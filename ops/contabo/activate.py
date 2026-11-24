#!/usr/bin/env python3
import fcntl
import hashlib
import json
import os
from pathlib import Path
import pwd
import re
import shutil
import subprocess
import tempfile
import time
import urllib.request

STAGE = Path(__file__).resolve().parent
BASE = Path('/home/codex-account2/chineseos-vps-test/20261108-v105-ui')
SOURCE = BASE / 'source'
OWNER = 'codex-account2'
SERVICE = 'chineseos-vps-test-20261108.service'
STATE = Path('.wrangler/vps-test-state')
ORIGIN = 'https://chineseos.l00p.network'
LOCAL = 'http://127.0.0.1:18765'
DISK_RESERVE = 20_000_000_000

def recorded(name):
    return json.loads((STAGE / name).read_text())

def fetch(origin, path):
    request = urllib.request.Request(origin + path, headers={'Cache-Control': 'no-cache'})
    with urllib.request.urlopen(request, timeout=8) as response:
        return response.read()

def manifest(origin):
    return json.loads(fetch(origin, '/__vps/release.json'))

def run_as_owner(*args):
    return subprocess.check_output(['runuser', '-u', OWNER, '--', *map(str, args)], text=True).strip()

def commit(path):
    return run_as_owner('git', '-C', path, 'rev-parse', 'HEAD')

def service(action):
    subprocess.run(['systemctl', action, SERVICE], check=True)

def available():
    fs = os.statvfs(BASE)
    return fs.f_bavail * fs.f_frsize

def replace_gateway(path, content):
    status = path.stat()
    with tempfile.NamedTemporaryFile(dir=path.parent, prefix='.gateway-', delete=False) as new:
        pending = Path(new.name)
        try:
            os.fchmod(new.fileno(), status.st_mode & 0o777)
            os.fchown(new.fileno(), status.st_uid, status.st_gid)
            new.write(content)
            new.flush()
            os.fsync(new.fileno())
            pending.replace(path)
        finally:
            pending.unlink(missing_ok=True)

def expect_healthy(expected):
    for _ in range(24):
        try:
            assert manifest(LOCAL) == expected
            assert manifest(ORIGIN) == expected
            assert json.loads(fetch(LOCAL, '/api/sentence-check'))['enabled'] is True
            assert json.loads(fetch(LOCAL, '/api/reading-lab/narration')) == {'enabled': True, 'voice': 'qwen'}
            subprocess.run(['systemctl', 'is-active', '--quiet', 'chineseos-sentence-audio.service'], check=True)
            assert b'/_next/static/' in fetch(LOCAL, '/?notebook=1')
            assert b'/_next/static/' in fetch(ORIGIN, '/?atlas=1&workspace=1&mode=build')
            return
        except (OSError, ValueError, AssertionError, subprocess.CalledProcessError):
            time.sleep(1)
    raise RuntimeError('Contabo release did not pass readiness')

def activate():
    assert os.geteuid() == 0
    assert STAGE.parent == Path('/dev/shm') and STAGE.name.startswith('chineseos-')
    assert STAGE.stat().st_uid == pwd.getpwnam(OWNER).pw_uid and STAGE.stat().st_mode & 0o077 == 0
    receipt = recorded('PACKAGE-RECEIPT.json')
    approval = recorded('CANDIDATE-APPROVAL.json')
    staged = STAGE / 'source'
    source_sha = receipt['sourceCommit']
    digest = receipt['sha256']
    assert re.fullmatch(r'[0-9a-f]{40}', source_sha)
    assert re.fullmatch(r'[0-9a-f]{64}', digest)
    assert approval['source'] == source_sha and approval['sha256'] == digest and approval['accepted'] is True
    with (STAGE/'source.bundle').open('rb') as bundle:
        assert hashlib.file_digest(bundle,'sha256').hexdigest() == digest
    previous = manifest(LOCAL)
    assert previous == manifest(ORIGIN)
    assert previous['source'] == receipt['baseSource'] == commit(SOURCE)
    assert previous['release'] == receipt['baseLiveRelease']
    assert previous['readingLabQwen'] and previous['sentenceAudio']
    assert json.loads(fetch(LOCAL, '/api/sentence-check'))['enabled'] is True
    expected = {**previous, 'source': source_sha, 'release': 'r-'+digest}
    assert manifest('http://127.0.0.1:18968') == expected
    assert commit(staged) == source_sha
    assert (staged/'dist/server/index.js').is_file()
    assert (staged/'wrangler.vps-local.json').read_bytes() == (SOURCE/'wrangler.vps-local.json').read_bytes()
    deps = BASE / 'runtime-dependencies/node_modules'
    assert (staged/'node_modules').resolve(strict=True) == deps
    assert not (staged/'.git/objects/info/alternates').exists()
    protected = BASE / '.sentence-check.dev.vars'
    active_vars = SOURCE / '.dev.vars'
    assert active_vars.is_symlink() and active_vars.resolve(strict=True) == protected
    assert protected.stat().st_mode & 0o077 == 0
    assert (SOURCE/STATE).is_dir() and not (SOURCE/STATE).is_symlink()
    inode = (SOURCE/STATE).stat().st_ino
    assert (SOURCE/STATE).stat().st_dev == BASE.stat().st_dev

    gateway = BASE / 'gateway.mjs'
    original = gateway.read_bytes()
    new, matched = re.subn(rb'const publicRelease=.*?;', b'const publicRelease=' + json.dumps(expected).encode() + b';', original)
    assert matched == 1
    candidate = BASE / ('.staging-'+source_sha)
    retiring = BASE / ('.retiring-'+source_sha)
    assert not candidate.exists() and not retiring.exists()
    candidate_bytes = int(subprocess.check_output(
        ['du','-s','-B1','--exclude=.wrangler',str(staged)], text=True).split()[0])
    assert available() >= DISK_RESERVE + candidate_bytes
    renamed = state_moved = promoted = False
    try:
        run_as_owner('mkdir', '-m', '700', candidate)
        run_as_owner('rsync', '-a', '--exclude=/.wrangler/', f'{staged}/', f'{candidate}/')
        assert commit(candidate) == source_sha
        assert available() >= DISK_RESERVE
        assert not (candidate/STATE).exists()
        run_as_owner('mkdir', '-p', (candidate/STATE).parent)
        run_as_owner('ln', '-s', '--', os.readlink(active_vars), candidate/'.dev.vars')

        service('stop')
        SOURCE.rename(retiring)
        renamed = True
        (retiring/STATE).rename(candidate/STATE)
        state_moved = True
        candidate.rename(SOURCE)
        promoted = True
        replace_gateway(gateway, new)
        service('start')
        expect_healthy(expected)
        assert inode == (SOURCE/STATE).stat().st_ino
    except BaseException:
        if renamed:
            service('stop')
            if promoted:
                SOURCE.rename(candidate)
            if state_moved:
                (candidate/STATE).rename(retiring/STATE)
            retiring.rename(SOURCE)
            replace_gateway(gateway, original)
            service('start')
        elif not SOURCE.exists():
            raise
        else:
            service('start')
        if candidate.exists():
            shutil.rmtree(candidate)
        raise

    shutil.rmtree(retiring)
    print(json.dumps({**expected,'previous': previous['release'], 'retention':'active-only',
                      'stateInodePreserved':True,'availableBytes':available()}, indent=2), flush=True)

with (BASE/'.atlas-build-contabo-release.lock').open('a') as lock:
    fcntl.flock(lock, fcntl.LOCK_EX | fcntl.LOCK_NB)
    activate()
