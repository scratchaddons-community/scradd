export type ImmutableArray<T> = Omit<Array<T>, "pop" | "push" | "shift" | "unshift" | "splice">;
declare global {
	interface ReadonlyArray<T> {
		/**
		 * Determines whether an array includes a certain element, returning true or false as appropriate.
		 *
		 * @author jcalz [`ReadonlyArray`](https://stackoverflow.com/a/56745484/11866686)
		 *
		 * @param searchElement The element to search for.
		 * @param fromIndex The position in this array at which to begin searching for searchElement.
		 */
		includes<U>(
			searchElement: T | (T & U extends never ? never : U),
			fromIndex?: 0,
		): searchElement is T;
	}
}
