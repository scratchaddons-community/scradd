import { Message, RESTJSONErrorCodes, Snowflake } from "discord.js";
import papaparse from "papaparse";
import exitHook from "async-exit-hook";
import { getLoggingThread } from "./logging.js";
import client from "../client.js";
import type { suggestionAnswers } from "../commands/get-top-suggestions.js";
import logError from "../util/logError.js";
import type { ImmutableArray } from "./types/util.js";

export const DATABASE_THREAD = "databases";

const thread = await getLoggingThread(DATABASE_THREAD);

const databases: Record<string, undefined | Message<true>> = {};

for (const message of (await thread.messages.fetch({ limit: 100 })).toJSON()) {
	const name = message.content.split(" ")[1]?.toLowerCase();
	if (name && message.author.id === client.user?.id) {
		databases[name] = message;
	}
}

let timeouts: Record<
	Snowflake,
	{ callback: () => Promise<Message<true>>; timeout: NodeJS.Timeout } | undefined
> = {};

const contructed: (keyof Databases)[] = [];

export default class Database<Name extends keyof Databases> {
	message: Message<true> | undefined;
	#data: ImmutableArray<Databases[Name]> | undefined;
	#extra: string | undefined;
	constructor(public name: Name) {
		if (contructed.includes(name))
			throw new RangeError(
				`Cannot create a 2nd database for ${name}, they will have conflicting data`,
			);
		contructed.push(name);
	}

	async init() {
		this.message = databases[this.name] ||= await thread.send(
			`__**SCRADD ${this.name.toUpperCase()} DATABASE**__\n\n*Please don’t delete this message. If you do, all ${this.name.replaceAll(
				"_",
				" ",
			)} information may be reset.*`,
		);

		const attachment = this.message?.attachments.first()?.url;

		this.#data = attachment
			? await fetch(attachment)
					.then((res) => res.text())
					.then(
						(csv) =>
							papaparse.parse<Databases[Name]>(csv.trim(), {
								dynamicTyping: true,
								header: true,
								delimiter: ",",
							}).data,
					)
			: [];

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

	#queueWrite() {
		if (!this.message)
			throw new ReferenceError(
				"Must call `.init()` before reading or setting `.data` or `.extra`",
			);

		const timeoutId = timeouts[this.message.id];

		const callback = (): Promise<Message<true>> => {
			if (!this.message)
				throw new ReferenceError(
					"Must call `.init()` before reading or setting `.data` or `.extra`",
				);

			const data = !!this.#data?.length && papaparse.unparse([...this.#data]).trim();

			const files = data
				? [{ attachment: Buffer.from(data, "utf-8"), name: this.name + ".scradddb" }]
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
					return callback();
				})
				.then(async (edited) => {
					const attachment = edited.attachments.first()?.url;

					const written = attachment
						? (await fetch(attachment).then((res) => res.text())).trim()
						: false;

					if (written !== data)
						throw new Error("Data changed through write!", {
							cause: { written, data },
						});

					return edited;
				});

			timeouts[this.message.id] = undefined;
			return promise;
		};

		timeouts[this.message.id] = { timeout: setTimeout(callback, 15_000), callback };
		timeoutId && clearTimeout(timeoutId.timeout);
	}
}

export async function cleanDatabaseListeners() {
	console.log(`Cleaning ${Object.values(timeouts).length} listeners: ${Object.keys(timeouts)}`);
	await Promise.all(Object.values(timeouts).map((info) => info?.callback()));
	timeouts = {};
	console.log("Listeners cleaned");
}

exitHook((callback) => cleanDatabaseListeners().then(callback));

export type Databases = {
	board: {
		/** The number of reactions this message has. */
		reactions: number;
		/** The ID of the user who posted this. */
		user: Snowflake;
		/** The ID of the channel this message is in. */
		channel: Snowflake;
		/** The ID of the message on the board. */
		onBoard: 0 | Snowflake;
		/** The ID of the original message. */
		source: Snowflake;
	};
	warn: {
		/** The ID of the user who was warned. */
		user: Snowflake;
		/** The time when this warn expires. */
		expiresAt: number;
		/** The ID of the message in #mod-log with more information. */
		info: Snowflake;
	};
	mute: {
		/** The ID of the user who was muted. */
		user: Snowflake;
		/** The time when this mute is no longer taken into account when calculating future mute times. */
		expiresAt: number;
	};
	xp: {
		/** The ID of the user. */
		user: Snowflake;
		/** How much XP they have. */
		xp: number;
	};
	user_settings: {
		/** The ID of the user. */
		user: Snowflake;
		/** Whether to ping the user when their message gets on the board. */
		boardPings: boolean;
		/** Whether to ping the user when they level up. */
		levelUpPings: boolean;
		/** Whether to ping the user when they are a top poster of the week. */
		weeklyPings: boolean;
		/** Whether to automatically react to their messages with random emojis. */
		autoreactions: boolean;
		useMentions: boolean;
	};
	recent_xp: {
		/** The ID of the user. */
		user: Snowflake;
		/** How much XP they gained. */
		xp: number;
	};
	suggestions: {
		answer: typeof suggestionAnswers[number];
		author: string;
		count: number;
		id: Snowflake;
		title: string;
	};
	roles: { [role: Snowflake]: true } & { user: Snowflake };
};
