import type { Message, Snowflake } from "discord.js";

import { ChannelType, RESTJSONErrorCodes, ThreadAutoArchiveDuration } from "discord.js";
import papaparse from "papaparse";
import { client, getFilesFromMessage } from "strife.js";

import { getAllMessages } from "../util/discord.ts";
import config from "./config.ts";
import constants from "./constants.ts";

let timeouts: Record<
	Snowflake,
	{ callback(): Promise<Message<true>>; timeout: NodeJS.Timeout } | undefined
> = {};

const threadName = "databases";
const databaseFileType =
	constants.env === "production" ? `${client.user.displayName.toLowerCase()}-db` : "csv";
export const databaseThread =
	(await config.channels.modlogs.threads.fetch()).threads.find(
		(thread) => thread.name === threadName,
	) ??
	(await config.channels.modlogs.threads.create({
		name: threadName,
		reason: "For databases",
		type: ChannelType.PrivateThread,
		invitable: false,
		autoArchiveDuration: ThreadAutoArchiveDuration.OneWeek,
	}));

const databases: Record<string, Message<true> | undefined> = {};
export const allDatabaseMessages = await getAllMessages(databaseThread);
for (const message of allDatabaseMessages) {
	const name = message.content.split(" ")[1]?.toLowerCase();
	if (name && message.attachments.size)
		databases[name] =
			message.author.id === client.user.id ?
				message
			:	await databaseThread.send({
					files: [...(await getFilesFromMessage(message)).values()],
					content: message.content,
				});
}

const contructed = new Set<string>();

/** @deprecated */
export default class Database<Data extends Record<string, boolean | number | string | null>> {
	message: Message<true> | undefined;
	#data: readonly Data[] = [];

	constructor(public name: string) {
		this.name = name.replaceAll(" ", "_");
		if (contructed.has(this.name))
			throw new RangeError(
				`Cannot create a second database for ${this.name}, they may have conflicting data`,
			);
		contructed.add(this.name);
	}

	async init(): Promise<void> {
		if (this.message) return;

		const content =
			`__**${client.user.displayName
				.replaceAll(" ", "-")
				.toUpperCase()} ${this.name.toUpperCase()} DATABASE**__\n` +
			`\n*Please don’t delete this message. If you do, all ${this.name.replaceAll(
				"_",
				" ",
			)} information may be reset.*`;
		if (databases[this.name]) await databases[this.name]?.edit(content);
		this.message = databases[this.name] ?? (await databaseThread.send(content));
		databases[this.name] ??= this.message;

		const attachment = (await getFilesFromMessage(this.message)).first();
		if (!attachment) {
			this.#queueWrite();
			return;
		}

		this.#data = await fetch(attachment.url)
			.then(async (res) => await res.text())
			.then(
				(csv) =>
					papaparse.parse<Data>(csv.trim(), {
						dynamicTyping: true,
						header: true,
						delimiter: ",",
					}).data,
			);
	}

	get data(): readonly Data[] {
		if (!this.message) throw new ReferenceError("Must call `.init()` before reading `.data`");
		return this.#data;
	}
	set data(content: readonly Data[]) {
		if (!this.message) throw new ReferenceError("Must call `.init()` before setting `.data`");
		this.#data = content;
		this.#queueWrite();
	}

	#queueWrite(): void {
		if (!this.message)
			throw new ReferenceError("Must call `.init()` before reading or setting `.data`");

		const timeoutId = timeouts[this.message.id];

		const callback = async (): Promise<Message<true>> => {
			if (!this.message)
				throw new ReferenceError("Must call `.init()` before reading or setting `.data`");

			const { message } = this;

			const data = papaparse.unparse([...this.#data]).trim();
			const files = [
				{
					attachment: Buffer.from(data, "utf8"),
					name: `${this.name}.${databaseFileType}`,
				},
			];

			const promise = message
				.edit({ files })
				.catch(async (error: unknown) => {
					if (
						error &&
						typeof error === "object" &&
						"code" in error &&
						error.code === RESTJSONErrorCodes.UnknownMessage
					) {
						databases[this.name] = undefined;
						this.message = undefined;
						await this.init();
						return await callback();
					}

					return await message.edit({ files }).catch((retryError: unknown) => {
						throw new AggregateError(
							[error, retryError],
							"Failed to write to database!",
							{ cause: { data, database: this.name } },
						);
					});
				})
				.then(async (edited) => {
					databases[this.name] = edited;

					const attachment = edited.attachments.first()?.url;

					const written =
						attachment &&
						(await fetch(attachment).then(async (res) => await res.text())).trim();

					if (attachment && written !== data && !written?.startsWith("<?xml"))
						throw new Error("Data changed through write!", {
							cause: { written, data, database: this.name },
						});

					return edited;
				});

			timeouts[message.id] = undefined;
			return await promise;
		};

		timeouts[this.message.id] = { timeout: setTimeout(callback, 15_000), callback };
		if (timeoutId) clearTimeout(timeoutId.timeout);
	}
}

export async function cleanListeners(): Promise<void> {
	const count = Object.values(timeouts).length;
	console.log(
		`Cleaning ${count} listener${count === 1 ? "" : "s"}: ${Object.keys(timeouts).join(",")}`,
	);
	await Promise.all(Object.values(timeouts).map((info) => info?.callback()));
	console.log("Listeners cleaned");
	timeouts = {};
}
export async function prepareExit(): Promise<void> {
	process.emitWarning("prepare-exit called");
	await cleanListeners();
	client.user.setStatus("dnd");
	await client.destroy();
}

for (const [event, code] of Object.entries({
	exit: undefined,
	beforeExit: 0,
	SIGHUP: 12,
	SIGINT: 130,
	SIGTERM: 143,
	SIGBREAK: 149,
	message: 0,
} as const)) // eslint-disable-next-line @typescript-eslint/no-loop-func
	process.once(event, (message) => {
		if (event === "message" && message !== "shutdown") return;

		if (event !== "exit" && Object.values(timeouts).length) {
			void prepareExit().then(() => {
				process.nextTick(() => process.exit(code));
			});
			setTimeout(() => {
				process.nextTick(() => process.exit(code));
			}, 30_000);
		} else void prepareExit();
	});
