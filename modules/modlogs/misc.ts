import {
	APIEmbed,
	ButtonStyle,
	ChannelType,
	ComponentType,
	Embed,
	PermissionFlagsBits,
	TextBasedChannel,
	TextChannel,
	ThreadChannel,
} from "discord.js";

import { getBaseChannel } from "../../util/discord.js";
import config from "../../common/config.js";
import constants from "../../common/constants.js";
import type { DATABASE_THREAD } from "../../common/database.js";

export const LOG_GROUPS = ["server", "messages", "channels", "members", "voice"] as const;

export function shouldLog(channel: TextBasedChannel | null): boolean {
	const baseChannel = getBaseChannel(channel);

	return Boolean(
		baseChannel?.type !== ChannelType.DM &&
			baseChannel?.guild.id === config.guild.id &&
			baseChannel
				?.permissionsFor(config.roles.mod || baseChannel.guild.id)
				?.has(PermissionFlagsBits.ViewChannel),
	);
}

export default async function log(
	content: `${LoggingEmojis} ${string} ✨${string}`,
	group?: typeof LOG_GROUPS[number],
	extra: {
		embeds?: (Embed | APIEmbed)[];
		files?: (string | { extension?: string; content: string })[];
		button?: { label: string; url: string };
	} = {},
) {
	const thread = await getLoggingThread(group);

	const externalFileIndex = extra.files?.findIndex((file) => {
		if (typeof file === "string" || file.content.includes("```")) return true;

		const lines = file.content.split("\n");
		return lines.length > 10 || lines.find((line) => line.length > 50);
	});
	const embeddedFiles =
		externalFileIndex === -1
			? extra.files?.splice(0)
			: extra.files?.splice(0, externalFileIndex);

	return await thread.send({
		content:
			content +
			(embeddedFiles?.length
				? "\n" +
				  embeddedFiles
						.map((file) =>
							typeof file === "string"
								? file
								: `\`\`\`${file.extension}\n${file.content}\n\`\`\``,
						)
						.join("\n")
				: ""),
		allowedMentions: { users: [] },
		embeds: extra.embeds,
		components: extra.button && [
			{
				components: [
					{
						label: extra.button.label,
						style: ButtonStyle.Link,
						type: ComponentType.Button,
						url: extra.button.url,
					},
				],
				type: ComponentType.ActionRow,
			},
		],
		files: await Promise.all(
			extra.files?.slice(0, 10).map(async (file) => {
				if (typeof file === "string") {
					const response = await fetch(file);
					return {
						attachment: Buffer.from(await response.arrayBuffer()),
						name: new URL(file).pathname.split("/").at(-1),
					};
				}

				return {
					attachment: Buffer.from(file.content, "utf8"),
					name: `file.${file.extension || "txt"}`,
				};
			}) ?? [],
		),
	});
}

export async function getLoggingThread(
	group?: typeof LOG_GROUPS[number] | typeof DATABASE_THREAD,
): Promise<ThreadChannel>;
export async function getLoggingThread(group?: undefined): Promise<TextChannel>;
export async function getLoggingThread(
	group?: typeof LOG_GROUPS[number] | typeof DATABASE_THREAD | undefined,
) {
	if (!config.channels.modlogs) throw new ReferenceError("Cannot find logs channel");
	if (!group) return config.channels.modlogs;

	const threads = await config.channels.modlogs.threads.fetchActive();

	return (
		threads.threads.find((thread) => thread.name === group) ||
		(await config.channels.modlogs.threads.create({
			name: group,
			reason: "New logging thread",
		}))
	);
}

export enum LoggingEmojis {
	Member = "👥",
	UserUpdate = "👤",
	SettingChange = "📋",
	ServerUpdate = "✨",
	Invite = "👋",
	Role = "🏷",
	MessageDelete = "🗑",
	MessageUpdate = "🌐",
	MessageEdit = "📝",
	Voice = "🔊",
	Channel = "🗄",
	Punishment = "🔨",
	Event = "🗓",
	Error = "⚠", // constants.emojis.statuses.no,
	Bot = "🤖",
	Emoji = "😳",
	Thread = "📂",
	Integration="🖇"
}
