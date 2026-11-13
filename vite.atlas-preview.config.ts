import { createHash } from 'node:crypto';
import { readFile } from 'node:fs/promises';
import { gunzipSync } from 'node:zlib';
import type { IncomingMessage, ServerResponse } from 'node:http';
import { defineConfig, mergeConfig, type Plugin } from 'vite';
import { cedictEntry, validDictionaryText } from './app/dictionary-source-model';
import sourceMeta from './data/dictionary-sources.json';
import { hkDictionaryAsset } from './hk/dictionary-asset';
import hkConfig from './vite.hk.config';

function pinnedAsset(path: string, sha256: string) {
  return readFile(new URL(path, import.meta.url)).then(bytes => {
    if (createHash('sha256').update(bytes).digest('hex') !== sha256) {
      throw new Error(`Unexpected Atlas preview asset revision: ${path}`);
    }
    return bytes;
  });
}

function json(response: ServerResponse, status: number, body: unknown) {
  response.writeHead(status, { 'Content-Type': 'application/json; charset=utf-8' });
  response.end(JSON.stringify(body));
}

function localDictionary(): Plugin {
  const versionedPath = '/' + hkDictionaryAsset.versionedPath;
  const headwords = () => pinnedAsset('./public/' + hkDictionaryAsset.sourcePath, hkDictionaryAsset.sourceSHA256);
  let snapshot: Promise<string> | undefined;
  function middleware(request: IncomingMessage, response: ServerResponse, next: () => void) {
    const url = new URL(request.url ?? '/', 'http://127.0.0.1');
    if (url.pathname === versionedPath) {
      void headwords().then(bytes => {
        response.writeHead(200, { 'Content-Type': 'application/gzip', 'Content-Length': bytes.length });
        response.end(request.method === 'HEAD' ? undefined : bytes);
      }).catch(() => json(response, 503, { status: 'error' }));
      return;
    }
    if (url.pathname !== '/api/dictionary') {
      next();
      return;
    }
    if (request.method !== 'GET') {
      json(response, 405, { status: 'invalid' });
      return;
    }
    const text = url.searchParams.get('text') ?? '';
    if (!validDictionaryText(text)) {
      json(response, 400, { status: 'invalid' });
      return;
    }
    snapshot ??= pinnedAsset('./resources/cc-cedict/cedict.txt.gz', sourceMeta.cedict.sha256)
      .then(bytes => gunzipSync(bytes).toString('utf8'));
    void snapshot.then(source => {
      const entry = cedictEntry(source, text);
      json(response, entry ? 200 : 404, entry ? { status: 'found', entry } : { status: 'not-found' });
    }).catch(() => json(response, 503, { status: 'error' }));
  }

  return {
    name: 'atlas-preview-local-dictionary',
    configureServer(server) {
      server.middlewares.use(middleware);
    },
    configurePreviewServer(server) {
      server.middlewares.use(middleware);
    },
    async generateBundle() {
      this.emitFile({ type: 'asset', fileName: hkDictionaryAsset.versionedPath, source: await headwords() });
    },
  };
}

export default defineConfig(mergeConfig(hkConfig, {
  plugins: [localDictionary()],
  build: { outDir: 'output/atlas-unified-preview/dist' },
  preview: { host: '127.0.0.1' },
}));
