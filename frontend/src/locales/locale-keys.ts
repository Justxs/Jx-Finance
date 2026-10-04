import type en from "./en/common.json";
import type lt from "./lt/common.json";

type Keys<T, Prefix extends string = ""> = {
  [K in keyof T & string]: T[K] extends string ? `${Prefix}${K}` : Keys<T[K], `${Prefix}${K}.`>;
}[keyof T & string];

type LithuanianPlural<K> = K extends `${infer Base}_${"one" | "other"}`
  ? `${Base}_${"one" | "few" | "many" | "other"}`
  : K;

type Expected = LithuanianPlural<Keys<typeof en>>;
type Actual = Keys<typeof lt>;

type None<T extends never> = T;

export type MissingInLithuanian = None<Exclude<Expected, Actual>>;
export type MissingInEnglish = None<Exclude<Actual, Expected>>;
