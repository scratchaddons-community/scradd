import {
	GuildMember,
	ComponentType,
	ButtonStyle,
	time,
	TimestampStyles,
	User,
	type RepliableInteraction,
} from "discord.js";
import constants from "../../common/constants.js";
import { disableComponents } from "../../util/discord.js";
import { parseTime } from "../../util/numbers.js";
import { SpecialReminders, remindersDatabase } from "../reminders/misc.js";
import { client } from "strife.js";
import config from "../../common/config.js";
import { escapeMessage } from "../../util/markdown.js";
import queueReminders from "../reminders/send.js";
import pkg from "../../package.json" assert { type: "json" };

export default async function ban(
	interaction: RepliableInteraction,
	options: {
		"user": User | GuildMember;
		"reason"?: string;
		"unban-in"?: string;
		"delete-range"?: string;
	},
) {
	const userToBan = options.user instanceof GuildMember ? options.user.user : options.user;
	const unbanIn = options["unban-in"]?.toLowerCase();
	const unbanTime = unbanIn && unbanIn !== "never" && parseTime(unbanIn);
	const deleteRange = options["delete-range"]?.toLowerCase();
	const deleteLength = Math.min(
		604_800,
		(deleteRange && deleteRange !== "none" && +parseTime(deleteRange) - Date.now()) || 0,
	);

	const untilUnban = unbanTime && +unbanTime - Date.now();
	if (untilUnban && (untilUnban < 30_000 || untilUnban > 315_360_000_000)) {
		return await interaction.reply({
			ephemeral: true,
			content: `${constants.emojis.statuses.no} Could not parse the unban time! Make sure to pass in the value as so: \`1h30m\`, for example. Note that I can’t unban them sooner than 30 seconds or later than 10 years.`,
		});
	}
	const ban =
		options.user instanceof User &&
		(await config.guild.bans.fetch(userToBan).catch(() => void 0));

	if (ban) {
		const unbanTimer = remindersDatabase.data.find(
			(reminder) =>
				reminder.user === client.user.id &&
				reminder.id === SpecialReminders.Unban &&
				reminder.reminder === userToBan.id,
		);
		if (unbanTime) {
			remindersDatabase.data = [
				...remindersDatabase.data.filter(
					(reminder) =>
						!(
							reminder.user === client.user.id &&
							reminder.id === SpecialReminders.Unban &&
							reminder.reminder === userToBan.id
						),
				),
				{
					channel: "0",
					date: +unbanTime,
					user: client.user.id,
					id: SpecialReminders.Unban,
					reminder: userToBan.id,
				},
			];

			await interaction.reply(
				`${
					constants.emojis.statuses.yes
				} ${userToBan} is already banned! I will unban them ${time(
					unbanTime,
					TimestampStyles.RelativeTime,
				)}.`,
			);
			await queueReminders();
		} else if (unbanIn === "never" && unbanTimer) {
			remindersDatabase.data = remindersDatabase.data.filter(
				(reminder) =>
					!(
						reminder.user === client.user.id &&
						reminder.id === SpecialReminders.Unban &&
						reminder.reminder === userToBan.id
					),
			);

			await interaction.reply(
				`${
					constants.emojis.statuses.yes
				} ${userToBan} is already banned, but I will no longer unban them ${time(
					Math.round(unbanTimer.date / 1000),
					TimestampStyles.RelativeTime,
				)}.`,
			);
			await queueReminders();
		} else {
			await interaction.reply({
				ephemeral: true,
				content: `${constants.emojis.statuses.no} ${userToBan} is already banned!${
					unbanTimer
						? ` Explicitly set \`unban-in: never\` to prevent them from being unbanned ${time(
								Math.round(unbanTimer.date / 1000),
								TimestampStyles.RelativeTime,
						  )}.`
						: ""
				}`,
			});
		}
		return;
	}

	if (options.user instanceof User || options.user.bannable) {
		const message = await interaction.reply({
			content: `Are you sure you want to ban **${userToBan.toString()}**${
				unbanTime ? " until " + time(unbanTime, TimestampStyles.LongDate) : ""
			}?`,
			components: [
				{
					type: ComponentType.ActionRow,
					components: [
						{
							type: ComponentType.Button,
							label: "Ban",
							style: ButtonStyle.Danger,
							customId: "confirm",
						},
					],
				},
			],
			fetchReply: true,
			ephemeral: true,
		});

		const collector = message.createMessageComponentCollector({
			componentType: ComponentType.Button,
			max: 1,
			time: constants.collectorTime,
		});

		collector
			.on("collect", async (buttonInteraction) => {
				await buttonInteraction.deferReply();
				if (unbanTime && untilUnban) {
					if (untilUnban < 30_000 || untilUnban > 315_360_000_000) {
						await interaction.reply({
							ephemeral: true,
							content: `${constants.emojis.statuses.no} Could not parse the unban time! Make sure to pass in the value as so: \`1h30m\`, for example. Note that I can’t unban them sooner than 30 seconds or later than 10 years.`,
						});
						return;
					}
					remindersDatabase.data = [
						...remindersDatabase.data,
						{
							channel: "0",
							date: +unbanTime,
							user: client.user.id,
							id: SpecialReminders.Unban,
							reminder: userToBan.id,
						},
					];
				}

				await userToBan
					.send({
						embeds: [
							{
								title: `You were banned from ${escapeMessage(config.guild.name)}!`,
								description:
									(options.reason || "") +
									(unbanTime
										? `\n> You will be [automatically unbanned](${
												pkg.homepage
										  }) ${time(unbanTime, TimestampStyles.RelativeTime)}`
										: ""),
								color:
									options.user instanceof GuildMember
										? options.user.displayColor
										: undefined,
								thumbnail: config.guild.icon
									? { url: config.guild.iconURL() || "" }
									: undefined,
							},
						],
						components: [
							{
								type: ComponentType.ActionRow,
								components: [
									{
										type: ComponentType.Button,
										style: ButtonStyle.Link,
										label: "Appeal Ban",
										url:
											(process.env.NODE_ENV === "production"
												? "https://sa-discord.up.railway.app"
												: `http://localhost:${process.env.PORT}`) +
											"/ban-appeal",
									},
								],
							},
						],
					})
					.catch(() => void 0);

				await config.guild.bans.create(userToBan, {
					reason:
						(options.reason ? options.reason + "\n" : "") +
						`> Banned by ${buttonInteraction.user.tag} via /ban-user${
							unbanTime ? ` until ${unbanTime.toDateString()}` : ""
						}`,
					deleteMessageSeconds: deleteLength,
				});
				await buttonInteraction.editReply(
					`${constants.emojis.statuses.yes} Banned ${userToBan}!${
						options.reason ? " " + options.reason : ""
					}${
						unbanTime && untilUnban
							? `\nI will unban them ${time(
									unbanTime,
									TimestampStyles.RelativeTime,
							  )}.`
							: ""
					}`,
				);
				await queueReminders();
			})
			.on("end", async () => {
				await interaction.editReply({ components: disableComponents(message.components) });
			});
	} else {
		await interaction.reply({
			ephemeral: true,
			content: `${constants.emojis.statuses.no} I can’t ban ${userToBan}!`,
		});
	}
}
