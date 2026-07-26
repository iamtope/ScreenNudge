import type { Dictionary } from './en';

export type { Dictionary };

/**
 * A partial translation. Provide only the keys you translate; anything omitted
 * falls back to English. Arrays are replaced wholesale (translate the whole list).
 */
export type DeepPartial<T> = T extends readonly (infer _U)[]
  ? T
  : T extends object
    ? { [K in keyof T]?: DeepPartial<T[K]> }
    : T;
