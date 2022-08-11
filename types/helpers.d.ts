export type ArrayOfAtLeastOne<T> = [T, ...T[]];
export type NonNullablify<T = { [key: string]: any }> = NonNullable<{
	[K in keyof T]-?: NonNullable<T[K]>;
}>;
