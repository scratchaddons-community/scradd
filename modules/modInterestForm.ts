import { ButtonStyle, ComponentType, GuildMember, TextInputStyle, time } from "discord.js";
import { defineCommand, defineButton, defineModal } from "strife.js";
import config from "../common/config.js";
import { getLevelForXp, getWeeklyXp, xpDatabase } from "./xp/misc.js";
import { EXPIRY_LENGTH, strikeDatabase } from "./punishments/misc.js";
import constants from "../common/constants.js";
import giveXp from "./xp/giveXp.js";

if (!config.channels.admin) throw new ReferenceError("Could not find admin channel");
const threads = await config.channels.admin.threads.fetchActive();
const thread =
	threads.threads.find((thread) => thread.name === "Moderator Interest Forms") ||
	(await config.channels.admin.threads.create({
		name: "Moderator Interest Forms",
		reason: "For mod interest forms",
	}));

defineCommand(
	{ name: "mod-interest-form", description: "Fill out a moderator interest form" },
	async (interaction) => {
		await interaction.reply({
			ephemeral: true,
			content:
				"**Moderator Interest Form**\n__This is not a mod application.__ This form mainly exists just to determine who in the server wants moderator in the first place. Filling out this form does not guarantee anything. However, if you don't fill out the form, you do not have any chance of promotion.\nAlso, know that this form is not the only step in being promoted. If admins think you are a good candidate for moderator, they will DM you further questions before promoting you.\nFinally, please note that 2-factor authentication (2FA) is required for moderators in this server. If you are unable to enable 2FA, please try using <https://totp.app/>.\nThanks for being a part of the server and filling out the form!",

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
	},
);

defineButton("modInterestForm", async (interaction) => {
	await interaction.showModal({
		customId: "_modInterestForm",
		title: "Moderator Interest Form",
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
					},
				],
			},
		],
	});
});

defineModal("modInterestForm", async (interaction) => {
	if (!(interaction.member instanceof GuildMember))
		throw new TypeError("interaction.member is not a GuildMember");

	const allXp = [...xpDatabase.data].sort((one, two) => Math.abs(two.xp) - Math.abs(one.xp));
	const xp = Math.floor(allXp.find((entry) => entry.user === interaction.user.id)?.xp ?? 0);
	const level = getLevelForXp(Math.abs(xp));
	const rank = allXp.findIndex((info) => info.user === interaction.user.id) + 1;

	const strikes = strikeDatabase.data.filter((strike) => strike.user === interaction.user.id);
	const totalStrikeCount = strikes.reduce(
		(accumulator, { count, removed }) => count * Number(!removed) + accumulator,
		0,
	);
	const recentStrikeCount = strikes
		.filter((strike) => strike.date + EXPIRY_LENGTH > Date.now())
		.reduce((accumulator, { count, removed }) => count * Number(!removed) + accumulator, 0);
	const semiRecentStrikeCount = strikes
		.filter((strike) => strike.date + EXPIRY_LENGTH * 2 > Date.now())
		.reduce((accumulator, { count, removed }) => count * Number(!removed) + accumulator, 0);

	const misc = interaction.fields.fields.get("misc")?.value;
	const { url } = await thread.send({
		embeds: [
			{
				color: interaction.member?.displayColor,
				author: {
					name: interaction.user.tag,
					icon_url: interaction.user.displayAvatarURL(),
				},
				description: interaction.user.toString(),
				fields: [
					{
						name: "Roles",
						value:
							interaction.member?.roles
								.valueOf()
								.sorted((one, two) => two.comparePositionTo(one))
								.filter((role) => role.id !== config.guild.id)
								.toJSON()
								.join(" ") || "*No roles*",
						inline: false,
					},
					{ name: "Created", value: time(interaction.user.createdAt), inline: true },
					{
						name: "Joined",
						value: time(interaction.member.joinedAt ?? new Date()),
						inline: true,
					},
					{
						name: "Strikes",
						value: `${totalStrikeCount.toLocaleString(
							"en-us",
						)} (${recentStrikeCount.toLocaleString(
							"en-us",
						)} in the past 3 weeks; ${semiRecentStrikeCount.toLocaleString(
							"en-us",
						)} in the past 6 weeks)`,
						inline: true,
					},
					{
						name: "XP",
						value: `${rank}) Level ${level} - ${xp.toLocaleString("en-us")} XP`,
						inline: true,
					},
					{
						name: "Weekly XP",
						value: `${getWeeklyXp(interaction.user.id).toLocaleString("en-us")} XP`,
						inline: true,
					},
					{
						name: constants.zeroWidthSpace,
						value: constants.zeroWidthSpace,
						inline: false,
					},
					{
						name: "Timezone",
						value: interaction.fields.getTextInputValue("timezone"),
						inline: true,
					},
					{
						name: "Activity",
						value: interaction.fields.getTextInputValue("activity"),
						inline: true,
					},
					{
						name: "Age",
						value: interaction.fields.getTextInputValue("age"),
						inline: true,
					},
					{
						name: "Previous Experience",
						value: interaction.fields.getTextInputValue("experience"),
						inline: true,
					},
					...(misc ? [{ name: "Misc", value: misc, inline: true }] : []),
				],
			},
		],
	});
	await interaction.reply({
		ephemeral: true,
		content: `${constants.emojis.statuses.yes} Thanks for filling it out!`,
	});
	await giveXp(interaction.user, url);
});
