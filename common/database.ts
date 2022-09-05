import { Message, AttachmentBuilder, Snowflake } from "discord.js";
import papaparse from "papaparse";
import fetch from "node-fetch";
import exitHook from "async-exit-hook";
import { getLoggingThread } from "./moderation/logging.js";
import client from "../client.js";

export const DATABASE_THREAD = "databases";

const thread = await getLoggingThread(DATABASE_THREAD);

const databases: { [key: string]: undefined | Message<true> } = {};

for (const message of (await thread.messages.fetch({ limit: 100 })).toJSON()) {
	const name = message.content.split(" ")[1]?.toLowerCase();
	if (name && message.author.id === client.user?.id) {
		databases[name] = message;
	}
}

const timeouts: {
	[key: Snowflake]:
		| { callback: () => Promise<Message<true>>; timeout: NodeJS.Timeout }
		| undefined;
} = {};

const contructed: (keyof Databases)[] = [];

export default class Database<Name extends keyof Databases> {
	name: Name;
	message: Message<true> | undefined;
	#data: Databases[Name][] | undefined;
	constructor(name: Name) {
		if (contructed.includes(name))
			throw new RangeError(
				`Cannot create a 2nd database for ${name}, they will have conflicting data`,
			);
		contructed.push(name);
		this.name = name;
	}

	async init() {
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
							papaparse.parse<Databases[Name]>(csv.trim(), {
								dynamicTyping: true,
								header: true,
							}).data,
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

		const callback = (): Promise<Message<true>> => {
			if (!this.message)
				throw new ReferenceError("Must call `.init()` before setting `.data`");
			const promise = this.message.edit({ files }).catch(async () => {
				databases[this.name] = undefined;
				await this.init();
				return callback();
			});
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

export type Databases = {
	board: {
		/** The number of reactions this message has. */
		reactions: number;
		/** The ID of the user who posted this. */
		user: Snowflake;
		/** The ID of the channel this message is in. */
		channel: Snowflake;
		/** The ID of the message on the board. */
		onBoard?: Snowflake;
		/** The ID of the original message. */
		source: Snowflake;
	};
	warn: {
		/** The ID of the user who was warned. */
		user: Snowflake;
		/** The timestamp when this warn expires. */
		expiresAt: number;
		/** The ID of the message in #mod-log with more information. */
		info: Snowflake;
	};
	mute: {
		/** The ID of the user who was muted. */
		user: Snowflake;
		/** The timestamp when this mute is no longer taken into account when calculating future mute times. */
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
	};
	recent_xp: {
		/** The ID of the user. */
		user: Snowflake;
		/** How much XP they gained. */
		xp: number;
		/** The timestamp when they gained it at. */
		timestamp: number;
	};
};
