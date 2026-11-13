import {execFileSync} from 'node:child_process';
import {fileURLToPath} from 'node:url';
import path from 'node:path';
import fs from 'node:fs';

// The official packager still prepares and validates the Site. This command adds
// portable metadata and a verified expanded-size gate before native upload.
const [helper, destination, ...extra] = process.argv.slice(2);
if (!helper || !destination || extra.length || !path.isAbsolute(helper) || !path.isAbsolute(destination)) {
  throw Error('Usage: npm run release:package -- /absolute/path/package-site.mjs /absolute/path/new-site.tar.gz');
}
const original = destination + '.official.tar.gz';
for (const filename of [original, destination, destination + '.check.json']) {
  if (fs.existsSync(filename)) throw Error('Refusing to overwrite: ' + filename);
}
execFileSync(process.execPath, [helper, process.cwd(), original], {
  env: {...process.env, COPYFILE_DISABLE: '1'}, stdio: ['ignore', 'inherit', 'inherit'],
});
const report = execFileSync('python3', [fileURLToPath(new URL('./prepare-sites-archive.py', import.meta.url)), original, destination], {encoding: 'utf8'});
fs.writeFileSync(destination + '.check.json', report, {flag: 'wx'});
process.stdout.write(report);
