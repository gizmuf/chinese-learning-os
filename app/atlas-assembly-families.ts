type Family = {
  part: string;
  label: string;
  forms: string[];
  sample?: string;
  examples?: string;
  note?: string;
};

function family(glyphs: string, label: string, options: Pick<Family, 'sample' | 'examples' | 'note'> = {}): Family {
  const forms = Array.from(glyphs);
  return {part: forms[0], label, forms, ...options};
}

// The starting list is a set of study entry points. It does not classify each occurrence by meaning.
export const commonFamilies = [
  family('女', 'Woman', {sample: '妈', examples: '妈姐妹姑妇妃如'}),
  family('口', 'Mouth', {sample: '问', examples: '问唱喝吃回'}),
  family('扌手', 'Hand', {sample: '挤', examples: '推拉抱打撞挤拖挖抓拍拿掌掰拜'}),
  family('木', 'Wood', {sample: '森', examples: '林森树休想本'}),
  family('氵水氺', 'Water', {sample: '清', examples: '河海湖洗泳清济'}),
  family('讠言', 'Speech', {sample: '让', examples: '说讲请谢认让记试话语'}),
  family('亻人', 'Person'),
  family('心忄⺗', 'Heart', {sample: '想', examples: '想念忘忙怕情'}),
  family('日', 'Sun'),
  family('月', 'Moon form', {note: '月 can also represent a body component. Check the whole character before using “moon” as a clue.'}),
  family('目', 'Eye'),
  family('足⻊', 'Foot'),
  family('金钅', 'Metal'),
  family('丝纟糸', 'Silk forms'),
  family('火灬', 'Fire forms', {note: '灬 can be a fire form. The same shape can have a different origin in other characters.'}),
  family('土', 'Earth'),
  family('石', 'Stone'),
  family('山', 'Mountain'),
  family('虫', 'Insect'),
  family('鸟', 'Bird'),
  family('马', 'Horse'),
  family('牛牜', 'Ox'),
  family('犬犭', 'Dog'),
  family('宀', 'Roof'),
  family('广', 'Shelter'),
  family('厂', 'Cliff'),
  family('门', 'Gate'),
  family('阝', 'Ear-shaped form', {note: 'Left 阝 comes from 阜 (mound). Right 阝 comes from 邑 (settlement).'}),
  family('刂刀', 'Blade'),
  family('力', 'Strength'),
  family('又', '又 form'),
  family('大', 'Big'),
  family('小', 'Small'),
  family('白', 'White'),
  family('田', 'Field'),
  family('禾', 'Grain'),
  family('米', 'Rice'),
  family('衣衤', 'Clothing'),
  family('示礻', 'Altar forms'),
  family('竹⺮', 'Bamboo'),
];

const moreFamilies = [
  family('艹', 'Grass'),
  family('辶', 'Movement'),
  family('⺼', 'Body form'),
  family('贝', 'Shell'),
  family('疒', 'Sickness'),
  family('车', 'Vehicle'),
  family('页', 'Head form'),
  family('攵', 'Strike form'),
  family('王⺩玉', 'King and jade forms', {note: 'These forms can look alike. The written shape by itself does not distinguish king from jade.'}),
  family('巾', 'Cloth'),
  family('彳', 'Step form'),
  family('尸', '尸 form'),
  family('穴', 'Cave'),
  family('饣食', 'Food'),
  family('酉', 'Wine vessel'),
  family('冫', 'Ice'),
  family('冖', 'Cover'),
  family('囗', 'Enclosure', {note: 'A frame around another part, as in 国. The smaller 口 is a separate shape.'}),
  family('雨', 'Rain'),
  family('羊', 'Sheep'),
  family('皿', 'Dish'),
  family('耳', 'Ear'),
  family('弓', 'Bow'),
  family('羽', 'Feathers'),
  family('鱼', 'Fish'),
  family('见', 'See'),
];

const soundFamilies = [
  family('青', 'qīng', {sample: '清', examples: '清请情晴睛精'}),
  family('包', 'bāo', {sample: '抱', examples: '抱饱跑泡炮'}),
  family('方', 'fāng', {sample: '放', examples: '放房防访仿'}),
  family('令', 'lìng', {sample: '领', examples: '领铃零冷龄'}),
  family('也', 'yě', {sample: '他', examples: '他她地池'}),
  family('可', 'kě', {sample: '河', examples: '河何呵荷'}),
  family('良', 'liáng', {sample: '粮', examples: '粮狼浪娘'}),
  family('主', 'zhǔ', {sample: '住', examples: '住注柱驻往'}),
  family('巴', 'bā', {sample: '把', examples: '把爸吧爬芭'}),
  family('齐', 'qí', {sample: '挤', examples: '挤济剂'}),
  family('莫', 'mò', {sample: '模', examples: '模摸膜幕墓'}),
  family('甬', 'yǒng', {sample: '通', examples: '通痛桶涌勇'}),
  family('工', 'gōng', {sample: '功', examples: '功攻江红'}),
  family('各', 'gè', {sample: '格', examples: '格路略落客'}),
];

export const assemblyFamilySections = [
  {title: 'Common forms', families: commonFamilies},
  {title: 'More forms', families: moreFamilies},
  {title: 'Sound clues', families: soundFamilies},
];
export const assemblyPresets = assemblyFamilySections.flatMap(section => section.families);
export const assemblySeeds = ['扌', '氵', '女', '木', '口', '心'].map(part =>
  commonFamilies.find(item => item.part === part)!);
export const findAssemblySeed = (glyph: string) => assemblyPresets.find(item => item.forms.includes(glyph));

export const defaultAssemblyHanzi = '挤';
