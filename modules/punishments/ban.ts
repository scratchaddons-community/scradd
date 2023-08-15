import {
	GuildMember,
	type ChatInputCommandInteraction,
	ComponentType,
	ButtonStyle,
	time,
	TimestampStyles,
} from "discord.js";
import constants from "../../common/constants.js";
import { disableComponents } from "../../util/discord.js";
import { parseTime } from "../../util/numbers.js";
import { SpecialReminders, remindersDatabase } from "../reminders/misc.js";
import { client } from "strife.js";
import config from "../../common/config.js";
import { escapeMessage } from "../../util/markdown.js";
import queueReminders from "../reminders/send.js";

export default async function ban(interaction: ChatInputCommandInteraction<"cached" | "raw">) {
	const memberToBan = interaction.options.getMember("user");
	const userToBan =
		memberToBan instanceof GuildMember
			? memberToBan.user
			: interaction.options.getUser("user", true);
	const reason = interaction.options.getString("reason");
	const unbanIn = interaction.options.getString("unban-in")?.toLowerCase().trim();
	const unbanTime = unbanIn && unbanIn !== "never" && parseTime(unbanIn);
	const deleteRange = interaction.options.getString("delete-range")?.toLowerCase().trim();
	const deleteLength = Math.min(
		604_800,
		(deleteRange && deleteRange !== "none" && +parseTime(deleteRange) - Date.now()) || 0,
	);

	const untilUnban = unbanTime && +unbanTime - Date.now();
	if (untilUnban && (untilUnban < 30_000 || untilUnban > 315_360_000_000)) {
		return await interaction.reply({
			ephemeral: true,
			content: `${constants.emojis.statuses.no} Could not parse the time! Make sure to pass in the value as so: \`1h30m\`, for example. Note that I can’t unban them sooner than 30 seconds or later than 10 years.`,
		});
	}
	const ban = !memberToBan && (await config.guild.bans.fetch(userToBan).catch(() => {}));

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
					channel: "",
					date: +unbanTime,
					user: client.user.id,
					id: SpecialReminders.Unban,
					reminder: userToBan.id,
				},
			];
			await queueReminders();

			await interaction.reply(
				`${
					constants.emojis.statuses.yes
				} ${userToBan} is already banned! I will unban them ${time(
					unbanTime,
					TimestampStyles.RelativeTime,
				)}.`,
			);
		} else if (unbanIn === "never" && unbanTimer) {
			remindersDatabase.data = remindersDatabase.data.filter(
				(reminder) =>
					!(
						reminder.user === client.user.id &&
						reminder.id === SpecialReminders.Unban &&
						reminder.reminder === userToBan.id
					),
			);
			await queueReminders();

			await interaction.reply(
				`${
					constants.emojis.statuses.yes
				} ${userToBan} is already banned, but I will no longer unban them ${time(
					Math.round(unbanTimer.date / 1000),
					TimestampStyles.RelativeTime,
				)}.`,
			);
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

	if (memberToBan instanceof GuildMember ? memberToBan.bannable : true) {
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
						{
							type: ComponentType.Button,
							label: "Cancel",
							customId: "cancel",
							style: ButtonStyle.Secondary,
						},
					],
				},
			],
			fetchReply: true,
		});

		const collector = message.createMessageComponentCollector({
			componentType: ComponentType.Button,
			filter: (buttonInteraction) => interaction.user.id === buttonInteraction.user.id,
			max: 1,
			time: constants.collectorTime,
		});

		collector
			.on("collect", async (buttonInteraction) => {
				if (buttonInteraction.customId === "cancel") {
					await buttonInteraction.deferUpdate();
					return;
				}

				if (unbanTime)
					remindersDatabase.data = [
						...remindersDatabase.data,
						{
							channel: "",
							date: +unbanTime,
							user: client.user.id,
							id: SpecialReminders.Unban,
							reminder: userToBan.id,
						},
					];

				await userToBan
					?.send({
						embeds: [
							{
								title: `You were banned from ${escapeMessage(config.guild.name)}!`,
								description:
									(reason || "") +
									(unbanTime
										? `\n> You will be [automatically unbanned](${
												constants.inviteUrl
										  }) ${time(unbanTime, TimestampStyles.RelativeTime)}`
										: ""),
								color:
									memberToBan instanceof GuildMember
										? memberToBan.displayColor
										: undefined,
								thumbnail: config.guild.icon
									? { url: config.guild.iconURL() || "" }
									: undefined,
							},
						],
					})
					.catch(() => {});

				await config.guild.bans.create(userToBan, {
					reason:
						(reason ? reason + "\n" : "") +
						`> Banned by ${buttonInteraction.user.tag} via /ban${
							unbanTime ? ` until ${unbanTime.toDateString()}` : ""
						}`,
					deleteMessageSeconds: deleteLength,
				});
				await buttonInteraction.reply(
					`${constants.emojis.statuses.yes} Banned ${userToBan}!${
						unbanTime
							? ` I will unban them ${time(unbanTime, TimestampStyles.RelativeTime)}.`
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
