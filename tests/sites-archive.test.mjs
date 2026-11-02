import test from 'node:test';
import {execFileSync} from 'node:child_process';
import {fileURLToPath} from 'node:url';

test('Sites packaging preserves long Unicode paths and bytes, removes xattrs, rejects oversized and unsafe outputs', () => {
  const script = fileURLToPath(new URL('../scripts/prepare-sites-archive.py', import.meta.url));
  execFileSync('python3', ['-c', `
import importlib.util, io, pathlib, tarfile, tempfile, sys
sys.dont_write_bytecode = True
spec=importlib.util.spec_from_file_location('pack', ${JSON.stringify(script)})
pack=importlib.util.module_from_spec(spec); spec.loader.exec_module(pack)
with tempfile.TemporaryDirectory() as directory:
    root=pathlib.Path(directory); source=root/'source.tar.gz'; output=root/'portable.tar.gz'
    with tarfile.open(source, 'w:gz', format=tarfile.PAX_FORMAT) as archive:
        for name, data in [('dist/.openai/hosting.json', b'{}'), ('dist/'+('long/'*25)+'\u590d.pdf', b'actual PDF bytes')]:
            entry=tarfile.TarInfo(name); entry.size=len(data); entry.mode=0o644; entry.mtime=123.456
            entry.pax_headers={'SCHILY.xattr.com.apple.provenance': 'metadata'}
            archive.addfile(entry, io.BytesIO(data))
    original=source.read_bytes()
    report=pack.prepare(source, output)
    assert report['content_identity_verified'] and report['files']==2
    assert pack.inventory(source)==pack.inventory(output)
    assert source.read_bytes()==original
    with tarfile.open(output) as archive:
        assert all(not entry.pax_headers for entry in archive)
    for destination, limit in [(output, pack.LIMIT), (source, pack.LIMIT), (root/'too-big.tar.gz', 512)]:
        try: pack.prepare(source, destination, limit=limit)
        except ValueError: pass
        else: raise AssertionError('Must reject overwrite or oversize')
    assert not (root/'too-big.tar.gz').exists()
    for bad in ['dist/._file', '../escape', 'dist/file']:
        malformed=root/'malformed.tar.gz'
        with tarfile.open(malformed, 'w:gz') as archive:
            for name in ['dist/.openai/hosting.json', bad, bad]:
                archive.addfile(tarfile.TarInfo(name))
        try: pack.prepare(malformed, root/'rejected.tar.gz')
        except ValueError: pass
        else: raise AssertionError('Must reject metadata/unsafe/duplicate paths')
`], {stdio: 'pipe'});
});
