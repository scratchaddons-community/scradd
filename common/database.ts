import exitHook from "async-exit-hook";
import { type Message, RESTJSONErrorCodes, type Snowflake } from "discord.js";
import papaparse from "papaparse";

import client from "../client.js";
import { extractMessageExtremities } from "../util/discord.js";
import logError from "../util/logError.js";
import { getLoggingThread } from "./logging.js";
import type { ImmutableArray } from "./types/global.js";

export const DATABASE_THREAD = "databases";

const thread = await getLoggingThread(DATABASE_THREAD);

const databases: { [key: string]: Message<true> | undefined } = {};

for (const message of (await thread.messages.fetch({ limit: 100 })).toJSON()) {
	const name = message.content.split(" ")[1]?.toLowerCase();
	if (name) {
		databases[name] =
			message.author.id === client.user?.id
				? message
				: await thread.send({
						...(await extractMessageExtremities(message)),
						content: message.content,
				  });
	}
}

let timeouts: {
	[key: Snowflake]:
		| { callback: () => Promise<Message<true>>; timeout: NodeJS.Timeout }
		| undefined;
} = {};

const contructed: string[] = [];

export default class Database<Data extends { [key: string]: string | number | boolean | null }> {
	message: Message<true> | undefined;

	#data: ImmutableArray<Data> | undefined;

	#extra: string | undefined;

	constructor(public name: string) {
		if (contructed.includes(name)) {
			throw new RangeError(
				`Cannot create a 2nd database for ${name}, they will have conflicting data`,
			);
		}
		contructed.push(name);
	}

	get data() {
		if (!this.#data) throw new ReferenceError("Must call `.init()` before reading `.data`");
		return this.#data;
	}

	get extra() {
		if (!this.#data) throw new ReferenceError("Must call `.init()` before reading `.extra`");
		return this.#extra;
	}

	#queueWrite() {
		if (!this.message) {
			throw new ReferenceError(
				"Must call `.init()` before reading or setting `.data` or `.extra`",
			);
		}

		const timeoutId = timeouts[this.message.id];

		const callback = async (): Promise<Message<true>> => {
			if (!this.message) {
				throw new ReferenceError(
					"Must call `.init()` before reading or setting `.data` or `.extra`",
				);
			}

			const data =
				Boolean(this.#data?.length) &&
				papaparse.unparse(Array.from(this.#data || [])).trim();

			const files = data
				? [{ attachment: Buffer.from(data, "utf8"), name: `${this.name}.scradddb` }]
				: [];
			const messageContent = this.message.content.split("\n");
			messageContent[3] = "";
			if (this.#extra) {
				messageContent[4] = "Extra misc info:";
				messageContent[5] = this.#extra;
			} else {
				messageContent[4] = "";
				messageContent[5] = "";
			}

			const promise = this.message
				.edit({ content: messageContent.join("\n").trim(), files })
				.catch(async (error) => {
					await logError(error, `Database<${this.name}>#queueWrite()`);
					if (error.code === RESTJSONErrorCodes.UnknownMessage) {
						databases[this.name] = undefined;
						await this.init();
					}
					return await callback();
				})
				.then(async (edited) => {
					const attachment = edited.attachments.first()?.url;

					const written = attachment
						? (await fetch(attachment).then(async (res) => await res.text())).trim()
						: false;

					if (written !== data) {
						throw new Error("Data changed through write!", {
							cause: { written, data },
						});
					}

					return edited;
				});

			timeouts[this.message.id] = undefined;
			return await promise;
		};

		timeouts[this.message.id] = { timeout: setTimeout(callback, 15_000), callback };
		timeoutId && clearTimeout(timeoutId.timeout);
	}

	async init() {
		this.message = databases[this.name] ||= await thread.send(
			`__**SCRADD ${this.name.toUpperCase()} DATABASE**__\n\n*Please don’t delete this message. If you do, all ${this.name.replaceAll(
				"_",
				" ",
			)} information may be reset.*`,
		);

		const attachment = this.message.attachments.first()?.url;

		this.#data = attachment
			? await fetch(attachment)
					.then(async (res) => await res.text())
					.then(
						(csv) =>
							papaparse.parse<Data>(csv.trim(), {
								dynamicTyping: true,
								header: true,
								delimiter: ",",
							}).data,
					)
			: [];

		this.#extra = this.message.content.split("\n")[5];
	}

	set data(content) {
		if (!this.message) throw new ReferenceError("Must call `.init()` before setting `.data`");
		this.#data = content;
		this.#queueWrite();
	}

	set extra(content) {
		if (!this.message) throw new ReferenceError("Must call `.init()` before setting `.extra`");
		this.#extra = content;
		this.#queueWrite();
	}
}

export async function cleanDatabaseListeners() {
	console.log(`Cleaning ${Object.values(timeouts).length} listeners: ${Object.keys(timeouts)}`);
	await Promise.all(Object.values(timeouts).map((info) => info?.callback()));
	timeouts = {};
	console.log("Listeners cleaned");
}

exitHook(async (callback) => {
	await cleanDatabaseListeners().then(callback);
});
