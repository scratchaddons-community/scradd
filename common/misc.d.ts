export type FilterNonFalsy<T> =
	T extends readonly [infer F, ...infer R] ?
		F extends TSReset.Falsy ?
			FilterNonFalsy<R>
		:	[F, ...FilterNonFalsy<R>]
	:	[];

export type CamelToKebab<S extends string> =
	S extends `${infer T}${infer U}` ?
		U extends Uncapitalize<U> ?
			`${Lowercase<T>}${CamelToKebab<U>}`
		:	`${Lowercase<T>}-${CamelToKebab<U>}`
	:	"";
