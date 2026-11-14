import type {Mode} from './content';

export const writingOriginViews = ['shuoshuo-lesson', 'private-lessons', 'shuoshuo', 'myday', 'studio', 'grammar', 'atlas', 'course', 'today', 'lessons', 'reviews', 'progress'] as const;
export type WritingOrigin = {view: typeof writingOriginViews[number]; url: string; scroll: number; search?: string; lesson?: string; level?: string};

export function safeWritingOrigin(view: string | null, url: string | null, scroll: string | null): WritingOrigin | undefined {
  if (!writingOriginViews.includes(view as WritingOrigin['view']) || !url?.startsWith('/') || url.startsWith('//') || url.includes('\\') || /[\r\n]/.test(url) || url.length > 2000) return;
  return {view: view as WritingOrigin['view'], url, scroll: Math.max(0, Math.min(100000, Number(scroll) || 0))};
}

export function appendWritingOrigin(params: URLSearchParams, origin?: WritingOrigin) {
  if (!origin) return;
  params.set('returnView', origin.view);
  params.set('returnTo', origin.url);
  params.set('returnScroll', String(origin.scroll));
  if (origin.search) params.set('returnSearch', origin.search.slice(0, 180));
  if (origin.lesson) params.set('returnLesson', origin.lesson);
  if (origin.level) params.set('returnLevel', origin.level);
}

export function readWritingOrigin(params: URLSearchParams) {
  const origin = safeWritingOrigin(params.get('returnView'), params.get('returnTo'), params.get('returnScroll'));
  if (!origin) return;
  return {...origin, search: (params.get('returnSearch') ?? '').slice(0, 180), lesson: params.get('returnLesson') ?? 'all', level: params.get('returnLevel') ?? undefined};
}

export function writingPracticeHref(itemId: string, mode: Mode, layout: 'studio' | 'notebook', origin?: WritingOrigin) {
  const params = new URLSearchParams({study: 'writing', word: itemId, mode, layout});
  appendWritingOrigin(params, origin);
  return '/?' + params;
}

export function writingPracticeRoute(search: string, items: readonly {id: string}[]) {
  const params = new URLSearchParams(search);
  const itemId = params.get('word');
  if (params.get('study') !== 'writing' || !itemId || !items.some(item => item.id === itemId)) return null;
  const mode = params.get('mode');
  return {itemId, mode: (['watch', 'trace', 'copy', 'recall'] as const).includes(mode as Mode) ? mode as Mode : 'trace' as const,
    layout: params.get('layout') === 'notebook' ? 'notebook' as const : 'studio' as const, origin: readWritingOrigin(params)};
}
