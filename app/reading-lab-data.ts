import source from '../data/reading-lab.json';
import podcast53 from '../data/reading-lab-podcast-53.json';
import {narratorDemo} from './reading-lab-narrator-demo';
import type {ReadingLabReading} from './reading-lab-types';

export const readingLabReadings: readonly ReadingLabReading[] = [
  ...source.readings as readonly ReadingLabReading[],
  narratorDemo,
  podcast53 as ReadingLabReading,
];
