import {
	type APIEmbed,
	ButtonStyle,
	ChannelType,
	ComponentType,
	Embed,
	GuildAuditLogsEntry,
	PermissionFlagsBits,
	type TextBasedChannel,
	TextChannel,
	ThreadChannel,
	ThreadAutoArchiveDuration,
} from "discord.js";
import { getBaseChannel } from "../../util/discord.js";
import config, { getInitialChannelThreads } from "../../common/config.js";
import { DATABASE_THREAD } from "../../common/database.js";
import constants from "../../common/constants.js";

export const LOG_GROUPS = ["server", "messages", "channels", "members", "voice"] as const;
export type LogGroup = typeof LOG_GROUPS[number];

export function shouldLog(channel: TextBasedChannel | null): boolean {
	const baseChannel = getBaseChannel(channel);

	return Boolean(
		baseChannel?.type !== ChannelType.DM &&
			baseChannel?.guild.id === config.guild.id &&
			baseChannel
				.permissionsFor(config.roles.staff || config.guild.id)
				?.has(PermissionFlagsBits.ViewChannel),
	);
}

export default async function log(
	content?: `${LoggingEmojis | typeof LoggingErrorEmoji} ${string}`,
	group?: LogGroup,
	extra: {
		embeds?: (Embed | APIEmbed)[];
		files?: (string | { extension?: string; content: string })[];
		buttons?: { label: string; url: string }[];
	} = {},
) {
	const thread = await getLoggingThread(group);

	const externalIndex = extra.files?.findIndex((file) => {
		if (typeof file === "string" || file.content.includes("```")) return true;

		const lines = file.content.split("\n");
		return lines.length > 10 || lines.find((line) => line.length > 100);
	});
	const embeddedFiles = extra.files?.splice(0, externalIndex === -1 ? externalIndex : undefined);

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
		components: extra.buttons && [
			{
				components: extra.buttons.map((button) => ({
					...button,
					style: ButtonStyle.Link,
					type: ComponentType.Button,
				})),
				type: ComponentType.ActionRow,
			},
		],
		files: await Promise.all(
			extra.files?.map(async (file) => {
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
	group?: LogGroup | typeof DATABASE_THREAD,
): Promise<ThreadChannel>;
export async function getLoggingThread(group?: undefined): Promise<TextChannel>;
export async function getLoggingThread(group?: LogGroup | typeof DATABASE_THREAD | undefined) {
	if (!config.channels.modlogs) throw new ReferenceError("Cannot find logs channel");
	if (!group) return config.channels.modlogs;

	return (
		getInitialChannelThreads(config.channels.modlogs).find((thread) => thread.name === group) ||
		(await config.channels.modlogs.threads.create({
			name: group,
			reason: "New logging thread",
			type: ChannelType[group === DATABASE_THREAD ? "PrivateThread" : "PublicThread"],
			invitable: group === DATABASE_THREAD ? false : undefined,
			autoArchiveDuration: ThreadAutoArchiveDuration.OneWeek,
		}))
	);
}

export enum LoggingEmojis {
	SettingChange = "📋",
	Channel = "🗄",
	Punishment = "🔨",
	Role = "🏷",
	Integration = "🖇",
	Thread = "📂",
	ServerUpdate = "✨",
	Voice = "🔊",
	Expressions = "😳",
	User = "👤",
	Event = "🗓",
	Invite = "👋",
	MessageUpdate = "🌐",
	MessageEdit = "📝",
	Bot = "🤖",
	MessageDelete = "🗑",
	Member = "👥",
}

export const LoggingErrorEmoji = constants.emojis.statuses.no;

export function extraAuditLogsInfo(entry: GuildAuditLogsEntry) {
	return `${entry.executor ? ` by ${entry.executor.toString()}` : ""}${
		entry.reason
			? entry.reason.includes("\n")
				? `:\n${entry.reason}`
				: ` (${entry.reason})`
			: ""
	}`;
}
