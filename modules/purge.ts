import type {
	APIEmbed,
	BaseMessageOptions,
	GuildMember,
	InteractionReplyOptions,
	InteractionResponse,
	RepliableInteraction,
	User,
} from "discord.js";

import {
	ApplicationCommandOptionType,
	ApplicationCommandType,
	ButtonStyle,
	ComponentType,
} from "discord.js";
import { client, defineChatCommand, defineMenuCommand, disableComponents } from "strife.js";

import constants from "../common/constants.js";
import { messageToEmbed } from "../util/discord.js";

const MAX_FETCH_COUNT = 100;

async function purge(
	interaction: RepliableInteraction<"cached" | "raw">,
	options: { count: string; user?: GuildMember | User; message?: string },
): Promise<InteractionResponse | undefined> {
	const before = options.message?.match(/^(?:\d+-)?(?<id>\d+)$/)?.groups?.id ?? undefined;
	const numberCount = Number(options.count);
	const useId = Number.isNaN(numberCount) || numberCount > MAX_FETCH_COUNT;
	const { channel: channelId, id: countId } = (useId &&
		/^(?:(?<channel>\d+)-)?(?<id>\d+)$/.exec(options.count)?.groups) || { id: options.count };
	const channel =
		channelId ?
			await client.channels.fetch(channelId).catch(() => void 0)
		:	interaction.channel;
	if (!channel?.isTextBased() || channel.isDMBased())
		return await interaction.reply(
			`${constants.emojis.statuses.no} Could not find that channel!`,
		);
	const messages = await channel.messages.fetch({ limit: MAX_FETCH_COUNT, before });

	const filtered = [...messages.values()].filter(
		(message) =>
			(!options.user || message.author.id === options.user.id) && message.bulkDeletable,
	);

	let start = 0;
	let end =
		useId ?
			filtered.findIndex(({ id }) => id === countId) + 1
		:	Math.min(filtered.length, numberCount);

	async function generateMessage(): Promise<InteractionReplyOptions> {
		const sliced = filtered.slice(start, end);
		if (!sliced[0] || start >= end) {
			return {
				content: `${
					constants.emojis.statuses.no
				} No messages matched those filters! Note: I cannot detect messages more than ${MAX_FETCH_COUNT} messages ${
					before && channel ?
						`before [this message](<${channel.url}/${before}>). Try searching from an older message.`
					:	"ago. Use the `message` option to search backwards from a certain point."
				} Also, I can’t purge any messages more than 2 weeks old.`,
			};
		}

		const embeds: APIEmbed[] = [];

		const last = sliced.at(-1);
		if (sliced.length > 1 && last) embeds.push(await messageToEmbed(last));

		if (sliced.length > 2)
			embeds.push({
				description: `*${sliced.length - 2} more message${
					sliced.length === 3 ? "" : "s"
				}…*`,
			});

		embeds.push(await messageToEmbed(sliced[0]));

		return {
			content: `Are you sure you want to purge ${
				sliced.length === 1 ? "this message" : `these ${sliced.length} messages`
			}?`,
			embeds,
			components: [
				{
					type: ComponentType.ActionRow,
					components: [
						{
							type: ComponentType.Button,
							style: ButtonStyle.Link,
							label: "First Message",
							url: (last ?? sliced[0]).url,
						},
						{
							type: ComponentType.Button,
							customId: `first-remove-${interaction.id}`,
							style: ButtonStyle.Primary,
							disabled: start >= end - 1,
							label: "Remove First",
						},
						{
							type: ComponentType.Button,
							customId: `first-add-${interaction.id}`,
							style: ButtonStyle.Primary,
							disabled: end >= filtered.length,
							label: "Prepend One",
						},
					],
				},
				{
					type: ComponentType.ActionRow,
					components: [
						{
							type: ComponentType.Button,
							style: ButtonStyle.Link,
							label: "Last Message",
							url: sliced[0].url,
						},
						{
							type: ComponentType.Button,
							customId: `last-remove-${interaction.id}`,
							style: ButtonStyle.Primary,
							disabled: start >= end - 1,
							label: "Remove Last",
						},
						{
							type: ComponentType.Button,
							customId: `last-add-${interaction.id}`,
							style: ButtonStyle.Primary,
							disabled: start < 1,
							label: "Append One",
						},
					],
				},
				{
					type: ComponentType.ActionRow,
					components: [
						{
							type: ComponentType.Button,
							label: "Purge",
							style: ButtonStyle.Success,
							customId: `confirm-${interaction.id}`,
						},
					],
				},
			],
		} satisfies BaseMessageOptions;
	}

	const first = await generateMessage();
	let reply = await interaction.reply({ ...first, ephemeral: true, fetchReply: true });
	if (!first.embeds) return;

	const collector = reply.createMessageComponentCollector({
		idle: constants.collectorTime,
		time: (14 * 60 + 50) * 1000,
	});

	collector
		.on("collect", async (buttonInteraction) => {
			const split = buttonInteraction.customId.split("-");
			split.pop();

			switch (split[0]) {
				case "confirm": {
					const sliced = filtered.slice(start, end);
					await channel.bulkDelete(sliced);
					await buttonInteraction.reply(
						`${constants.emojis.statuses.yes} Purged ${sliced.length} message${
							sliced.length === 1 ? "" : "s"
						}!`,
					);
					collector.stop();
					return;
				}
				case "first": {
					if (split[1] === "remove") end--;
					else end++;
					break;
				}
				case "last": {
					if (split[1] === "remove") start++;
					else start--;
					break;
				}
			}

			await buttonInteraction.deferUpdate();

			const generated = await generateMessage();
			reply = await interaction.editReply(generated);

			if (!generated.embeds) collector.stop();
		})
		.on("end", async () => {
			await interaction.editReply({ components: disableComponents(reply.components) });
		});
}

defineChatCommand(
	{
		name: "purge",
		description: "Bulk delete a specified amount of messages",
		access: false,

		options: {
			count: {
				type: ApplicationCommandOptionType.String,

				description:
					"The number of messages to purge or a message ID to delete to (inclusive)",

				required: true,
			},

			user: {
				type: ApplicationCommandOptionType.User,
				description: "Only purge messages from this user",
			},

			message: {
				type: ApplicationCommandOptionType.String,

				description: "The message ID to count backwards from (exclusive).",
			},
		},

		restricted: true,
	},
	purge,
);
defineMenuCommand(
	{
		name: "Purge To Here",
		type: ApplicationCommandType.Message,
		access: false,
		restricted: true,
	},
	async (interaction) => {
		await purge(interaction, { count: interaction.targetMessage.id });
	},
);
