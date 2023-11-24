import type { Snowflake } from "discord.js";
import type { MenuCommandContext } from "strife.js";

declare global {
	interface Array<T> {
		filter(predicate: BooleanConstructor, thisArg?: unknown): NonFalsy<T>[];
		map<U>(
			callbackfn: (value: T, index: number, array: T[]) => U,
			thisArg?: unknown,
		): { [K in keyof this]: U };
	}
	interface ReadonlyArray<T> {
		filter(predicate: BooleanConstructor, thisArg?: unknown): NonFalsy<T>[];
		includes(
			searchElement: T | (WidenLiteral<T> & NonNullable<unknown>),
			fromIndex?: number,
		): searchElement is T;
		lastIndexOf(
			searchElement: T | (WidenLiteral<T> & NonNullable<unknown>),
			fromIndex?: number,
		): number;
		indexOf(
			searchElement: T | (WidenLiteral<T> & NonNullable<unknown>),
			fromIndex?: number,
		): number;
		map<U>(
			callbackfn: (value: T, index: number, array: readonly T[]) => U,
			thisArg?: unknown,
		): { readonly [K in keyof this]: U };
	}
	interface ReadonlySet<T> {
		has(value: T | (WidenLiteral<T> & NonNullable<unknown>)): boolean;
	}

	interface ObjectConstructor {
		entries<T, U extends PropertyKey>(
			o: Record<U, T> | ArrayLike<T>,
		): [U extends number ? `${U}` : U, T][];
		fromEntries<T, U extends PropertyKey>(entries: Iterable<readonly [U, T]>): Record<U, T>;
		keys<U extends PropertyKey>(entries: Record<U, unknown>): (U extends number ? `${U}` : U)[];
	}

	interface Body {
		json<T = unknown>(): Promise<T>;
	}
	interface JSON {
		stringify<T>(
			value: T,
			replacer?: (string | number)[] | null | undefined,
			space?: string | number | undefined,
		): T extends UndefinedDomain ? undefined : UndefinedDomain extends T ? undefined : string;
		stringify<T>(
			value: T,
			replacer: (this: unknown, key: string, value: ToJSON<T>) => unknown,
			space?: string | number | undefined,
		): string;
		stringify<T>(
			value: T,
			replacer?: undefined | ((this: unknown, key: string, value: ToJSON<T>) => unknown),
			space?: string | number | undefined,
		): string | undefined;

		parse(text: string): unknown;
		parse<T = unknown>(
			text: string,
			reviver: <M extends string>(this: Record<M, unknown>, key: M, value: unknown) => T,
		): T;
	}

	interface BooleanConstructor {
		// eslint-disable-next-line @typescript-eslint/ban-types
		new (value?: unknown): Boolean;
		<T>(value?: T): value is NonFalsy<T>;
		// eslint-disable-next-line @typescript-eslint/ban-types
		readonly prototype: Boolean;
	}
	interface String {
		split<Separator extends string, Limit extends number>(
			separator: Separator,
			limit?: Limit,
		): Limit extends 0 ? [] : Separator extends "" ? string[] : [string, ...string[]];
		startsWith<P extends string>(searchString: P, position?: 0): this is `${P}${string}`;
		endsWith<P extends string>(
			searchString: P,
			endPosition?: undefined,
		): this is `${string}${P}`;
		toLowerCase<T extends string>(this: T): Lowercase<T>;
		toLocaleLowerCase<T extends string>(this: T): Lowercase<T>;
		toUpperCase<T extends string>(this: T): Uppercase<T>;
		toLocaleUpperCase<T extends string>(this: T): Uppercase<T>;
	}

	namespace NodeJS {
		interface ProcessEnv {
			/** The main guild ID for the bot to operate in. Requires Administrator permission in this server. */
			GUILD_ID: Snowflake;
			/** The bot's token. */
			BOT_TOKEN: string;
			/** The URI to use when connecting to MongoDB. */
			MONGO_URI: string;
			/**
			 * The mode for the bot to run in. Defaults to `"development"`.
			 *
			 * For consistency, always compare against `"production"` in code.
			 */
			NODE_ENV?: "development" | "production";
			/**
			 * Whether or not to enable features requiring `@napi-api/canvas`, which does not work on some devices. Defaults to `true`.
			 *
			 * For consistency, always compare against `"true"` in code.
			 */
			CANVAS?: `${boolean}`;
			/** The port to run the web server on. Omit to not run the server. */
			PORT?: `${number}`;
			/** The bot's client secret, used in OAuth2 flows. Omit to disable all features using OAuth2. */
			CLIENT_SECRET?: string;
			/** The API key to force a database write on `/cleanDatabaseListeners`. */
			CDBL_AUTH?: string;
		}
	}
}

declare module "strife.js" {
	export interface AugmentedChatCommandData<_InGuild extends boolean> {
		/**
		 * Pass `false` to ignore bad words in this command’s options. Pass `"channel"` to only ignore bad words if the channel allows bad
		 * words.
		 *
		 * @default true
		 */
		censored?: "channel" | false;
	}
	export interface AugmentedMenuCommandData<
		_InGuild extends boolean,
		_Context extends MenuCommandContext,
	> {
		censored?: never;
	}
	export interface DefaultCommandAccess {
		inGuild: true;
	}
}

// eslint-disable-next-line @typescript-eslint/no-invalid-void-type
type NonFalsy<T> = T extends false | 0 | "" | null | undefined | void | 0n ? never : T;
type WidenLiteral<T> = T extends string
	? string
	: T extends number
	? number
	: T extends boolean
	? boolean
	: T extends bigint
	? bigint
	: T extends symbol
	? symbol
	: T;

type UndefinedDomain =
	| symbol
	| ((...args: unknown[]) => unknown)
	| (new (...args: unknown[]) => unknown)
	| undefined;
type ToJSON<A> = A extends { toJSON(...args: unknown[]): infer T } ? T : A;
