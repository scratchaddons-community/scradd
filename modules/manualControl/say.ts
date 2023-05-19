import {
	type ModalSubmitInteraction,
	type ChatInputCommandInteraction,
	ComponentType,
	chatInputApplicationCommandMention,
	MessageFlags,
	TextInputStyle,
	AutocompleteInteraction,
	cleanContent,
	Constants,
	MessageType,
	Snowflake,
} from "discord.js";
import { messageToText } from "../../util/discord.js";
import Fuse from "fuse.js";
import { truncateText } from "../../util/text.js";
import { stripMarkdown } from "../../util/markdown.js";
import config from "../../common/config.js";
import constants from "../../common/constants.js";
import log, { LoggingEmojis } from "../modlogs/misc.js";

const fetchedChannels = new Set<Snowflake>();
export async function sayAutocomplete(interaction: AutocompleteInteraction<"cached" | "raw">) {
	if (!interaction.channel) return await interaction.respond([]);
	if (!fetchedChannels.has(interaction.channel.id)) {
		interaction.channel.messages
			.fetch({ limit: 100 })
			.then(() => fetchedChannels.add(interaction.channel?.id ?? ""));
	}
	const messages = await Promise.all(
		interaction.channel.messages.cache
			.sort((one, two) => +two.createdAt - +one.createdAt)
			.filter(
				(message) =>
					!message.flags.has("Ephemeral") &&
					(Constants.NonSystemMessageTypes as MessageType[]).includes(message.type),
			)
			.map(async (message) => ({
				...message,
				content: await messageToText(message, false),
			})) ?? [],
	);
	const reply = interaction.options.getString("reply", true);
	if (!reply) return await interaction.respond(messages.slice(0, 25).map(getMessageInfo));

	const fuse = new Fuse(messages, {
		findAllMatches: true,
		ignoreLocation: true,
		includeScore: true,

		keys: [
			{ name: "content", weight: 1 },
			{ name: "embeds.title", weight: 0.8 },
			{ name: "embeds.description", weight: 0.7 },
			{ name: "embeds.fields.name", weight: 0.6 },
			{ name: "embeds.fields.value", weight: 0.6 },
			{ name: "id", weight: 0.5 },
			{ name: "embeds.footer.text", weight: 0.4 },
			{ name: "embeds.author.name", weight: 0.3 },
			{ name: "interaction.commandName", weight: 0.3 },
			{ name: "attachments.name", weight: 0.3 },
			{ name: "sticker.name", weight: 0.3 },
			{ name: "author.username", weight: 0.2 },
			{ name: "components.label", weight: 0.2 },
			{ name: "components.placeholder", weight: 0.1 },
		],
	});
	await interaction.respond(
		fuse
			.search(reply)
			.filter(({ score }, index) => index < 25 && (score ?? 0) < 0.1)
			.map((message) => getMessageInfo(message.item)),
	);
	function getMessageInfo(message: typeof messages[number]) {
		const component = message.components[0]?.components[0];
		return {
			name: `@${message.author.username} - ${truncateText(
				message.content
					? stripMarkdown(
							interaction.channel
								? cleanContent(message.content, interaction.channel)
								: message.content,
					  )
					: message.embeds[0]?.title ||
							message.stickers.first()?.name ||
							(component?.type === ComponentType.Button
								? component.label
								: component?.placeholder) ||
							message.attachments.first()?.name ||
							"",
				40,
			)} (${new Date(message.createdTimestamp).toLocaleDateString("en-us", {
				month: "short",
				day: "2-digit",
				hour: "2-digit",
				minute: "2-digit",
				second: "2-digit",
				hour12: true,
			})})`,
			value: message.id,
		};
	}
}

/**
 * Mimic something.
 *
 * @param interaction - The interaction that triggered this mimic.
 * @param content - What to mimic.
 */
export async function say(
	interaction: ChatInputCommandInteraction<"cached" | "raw"> | ModalSubmitInteraction,
	content: string,
	reply?: string,
) {
	const silent = content.startsWith("@silent");
	content = silent ? content.replace("@silent", "").trim() : content;
	const noPing = reply?.startsWith("-");
	reply = noPing ? reply?.replace("-", "") : reply;
	const oldMessage = reply && (await interaction.channel?.messages.fetch(reply).catch(() => {}));
	if (reply && !oldMessage)
		return interaction.reply({
			content: `${constants.emojis.statuses.no} Could not find message to reply to!`,
			ephemeral: true,
		});

	const message = await (oldMessage
		? oldMessage.reply({
				content,
				flags: silent ? MessageFlags.SuppressNotifications : undefined,
				allowedMentions: { repliedUser: !noPing },
		  })
		: interaction.channel?.send({
				content,
				flags: silent ? MessageFlags.SuppressNotifications : undefined,
		  }));

	if (message) {
		await log(
			`${LoggingEmojis.Bot} ${chatInputApplicationCommandMention(
				"say",
				(await config.guild.commands.fetch()).find(({ name }) => name === "say")?.id ?? "",
			)} used by ${interaction.user.toString()} in ${message.channel.toString()}`,
			"messages",
			{ button: { label: "View Message", url: message.url } },
		);
		await interaction.reply({
			content: `${constants.emojis.statuses.yes} Message sent!`,
			ephemeral: true,
		});
	}
}

export default async function sayCommand(
	interaction: ChatInputCommandInteraction<"cached" | "raw">,
) {
	const content = interaction.options.getString("message");
	const reply = interaction.options.getString("reply");
	if (content) {
		await say(interaction, content, reply || undefined);
		return;
	}

	await interaction.showModal({
		title: `Send Message`,
		customId: `${reply ?? ""}_say`,

		components: [
			{
				type: ComponentType.ActionRow,

				components: [
					{
						type: ComponentType.TextInput,
						customId: "message",
						label: "Message Content",
						maxLength: 2000,
						required: true,
						style: TextInputStyle.Paragraph,
					},
				],
			},
		],
	});
	return await interaction.channel?.sendTyping();
}
