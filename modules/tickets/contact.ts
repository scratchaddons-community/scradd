import {
	ButtonStyle,
	ChannelType,
	ComponentType,
	GuildMember,
	InteractionType,
	type APIEmbedField,
	type AnySelectMenuInteraction,
	type ButtonInteraction,
	type InteractionResponse,
	type RepliableInteraction,
	type ThreadChannel,
} from "discord.js";
import config from "../../common/config.js";
import constants from "../../common/constants.js";
import { disableComponents } from "../../util/discord.js";
import log from "../logging/misc.js";
import { LogSeverity, LoggingEmojis } from "../logging/util.js";
import { listStrikes } from "../punishments/util.js";
import {
	MOD_CATEGORY,
	SA_CATEGORY,
	SERVER_CATEGORY,
	TICKETS_BY_MEMBER,
	TICKET_CATEGORIES,
	allFields,
	categoryToDescription,
	type Category,
} from "./misc.js";

export async function showTicketModal(
	interaction: AnySelectMenuInteraction,
): Promise<InteractionResponse | undefined>;
export async function showTicketModal(
	interaction: ButtonInteraction,
	category: Exclude<Category, "appeal">,
): Promise<InteractionResponse | undefined>;
export async function showTicketModal(
	interaction: ButtonInteraction,
	category: "appeal",
	strikeId: string,
): Promise<InteractionResponse | undefined>;
export async function showTicketModal(
	interaction: AnySelectMenuInteraction | ButtonInteraction,
	category?: Category,
	strikeId?: string,
): Promise<InteractionResponse | undefined> {
	const option = interaction.isAnySelectMenu() ? interaction.values[0] : category;

	if (option === SA_CATEGORY) {
		return await interaction.reply({
			content: `${
				constants.emojis.statuses.no
			} Please don’t contact mods for SA help. Instead, put your suggestions in ${
				config.channels.suggestions?.toString() ?? "#suggestions"
			}, bug reports in ${
				config.channels.bugs?.toString() ?? "#bugs"
			}, and other questions, comments, concerns, or etcetera in ${
				config.channels.support?.toString() ?? "#support"
			}.`,

			ephemeral: true,
		});
	}

	if (option === SERVER_CATEGORY && config.channels.server) {
		return await interaction.reply({
			content: `${
				constants.emojis.statuses.no
			} Please don’t contact mods for server suggestions. Instead, share them in ${config.channels.server.toString()}.`,

			ephemeral: true,
		});
	}

	if (!option || !TICKET_CATEGORIES.includes(option))
		throw new TypeError(`Unknown ticket category: ${option ?? "`undefined`"}`);

	const fields = allFields[option];

	await interaction.showModal({
		title: categoryToDescription[option],
		customId: `${option}_contactMods`,
		components: fields.map((field) => ({
			type: ComponentType.ActionRow,
			components: [field.customId === "strike" ? { ...field, value: strikeId } : field],
		})),
	});
}
export default async function contactMods(
	interaction: RepliableInteraction,
	options: Category | GuildMember,
): Promise<ThreadChannel> {
	const category = options instanceof GuildMember ? MOD_CATEGORY : options;

	const member =
		options instanceof GuildMember ? options : (
			interaction.member ?? (await config.guild.members.fetch(interaction.user.id))
		);
	if (!(member instanceof GuildMember)) throw new TypeError("member is not a GuildMember!");

	if (!config.channels.tickets) throw new ReferenceError("Could not find tickets channel!");

	const fields =
		interaction.type === InteractionType.ModalSubmit ?
			Object.entries(
				{
					appeal: { "🔨 Strike ID": "strike" },
					report: { "👤 Reported User": "user" },
					role: { "🗄️ Role(s)": "role", "👥 Account(s)": "account" },
					bug: {},
					update: {},
					rules: { "📜 Rule": "rule" },
					server: {},
					other: {},
					[MOD_CATEGORY]: {},
				}[category],
			).map<APIEmbedField>(([name, key]) => ({
				name,
				value: interaction.fields.getTextInputValue(key),
				inline: true,
			}))
		:	[];
	const body =
		category !== "role" &&
		interaction.type === InteractionType.ModalSubmit &&
		interaction.fields.getTextInputValue("BODY");
	const details = {
		title: categoryToDescription[category],

		color: member.displayColor,

		author: { icon_url: member.displayAvatarURL(), name: member.displayName },
		...(body ?
			fields.length ?
				{ fields: [...fields, { name: constants.zws, value: body }] }
			:	{ description: body }
		:	{ fields }),
	};

	const oldThread = TICKETS_BY_MEMBER[member.id];
	if (oldThread) {
		await oldThread.setLocked(false, "Unlocking due to new ticket sent");
		await oldThread.send({ embeds: [details] });
		return oldThread;
	}

	const thread = await config.channels.tickets.threads.create({
		name: `${member.user.displayName} (${member.id})`,
		reason: `${interaction.user.tag} contacted ${
			category === MOD_CATEGORY ? member.user.tag : "mods"
		}`,
		type: ChannelType.PrivateThread,
		invitable: false,
	});
	TICKETS_BY_MEMBER[member.id] = thread;
	await log(
		`${LoggingEmojis.Thread} ${interaction.user.toString()} contacted ${
			category === MOD_CATEGORY ? member.toString() : "mods"
		}: ${thread.toString()}`,
		LogSeverity.Alert,
	);

	const ping =
		category === MOD_CATEGORY || constants.env === "development" ?
			""
		:	config.roles.helper.toString();
	await (["appeal", "report", "other", MOD_CATEGORY].includes(category) ?
		listStrikes(
			member,
			(data) =>
				thread.send({
					...data,
					flags: undefined,
					embeds: [details, ...(data.embeds ?? [])],
					content: ping,
					allowedMentions: { parse: ["roles"] },
				}),
			{ removed: true },
		)
	:	thread.send({ embeds: [details], content: ping, allowedMentions: { parse: ["roles"] } }));

	await thread.members.add(member, "Thread created");
	return thread;
}

export async function contactUser(
	member: GuildMember,
	interaction: RepliableInteraction,
): Promise<void> {
	await interaction.deferReply({ ephemeral: true });
	const existingThread = TICKETS_BY_MEMBER[member.id];

	if (existingThread) {
		await interaction.editReply(
			`${
				constants.emojis.statuses.no
			} ${member.toString()} already has a ticket open! Talk to them in ${existingThread.toString()}.`,
		);

		return;
	}

	const message = await interaction.editReply({
		content: `Are you sure you want to contact **${member.toString()}**?`,
		components: [
			{
				type: ComponentType.ActionRow,
				components: [
					{
						type: ComponentType.Button,
						label: "Contact",
						style: ButtonStyle.Success,
						customId: `confirm-${interaction.id}`,
					},
				],
			},
		],
		allowedMentions: { users: [] },
	});

	const collector = message.createMessageComponentCollector({
		filter: (buttonInteraction) => buttonInteraction.user.id === interaction.user.id,
		time: constants.collectorTime,
		max: 1,
	});

	collector
		.on("collect", async (buttonInteraction) => {
			await buttonInteraction.deferReply({ ephemeral: true });
			const thread = await contactMods(interaction, member);
			await buttonInteraction.editReply(
				`${
					constants.emojis.statuses.yes
				} **Ticket opened!** Send ${member.toString()} a message in ${thread.toString()}.`,
			);
		})
		.on("end", async () => {
			await interaction.editReply({ components: disableComponents(message.components) });
		});
}
