import batchA from '../data/grammar-hsk3-a.json';
import batchB from '../data/grammar-hsk3-b.json';

// Retain the authored exercise IDs; guided drafts are never migrated to events.
export const grammarQuestions = [...batchA, ...batchB].flatMap(unit =>
  unit.cards.flatMap(card => card.exercises.map(ex => ({unit, card, ex}))),
);
export const grammarActivityIds = grammarQuestions.map(({ex}) => ex.id);
