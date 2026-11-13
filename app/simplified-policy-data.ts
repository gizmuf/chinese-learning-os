import {unpack} from './packed-data';
import packed from '../data/simplified-dictionary-policy-packed';
export default unpack<typeof import('../data/simplified-dictionary-policy.json')>(packed);
