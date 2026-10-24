/** Preserve classic Atlas deep links while giving a clean Atlas entry the new default. */
export function isCloudAtlasEntry(params:URLSearchParams):boolean {
  if(params.has('cloud'))return params.get('cloud')==='1';
  return !['classic','studio','lab','listen','story','component','group','target'].some(key=>params.has(key));
}
