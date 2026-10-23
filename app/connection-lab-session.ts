import { z } from 'zod';
import { atlasByHanzi, atlasById } from './atlas-model';
import { assemblies } from './atlas-workshop-data';
import { routes, skills, taskOrder, type LabRoute, type LabTask, type LabRecord } from './connection-lab-model';
const point = z.object({ x: z.number().finite().min(0).max(1), y: z.number().finite().min(0).max(1), p: z.number().finite().min(0).max(1), t: z.number().finite().nonnegative() }).strict();
const answerSchema = z.object({
    pick: z.string().max(100), placed: z.array(z.number().int().nonnegative()).max(20),
    ink: z.array(z.array(point).min(1).max(4096)).max(256),
    revealed: z.boolean(), hinted: z.boolean(), listened: z.boolean(), rating: z.number().int().min(0).max(4).nullable(),
    saved: z.boolean(), mistake: z.boolean(), started: z.number().int().nonnegative(),
    assisted: z.boolean().optional(), at: z.number().int().nonnegative().optional(), durationMs: z.number().int().min(0).max(3600000).optional(),
}).strict();
export type Answer = z.infer<typeof answerSchema>;
const sessionSchema = z.object({ version: z.literal(1), id: z.string().uuid(), route: z.enum(routes),
    tasks: z.array(z.object({ id: z.string().uuid(), targetId: z.string().refine(id => atlasById.has(id)), skill: z.enum(['watch', ...skills]) }).strict()).min(1).max(5),
    index: z.number().int().nonnegative(), answers: z.record(answerSchema), exposed: z.boolean(), done: z.boolean(),
    feedbackId: z.string().uuid(), feedback: z.number().int().min(1).max(3).nullable(), review: z.boolean(),
}).strict().superRefine((s, ctx) => {
    const invalid = () => ctx.addIssue({ code: 'custom', message: 'Invalid session state' });
    const ids = s.tasks.map(t => t.id);
    if (new Set(ids).size !== ids.length || s.index >= ids.length || Object.keys(s.answers).length !== ids.length || ids.some(id => !s.answers[id])) return invalid();
    if (s.tasks.some(t => t.targetId !== s.tasks[0].targetId)) return invalid();
    if (s.review ? s.tasks.length !== 1 || !['meaning', 'sound', 'writing'].includes(s.tasks[0].skill) : s.tasks.map(t => t.skill).join() !== taskOrder(s.route).join()) return invalid();
    if (s.done && s.index !== ids.length - 1 || s.feedback !== null && !s.done) return invalid();
    for (const t of s.tasks) {
        const a = s.answers[t.id], guided = t.skill === 'watch' || t.skill === 'component';
        const assembly = assemblies.find(e => e.hanzi === atlasById.get(t.targetId)!.hanzi);
        if (new Set(a.placed).size !== a.placed.length || a.placed.some(i => !assembly || i >= assembly.parts.length)) return invalid();
        if (a.rating !== null && (!a.revealed || a.at === undefined || a.durationMs === undefined || a.assisted === undefined || (guided ? a.rating !== 0 || !a.assisted : a.rating < 1))) return invalid();
        if (a.saved && a.rating === null) return invalid();
    }
});
export type Session = z.infer<typeof sessionSchema>;
export const labCandidates = [...new Map(assemblies.filter(a => atlasByHanzi.has(a.hanzi)).map(a => [a.hanzi, a])).values()];
export const blank = (): Answer => ({ pick: '', placed: [], ink: [], revealed: false, hinted: false, listened: false, rating: null, saved: false, mistake: false, started: Date.now() });
export function createSession(route: LabRoute, targetId: string): Session {
    const tasks = taskOrder(route).map(skill => ({ id: crypto.randomUUID(), targetId, skill }));
    return { version: 1, id: crypto.randomUUID(), route, tasks, index: 0, answers: Object.fromEntries(tasks.map(t => [t.id, blank()])), exposed: false, done: false, feedbackId: crypto.randomUUID(), feedback: null, review: false };
}
export function restore(raw: string | null): Session | null {
    if (!raw || raw.length > 4000000) return null;
    try { const result = sessionSchema.safeParse(JSON.parse(raw)); return result.success ? result.data : null; } catch { return null; }
}
export function patchAnswer(s: Session | null, sessionId: string, taskId: string, patch: Partial<Answer>, activeOnly = false): Session | null {
    if (!s || s.id !== sessionId || !s.answers[taskId] || activeOnly && s.tasks[s.index].id !== taskId) return s;
    return { ...s, answers: { ...s.answers, [taskId]: { ...s.answers[taskId], ...patch } } };
}
export function savedTask(records: LabRecord[], session: Session, task: LabTask) {
    return records.some(r => r.kind === 'attempt' && r.id === task.id && r.sessionId === session.id && r.targetId === task.targetId && r.skill === task.skill && r.route === session.route);
}
