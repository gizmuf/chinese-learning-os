#!/usr/bin/env python3
"""Loopback-only Mandarin TTS for signed Sentence Check requests."""

import argparse
import asyncio
from concurrent.futures import Future
import hashlib
import hmac
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
import json
import os
from pathlib import Path
import re
import stat
import tempfile
import threading
import time
import unicodedata

VOICE = "zh-CN-XiaoxiaoNeural"
RATE = "-10%"
AUDIO_PATH = "/api/sentence-check/audio"
MAX_BODY = 4096
MAX_TEXT_UNITS = 200
MAX_TTL = 86400
MAX_AUDIO = 512 * 1024
MAX_FILES = 4096
SYNTH_TIMEOUT = 12
HEX_64 = re.compile(r"[0-9a-f]{64}")
HAN = re.compile(r"[\u3007\u3400-\u4dbf\u4e00-\u9fff\uf900-\ufaff"
                 r"\U00020000-\U0002fa1f\U00030000-\U000323af]")


def valid_text(value):
    return (isinstance(value, str)
            and len(value) <= MAX_TEXT_UNITS
            and not any(unicodedata.category(char).startswith("C") for char in value)
            and len(value.encode("utf-16-le")) <= 2 * MAX_TEXT_UNITS
            and bool(HAN.search(value)))


def valid_signature(key, sentence, expires, signature, now):
    return (type(expires) is int
            and now < expires <= now + MAX_TTL
            and isinstance(signature, str)
            and HEX_64.fullmatch(signature) is not None
            and hmac.compare_digest(
                hmac.digest(key, f"{expires}\n{sentence}".encode("utf-8"), "sha256").hex(),
                signature))


def frame_size(data, offset):
    """Return a plausible Layer III frame length, or zero for an invalid header."""
    if len(data) < offset + 4:
        return 0
    a, b, c, _ = data[offset:offset + 4]
    version, layer = (b >> 3) & 3, (b >> 1) & 3
    bitrate_index, sample_index = c >> 4, (c >> 2) & 3
    if (a != 0xff or b & 0xe0 != 0xe0 or version == 1 or layer != 1
            or bitrate_index in (0, 15) or sample_index == 3):
        return 0
    mpeg1 = version == 3
    bitrates = ((32, 40, 48, 56, 64, 80, 96, 112, 128, 160, 192, 224, 256, 320)
                if mpeg1 else (8, 16, 24, 32, 40, 48, 56, 64, 80, 96, 112, 128, 144, 160))
    sample_rate = (44100, 48000, 32000)[sample_index] // {0: 4, 2: 2, 3: 1}[version]
    return (144000 if mpeg1 else 72000) * bitrates[bitrate_index - 1] // sample_rate + ((c >> 1) & 1)


def plausible_mp3(data):
    if not 8 <= len(data) <= MAX_AUDIO:
        return False
    offset = 0
    if data.startswith(b"ID3"):
        if len(data) < 10 or any(byte & 0x80 for byte in data[6:10]):
            return False
        offset = 10 + sum(byte << shift for byte, shift in zip(data[6:10], (21, 14, 7, 0)))
        if data[5] & 0x10:  # ID3v2.4 footer.
            offset += 10
    first = frame_size(data, offset)
    second = frame_size(data, offset + first) if first else 0
    return bool(second and offset + first + second <= len(data))


async def synthesize(sentence):
    import edge_tts

    result = bytearray()
    async for chunk in edge_tts.Communicate(sentence, VOICE, rate=RATE).stream():
        if chunk["type"] == "audio":
            if len(result) + len(chunk["data"]) > MAX_AUDIO:
                raise ValueError("Audio too large")
            result.extend(chunk["data"])
    return bytes(result)


class Busy(Exception):
    pass


class AudioService:
    def __init__(self, cache, origin, key, synth=synthesize, max_files=MAX_FILES, max_synth=2):
        self.cache = Path(cache)
        self.cache.mkdir(mode=0o700, parents=True, exist_ok=True)
        info = self.cache.lstat()
        if not stat.S_ISDIR(info.st_mode) or info.st_uid != os.getuid() or info.st_mode & 0o077:
            raise ValueError("The audio cache must be a private directory owned by the service user")
        self.origin, self.key, self.synth = origin, key, synth
        self.max_files = max_files
        self.slots = threading.BoundedSemaphore(max_synth)
        self.lock = threading.Lock()
        self.pending = {}

    def cache_path(self, sentence):
        digest = hmac.digest(self.key, f"cache\0{VOICE}\0{RATE}\0{sentence}".encode(), "sha256").hex()
        return self.cache / f"{digest}.mp3"

    def read(self, path):
        try:
            with os.fdopen(os.open(path, os.O_RDONLY | os.O_NOFOLLOW | os.O_NONBLOCK), "rb") as file:
                info = os.fstat(file.fileno())
                if (not stat.S_ISREG(info.st_mode) or info.st_uid != os.getuid()
                        or info.st_mode & 0o077 or info.st_size > MAX_AUDIO):
                    return None
                audio = file.read(MAX_AUDIO + 1)
                return audio if plausible_mp3(audio) else None
        except OSError:
            return None

    def write(self, path, audio):
        files = []
        for candidate in self.cache.glob("*.mp3"):
            if candidate != path and HEX_64.fullmatch(candidate.stem):
                files.append((candidate.lstat().st_mtime_ns, candidate))
        if len(files) >= self.max_files:
            for _, oldest in sorted(files)[:len(files) - self.max_files + 1]:
                oldest.unlink(missing_ok=True)
        scratch = None
        try:
            with tempfile.NamedTemporaryFile(dir=self.cache, prefix=".audio-", delete=False) as file:
                scratch = Path(file.name)
                file.write(audio)
            os.replace(scratch, path)
        finally:
            if scratch is not None:
                scratch.unlink(missing_ok=True)

    def audio(self, sentence):
        path = self.cache_path(sentence)
        with self.lock:
            audio = self.read(path)
            if audio is not None:
                return audio, "HIT"
            pending = self.pending.get(path)
            owns_synthesis = pending is None
            if owns_synthesis:
                if not self.slots.acquire(blocking=False):
                    raise Busy
                pending = self.pending[path] = Future()
        if not owns_synthesis:
            return pending.result(timeout=SYNTH_TIMEOUT + 1), "HIT"
        try:
            audio = asyncio.run(asyncio.wait_for(self.synth(sentence), SYNTH_TIMEOUT))
            if not plausible_mp3(audio):
                raise ValueError("Invalid audio")
            with self.lock:
                self.write(path, audio)
            pending.set_result(audio)
            return audio, "MISS"
        except Exception as error:
            pending.set_exception(error)
            raise
        finally:
            with self.lock:
                del self.pending[path]
                self.slots.release()


