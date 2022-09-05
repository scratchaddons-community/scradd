import { Message, AttachmentBuilder } from "discord.js";
import papaparse from "papaparse";
import fetch from "node-fetch";
import exitHook from "async-exit-hook";
import { getLoggingThread } from "./moderation/logging.js";
import client from "../client.js";

export const DATABASE_THREAD = "databases";

const thread = await getLoggingThread(DATABASE_THREAD);

/** @type {{ [key: string]: Message<true> }} */
const databases = {};

for (const message of (await thread.messages.fetch({ limit: 100 })).toJSON()) {
	const name = message.content.split(" ")[1]?.toLowerCase();
	if (name && message.author.id === client.user?.id) {
		databases[name] = message;
	}
}

/**
 * @type {{
 * 	[key: import("discord.js").Snowflake]:
 * 		| { callback: () => Promise<import("discord.js").Message<true> | void>; timeout: NodeJS.Timeout }
 * 		| undefined;
 * }}
 */
const timeouts = {};
/** @type {(keyof import("./types/databases").default)[]} */
const contructed = [];

/** @template {keyof import("./types/databases").default} Name */
export default class Database {
	/** @param {Name} name */
	constructor(name) {
		if (contructed.includes(name))
			throw new RangeError(
				`Cannot create a 2nd database for ${name}, they will have conflicting data`,
			);
		contructed.push(name);
		/** @type {Name} */
		this.name = name;
	}

	/** @type {import("./types/databases").default[Name][] | undefined} */
	#data = undefined;
	async init() {
		/** @type {Message<true> | undefined} */
		this.message = databases[this.name] ||= await thread.send(
			`**__SCRADD ${this.name.toUpperCase()} DATABASES__**\n\n*Please don’t delete this message. If you do, all ${this.name.replaceAll(
				"_",
				" ",
			)} will be reset.*`,
		);

		const attachment = this.message?.attachments.first()?.url;

		this.#data = attachment
			? await fetch(attachment)
					.then((res) => res.text())
					.then(
						(csv) =>
							/** @type {import("./types/databases").default[Name][]} */ (
								papaparse.parse(csv.trim(), {
									dynamicTyping: true,
									header: true,
								}).data
							),
					)
			: [];
	}

	get data() {
		if (!this.#data) throw new ReferenceError("Must call `.init()` before reading `.data`");
		return this.#data;
	}

	set data(content) {
		if (!this.message) throw new ReferenceError("Must call `.init()` before setting `.data`");
		this.#data = content;
		const timeoutId = timeouts[this.message.id];
		const files = content.length
			? [
					new AttachmentBuilder(Buffer.from(papaparse.unparse(content), "utf-8"), {
						name: this.name + ".csv",
					}),
			  ]
			: [];
		const callback = () => {
			if (!this.message)
				throw new ReferenceError("Must call `.init()` before setting `.data`");
			const promise = this.message.edit({ files }).catch(this.init);
			timeouts[this.message.id] = undefined;
			return promise;
		};
		timeouts[this.message.id] = { timeout: setTimeout(callback, 15_000), callback };
		timeoutId && clearTimeout(timeoutId.timeout);
	}
}

export function cleanDatabaseListeners() {
	return Promise.all(Object.values(timeouts).map((info) => info?.callback()));
}

exitHook((callback) => cleanDatabaseListeners().then(callback));
