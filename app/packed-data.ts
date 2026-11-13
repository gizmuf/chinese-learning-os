import {gunzipSync,strFromU8} from 'fflate';
/** Preserve the original JSON exactly; used only for build-time generated static data. */
export function unpack<T>(packed:string):T{const binary=atob(packed);const bytes=Uint8Array.from(binary,ch=>ch.charCodeAt(0));return JSON.parse(strFromU8(gunzipSync(bytes))) as T;}
