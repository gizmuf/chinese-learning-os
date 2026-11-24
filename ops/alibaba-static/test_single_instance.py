import hashlib
import io
import json
import os
from pathlib import Path
import sys
import tarfile
import tempfile
import unittest

sys.dont_write_bytecode = True
sys.path.insert(0, str(Path(__file__).resolve().parent / "proposed"))
import core


class SingleInstance(unittest.TestCase):
    before = "r-" + "a" * 64

    def setUp(self):
        self.scratch = tempfile.TemporaryDirectory(dir=Path.home())
        self.addCleanup(self.scratch.cleanup)
        root = Path(self.scratch.name)
        self.base = root / "web"
        self.releases = self.base / "releases"
        self.state = root / "state"
        self.inbox = root / "inbox"
        self.backups = self.base / "backups"
        for path in (self.base, self.releases, self.state, self.inbox):
            path.mkdir(mode=0o700)
        (root / "upload.lock").touch(mode=0o600)
        self.old = self.releases / self.before
        self.old.mkdir()
        (self.old / "index.html").write_bytes(b"old")
        (self.old / "assets").mkdir()
        (self.old / "assets" / "shared.txt").write_bytes(b"shared")
        (self.base / "current").symlink_to("releases/" + self.before)
        policy = root / "policy.json"
        policy.write_text(json.dumps(dict(core.DEFAULT_POLICY, enabled=True)))
        policy.chmod(0o600)
        uid = os.getuid()
        self.healthy = True
        self.engine = core.Engine(core.Layout(self.base, self.state, self.inbox, self.backups, policy),
                                  uid, uid, lambda *_: self.healthy)
        # The fixture exercises release-state semantics without 5 GB of free local disk.
        self.engine.disk = lambda _: None

    def make_request(self, expected=None, index=b"new", extra=()):
        buf = io.BytesIO()
        with tarfile.open(fileobj=buf, mode="w:gz", format=tarfile.USTAR_FORMAT) as archive:
            for name, body in (("index.html", index), ("assets/latest.txt", b"latest"), *extra):
                item = tarfile.TarInfo("public/" + name)
                item.size = len(body)
                item.mode = 0o644
                archive.addfile(item, io.BytesIO(body))
        data = buf.getvalue()
        sha = hashlib.sha256(data).hexdigest()
        header = dict(version=1, sha256=sha, bytes=len(data), expectedCurrent=expected or self.before)
        upload = self.inbox / "request.upload"
        upload.write_bytes(json.dumps(header).encode() + b"\n" + data)
        upload.chmod(0o600)
        return "r-" + sha

    def assert_clean(self):
        self.assertFalse(self.backups.exists())
        self.assertFalse((self.state / "pending.json").exists())
        self.assertFalse(list(self.state.glob("snapshot-*")))
        self.assertFalse(list(self.releases.glob(".stage-*")))

    def test_success_keeps_only_active_and_preserves_inherited_assets(self):
        rid = self.make_request()
        result = self.engine.activate()
        self.assertEqual(result, dict(status="activated", release=rid, retention="active-only"))
        self.assertEqual(self.engine.current(), rid)
        self.assertEqual(list(self.releases.iterdir()), [self.releases / rid])
        self.assertEqual((self.releases / rid / "assets/shared.txt").read_bytes(), b"shared")
        self.assertFalse((self.inbox / "request.upload").exists())
        self.assert_clean()
        with self.assertRaisesRegex(core.Refused, "rollback disabled"):
            self.engine.rollback()

    def test_health_failure_keeps_original_and_removes_candidate(self):
        self.make_request()
        self.healthy = False
        with self.assertRaisesRegex(core.Refused, "health check failed"):
            self.engine.activate()
        self.assertEqual(self.engine.current(), self.before)
        self.assertEqual(list(self.releases.iterdir()), [self.old])
        self.assert_clean()

    def test_stale_parent_leaves_original_and_no_stage(self):
        self.make_request("r-" + "b" * 64)
        with self.assertRaisesRegex(core.Refused, "stale expectedCurrent"):
            self.engine.activate()
        self.assertEqual(self.engine.current(), self.before)
        self.assert_clean()

    def test_recovery_respects_commit_barrier(self):
        rid = self.make_request()
        for committed in (False, True):
            (self.releases / rid).mkdir()
            self.engine.swap(rid)
            core.atomic_json(self.state / "pending.json",
                             dict(before=self.before, after=rid, committed=committed), os.getuid())
            self.engine.recover()
            self.assertEqual(self.engine.current(), rid if committed else self.before)
            self.assertEqual(len(list(self.releases.iterdir())), 1)
            self.assert_clean()

    def test_cleanup_leaves_a_newer_upload(self):
        rid = self.make_request()
        self.engine.health = lambda *_: bool(self.make_request(expected=rid, index=b"queued"))
        self.assertEqual(self.engine.activate()["release"], rid)
        row = json.loads((self.inbox / "request.upload").read_bytes().splitlines()[0])
        self.assertEqual(row["expectedCurrent"], rid)
        self.assertNotEqual("r-" + row["sha256"], rid)

    def test_full_vite_build_retires_old_chunks_and_preserves_other_public_files(self):
        (self.old/'assets/entry-00000000.js').write_bytes(b'old Vite chunk')
        (self.old/'audio').mkdir()
        (self.old/'audio/line.mp3').write_bytes(b'lesson audio')
        entry='assets/entry-AAAAAAAA.js'
        lazy='assets/lazy-BBBBBBBB.js'
        marker=json.dumps({'version':1,'chunks':[entry,lazy]}).encode()
        rid=self.make_request(index=b'<script type="module" src="/assets/entry-AAAAAAAA.js"></script>',
                              extra=((core.VITE_BUILD_MARKER,marker),(entry,b'import("./lazy-BBBBBBBB.js")'),(lazy,b'export default 1')))
        self.assertEqual(self.engine.activate()['release'],rid)
        published=self.releases/rid
        self.assertFalse((published/'assets/entry-00000000.js').exists())
        self.assertFalse((published/core.VITE_BUILD_MARKER).exists())
        self.assertTrue((published/lazy).exists())
        self.assertEqual((published/'assets/shared.txt').read_bytes(),b'shared')
        self.assertEqual((published/'audio/line.mp3').read_bytes(),b'lesson audio')
        self.assert_clean()

    def test_full_vite_build_rejects_missing_lazy_chunk_before_any_switch(self):
        entry='assets/entry-AAAAAAAA.js'
        marker=json.dumps({'version':1,'chunks':[entry]}).encode()
        self.make_request(index=b'<script type="module" src="/assets/entry-AAAAAAAA.js"></script>',
                          extra=((core.VITE_BUILD_MARKER,marker),(entry,b'import("./missing-BBBBBBBB.js")')))
        with self.assertRaisesRegex(core.Refused,'missing referenced Vite chunk'):
            self.engine.activate()
        self.assertEqual(self.engine.current(),self.before)
        self.assert_clean()


if __name__ == "__main__":
    unittest.main(verbosity=2)
