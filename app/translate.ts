import translations from "../data/translations.json";
import type { Item } from "./content";
export type Locale = "en" | "fr" | "ru";
const ui: Record<string, {fr: string; ru: string}> = translations.ui;
const vocabulary: Record<string, {fr: Pick<Item, "english" | "translation">; ru: Pick<Item, "english" | "translation">}> = translations.vocabulary;
const canonical = new Map<string,string>();
for (const [key, value] of Object.entries(ui)) { canonical.set(value.fr,key); canonical.set(value.ru,key); }
export function translate(text: string, locale: Locale, values: (string | number | null | undefined)[] = []): string {
  const key = canonical.get(text) ?? text;
  const translated = locale === "en" ? key : ui[key]?.[locale] ?? key;
  return translated.replace(/\{(\d+)\}/g, (match, index) => String(values[Number(index)] ?? match));
}
export function localizeItem(item: Item, locale: Locale): Item {
  return locale === "en" ? item : {...item, ...vocabulary[item.id]?.[locale]};
}
export const localeNames: Record<Locale,string> = {en:"English",fr:"Français",ru:"Русский"};
