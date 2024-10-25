export type Falsy = "" | 0 | 0n | false | null | undefined;

export type FilterNonFalsy<T> =
	T extends readonly [infer F, ...infer R] ?
		F extends Falsy ?
			FilterNonFalsy<R>
		:	[F, ...FilterNonFalsy<R>]
	:	[];

export type CamelToKebab<S extends string> =
	S extends `${infer T}${infer U}` ?
		U extends Uncapitalize<U> ?
			`${Lowercase<T>}${CamelToKebab<U>}`
		:	`${Lowercase<T>}-${CamelToKebab<U>}`
	:	"";
