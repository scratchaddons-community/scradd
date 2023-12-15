import {
	type APIEmbed,
	ButtonStyle,
	ChannelType,
	ComponentType,
	Embed,
	GuildAuditLogsEntry,
	type TextBasedChannel,
	TextChannel,
	ThreadAutoArchiveDuration,
} from "discord.js";
import { getBaseChannel } from "../../util/discord.js";
import config, { getInitialChannelThreads } from "../../common/config.js";
import { DATABASE_THREAD } from "../../common/database.js";
import constants from "../../common/constants.js";

export function shouldLog(channel: TextBasedChannel | null): boolean {
	const baseChannel = getBaseChannel(channel);

	return Boolean(
		baseChannel?.type !== ChannelType.DM &&
			baseChannel?.guild.id === config.guild.id &&
			baseChannel.permissionsFor(config.roles.staff || config.guild.id)?.has("ViewChannel"),
	);
}

export enum LogSeverity {
	/**
	 * Critical alerts that require actions in response. All mods should read this channel, preferably with notifications on.
	 *
	 * - Failed actions.
	 * - Bot errors.
	 * - Likely spammer detected.
	 * - Ticket opened.
	 * - Message reported by member.
	 *
	 * Discord also logs some things here:
	 *
	 * - AutoMod triggered.
	 * - Community update messages.
	 * - Raid alerts.
	 */
	Alert,
	/**
	 * Updates that are important to know or not easily noticeable otherwise. All mods should read.
	 *
	 * - Channel created/deleted/converted.
	 * - Expressions changed.
	 * - Roles list changed.
	 * - Integrations changed.
	 * - Server identity changed.
	 * - Thread deleted.
	 * - User punished.
	 *
	 * @todo - When migrating, the `members` thread should become this to keep warn messages all in the same thread.
	 */
	ImportantUpdate,
	/**
	 * Change to server settings or other changes affecting the whole server. All mods should skim.
	 *
	 * - `/say` used.
	 * - Permissions changed.
	 * - Channel settings changed.
	 * - Message pinned/published.
	 * - Thread closed/locked.
	 * - Member server profile edited.
	 * - Events scheduled/edited.
	 */
	ServerChange,
	/**
	 * Generally unimportant changes to server content. Optional to read.
	 *
	 * - Message edited/deleted.
	 * - Messages purged.
	 * - Reactions purged.
	 * - Thread settings updated.
	 */
	ContentEdit,
	/**
	 * Logged as a resource for possible future reference. Optional to join the thread.
	 *
	 * - User global profile changed.
	 * - Member joined/left.
	 * - Invites created/deleted.
	 * - Voice channel state changed.
	 */
	Resource,
}

export default async function log(
	content: `${LoggingEmojis | typeof LoggingErrorEmoji} ${string}`,
	group: TextChannel | LogSeverity,
	extra: {
		embeds?: (Embed | APIEmbed)[];
		files?: (string | { extension?: string; content: string })[];
		buttons?: ({ label: string } & (
			| { url: string }
			| { customId: string; style: Exclude<ButtonStyle, ButtonStyle.Link> }
		))[];
	} = {},
) {
	const thread = typeof group === "object" ? group : await getLoggingThread(group);

	const externalIndex =
		extra.files?.findIndex((file) => {
			if (typeof file === "string" || file.content.includes("```")) return true;

			const lines = file.content.split("\n");
			return lines.length > 10 || lines.find((line) => line.length > 100);
		}) ?? 0;
	const embeddedFiles = extra.files?.splice(0, extra.files.length - externalIndex - 1);

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
					style: ButtonStyle.Link,
					...button,
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

export async function getLoggingThread(group: LogSeverity | typeof DATABASE_THREAD) {
	if (!config.channels.modlogs) throw new ReferenceError("Cannot find logs channel");
	if (group === LogSeverity.Alert) return config.channels.modlogs;

	const name =
		group === DATABASE_THREAD
			? group
			: `${group}. ${LogSeverity[group]
					.replaceAll(/([a-z])([A-Z])/g, "$1 $2")
					.toLowerCase()}`;

	return (
		getInitialChannelThreads(config.channels.modlogs).find((thread) => thread.name === name) ||
		(await config.channels.modlogs.threads.create({
			name,
			reason: "New logging thread",
			type: ChannelType[group === DATABASE_THREAD ? "PrivateThread" : "PublicThread"],
			invitable: group !== DATABASE_THREAD && undefined,
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
