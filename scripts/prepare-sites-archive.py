#!/usr/bin/env python3
"""Normalize an official Sites archive, verify its contents, enforce expanded size."""
import argparse
import copy
import gzip
import hashlib
import json
import os
from pathlib import Path, PurePosixPath
import tarfile
import tempfile

LIMIT = 256 * 1024 * 1024
WARNING_HEADROOM = 32 * 1024 * 1024


def digest(stream):
    h = hashlib.sha256()
    for block in iter(lambda: stream.read(1024 * 1024), b""):
        h.update(block)
    return h.hexdigest()


def inventory(filename):
    result = {}
    with tarfile.open(filename, "r:gz") as archive:
        for member in archive:
            name = member.name
            path = PurePosixPath(name)
            if path.is_absolute() or ".." in path.parts or name in result:
                raise ValueError(f"Unsafe or duplicate archive path: {name}")
            if any(part.startswith("._") or part == "__MACOSX" for part in path.parts):
                raise ValueError("AppleDouble metadata found; recreate the official archive with COPYFILE_DISABLE=1")
            if not (member.isfile() or member.isdir() or member.issym() or member.islnk()):
                raise ValueError(f"Unsupported archive member: {name}")
            result[name] = (member.type.decode(), member.mode, member.linkname,
                            member.size, digest(archive.extractfile(member)) if member.isfile() else None)
    if "dist/.openai/hosting.json" not in result:
        raise ValueError("Missing official Sites hosting manifest")
    return result


def prepare(source, destination, *, limit=LIMIT):
    source, destination = Path(source).resolve(), Path(destination).absolute()
    if source == destination.resolve() or destination.exists():
        raise ValueError("Use a new output path; input and existing outputs remain immutable")
    before = inventory(source)
    destination.parent.mkdir(parents=True, exist_ok=True)
    temporary = None
    try:
        with tempfile.NamedTemporaryFile(dir=destination.parent, delete=False) as raw:
            temporary = Path(raw.name)
            with gzip.GzipFile(filename="", mode="wb", fileobj=raw, mtime=0) as compressed:
                with tarfile.open(fileobj=compressed, mode="w|", format=tarfile.GNU_FORMAT) as target:
                    with tarfile.open(source, "r:gz") as original:
                        for member in original:
                            clean = copy.copy(member)
                            clean.pax_headers = {}
                            clean.mtime = int(clean.mtime)
                            target.addfile(clean, original.extractfile(member) if member.isfile() else None)
        after = inventory(temporary)
        if before != after:
            raise ValueError("Archive content identity check failed")
        expanded = 0
        with gzip.open(temporary, "rb") as stream:
            for block in iter(lambda: stream.read(1024 * 1024), b""):
                expanded += len(block)
        if expanded > limit:
            raise ValueError(f"Sites archive exceeds expanded limit: {expanded} > {limit} bytes; separate large media from application delivery")
        with temporary.open("rb") as stream:
            sha = digest(stream)
        report = {"archive": str(destination), "archive_sha256": sha,
                  "expanded_bytes": expanded, "limit_bytes": limit,
                  "headroom_bytes": limit - expanded,
                  "compressed_bytes": temporary.stat().st_size,
                  "files": sum(value[0] in ("0", "\u0000") for value in after.values()),
                  "members": len(after), "content_identity_verified": True,
                  "capacity_warning": limit - expanded < WARNING_HEADROOM}
        # Exclusive creation also protects against a destination appearing during processing.
        os.link(temporary, destination)
        return report
    finally:
        if temporary is not None:
            temporary.unlink(missing_ok=True)


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("source", help="Archive produced by the official Sites helper")
    parser.add_argument("destination", help="New portable archive to pass to Sites")
    args = parser.parse_args()
    try:
        print(json.dumps(prepare(args.source, args.destination), indent=2))
    except (ValueError, OSError, tarfile.TarError) as error:
        parser.exit(1, f"Sites packaging stopped: {error}\n")


if __name__ == "__main__":
    main()
