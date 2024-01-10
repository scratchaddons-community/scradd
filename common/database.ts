import {
	type Message,
	RESTJSONErrorCodes,
	type Snowflake,
	type TextBasedChannel,
	ChannelType,
	ThreadAutoArchiveDuration,
} from "discord.js";
import papaparse from "papaparse";
import { client } from "strife.js";
import { extractMessageExtremities } from "../util/discord.js";
import config from "./config.js";
let timeouts: Record<
	Snowflake,
	{ callback(): Promise<Message<true>>; timeout: NodeJS.Timeout } | undefined
> = {};

if (!config.channels.modlogs) throw new ReferenceError("Cannot find logs channel");
const threadName = "databases";
export const databaseThread =
	(await config.channels.modlogs.threads.fetch()).threads.find(
		(thread) => thread.name === threadName,
	) ||
	(await config.channels.modlogs.threads.create({
		name: threadName,
		reason: "For databases",
		type: ChannelType.PrivateThread,
		invitable: false,
		autoArchiveDuration: ThreadAutoArchiveDuration.OneWeek,
	}));

const databases: Record<string, Message<true> | undefined> = {};

for (const message of (await databaseThread.messages.fetch({ limit: 100 })).values()) {
	const name = message.content.split(" ")[1]?.toLowerCase();
	if (name) {
		databases[name] =
			message.author.id === client.user.id
				? message
				: message.attachments.size
				? await databaseThread.send({
						...extractMessageExtremities(message),
						content: message.content,
				  })
				: undefined;
	}
}

const contructed: string[] = [];

export default class Database<Data extends Record<string, boolean | number | string | null>> {
	message: Message<true> | undefined;
	#data: readonly Data[] | undefined;
	#extra: string | undefined;

	constructor(public name: string) {
		if (contructed.includes(name)) {
			throw new RangeError(
				`Cannot create a 2nd database for ${name}, they will have conflicting data`,
			);
		}
		contructed.push(name);
	}

	async init() {
		this.message = databases[this.name] ||= await databaseThread.send(
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

		// eslint-disable-next-line @typescript-eslint/prefer-destructuring
		this.#extra = this.message.content.split("\n")[5];
	}

	get data() {
		if (!this.#data) throw new ReferenceError("Must call `.init()` before reading `.data`");
		return this.#data;
	}
	set data(content) {
		if (!this.message) throw new ReferenceError("Must call `.init()` before setting `.data`");
		this.#data = content;
		this.#queueWrite();
	}

	get extra() {
		if (!this.#data) throw new ReferenceError("Must call `.init()` before reading `.extra`");
		return this.#extra;
	}
	set extra(content) {
		if (!this.message) throw new ReferenceError("Must call `.init()` before setting `.extra`");
		this.#extra = content;
		this.#queueWrite();
	}

	updateById<Keys extends keyof Data>(
		newData: Data["id"] extends string ? Pick<Data, Keys> & { id: string } : never,
		oldData?: Omit<Data, Keys | "id">,
	) {
		const data = [...this.data];
		const index = data.findIndex((suggestion) => suggestion.id === newData.id);
		const suggestion = data[index];
		if (suggestion) data[index] = { ...suggestion, ...newData };
		else if (oldData) data.push({ ...oldData, ...newData } as unknown as Data);

		this.data = data;
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
			const { message } = this;

			const data = this.#data?.length && papaparse.unparse([...this.#data]).trim();

			const files = data
				? [{ attachment: Buffer.from(data, "utf8"), name: `${this.name}.scradddb` }]
				: [];
			const messageContent = message.content.split("\n");
			messageContent[3] = "";
			messageContent[4] = this.#extra ? "Extra misc info:" : "";
			messageContent[5] = this.#extra || "";

			const content = messageContent.join("\n").trim();
			const promise = message
				.edit({ content, files })
				.catch(async (error) => {
					if (error.code !== RESTJSONErrorCodes.UnknownMessage) {
						return await message.edit({ content, files }).catch((error2) => {
							throw new AggregateError(
								[error, error2],
								"Failed to write to database!",
								{ cause: { data, database: this.name } },
							);
						});
					}

					databases[this.name] = undefined;
					await this.init();
					return await callback();
				})
				.then(async (edited) => {
					const attachment = edited.attachments.first()?.url;

					const written =
						attachment &&
						(await fetch(attachment).then(async (res) => await res.text())).trim();

					if (attachment && written !== data && !written?.startsWith("<?xml")) {
						throw new Error("Data changed through write!", {
							cause: { written, data, database: this.name },
						});
					}

					return edited;
				});

			timeouts[message.id] = undefined;
			return await promise;
		};

		timeouts[this.message.id] = { timeout: setTimeout(callback, 15_000), callback };
		if (timeoutId) clearTimeout(timeoutId.timeout);
	}
}

export async function cleanDatabaseListeners() {
	const count = Object.values(timeouts).length;
	console.log(
		`Cleaning ${count} listener${count === 1 ? "" : "s"}: ${Object.keys(timeouts).join(",")}`,
	);
	await Promise.all(Object.values(timeouts).map((info) => info?.callback()));
	timeouts = {};
	console.log("Listeners cleaned");
	client.user.setPresence({ status: "dnd" });
}

let called = false,
	exited = false;
for (const [event, code] of [
	["exit"],
	["beforeExit", 0],
	["SIGHUP", 12],
	["SIGINT", 130],
	["SIGTERM", 143],
	["SIGBREAK", 149],
	["message", 0],
] as const) {
	// eslint-disable-next-line @typescript-eslint/no-loop-func
	process.on(event, function (message) {
		if (called || (event === "message" && message !== "shutdown")) return;
		called = true;

		function doExit() {
			if (exited) return;
			exited = true;

			if (event !== "exit") process.nextTick(() => process.exit(code));
		}

		if (event !== "exit" && cleanDatabaseListeners.length) {
			void cleanDatabaseListeners().then(() => {
				process.nextTick(doExit);
			});
			setTimeout(doExit, 10_000);
		} else {
			void cleanDatabaseListeners();
			doExit();
		}
	});
}

export async function backupDatabases(channel: TextBasedChannel) {
	if (process.env.NODE_ENV !== "production") return;

	const attachments = Object.values(databases)
		.map((database) => database?.attachments.first())
		.filter(Boolean);

	await channel.send("# Daily Scradd Database Backup");
	while (attachments.length) {
		await channel.send({ files: attachments.splice(0, 10) });
	}
}
