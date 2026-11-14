import source from '../data/reading-lab.json';
import type {ReadingLabReading} from './reading-lab-types';

export const readingLabReadings = source.readings as readonly ReadingLabReading[];
