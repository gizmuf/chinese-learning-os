import { courseCards, type CourseEvent } from './course-learning';
import { grammarQuestions } from './grammar-hsk3-data';

export function grammarReviewQueue(events: CourseEvent[], now = Date.now()) {
  const cards = courseCards(events.filter(e => e.lessonId === 'grammar-hsk3'));
  const due = grammarQuestions.filter(({ex}) => cards[ex.id] && new Date(cards[ex.id].due).getTime() <= now)
    .sort((a, b) => new Date(cards[a.ex.id].due).getTime() - new Date(cards[b.ex.id].due).getTime());
  const unseen = grammarQuestions.filter(({ex}) => !cards[ex.id]);
  return { due, unseen };
}

// Keep one UUID for a submission, including retries after a storage error.
export function grammarReviewEvent(activityId: string, picked: number, assisted: boolean): CourseEvent {
  const question = grammarQuestions.find(({ex}) => ex.id === activityId);
  if (!question || !Number.isInteger(picked) || picked < 0 || picked >= question.ex.options.length)
    throw Error('Invalid grammar answer');
  return {id: crypto.randomUUID(), lessonId: 'grammar-hsk3', activityId, kind: 'answer',
    correct: picked === question.ex.answer, assisted, at: Date.now()};
}
