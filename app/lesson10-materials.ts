/** Only reviewed public lesson files belong here; client input never selects a URL. */
export const lesson10Materials=[
 {id:'study-en',locale:'en',kind:'study',label:'Download study PDF',pages:11,filename:'Chinese_Practice_Lesson_10_STUDY_REFERENCE_COMPACT_EN_iPad_SAFE.pdf',path:'resources/lesson10/study-en.pdf',commit:'9ecc0f798b5c4f6035e3e99bbc0b52f8649e330b',bytes:3158765,sha256:'51196bcf5fd7d6b90df14f005e35ac06ecf92917e050995d8e40502934555e1a'},
 {id:'writing-en',locale:'en',kind:'writing',label:'Download writing workbook',pages:36,filename:'Chinese_Practice_Lesson_10_WRITING_PRACTICE_EN_iPad_SAFE.pdf',path:'resources/lesson10/writing-en.pdf',commit:'9ecc0f798b5c4f6035e3e99bbc0b52f8649e330b',bytes:5560497,sha256:'6d3bb8491e7f0753c662b89be064359e97622bff352a6425e875c7b9e878659b'},
] as const;
export const lesson10MaterialHref=(id:string)=>'/api/lesson10-material?file='+encodeURIComponent(id);
