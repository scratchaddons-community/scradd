import exitHook from "async-exit-hook";
import {
	type Message,
	RESTJSONErrorCodes,
	type Snowflake,
	Attachment,
	type TextBasedChannel,
} from "discord.js";
import papaparse from "papaparse";
import { client } from "strife.js";
import { extractMessageExtremities } from "../util/discord.js";
import logError from "./logError.js";
import { getLoggingThread } from "../modules/logging/misc.js";

let timeouts: {
	[key: Snowflake]:
		| { callback: () => Promise<Message<true>>; timeout: NodeJS.Timeout }
		| undefined;
} = {};

export const DATABASE_THREAD = "databases";

const thread = await getLoggingThread(DATABASE_THREAD);

const databases: { [key: string]: Message<true> | undefined } = {};

for (const message of (await thread.messages.fetch({ limit: 100 })).toJSON()) {
	const name = message.content.split(" ")[1]?.toLowerCase();
	if (name) {
		databases[name] =
			message.author.id === client.user?.id
				? message
				: message.attachments.size
				? await thread.send({
						...extractMessageExtremities(message),
						content: message.content,
				  })
				: undefined;
	}
}

const contructed: string[] = [];

export default class Database<Data extends { [key: string]: string | number | boolean | null }> {
	message: Message<true> | undefined;

	#data: ReadonlyArray<Data> | undefined;

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
			const message = this.message;

			const data = this.#data?.length && papaparse.unparse([...this.#data]).trim();

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

			const content = messageContent.join("\n").trim();
			const promise = message
				.edit({ content, files })
				.catch(async (error) => {
					if (error.code === RESTJSONErrorCodes.UnknownMessage) {
						databases[this.name] = undefined;
						await this.init();
						return await callback();
					} else {
						return message.edit({ content, files }).catch(async (error2) => {
							await logError(error, `Database<${this.name}>#queueWrite()`);
							await logError(error2, `Database<${this.name}>#queueWrite()`);
							throw new Error("Failed to write to database!", {
								cause: { data, database: this.name },
							});
						});
					}
				})
				.then(async (edited) => {
					const attachment = edited.attachments.first()?.url;

					const written = attachment
						? (await fetch(attachment).then(async (res) => await res.text())).trim()
						: false;

					if (attachment && written !== data) {
						throw new Error("Data changed through write!", {
							cause: { written, data, database: this.name },
						});
					}

					return edited;
				});

			timeouts[this.message.id] = undefined;
			return await promise;
		};

		timeouts[this.message.id] = {
			timeout: setTimeout(async () => await callback(), 15_000),
			callback,
		};
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
	updateById<Keys extends keyof Data>(
		newData: Data["id"] extends string ? Pick<Data, Keys> & { id: string } : never,
		oldData?: Omit<Data, Keys | "id">,
	) {
		const data = [...this.data];
		const index = data.findIndex((suggestion) => suggestion.id === newData.id);
		const suggestion = data[index];
		if (suggestion) {
			data[index] = { ...suggestion, ...newData };
		} else if (oldData) {
			data.push({ ...oldData, ...newData } as unknown as Data);
		}
		this.data = data;
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
	client.user.setPresence({ status: "dnd" });
}

exitHook(async (callback) => {
	await cleanDatabaseListeners().then(callback);
});

export async function backupDatabases(channel: TextBasedChannel) {
	const attachments = Object.values(databases)
		.map((database) => database?.attachments.first())
		.filter((attachment): attachment is Attachment => Boolean(attachment));

	await channel.send("# Daily Scradd Database Backup");
	await Promise.all(
		Array.from(
			{ length: Math.ceil(attachments.length / 10) },
			() => channel.send({ files: attachments.splice(0, 10) }),
		),
	);
}
