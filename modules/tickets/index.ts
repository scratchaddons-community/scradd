import type { Category } from "./misc.ts";

import {
	ApplicationCommandOptionType,
	ApplicationCommandType,
	ButtonStyle,
	ChannelType,
	ComponentType,
	GuildMember,
	TextInputStyle,
	userMention,
} from "discord.js";
import {
	client,
	defineButton,
	defineChatCommand,
	defineEvent,
	defineMenuCommand,
	defineModal,
	defineSelect,
	disableComponents,
} from "strife.js";

import config from "../../common/config.ts";
import constants from "../../common/constants.ts";
import log from "../logging/misc.ts";
import { extraAuditLogsInfo, LoggingEmojis, LogSeverity } from "../logging/util.ts";
import contactMods, { contactUser, showTicketModal } from "./contact.ts";
import {
	getIdFromName,
	SA_CATEGORY,
	SERVER_CATEGORY,
	TICKET_CATEGORIES,
	TICKETS_BY_MEMBER,
} from "./misc.ts";

const appealedStrikes = new Set<string>();

defineButton("contactMods", async (interaction) => {
	await interaction.reply({
		content: `${constants.emojis.statuses.yes} Thanks for reaching out!`,
		components: [
			{
				type: ComponentType.ActionRow,
				components: [
					{
						type: ComponentType.StringSelect,
						customId: "_contactMods",
						options: [
							...Object.entries({
								appeal: "Appeal a strike",
								report: "Report a user",
								role: "Request a contributor role",
								bug: `Report a ${client.user.displayName} bug`,
								[SERVER_CATEGORY]: "Suggest a server change",
								rules: "Get clarification on a rule",
								[SA_CATEGORY]: "Get help with Scratch Addons",
								server: "Add your server to Other Scratch Servers",
								other: "Other",
							} satisfies Record<
								Category | typeof SA_CATEGORY | typeof SERVER_CATEGORY,
								string
							>),
						].map(([value, label]) => ({ value, label })),
						placeholder: "What do you need help with?",
					},
				],
			},
		],
		ephemeral: true,
	});
});
defineSelect("contactMods", async (interaction) => {
	return await showTicketModal(interaction);
});
defineButton("confirmStrikeAppeal", async (interaction, id) => {
	return await interaction.reply({
		ephemeral: true,
		content:
			"## Strike Appeal\nThis form is for letting us know if we made a mistake so we can remove the strike. If you just made a mistake, don’t worry, strikes expire after 21 days, and just a couple strikes don’t ban you.\nIf you believe this strike was given in error and needs to be removed, please click below.",

		components: [
			{
				type: ComponentType.ActionRow,
				components: [
					{
						customId: `${id}_appealStrike`,
						label: "Fill out the form",
						style: ButtonStyle.Primary,
						type: ComponentType.Button,
					},
				],
			},
		],
	});
});
defineButton("appealStrike", async (interaction, id) => {
	if (appealedStrikes.has(id)) {
		return await interaction.reply({
			content: `${constants.emojis.statuses.no} You have already appealed this strike.`,
			ephemeral: true,
		});
	}
	return await showTicketModal(interaction, "appeal", id);
});
defineModal("contactMods", async (interaction, category) => {
	if (!TICKET_CATEGORIES.includes(category))
		throw new TypeError(`Unknown ticket category: ${category}`);

	if (!interaction.inGuild()) {
		const reply =
			interaction.message?.reference && (await interaction.message.fetchReference());
		await reply?.edit({ components: disableComponents(reply.components) });
	}

	await interaction.deferReply({ ephemeral: true });
	const thread = await contactMods(interaction, category);
	await interaction.editReply(
		`${
			constants.emojis.statuses.yes
		} **Ticket opened!** Send the mods messages in ${thread.toString()}.`,
	);

	if (category === "appeal") appealedStrikes.add(interaction.fields.getTextInputValue("strike"));
});
defineMenuCommand(
	{ name: "Report Message", type: ApplicationCommandType.Message },
	async (interaction) => {
		if (interaction.targetMessage.author.id === interaction.user.id) {
			return await interaction.reply({
				ephemeral: true,
				content: `${constants.emojis.statuses.no} You can’t report your own messages!`,
			});
		}
		await interaction.showModal({
			title: "Report Message",
			customId: `${interaction.targetMessage.id}_report`,
			components: [
				{
					type: ComponentType.ActionRow,
					components: [
						{
							type: ComponentType.TextInput,
							style: TextInputStyle.Paragraph,
							label: "Please explain how this message breaks rules",
							required: true,
							customId: "reason",
							minLength: 10,
							maxLength: 200,
						},
					],
				},
			],
		});
	},
);
defineModal("report", async (interaction, messageId) => {
	const message = await interaction.channel?.messages.fetch(messageId).catch(() => void 0);
	if (!message) {
		await interaction.reply({
			content: `${
				constants.emojis.statuses.no
			} Cannot report that message! Has it already been deleted?`,
			ephemeral: true,
		});
		return;
	}

	await log(
		`${LoggingEmojis.Punishment} ${interaction.user.toString()} reported [a message](<${
			message.url
		}>)${extraAuditLogsInfo({
			executor: message.author,
			reason: interaction.fields.getTextInputValue("reason"),
		})}`,
		LogSeverity.Alert,
		{
			pingHere: true,
			buttons: [
				{
					label: "Contact Reporter",
					style: ButtonStyle.Secondary,
					customId: `${interaction.user.id}_contactUser`,
				},
				{
					label: "Contact Reportee",
					style: ButtonStyle.Secondary,
					customId: `${message.author.id}_contactUser`,
				},
			],
		},
	);
	await interaction.reply({
		content: `${
			constants.emojis.statuses.yes
		} Thanks for the report! Please do not spam or meaninglessly report, or you may be blacklisted from reporting.`,
		ephemeral: true,
	});
});

