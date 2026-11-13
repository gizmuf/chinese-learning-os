import type {ReferenceCaption} from './reference-time-model';
type Stages={before:ReferenceCaption;during:ReferenceCaption;after:ReferenceCaption};
const row=(hanzi:string,pinyin:string,en:string):ReferenceCaption=>({hanzi,pinyin,en});
export const referenceActionLanguage:Record<string,Stages>={
 '上来':{before:row('他要上来。','Tā yào shàng lái.','He is going to come up.'),during:row('他正在上来。','Tā zhèngzài shàng lái.','He is coming up toward the speaker.'),after:row('他上来了。','Tā shàng lái le.','He has come up.')},
 '上去':{before:row('他要上去。','Tā yào shàng qù.','He is going to go up.'),during:row('他正在上去。','Tā zhèngzài shàng qù.','He is going up away from the speaker.'),after:row('他上去了。','Tā shàng qù le.','He has gone up.')},
 '关上':{before:row('我要关门。','Wǒ yào guān mén.','I am going to close the door.'),during:row('我正在关门。','Wǒ zhèngzài guān mén.','I am closing the door.'),after:row('我把门关上了。','Wǒ bǎ mén guān shang le.','I have shut the door.')},
 '锁上':{before:row('我要锁门。','Wǒ yào suǒ mén.','I am going to lock the door.'),during:row('我正在锁门。','Wǒ zhèngzài suǒ mén.','I am locking the door.'),after:row('我把门锁上了。','Wǒ bǎ mén suǒ shang le.','I have locked the door.')},
 '穿上':{before:row('我要穿外套。','Wǒ yào chuān wàitào.','I am going to put on a coat.'),during:row('我正在穿外套。','Wǒ zhèngzài chuān wàitào.','I am putting on a coat.'),after:row('我穿上外套了。','Wǒ chuān shang wàitào le.','I have put on a coat.')},
 '戴上':{before:row('我要戴帽子。','Wǒ yào dài màozi.','I am going to put on a hat.'),during:row('我正在戴帽子。','Wǒ zhèngzài dài màozi.','I am putting on a hat.'),after:row('我戴上帽子了。','Wǒ dài shang màozi le.','I have put on a hat.')},
 '赶上':{before:row('我要赶公共汽车。','Wǒ yào gǎn gōnggòng qìchē.','I need to catch the bus.'),during:row('我正在追公共汽车。','Wǒ zhèngzài zhuī gōnggòng qìchē.','I am running after the bus.'),after:row('我赶上公共汽车了。','Wǒ gǎn shang gōnggòng qìchē le.','I have caught the bus.')},
 '爱上':{before:row('我来到这个城市。','Wǒ lái dào zhège chéngshì.','I arrive in this city.'),during:row('我越来越喜欢这个城市。','Wǒ yuè lái yuè xǐhuan zhège chéngshì.','I like this city more and more.'),after:row('我爱上这个城市了。','Wǒ ài shang zhège chéngshì le.','I have fallen in love with this city.')},
 '写上':{before:row('我要写名字。','Wǒ yào xiě míngzi.','I am going to write my name.'),during:row('我正在写名字。','Wǒ zhèngzài xiě míngzi.','I am writing my name.'),after:row('我写上名字了。','Wǒ xiě shang míngzi le.','I have written my name on it.')},
 '上传':{before:row('我要上传照片。','Wǒ yào shàngchuán zhàopiàn.','I am going to upload a photo.'),during:row('我正在上传照片。','Wǒ zhèngzài shàngchuán zhàopiàn.','I am uploading a photo.'),after:row('照片已经上传了。','Zhàopiàn yǐjīng shàngchuán le.','The photo has been uploaded.')},
 '上菜':{before:row('服务员要上菜了。','Fúwùyuán yào shàng cài le.','The waiter is about to serve the dishes.'),during:row('服务员正在上菜。','Fúwùyuán zhèngzài shàng cài.','The waiter is serving the dishes.'),after:row('服务员把菜端上桌了。','Fúwùyuán bǎ cài duān shang zhuō le.','The waiter has put the dishes on the table.')},
 '上山':{before:row('我要上山。','Wǒ yào shàng shān.','I am going to climb the mountain.'),during:row('我正在上山。','Wǒ zhèngzài shàng shān.','I am going up the mountain.'),after:row('我到山顶了。','Wǒ dào shāndǐng le.','I have reached the summit.')},
 '下山':{before:row('我要下山。','Wǒ yào xià shān.','I am going to go down the mountain.'),during:row('我正在下山。','Wǒ zhèngzài xià shān.','I am going down the mountain.'),after:row('我到山脚了。','Wǒ dào shānjiǎo le.','I have reached the foot of the mountain.')},
 '上车':{before:row('我要上车。','Wǒ yào shàng chē.','I am going to get into the car.'),during:row('我正在上车。','Wǒ zhèngzài shàng chē.','I am getting into the car.'),after:row('我上车了。','Wǒ shàng chē le.','I have got into the car.')},
 '上楼':{before:row('我要上楼。','Wǒ yào shàng lóu.','I am going to go upstairs.'),during:row('我正在上楼。','Wǒ zhèngzài shàng lóu.','I am going upstairs.'),after:row('我上楼了。','Wǒ shàng lóu le.','I have gone upstairs.')},
 '上床':{before:row('我要上床睡觉。','Wǒ yào shàng chuáng shuìjiào.','I am going to get into bed to sleep.'),during:row('我正在上床。','Wǒ zhèngzài shàng chuáng.','I am getting into bed.'),after:row('我上床了。','Wǒ shàng chuáng le.','I have got into bed.')},
 '上飞机':{before:row('我要上飞机。','Wǒ yào shàng fēijī.','I am going to board the plane.'),during:row('我正在上飞机。','Wǒ zhèngzài shàng fēijī.','I am boarding the plane.'),after:row('我上飞机了。','Wǒ shàng fēijī le.','I have boarded the plane.')},
};
export const referenceActivityLanguage:Record<string,ReferenceCaption>={
 '上课':row('我在上课。','Wǒ zài shàngkè.','I am attending class.'),
 '上学':row('我去上学。','Wǒ qù shàngxué.','I am going to school.'),
 '上班':row('我在上班。','Wǒ zài shàngbān.','I am at work.'),
 '上大学':row('我上大学。','Wǒ shàng dàxué.','I attend university.'),
 '上网':row('我在上网。','Wǒ zài shàngwǎng.','I am using the internet.'),
 '上厕所':row('我要上厕所。','Wǒ yào shàng cèsuǒ.','I need to go to the toilet.'),
 '上菜':row('服务员正在上菜。','Fúwùyuán zhèngzài shàng cài.','The waiter is serving the dishes.'),
};
export function referenceActionCaption(word:string,progress:number){const stages=referenceActionLanguage[word];return stages?.[progress===1?'after':progress>0?'during':'before'];}

/** A user choosing reduced motion sees the completed scene, so its audio must name that result. */
export function referenceSelectionCaption(word:string,reduced:boolean){return referenceActionLanguage[word]?.[reduced?'after':'during']??referenceActivityLanguage[word];}
