#!/usr/bin/env python3
"""Exercise the real loopback HTTP path without calling the speech provider."""

import asyncio
from concurrent.futures import ThreadPoolExecutor
import hashlib
import hmac
import http.client
import importlib.util
import json
from pathlib import Path
import stat
import tempfile
import threading
import time
import unittest

SPEC = importlib.util.spec_from_file_location(
    "sentence_audio_server", Path(__file__).resolve().parents[1] / "scripts/sentence-audio-server.py")
audio_server = importlib.util.module_from_spec(SPEC)
SPEC.loader.exec_module(audio_server)

ORIGIN = "https://chinese.example"
KEY = ("01" * 32).encode()
SENTENCE = "你好，世界！"
FRAME = bytes.fromhex("fff364c4") + bytes(140)  # MPEG-2 Layer III, 48 kbps, 24 kHz.
MP3 = FRAME * 2
PATH = "/api/sentence-check/audio"


def signed(text=SENTENCE, expires=None):
    if expires is None:
        expires = int(time.time()) + 60
    signature = hmac.new(KEY, f"{expires}\n{text}".encode("utf-8"), hashlib.sha256).hexdigest()
    return {"text": text, "expires": expires, "signature": signature}


class AudioServerTest(unittest.TestCase):
    def setUp(self):
        temp = tempfile.TemporaryDirectory()
        self.addCleanup(temp.cleanup)
        self.cache = Path(temp.name) / "cache"
        self.calls = []
        self.started = threading.Event()
        self.release = threading.Event()
        self.release.set()
        self.fake_audio = MP3

        async def fake_synth(text):
            self.calls.append(text)
            self.started.set()
            while not self.release.is_set():
                await asyncio.sleep(0.01)
            return self.fake_audio

        self.service = audio_server.AudioService(self.cache, ORIGIN, KEY, synth=fake_synth, max_files=2,
                                                 max_synth=1)
        self.server = audio_server.AudioServer(0, self.service)
        self.addCleanup(self.server.server_close)
        self.thread = threading.Thread(target=self.server.serve_forever, kwargs={"poll_interval": 0.01})
        self.thread.start()
        self.addCleanup(self.thread.join)
        self.addCleanup(self.server.shutdown)
        self.addCleanup(self.release.set)

    def request(self, payload=None, *, origin=ORIGIN, path=PATH, method="POST"):
        headers = {"Content-Type": "application/json"}
        if origin is not None:
            headers["Origin"] = origin
        if payload is not None and not isinstance(payload, bytes):
            payload = json.dumps(payload).encode()
        client = http.client.HTTPConnection("127.0.0.1", self.server.server_port, timeout=3)
        try:
            client.request(method, path, body=payload, headers=headers)
            response = client.getresponse()
            return response.status, response.headers, response.read()
        finally:
            client.close()

    def test_signed_request_miss_then_hit_with_private_cache(self):
        status, headers, audio = self.request(signed())
        self.assertEqual((status, headers["X-Sentence-Audio-Cache"], audio), (200, "MISS", MP3))
        self.assertEqual(headers["Content-Type"], "audio/mpeg")
        self.assertEqual(headers["Cache-Control"], "no-store, private")
        status, headers, audio = self.request(signed(expires=int(time.time()) + 120))
        self.assertEqual((status, headers["X-Sentence-Audio-Cache"], audio), (200, "HIT", MP3))
        (entry,) = self.cache.iterdir()
        self.assertRegex(entry.name, r"^[0-9a-f]{64}\.mp3$")
        self.assertEqual(stat.S_IMODE(entry.stat().st_mode), 0o600)
        self.assertEqual(stat.S_IMODE(self.cache.stat().st_mode), 0o700)
        self.assertEqual(self.calls, [SENTENCE])

    def test_rejects_invalid_requests_before_audio_path(self):
        now = int(time.time())
        for payload, origin, status in [
            (signed(), None, 403),
            (signed(), ORIGIN + ".evil", 403),
            (signed() | {"text": "我很好。"}, ORIGIN, 403),
            (signed() | {"signature": "F" * 64}, ORIGIN, 403),
            (signed(expires=now - 1), ORIGIN, 403),
            (signed(expires=now + 86401), ORIGIN, 403),
            (signed(expires=now + 60.0), ORIGIN, 403),
            (signed("English only"), ORIGIN, 400),
            (signed("中\x00文"), ORIGIN, 400),
            (signed("𠀀" * 101), ORIGIN, 400),
            (signed() | {"unexpected": True}, ORIGIN, 400),
            (b'{"text":"\\ud800","expires":1,"signature":""}', ORIGIN, 400),
            (b"x" * 4097, ORIGIN, 413),
        ]:
            with self.subTest(payload_type=type(payload), status=status):
                actual, _, body = self.request(payload, origin=origin)
                self.assertEqual((actual, body), (status, b""))
        self.assertEqual(self.request(signed(), path=PATH + "?other")[0], 404)
        self.assertEqual(self.request(signed(), path="/" + PATH)[0], 404)
        self.assertEqual(self.request(path="/health", method="GET")[0], 200)
        self.service.origin = None
        self.assertEqual(self.request(signed())[0], 403)
        self.assertEqual(self.calls, [])
        self.assertEqual(list(self.cache.iterdir()), [])

    def test_concurrent_duplicate_shares_synthesis_and_competing_miss_is_bounded(self):
        self.release.clear()
        with ThreadPoolExecutor(max_workers=2) as pool:
            first = pool.submit(self.request, signed())
            try:
                self.assertTrue(self.started.wait(2))
                second = pool.submit(self.request, signed())
                self.assertEqual(self.request(signed("第二句。"))[0], 503)
            finally:
                self.release.set()
            first_result, second_result = first.result(), second.result()
        self.assertEqual([(result[0], result[1]["X-Sentence-Audio-Cache"], result[2])
                          for result in (first_result, second_result)], [(200, "MISS", MP3), (200, "HIT", MP3)])
        self.assertEqual(self.calls, [SENTENCE])

    def test_rejects_bad_audio_without_a_cache_entry_and_bounds_eviction(self):
        self.fake_audio = b"ID3" + bytes(500)
        self.assertEqual(self.request(signed())[0], 502)
        self.assertEqual(list(self.cache.iterdir()), [])
        self.fake_audio = MP3
        for sentence in (SENTENCE, "第二句。", "第三句。"):
            self.assertEqual(self.request(signed(sentence))[0], 200)
        self.assertEqual(len(list(self.cache.iterdir())), 2)
        self.assertEqual(self.request(signed())[1]["X-Sentence-Audio-Cache"], "MISS")


if __name__ == "__main__":
    unittest.main()
