// Keep the small entry index separate so the illustrated scenes load on demand.
export const familyStoryIndex:Readonly<Record<string,string>>=Object.freeze({
 莫:'mo',暮:'mu-dusk',幕:'mu-curtain',摸:'mo-touch',模:'mo-model',
 墓:'mu-grave',漠:'mo-desert',膜:'mo-membrane',募:'mu-recruit',摹:'mo-trace',慕:'mu-admire',
});
export function familyStoryForCharacter(text:string){
 return Object.hasOwn(familyStoryIndex,text)?familyStoryIndex[text]:undefined;
}
