import { z } from 'zod';
import { createEmptyCard, fsrs, generatorParameters, type Card, type Grade } from 'ts-fsrs';
import { atlasById } from './atlas-model';
import { seededQuestion } from './atlas-session';
import type { Locale } from './translate';
export const LAB_VERSION = 'connections-v1';
export const routes = ['connections', 'recall'] as const;
export type LabRoute = typeof routes[number];
export const skills = ['meaning', 'sound', 'component', 'writing'] as const;
export type LabSkill = typeof skills[number];
export type LabStep = LabSkill | 'watch';
export const labEventSchema = z.object({
    version: z.literal(1), experiment: z.literal(LAB_VERSION), kind: z.literal('attempt'),
    id: z.string().uuid(), sessionId: z.string().uuid(), route: z.enum(routes),
    targetId: z.string().refine(id => atlasById.has(id)), skill: z.enum(['watch', ...skills]),
    at: z.number().int().nonnegative(), durationMs: z.number().int().min(0).max(3600000),
    assisted: z.boolean(), rating: z.number().int().min(0).max(4),
}).strict().superRefine((e, ctx) => {
    if ((e.skill === 'watch' || e.skill === 'component') && (!e.assisted || e.rating !== 0))
        ctx.addIssue({ code: 'custom', message: 'Exploration and assembly are guided' });
    if (e.skill !== 'watch' && e.skill !== 'component' && e.rating === 0)
        ctx.addIssue({ code: 'custom', message: 'Checks require a result' });
});
export type LabEvent = z.infer<typeof labEventSchema>;
export const feedbackSchema = z.object({ version: z.literal(1), experiment: z.literal(LAB_VERSION), kind: z.literal('feedback'), id: z.string().uuid(), sessionId: z.string().uuid(), route: z.enum(routes), at: z.number().int().nonnegative(), score: z.number().int().min(1).max(3) }).strict();
export type LabFeedback = z.infer<typeof feedbackSchema>;
export type LabRecord = LabEvent | LabFeedback;
export type LabTask = {
    id: string;
    targetId: string;
    skill: LabStep;
};
export function taskOrder(route: LabRoute): LabStep[] { return route === 'connections' ? ['watch', 'component', 'meaning', 'sound', 'writing'] : ['meaning', 'sound', 'writing', 'component', 'watch']; }
export function isIndependent(e: LabEvent) { return !e.assisted && e.rating > 0 && e.skill !== 'watch' && e.skill !== 'component'; }
const scheduler = fsrs(generatorParameters({ request_retention: .9, enable_fuzz: false }));
export function labSchedules(records: LabRecord[]) {
    const cards: Record<string, Card> = {}, initial: Record<string, number> = {}, seen = new Set<string>();
    for (const e of [...records].sort((a, b) => a.at - b.at || a.id.localeCompare(b.id))) {
        if (seen.has(e.id))
            continue;
        seen.add(e.id);
        if (e.kind !== 'attempt' || e.skill === 'watch' || e.skill === 'component')
            continue;
        const key = [e.route, e.targetId, e.skill].join(':');
        if (isIndependent(e))
            cards[key] = scheduler.next(cards[key] ?? createEmptyCard(new Date(e.at)), new Date(e.at), e.rating as Grade).card;
        else
            initial[key] = Math.min(initial[key] ?? Infinity, e.at + 86400000);
    }
    return Object.keys({ ...initial, ...cards }).map(key => { const [route, targetId, skill] = key.split(':'); return { key, route: route as LabRoute, targetId, skill: skill as LabSkill, due: cards[key] ? new Date(cards[key].due).getTime() : initial[key], independent: !!cards[key] }; }).sort((a, b) => a.due - b.due);
}
// One skill per character in a review run: earlier answers cannot cue later tests.
export function dueLabTasks(records: LabRecord[], now = Date.now()) {
    const seen = new Set<string>();
    return labSchedules(records).filter(s => { if (s.due > now || seen.has(s.targetId) || recentlyExposed(records, s.targetId, now))
        return false; seen.add(s.targetId); return true; }).slice(0, 6);
}
export function labStats(records: LabRecord[], route: LabRoute, skill: LabSkill) {
    const attempts = records.filter((e): e is LabEvent => e.kind === 'attempt' && e.route === route && e.skill === skill);
    const unique = [...new Map(attempts.map(e => [e.id, e])).values()];
    const independent = unique.filter(isIndependent);
    return { guided: unique.length - independent.length, independent: independent.length, remembered: independent.filter(e => e.rating >= 3).length };
}
export function recentlyExposed(records: LabRecord[], targetId: string, now = Date.now()) { return records.some(e => e.kind === 'attempt' && e.targetId === targetId && e.at > now - 30 * 60 * 1000); }

// Meaning-only options also for listening: neither written Chinese nor pinyin can cue the answer.
export function labQuestion(targetId: string, skill: 'meaning' | 'sound', locale: Locale, seed: number) {
    return { ...seededQuestion(targetId, 'meaning', locale, seed), skill };
}

// A scheduled card is available only after its latest exposure cooldown ends.
export function nextLabReview(records: LabRecord[], now = Date.now()): number | null {
    const times = labSchedules(records).map(s => {
        const exposed = records.reduce((at, r) => r.kind === 'attempt' && r.targetId === s.targetId ? Math.max(at, r.at) : at, 0);
        return Math.max(s.due, exposed + 1800000);
    });
    return times.length ? Math.max(now, Math.min(...times)) : null;
}
