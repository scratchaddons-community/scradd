export type ImmutableArray<T> = Omit<Array<T>, "pop" | "push" | "shift" | "unshift" | "splice">;
