import {resolve} from 'node:path';
import {readFileSync, writeFileSync} from 'node:fs';
import {pathToFileURL} from 'node:url';

const routeImport = "const {createTutorGatewayRoute, filterTutorResponse} = await import(pathToFileURL(resolve('ops/reading-tutor/contabo-route.mjs')).href);";
const routeInit = "const tutorGatewayRoute = createTutorGatewayRoute({planEnabled: process.env.READING_TUTOR_PLAN_ENABLED === '1'});";

export function renderContaboGateway(source) {
  const edits = [
    ["import {resolve} from 'node:path';", `import {resolve} from 'node:path';\n${routeImport}\n${routeInit}`],
    [" const sentenceAudio=req.method==='POST'&&req.url==='/api/sentence-check/audio';",
      " const tutor = tutorGatewayRoute(req, path);\n if (tutor?.status) return json(res,tutor.status,{error:tutor.error});\n const sentenceAudio=req.method==='POST'&&req.url==='/api/sentence-check/audio';"],
    ["if(!['GET','HEAD'].includes(req.method??'')&&!sentenceAudio", "if(!['GET','HEAD'].includes(req.method??'')&&!tutor&&!sentenceAudio"],
    [" const headers={...req.headers,host:sentenceAudio?'127.0.0.1:18782':'127.0.0.1:18766',",
      " const headers={...(tutor ? tutor.headers : req.headers),host:tutor?.headers.host ?? (sentenceAudio?'127.0.0.1:18782':'127.0.0.1:18766'),"],
    [" for(const key of Object.keys(headers))", " if (!tutor) for(const key of Object.keys(headers))"],
    ["  const h={...r.headers};delete h['set-cookie'];", "  const h={...r.headers};\n  if (tutor) filterTutorResponse(h, tutor, r.statusCode);\n  else delete h['set-cookie'];"],
    ["  if(req.method==='GET'&&r.statusCode===200", "  if(!tutor&&req.method==='GET'&&r.statusCode===200"],
  ];
  if (source.includes(routeImport)) {
    if (edits.every(([, rendered]) => source.includes(rendered))) return source;
    throw new Error('Found a partial tutor gateway patch. Review the gateway source.');
  }

  for (const [original, rendered] of edits) {
    if (source.split(original).length !== 2) throw new Error(`Expected exactly one guest gateway anchor: ${original}`);
    source = source.replace(original, rendered);
  }
  return source;
}

if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) {
  const [, , input, output] = process.argv;
  if (!input || !output || resolve(input) === resolve(output)) {
    throw new Error('Usage: node render-contabo-gateway.mjs <existing-gateway> <separate-output>');
  }
  writeFileSync(output, renderContaboGateway(readFileSync(input, 'utf8')), {mode: 0o600});
}
