import source from '../data/reading-lab.json';
import {narratorDemo} from './reading-lab-narrator-demo';
import type {ReadingLabReading} from './reading-lab-types';

export const readingLabReadings = [...source.readings as readonly ReadingLabReading[], narratorDemo];
