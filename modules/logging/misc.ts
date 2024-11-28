import type { AnyThreadChannel, APIEmbed, Channel, Embed, Message, TextChannel } from "discord.js";
import type { LoggingEmojis, LoggingEmojisError } from "./util.js";

import { ButtonStyle, ComponentType, ThreadAutoArchiveDuration } from "discord.js";
import { getBaseChannel } from "strife.js";

import config from "../../common/config.js";
import features from "../../common/features.js";
import { LogSeverity } from "./util.js";

export function shouldLog(channel: Channel | null): boolean {
	const baseChannel = getBaseChannel(channel);

	if (!baseChannel) return true;
	if (baseChannel.isDMBased()) return false;
	if (baseChannel.guild.id !== config.guild.id) return false;
	return baseChannel.permissionsFor(config.roles.staff).has("ViewChannel");
}

let lastPing = 0;

export default async function log(
	content: `${LoggingEmojis | typeof LoggingEmojisError} ${string}`,
	group: LogSeverity | TextChannel,
	extra: {
		embeds?: (APIEmbed | Embed | undefined)[];
		files?: (string | { extension?: string; content: string })[];
		buttons?: ({ label: string } & (
			| { customId: string; style: Exclude<ButtonStyle, ButtonStyle.Link> }
			| { url: string }
		))[];
		pingHere?: boolean;
	} = {},
): Promise<Message<true>> {
	const thread = typeof group === "object" ? group : await getLoggingThread(group);

	const { external, embedded } = extra.files?.reduce<{
		external: (string | { extension?: string; content: string })[];
		embedded: { extension?: string | undefined; content: string }[];
	}>(
		(accumulator, file) => {
			if (typeof file === "string" || file.content.includes("```")) {
				return {
					embedded: accumulator.embedded,
					external: [...accumulator.external, file],
				};
			}

			const lines = file.content.split("\n");
			return lines.length > 10 || lines.some((line) => line.length > 100) ?
					{ embedded: accumulator.embedded, external: [...accumulator.external, file] }
				:	{ embedded: [...accumulator.embedded, file], external: accumulator.external };
		},
		{ external: [], embedded: [] },
	) ?? { external: [], embedded: [] };

	const shouldPing =
		extra.pingHere && features.ticketsPingForReports && Date.now() - lastPing > 90_000;
	if (shouldPing) lastPing = Date.now();

	return await thread.send({
		content:
			content +
			(shouldPing ? `${content.includes("\n") ? "\n" : " "}@here` : "") +
			(embedded.length ?
				embedded
					.map((file) => `\n\`\`\`${file.extension || ""}\n${file.content}\n\`\`\``)
					.join("")
			:	""),
		allowedMentions: { users: [], parse: shouldPing ? ["everyone"] : undefined },
		embeds: extra.embeds?.filter(Boolean),
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
			external.map(async (file) => {
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
			}),
		),
	});
}

export async function getLoggingThread(
	group: LogSeverity,
): Promise<TextChannel | AnyThreadChannel> {
	if (group === LogSeverity.Alert) return config.channels.modlogs;

	const name = `${group}) ${LogSeverity[group]
		.replaceAll(/([a-z])([A-Z])/g, "$1 $2")
		.toLowerCase()}s`;

	return (
		(await config.channels.modlogs.threads.fetch()).threads.find(
			(thread) => thread.name === name,
		) ??
		(await config.channels.modlogs.threads.create({
			name,
			reason: "New logging thread",
			autoArchiveDuration: ThreadAutoArchiveDuration.OneWeek,
		}))
	);
}
