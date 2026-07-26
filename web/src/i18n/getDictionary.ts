import type { Locale } from './config';
import { en, type Dictionary } from './messages/en';
import type { DeepPartial } from './messages/_types';
import { nl } from './messages/nl';
import { fr } from './messages/fr';
import { de } from './messages/de';
import { zh } from './messages/zh';
import { it } from './messages/it';
import { tr } from './messages/tr';

const overrides: Record<Locale, DeepPartial<Dictionary>> = { en: {}, nl, fr, de, zh, it, tr };

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

/** Merge a partial translation over the English base. Arrays replace wholesale. */
function deepMerge<T>(base: T, override: unknown): T {
  if (!isPlainObject(base) || !isPlainObject(override)) {
    return (override === undefined ? base : (override as T));
  }
  const result: Record<string, unknown> = { ...base };
  for (const key of Object.keys(override)) {
    result[key] = deepMerge((base as Record<string, unknown>)[key], override[key]);
  }
  return result as T;
}

/** Full, English-backed dictionary for a locale. */
export function getDictionary(locale: Locale): Dictionary {
  return deepMerge(en, overrides[locale] ?? {});
}

/** Replace {token} placeholders, e.g. fmt(t.rights, { year: 2026 }). */
export function fmt(template: string, vars: Record<string, string | number>): string {
  return template.replace(/\{(\w+)\}/g, (_, key) =>
    key in vars ? String(vars[key]) : `{${key}}`,
  );
}