class AudioHandler(BaseHTTPRequestHandler):
    def log_message(self, *args):
        pass

    def send_error(self, code, message=None, explain=None):
        self.reply(code)

    def reply(self, status, data=b"", cache=None):
        self.close_connection = True
        self.send_response(status)
        self.send_header("Connection", "close")
        self.send_header("Cache-Control", "no-store, private")
        self.send_header("X-Content-Type-Options", "nosniff")
        if cache is not None:
            self.send_header("Content-Type", "audio/mpeg")
            self.send_header("X-Sentence-Audio-Cache", cache)
        self.send_header("Content-Length", str(len(data)))
        self.end_headers()
        if data:
            self.wfile.write(data)

    def matches_path(self, path):
        # BaseHTTPRequestHandler normalizes a request target that starts with "//".
        return self.requestline.split()[1] == path

    def do_GET(self):
        self.reply(200 if self.matches_path("/health") else 404)

    def do_POST(self):
        service = self.server.service
        if not self.matches_path(AUDIO_PATH):
            return self.reply(404)
        if not service.origin or self.headers.get_all("Origin") != [service.origin]:
            return self.reply(403)
        if self.headers.get_all("Transfer-Encoding") or self.headers.get_content_type() != "application/json":
            return self.reply(400)
        lengths = self.headers.get_all("Content-Length", [])
        if len(lengths) != 1 or not re.fullmatch(r"[0-9]{1,10}", lengths[0]):
            return self.reply(400)
        length = int(lengths[0])
        if not 0 < length <= MAX_BODY:
            return self.reply(413)
        try:
            body = self.rfile.read(length)
            if len(body) != length:
                return self.reply(400)
            payload = json.loads(body.decode("utf-8"))
        except (ValueError, TimeoutError, RecursionError):
            return self.reply(400)
        if (not isinstance(payload, dict) or payload.keys() != {"text", "expires", "signature"}
                or not valid_text(payload["text"])):
            return self.reply(400)
        if not valid_signature(service.key, payload["text"], payload["expires"],
                               payload["signature"], int(time.time())):
            return self.reply(403)
        try:
            audio, cache = service.audio(payload["text"])
        except Busy:
            return self.reply(503)
        except Exception:
            return self.reply(502)
        self.reply(200, audio, cache)


class AudioServer(ThreadingHTTPServer):
    def __init__(self, port, service):
        self.service = service
        self.connections = threading.BoundedSemaphore(16)
        super().__init__(("127.0.0.1", port), AudioHandler)

    def get_request(self):
        connection, address = super().get_request()
        connection.settimeout(5)
        return connection, address

    def process_request(self, request, address):
        if not self.connections.acquire(blocking=False):
            try:
                request.sendall(b"HTTP/1.0 503 Service Unavailable\r\n"
                                b"Cache-Control: no-store, private\r\nContent-Length: 0\r\n\r\n")
            except OSError:
                pass
            self.shutdown_request(request)
            return
        try:
            super().process_request(request, address)
        except BaseException:
            self.connections.release()
            raise

    def process_request_thread(self, request, address):
        try:
            super().process_request_thread(request, address)
        finally:
            self.connections.release()

    def handle_error(self, request, address):
        # Upstream/client failures must not put request details in service logs.
        pass


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--port", type=int, default=os.environ.get("SENTENCE_CHECK_AUDIO_PORT", "18782"))
    args = parser.parse_args()
    origin = os.environ.get("SENTENCE_CHECK_AUDIO_ORIGIN")
    key = os.environ.get("SENTENCE_CHECK_AUDIO_SECRET", "")
    cache = os.environ.get("SENTENCE_CHECK_AUDIO_CACHE")
    if not re.fullmatch(r"[0-9a-fA-F]{64}", key) or not cache:
        parser.error("Configure SENTENCE_CHECK_AUDIO_SECRET (64 hex characters) and SENTENCE_CHECK_AUDIO_CACHE")
    try:
        import edge_tts  # Fail startup if the production synthesizer is unavailable.
        service = AudioService(cache, origin, key.encode("ascii"))
        with AudioServer(args.port, service) as server:
            server.serve_forever()
    except (ImportError, OSError, ValueError):
        parser.exit(1, "Sentence audio service could not start; check edge-tts, cache permissions and port.\n")


if __name__ == "__main__":
    main()
