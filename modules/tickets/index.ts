import {
	ApplicationCommandOptionType,
	ApplicationCommandType,
	ButtonStyle,
	ChannelType,
	ComponentType,
	GuildMember,
	TextInputStyle,
	channelLink,
} from "discord.js";
import config from "../../common/config.js";
import constants from "../../common/constants.js";
import {
	client,
	defineChatCommand,
	defineEvent,
	defineButton,
	defineModal,
	defineSelect,
	defineMenuCommand,
} from "strife.js";
import {
	type Category,
	SA_CATEGORY,
	SERVER_CATEGORY,
	TICKET_CATEGORIES,
	TICKETS_BY_MEMBER,
	getIdFromName,
} from "./misc.js";
import contactMods, { contactUser, showTicketModal } from "./contact.js";
import log, { LogSeverity, LoggingEmojis } from "../logging/misc.js";

const resourcesDmed = new Set<string>();

defineEvent("messageCreate", async (message) => {
	if (
		message.channel.type === ChannelType.DM &&
		message.author.id !== client.user.id &&
		!resourcesDmed.has(message.author.id)
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
							url: config.guild.rulesChannel?.url || "",
						},
						// {
						// 	type: ComponentType.Button,
						// 	style: ButtonStyle.Link,
						// 	label: "FAQ",
						// 	url: `https://discord.com/channels/${config.guild.id}/1099457798452035646`,
						// },
						...(config.channels.tickets
							?.permissionsFor(message.author)
							?.has("ViewChannel")
							? [
									{
										type: ComponentType.Button,
										style: ButtonStyle.Secondary,
										label: "Contact Mods",
										custom_id: "_contactMods",
									} as const,
							  ]
							: []),
						{
							type: ComponentType.Button,
							style: ButtonStyle.Link,
							label: "SA Support",
							url: channelLink(config.guild.id, config.channels.support),
						},
					],
				},
			],
		});
		resourcesDmed.add(message.author.id);
	}
});
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
						options: Object.entries({
							appeal: "Appeal a strike",
							report: "Report a user",
							role: "Request a contributor role",
							bug: "Report a Scradd bug",
							[SERVER_CATEGORY]: "Suggest a server change",
							rules: "Get clarification on a rule",
							[SA_CATEGORY]: "Get help with Scratch Addons",
							server: "Add your server to Other Scratch Servers",
							other: "Other",
						} satisfies Record<Category | typeof SA_CATEGORY | typeof SERVER_CATEGORY, string>).map(
							([value, label]) => ({ value, label }),
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
	return await showTicketModal(interaction);
});
defineButton("confirmStrikeAppeal", async (interaction, id) => {
	return await interaction.reply({
		ephemeral: true,
		content:
			"**Strike Appeal**\nThis form is for letting us know if we made a mistake so we can remove the strike. If you just made a mistake, don’t worry, strikes expire after 21 days, and just a couple strikes don’t ban you.\nIf you belive this strike was given in error and needs to be removed, please click below.",

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
	return await showTicketModal(interaction, "appeal", id);
});
defineModal("contactMods", async (interaction, id) => {
	if (!TICKET_CATEGORIES.includes(id)) throw new TypeError(`Unknown ticket category: ${id}`);

	await interaction.deferReply({ ephemeral: true });
	const thread = await contactMods(interaction, id);
	await interaction.editReply(
		`${
			constants.emojis.statuses.yes
		} **Ticket opened!** Send the mods messages in ${thread.toString()}.`,
	);
});
defineMenuCommand(
	{ name: "Report Message", type: ApplicationCommandType.Message, access: false },
	async (interaction) => {
		await interaction.showModal({
			title: "Report Message",
			customId: interaction.id,
			components: [
				{
					type: ComponentType.ActionRow,
					components: [
						{
							type: ComponentType.TextInput,
							style: TextInputStyle.Paragraph,
							label: "Concisely explain how this message breaks the rules",
							required: true,
							customId: "reason",
							minLength: 10,
							maxLength: 200,
						},
					],
				},
			],
		});

		const modalInteraction = await interaction
			.awaitModalSubmit({
				time: constants.collectorTime,
				filter: (modalInteraction) => modalInteraction.customId === interaction.id,
			})
			.catch(() => void 0);

		if (!modalInteraction) return;
		const reason = modalInteraction.fields.getTextInputValue("reason");

		await log(
			`${LoggingEmojis.Punishment} ${interaction.user} reported a message by ${interaction.targetMessage.author} - ${interaction.targetMessage.url}\n${reason}`,
			LogSeverity.Alert,
			{
				buttons: [
					{
						label: "Contact Reporter",
						style: ButtonStyle.Secondary,
						customId: `${interaction.user.id}_contactUser`,
					},
					{
						label: "Contact Reportee",
						style: ButtonStyle.Secondary,
						customId: `${interaction.targetMessage.author.id}_contactUser`,
					},
				],
			},
		);
		await interaction.reply({
			content: `${constants.emojis.statuses.yes} Thanks for the report! Please do not spam or meaninglessly report, or you may be blacklisted from reporting.`,
			ephemeral: true,
		});
	},
);

defineChatCommand(
	{
		name: "contact-user",
		description: "(Mod only) Start a private ticket with a user",
		restricted: true,

		options: {
			user: {
				required: true,
				type: ApplicationCommandOptionType.User,
				description: "The user to contact",
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
		!config.roles.mod ||
		!(interaction.member instanceof GuildMember
			? interaction.member.roles.resolve(config.roles.mod.id)
			: interaction.member?.roles.includes(config.roles.mod.id))
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
		oldThread.archived === newThread.archived
	)
		return;
	const memberId = getIdFromName(newThread.name);
	if (!memberId) return;

	if (newThread.archived) {
		TICKETS_BY_MEMBER[memberId] = undefined;
		if (!newThread.locked) {
			await newThread.setArchived(false, "To lock it");
			await newThread.setLocked(true, "Was closed");
		}
	} else if (TICKETS_BY_MEMBER[memberId]) {
		await newThread.setArchived(true, "Reopened while another ticket is already open");
		await newThread.setLocked(true, "Reopened while another ticket is already open");
	} else {
		TICKETS_BY_MEMBER[memberId] = newThread;
	}
});