defineChatCommand(
	{
		name: "contact-user",
		description: "Start a private mod ticket with a member",
		restricted: true,

		options: {
			user: {
				required: true,
				type: ApplicationCommandOptionType.User,
				description: "The member to contact",
			},
		},
	},

	async (interaction, options) => {
		if (!(options.user instanceof GuildMember)) {
			await interaction.reply({
				content: `${constants.emojis.statuses.no} Could not find user.`,
				ephemeral: true,
			});

			return;
		}

		await contactUser(options.user, interaction);
	},
);
defineMenuCommand(
	{ name: "Contact User", type: ApplicationCommandType.User, restricted: true },
	async (interaction) => {
		if (!(interaction.targetMember instanceof GuildMember)) {
			await interaction.reply({
				content: `${constants.emojis.statuses.no} Could not find user.`,
				ephemeral: true,
			});

			return;
		}

		await contactUser(interaction.targetMember, interaction);
	},
);

defineButton("contactUser", async (interaction, userId = "") => {
	if (
		!(interaction.member instanceof GuildMember ?
			interaction.member.roles.resolve(config.roles.mod.id)
		:	interaction.member?.roles.includes(config.roles.mod.id))
	) {
		return await interaction.reply({
			ephemeral: true,
			content: `${constants.emojis.statuses.no} You don’t have permission to contact users!`,
		});
	}

	const member = await config.guild.members.fetch(userId).catch(() => void 0);
	if (!member) {
		await interaction.reply({
			content: `${constants.emojis.statuses.no} Could not find member.`,
			ephemeral: true,
		});

		return;
	}
	await contactUser(member, interaction);
});

defineEvent("guildMemberRemove", async (member) => {
	if (member.guild.id !== config.guild.id) return;

	await TICKETS_BY_MEMBER[member.id]?.setArchived(true, "Member left");
});

defineEvent("threadUpdate", async (oldThread, newThread) => {
	if (
		newThread.parent?.id !== config.channels.tickets?.id ||
		newThread.type !== ChannelType.PrivateThread ||
		oldThread.archived === newThread.archived ||
		!newThread.editable
	)
		return;
	const memberId = getIdFromName(newThread.name);
	if (!memberId) return;

	const existing = TICKETS_BY_MEMBER[memberId];
	if (newThread.archived) {
		TICKETS_BY_MEMBER[memberId] = undefined;
		if (newThread.sendable && !newThread.locked) {
			await newThread.setArchived(false, "To lock it");
			await newThread.edit({ archived: true, locked: true, reason: "Was closed" });
		}
	} else if (newThread.locked) {
		TICKETS_BY_MEMBER[memberId] = undefined;
	} else if (existing) {
		await newThread.send(
			`${constants.emojis.statuses.no} ${userMention(
				memberId,
			)} already has another ticket open! Please use ${existing.toString()}.`,
		);
		await newThread.edit({
			archived: true,
			locked: true,
			reason: "Reopened while another ticket is already open",
		});
	} else {
		TICKETS_BY_MEMBER[memberId] = newThread;
	}
});

defineEvent("messageReactionAdd", async (partialReaction) => {
	const reaction = partialReaction.partial ? await partialReaction.fetch() : partialReaction;
	if (reaction.message.channel.id === config.channels.tickets?.id) await reaction.remove();
});
