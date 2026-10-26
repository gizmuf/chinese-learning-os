import fs from 'node:fs';
import path from 'node:path';
import ts from 'typescript';

// UI copy only: narrative datasets are translated in their own owning lane.
const sources = new Set(fs.readFileSync('data/ui-translations.tsv', 'utf8').split(/\r?\n/).filter(Boolean).map(line => line.split('\t')[0]));
const dynamic = [];
function visitDirectory(dir) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const file = path.join(dir, entry.name);
    if (entry.isDirectory()) { if (entry.name !== 'vendor') visitDirectory(file); continue; }
    if (!/\.tsx?$/.test(file) || /(?:-data|-extended|-targets|-readings)\.ts$/.test(file)) continue;
    const source = ts.createSourceFile(file, fs.readFileSync(file, 'utf8'), ts.ScriptTarget.Latest, true, file.endsWith('.tsx') ? ts.ScriptKind.TSX : ts.ScriptKind.TS);
    const walk = node => {
      if (ts.isCallExpression(node) && ts.isIdentifier(node.expression) && ['L', 'c'].includes(node.expression.text) && node.arguments.length >= 3) {
        const value = node.arguments[0];
        if (ts.isStringLiteralLike(value)) sources.add(value.text);
        else dynamic.push({ file, line: source.getLineAndCharacterOfPosition(node.getStart()).line + 1, source: value.getText(source) });
      }
      ts.forEachChild(node, walk);
    };
    walk(source);
  }
}
visitDirectory('app');
const translations = JSON.parse(fs.readFileSync('data/turkish-ui.json', 'utf8'));
const placeholder = value => [...value.matchAll(/\{\d+\}/g)].map(match => match[0]).sort().join('|');
const missing = [...sources].filter(key => !(key in translations));
const invalid = Object.entries(translations).filter(([key, value]) => typeof value !== 'string' || !value.trim() || placeholder(key) !== placeholder(value));
const hanzi = value => [...value.matchAll(/\p{Script=Han}/gu)].map(match => match[0]).sort().join('');
const hanziMismatch = Object.entries(translations).filter(([key, value]) => hanzi(key) !== hanzi(value));
console.log(JSON.stringify({ sourceCount: sources.size, translationCount: Object.keys(translations).length, missing, invalid, hanziMismatch, dynamic }, null, 2));
if (missing.length || invalid.length || hanziMismatch.length) process.exitCode = 1;
