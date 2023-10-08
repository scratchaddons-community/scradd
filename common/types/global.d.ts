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
			/** The port to run the web server on in production. Not used in development. */
			PORT?: `${number}`;
			/** The API key to force a database write in production. Not used in development. */
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
