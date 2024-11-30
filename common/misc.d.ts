export type CamelToKebab<S extends string, Seperator extends string = "-"> =
	S extends `${infer T}${infer U}` ?
		U extends Uncapitalize<U> ?
			`${Lowercase<T>}${CamelToKebab<U, Seperator>}`
		:	`${Lowercase<T>}${Seperator}${CamelToKebab<U, Seperator>}`
	:	"";
