import {
	ApplicationCommandOptionType,
	ButtonInteraction,
	ButtonStyle,
	ChatInputCommandInteraction,
	ComponentType,
	GuildMember,
} from "discord.js";

import CONSTANTS from "../common/CONSTANTS.js";
import startTicket, {
	gatherTicketInfo,
	getThreadFromMember,
	ticketCategoryMessage,
	TICKET_CATEGORIES,
} from "../common/contactMods.js";
import { defineCommand } from "../common/types/command.js";
import { disableComponents } from "../util/discord.js";

const command = defineCommand({
	data: {
		description: "(Mods only) Start a private ticket with a user",
		restricted: true,

		options: {
			user: {
				required: true,
				type: ApplicationCommandOptionType.User,
				description: "The user to contact",
			},
		},
	},

	async interaction(interaction) {
		const member = interaction.options.getMember("user");
		if (!(member instanceof GuildMember)) {
			await interaction.reply({
				content: `${CONSTANTS.emojis.statuses.no} Could not find user.`,
				ephemeral: true,
			});

			return;
		}

		await contactUser(member, interaction);
	},

	buttons: {
		async contactMods(interaction) {
			await interaction.reply(ticketCategoryMessage);
		},
		async contactUser(interaction, userId = "") {
			if (
				!CONSTANTS.roles.mod ||
				!(interaction.member instanceof GuildMember
					? interaction.member.roles.resolve(CONSTANTS.roles.mod.id)
					: interaction.member?.roles.includes(CONSTANTS.roles.mod.id))
			) {
				return await interaction.reply({
					ephemeral: true,
					content: `${CONSTANTS.emojis.statuses.no} You don’t have permission to open a ticket for someone else!`,
				});
			}

			const member = await CONSTANTS.guild.members.fetch(userId);
			await contactUser(member, interaction);
		},
		async appealStrike(interaction) {
			return await gatherTicketInfo(interaction, "appeal");
		},
	},

	stringSelects: {
		async contactMods(interaction) {
			return await gatherTicketInfo(interaction);
		},
	},

	modals: {
		async contactMods(interaction, id) {
			if (!TICKET_CATEGORIES.includes(id))
				throw new TypeError(`Unknown ticket category: ${id}`);
			const thread = id && (await startTicket(interaction, id));
			if (thread)
				await interaction.reply({
					content: `${
						CONSTANTS.emojis.statuses.yes
					} **Ticket opened!** Send the mods messages in ${thread?.toString()}.`,
					ephemeral: true,
				});
			return;
		},
	},
});
export default command;

async function contactUser(
	member: GuildMember,
	interaction: ChatInputCommandInteraction<"cached" | "raw"> | ButtonInteraction,
) {
	const existingThread = await getThreadFromMember(member);

	if (existingThread) {
		await interaction.reply({
			content: `${
				CONSTANTS.emojis.statuses.no
			} ${member.toString()} already has a ticket open! Talk to them in ${existingThread.toString()}.`,

			ephemeral: true,
		});

		return;
	}

	const message = await interaction.reply({
		content: `Are you sure you want to start a ticket with **${member.toString()}**?`,
		components: [
			{
				type: ComponentType.ActionRow,
				components: [
					{
						type: ComponentType.Button,
						label: "Confirm",
						style: ButtonStyle.Success,
						customId: `confirm-${interaction.id}`,
					},
					{
						type: ComponentType.Button,
						label: "Cancel",
						customId: `cancel-${interaction.id}`,
						style: ButtonStyle.Danger,
					},
				],
			},
		],
		fetchReply: true,
		allowedMentions: { users: [] },
	});

	const collector = message.createMessageComponentCollector({
		filter: (buttonInteraction) =>
			buttonInteraction.customId.endsWith(`-${interaction.id}`) &&
			buttonInteraction.user.id === interaction.user.id,

		time: CONSTANTS.collectorTime,
		max: 1,
	});

	collector
		.on("collect", async (buttonInteraction) => {
			if (buttonInteraction.customId.startsWith("confirm-")) {
				const thread = await startTicket(interaction, member);
				if (thread)
					await buttonInteraction.reply(
						`${
							CONSTANTS.emojis.statuses.yes
						} **Ticket opened!** Send ${member.toString()} a message in ${thread.toString()}.`,
					);
			} else {
				await buttonInteraction.deferUpdate();
			}
		})
		.on("end", async () => {
			await message.edit({ components: disableComponents(message.components) });
		});
}
