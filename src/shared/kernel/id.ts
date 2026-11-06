import { v7 } from "uuid";

export type Id<Brand extends string> = string & { readonly __brand: Brand };

export const newId = (): string => v7();
