import {
	ApplicationCommandOptionType,
	ButtonStyle,
	ChannelType,
	ComponentType,
	GuildMember,
} from "discord.js";
import client from "../../client.js";
import defineCommand from "../../commands.js";
import CONSTANTS from "../../common/CONSTANTS.js";
import { defineButton, defineModal, defineSelect } from "../../components.js";
import defineEvent from "../../events.js";
import { getSettings, updateSettings } from "../settings.js";
import { Category, getThreadFromMember, SA_CATEGORY, TICKET_CATEGORIES } from "./misc.js";
import startTicket, { contactUser, gatherTicketInfo } from "./open.js";

defineEvent("messageCreate", async (message) => {
	if (
		message.channel.type === ChannelType.DM &&
		message.author.id !== client.user.id &&
		// TODO CONSTANTS.channels.contact?.permissionsFor(message.author)?.has("ViewChannel") &&
		!getSettings(message.author).resourcesDmed
	) {
		await message.channel.send({
			components: [
				{
					type: ComponentType.ActionRow,
					components: [
						{
							type: ComponentType.Button,
							style: ButtonStyle.Link,
							label: "Server Rules",
							url: CONSTANTS.guild.rulesChannel?.url || "",
						},
						// {
						// 	type: ComponentType.Button,
						// 	style: ButtonStyle.Link,
						// 	label: "FAQ",
						// 	url: "TODO",
						// },
						{
							type: ComponentType.Button,
							style: ButtonStyle.Secondary,
							label: "Contact Mods",
							custom_id: "_contactMods",
						},
						// {
						// 	type: ComponentType.Button,
						// 	style: ButtonStyle.Link,
						// 	label: "SA Support",
						// 	url: "TODO",
						// },
					],
				},
			],
		});
		updateSettings(message.author, { resourcesDmed: true });
	}
});
defineButton("contactMods", async (interaction) => {
	await interaction.reply({
		content: `👍 Thanks for reaching out!`,
		components: [
			{
				type: ComponentType.ActionRow,
				components: [
					{
						type: ComponentType.StringSelect,
						customId: "_contactMods",
						options: Object.entries({
							appeal: "Appeal a strike",
							report: "Report a user",
							role: "Request a contributor role",
							bug: "Report a Scradd bug",
							update: "Suggest a server change",
							rules: "Get clarification on a rule",
							[SA_CATEGORY]: "Get help with Scratch Addons",
							server: "Add your server to Other Scratch Servers",
							other: "Other",
						} satisfies Record<Category | typeof SA_CATEGORY, string>).map(
							([value, label]) => ({
								value,
								label,
							}),
						),
						placeholder: "What do you need help with?",
					},
				],
			},
		],
		ephemeral: true,
	});
});
defineSelect("contactMods", async (interaction) => {
	return await gatherTicketInfo(interaction);
});
defineButton("appealStrike", async (interaction, id = "") => {
	return await gatherTicketInfo(interaction, "appeal", id);
});
defineModal("contactMods", async (interaction, id) => {
	if (!TICKET_CATEGORIES.includes(id)) throw new TypeError(`Unknown ticket category: ${id}`);

	await interaction.deferReply({ ephemeral: true });
	const thread = id && (await startTicket(interaction, id));
	if (thread)
		await interaction.editReply(
			`${
				CONSTANTS.emojis.statuses.yes
			} **Ticket opened!** Send the mods messages in ${thread?.toString()}.`,
		);
});

defineCommand(
	{
		name: "open-ticket",
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

	async (interaction) => {
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
);

defineButton("contactUser", async (interaction, userId = "") => {
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
});

defineEvent("guildMemberRemove", async (member) => {
	if (member.guild.id !== CONSTANTS.guild.id) return;
	await getThreadFromMember(member.partial ? await member.fetch() : member).then(
		async (thread) => {
			await thread?.setArchived(true, "Member left");
		},
	);
});
