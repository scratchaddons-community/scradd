import type { Snowflake } from "discord.js";
import type { MenuCommandContext } from "strife.js";

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
	interface ObjectConstructor {
		/**
		 * Returns an array of key/values of the enumerable properties of an object.
		 *
		 * @param o Object that contains the properties and methods. This can be an object that you created or an existing Document Object
		 *   Model (DOM) object.
		 */
		entries<T, U extends PropertyKey>(
			o: Record<U, T> | ArrayLike<T>,
		): [U extends number ? `${U}` : U, T][];
		/**
		 * Returns an object created by key-value entries for properties and methods.
		 *
		 * @param entries An iterable object that contains key-value entries for properties and methods.
		 */
		fromEntries<T, U extends PropertyKey>(entries: Iterable<readonly [U, T]>): Record<U, T>;
		/**
		 * Returns the names of the enumerable string properties and methods of an object.
		 *
		 * @param o Object that contains the properties and methods. This can be an object that you created or an existing Document Object
		 *   Model (DOM) object.
		 */
		keys<U extends PropertyKey>(entries: Record<U, unknown>): (U extends number ? `${U}` : U)[];
	}
	interface Body {
		json<T = unknown>(): Promise<T>;
	}
	namespace NodeJS {
		interface ProcessEnv {
			GUILD_ID: Snowflake;
			BOT_TOKEN: string;
			// BOT_SECRET: string;
			/** Defaults to `"development"` */
			NODE_ENV?: "development" | "production";
			PORT?: `${number}`;
			CDBL_AUTH?: string;
			/** Defaults to `true` */
			CANVAS?: `${boolean}`;
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
