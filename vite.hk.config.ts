import {defineConfig} from 'vite';
import react from '@vitejs/plugin-react';
import {fileURLToPath} from 'node:url';
export default defineConfig({plugins:[{name:'hk-http-content-hash',enforce:'pre',transform(code,id){if(id.endsWith('/app/private-lessons-model.ts')){if(!code.includes("crypto.subtle.digest('SHA-256'"))throw Error('Unexpected content hash contract');return "import {contentDigest} from '/hk/content-digest';"+String.fromCharCode(10)+code.replace("crypto.subtle.digest('SHA-256'","contentDigest('SHA-256'");}}},react()],resolve:{alias:[{find:/^\.\/auth-client$/,replacement:fileURLToPath(new URL('./hk/auth-client.ts',import.meta.url))}]},build:{outDir:'dist-hk',chunkSizeWarningLimit:1800},server:{host:'127.0.0.1'}});
