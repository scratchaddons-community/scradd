import {
	ButtonStyle,
	ComponentType,
	GuildMember,
	TextInputStyle,
	time,
	type ButtonInteraction,
	type ModalSubmitInteraction,
} from "discord.js";
import { client } from "strife.js";
import config, { getInitialThreads } from "../../common/config.js";
import constants from "../../common/constants.js";
import { getAllMessages } from "../../util/discord.js";
import { EXPIRY_LENGTH } from "../punishments/misc.js";
import { strikeDatabase } from "../punishments/util.js";
import giveXp from "../xp/give-xp.js";
import { getLevelForXp } from "../xp/misc.js";
import { getWeeklyXp, xpDatabase } from "../xp/util.js";

const thread =
	(await getInitialThreads(config.channels.admin, " Interest Forms")
		.first()
		?.setName("Staff Interest Forms")) ??
	(await config.channels.admin.threads.create({
		name: "Staff Interest Forms",
		reason: "For staff interest forms",
	}));

const applications = Object.fromEntries(
	(await getAllMessages(thread))
		.filter((message) => message.author.id === client.user.id && message.embeds.length)
		.map(
			(message) =>
				[
					message.embeds[0]?.description ?? "",
					{
						timezone: message.embeds[0]?.fields.find(
							(field) => field.name == "Timezone",
						)?.value,
						activity: message.embeds[0]?.fields.find(
							(field) => field.name == "Activity",
						)?.value,
						age: message.embeds[0]?.fields.find((field) => field.name == "Age")?.value,
						experience: message.embeds[0]?.fields.find(
							(field) => field.name == "Previous Experience",
						)?.value,
						misc: message.embeds[0]?.fields.find((field) => field.name == "Misc")
							?.value,
						message,
					},
				] as const,
		),
);

export default async function confirmInterest(interaction: ButtonInteraction): Promise<void> {
	await interaction.reply({
		ephemeral: true,
		content:
			"## Staff Interest Form\n" +
			"__This is not a staff application.__ This form mainly exists just to determine who in the server wants a staff position in the first place. Filling out this form does not guarantee anything. You may not ever get an explicit response. But without filling this out, you have little chance of promotion.\n" +
			"Also, please be aware that this form is not the only step in being promoted. If admins are interested in promoting you, they will DM you further questions before promoting you.\n" +
			"Finally, please note that 2-factor authentication (2FA) is required for staff in this server. If you are unable to enable 2FA, please try using an online service such as <https://totp.app/>.\n" +
			"Thanks for being a part of the server and filling out the form!",

		components: [
			{
				type: ComponentType.ActionRow,
				components: [
					{
						customId: "_modInterestForm",
						label: "Fill out the form",
						style: ButtonStyle.Primary,
						type: ComponentType.Button,
					},
				],
			},
		],
	});
}

export async function fillInterest(interaction: ButtonInteraction): Promise<void> {
	const mention = interaction.user.toString();
	await interaction.showModal({
		customId: "_modInterestForm",
		title: "Staff Interest Form",
		components: [
			{
				type: ComponentType.ActionRow,
				components: [
					{
						customId: "timezone",
						label: "What is your timezone?",
						style: TextInputStyle.Short,
						type: ComponentType.TextInput,
						maxLength: 100,
						value: applications[mention]?.timezone,
					},
				],
			},
			{
				type: ComponentType.ActionRow,
				components: [
					{
						customId: "activity",
						label: "How active would you say you are?",
						style: TextInputStyle.Short,
						type: ComponentType.TextInput,
						maxLength: 1000,
						value: applications[mention]?.activity,
					},
				],
			},
			{
				type: ComponentType.ActionRow,
				components: [
					{
						customId: "age",
						label: "How old are you?",
						style: TextInputStyle.Short,
						type: ComponentType.TextInput,
						maxLength: 10,
						value: applications[mention]?.age,
					},
				],
			},
			{
				type: ComponentType.ActionRow,
				components: [
					{
						customId: "experience",
						label: "What past moderation experience do you have?",
						style: TextInputStyle.Short,
						type: ComponentType.TextInput,
						maxLength: 1000,
						value: applications[mention]?.experience,
					},
				],
			},
			{
				type: ComponentType.ActionRow,
				components: [
					{
						customId: "misc",
						label: "Additional comments",
						style: TextInputStyle.Paragraph,
						type: ComponentType.TextInput,
						required: false,
						maxLength: 1000,
						value: applications[mention]?.misc,
					},
				],
			},
		],
	});
}

