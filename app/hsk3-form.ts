export type HskExamForm = 'a' | 'b';

export function hskExamForm(value: string | null): HskExamForm {
  return value === 'b' ? 'b' : 'a';
}

export function hskFormStorageKey(base: string, form: HskExamForm) {
  return form === 'a' ? base : base + ':b';
}
