// Hosting-only versioning: preserve the existing immutable HK URL and exact bytes.
export const hkDictionaryAsset = {
 sourcePath: 'dictionary/headwords.json.gz',
 versionedPath: 'dictionary/headwords-v86-d74c0a258a56.json.gz',
 sourceSHA256: 'ed6e09fe50cd13a57fb03fe610d0d27686404dd20922d1b0e842ff63e06884d5',
 decompressedSHA256: 'd74c0a258a56fbbd0fa0f8595ddbdecc05f550dce0715c50caf9419c77c23bcd',
 baselineSHA256: 'd8646df7d95c3a1d3610db545ec4b9dfccb43d41c156ebf7ab3efc1be35730ad',
 baselineSource: '008478fcb8f9ef21ce199aa62d02de415ebe669e',
} as const;
export function adaptDictionaryClient(code:string):string {
 const literal="'/dictionary/headwords.json.gz?v='";
 if(code.split(literal).length!==2)throw Error('Unexpected dictionary resource reference');
 return code.replace(literal,"'/"+hkDictionaryAsset.versionedPath+"?v='");
}