export async function submitInterest(interaction: ModalSubmitInteraction): Promise<void> {
	if (!(interaction.member instanceof GuildMember))
		throw new TypeError("interaction.member is not a GuildMember");

	const allXp = xpDatabase.data.toSorted((one, two) => two.xp - one.xp);
	const xp = allXp.find((entry) => entry.user === interaction.user.id)?.xp ?? 0;
	const level = getLevelForXp(xp);
	const rank = allXp.findIndex((info) => info.user === interaction.user.id) + 1;

	const strikes = strikeDatabase.data.filter((strike) => strike.user === interaction.user.id);
	const totalStrikeCount = strikes
		.reduce((accumulator, { count, removed }) => count * Number(!removed) + accumulator, 0)
		.toLocaleString();
	const recentStrikeCount = strikes
		.filter((strike) => strike.date + EXPIRY_LENGTH > Date.now())
		.reduce((accumulator, { count, removed }) => count * Number(!removed) + accumulator, 0)
		.toLocaleString();
	const semiRecentStrikeCount = strikes
		.filter((strike) => strike.date + EXPIRY_LENGTH * 2 > Date.now())
		.reduce((accumulator, { count, removed }) => count * Number(!removed) + accumulator, 0)
		.toLocaleString();

	const mention = interaction.user.toString();
	const fields = {
		timezone: interaction.fields.getTextInputValue("timezone"),
		activity: interaction.fields.getTextInputValue("activity"),
		age: interaction.fields.getTextInputValue("age"),
		experience: interaction.fields.getTextInputValue("experience"),
		misc: interaction.fields.fields.get("misc")?.value,
	};
	const data = {
		embeds: [
			{
				title: "Staff Interest Form",
				color: interaction.member.displayColor,
				author: {
					name: interaction.user.tag,
					icon_url: interaction.user.displayAvatarURL(),
				},
				description: mention,
				fields: [
					{
						name: "Roles",
						value:
							[
								...interaction.member.roles
									.valueOf()
									.sorted((one, two) => two.comparePositionTo(one))
									.filter(({ id }) => id !== config.guild.id)
									.values(),
							].join(" ") || "*No roles*",
						inline: false,
					},
					{
						name: "Created Account",
						value: time(interaction.user.createdAt),
						inline: true,
					},
					{
						name: "Joined Server",
						value: time(interaction.member.joinedAt ?? new Date()),
						inline: true,
					},
					{
						name: "Strikes",
						value: `${totalStrikeCount} (${recentStrikeCount} in the past 3 weeks; ${semiRecentStrikeCount} in the past 6 weeks)`,
						inline: true,
					},
					{
						name: "XP",
						value: `${rank}) Level ${level} - ${Math.floor(xp).toLocaleString()} XP`,
						inline: true,
					},
					{
						name: "Weekly XP",
						value: `${getWeeklyXp(interaction.user.id).toLocaleString()} XP`,
						inline: true,
					},
					{ name: constants.zws, value: constants.zws, inline: false },
					{ name: "Timezone", value: fields.timezone, inline: true },
					{ name: "Activity", value: fields.activity, inline: true },
					{ name: "Age", value: fields.age, inline: true },
					{ name: "Previous Experience", value: fields.experience, inline: true },
					...(fields.misc ? [{ name: "Misc", value: fields.misc, inline: true }] : []),
				],
			},
		],

		components: [
			{
				type: ComponentType.ActionRow,
				components: [
					{
						style: ButtonStyle.Secondary,
						type: ComponentType.Button,
						customId: `${interaction.user.id}_userInfo`,
						label: "User Info",
					} as const,
					{
						style: ButtonStyle.Secondary,
						type: ComponentType.Button,
						customId: `${interaction.user.id}_xp`,
						label: "XP",
					} as const,
					...(totalStrikeCount === "0" ?
						[]
					:	([
							{
								style: ButtonStyle.Secondary,
								type: ComponentType.Button,
								customId: `${interaction.user.id}_viewStrikes`,
								label: "Strikes",
							},
						] as const)),
					...((
						config.channels.tickets
							?.permissionsFor(interaction.member)
							?.has("ViewChannel")
					) ?
						([
							{
								style: ButtonStyle.Secondary,
								type: ComponentType.Button,
								customId: `${interaction.user.id}_contactUser`,
								label: "Contact User",
							},
						] as const)
					:	[]),
				],
			},
		],
	};
	const message = await (applications[mention]?.message.edit(data) ?? thread.send(data));
	await applications[mention]?.message.reply(`${mention} updated their application.`);
	applications[mention] = { ...fields, message: applications[mention]?.message ?? message };
	await giveXp(interaction.user, message.url);

	await interaction.reply({
		ephemeral: true,
		content: `${constants.emojis.statuses.yes} Thanks for filling it out!`,
	});
}
