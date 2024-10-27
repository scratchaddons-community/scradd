import type { InteractionResponse, RepliableInteraction, Snowflake } from "discord.js";

import { ButtonStyle, ComponentType, GuildMember, time, TimestampStyles, User } from "discord.js";
import { client, disableComponents, escapeAllMarkdown } from "strife.js";

import config from "../../common/config.js";
import constants from "../../common/constants.js";
import pkg from "../../package.json" with { type: "json" };
import { parseTime } from "../../util/numbers.js";
import { remindersDatabase, SpecialReminder } from "../reminders/misc.js";
import queueReminders from "../reminders/send.js";

export default async function ban(
	interaction: RepliableInteraction,
	options: {
		"user": GuildMember | User;
		"reason"?: string;
		"unban-in"?: string;
		"delete-range"?: string;
	},
): Promise<InteractionResponse | undefined> {
	const userToBan = options.user instanceof GuildMember ? options.user.user : options.user;
	const unbanIn = options["unban-in"]?.toLowerCase();
	const unbanTime = unbanIn ? unbanIn !== "never" && parseTime(unbanIn) : false;

	const isBanned =
		options.user instanceof User &&
		(await config.guild.bans.fetch(userToBan).catch(() => void 0));

	if (isBanned) {
		const unbanTimer = remindersDatabase.data.find(
			(
				reminder,
			): reminder is {
				channel: Snowflake;
				date: number;
				reminder: Snowflake;
				user: Snowflake;
				id: SpecialReminder.Unban;
			} =>
				reminder.user === client.user.id &&
				reminder.id === SpecialReminder.Unban &&
				reminder.reminder === userToBan.id &&
				reminder.date !== "NaN",
		);
		if (unbanTime) {
			remindersDatabase.data = [
				...remindersDatabase.data.filter(
					(reminder) =>
						!(
							reminder.user === client.user.id &&
							reminder.id === SpecialReminder.Unban &&
							reminder.reminder === userToBan.id
						),
				),
				{
					channel: "0",
					date: +unbanTime,
					user: client.user.id,
					id: SpecialReminder.Unban,
					reminder: userToBan.id,
				},
			];

			await interaction.reply(
				`${
					constants.emojis.statuses.yes
				} ${userToBan.toString()} is already banned! I will unban them ${time(
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
						reminder.id === SpecialReminder.Unban &&
						reminder.reminder === userToBan.id
					),
			);

			await interaction.reply(
				`${
					constants.emojis.statuses.yes
				} ${userToBan.toString()} is already banned, but I will no longer unban them ${time(
					Math.round(unbanTimer.date / 1000),
					TimestampStyles.RelativeTime,
				)}.`,
			);
			await queueReminders();
		} else {
			await interaction.reply({
				ephemeral: true,
				content: `${
					constants.emojis.statuses.no
				} ${userToBan.toString()} is already banned!${
					unbanTimer ?
						` Explicitly set \`unban-in: never\` to prevent them from being unbanned ${time(
							Math.round(unbanTimer.date / 1000),
							TimestampStyles.RelativeTime,
						)}.`
					:	""
				}`,
			});
		}
		return;
	}

	if (!(options.user instanceof User) && !options.user.bannable) {
		return await interaction.reply({
			ephemeral: true,
			content: `${constants.emojis.statuses.no} I can’t ban ${userToBan.toString()}!`,
		});
	}

	if (interaction.isModalSubmit()) {
		await confirmBan(interaction, { ...options, unbanTime, user: userToBan });
		return;
	}

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

	message
		.createMessageComponentCollector({
			componentType: ComponentType.Button,
			max: 1,
			time: constants.collectorTime,
		})
		.on("collect", async (buttonInteraction) => {
			await confirmBan(buttonInteraction, { ...options, unbanTime, user: userToBan });
		})
		.on("end", async () => {
			await interaction.editReply({ components: disableComponents(message.components) });
		});
}

async function confirmBan(
	interaction: RepliableInteraction,
	options: {
		"user": User;
		"reason"?: string;
		"delete-range"?: string;
		"unbanTime"?: Date | false;
	},
): Promise<void> {
	const deleteRange = options["delete-range"]?.toLowerCase();
	const deleteLength = Math.min(
		604_800,
		(deleteRange && deleteRange !== "none" && +parseTime(deleteRange) - Date.now()) || 0,
	);

	const untilUnban = options.unbanTime && +options.unbanTime - Date.now();
	if (options.unbanTime && untilUnban) {
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
				date: +options.unbanTime,
				user: client.user.id,
				id: SpecialReminder.Unban,
				reminder: options.user.id,
			},
		];
	}

	const dmed = await options.user
		.send({
			embeds: [
				{
					title: `You were banned from ${escapeAllMarkdown(config.guild.name)}!`,
					description:
						(options.reason || "") +
						(options.unbanTime ?
							`\n> You will be [automatically unbanned](${pkg.homepage}) ${time(
								options.unbanTime,
								TimestampStyles.RelativeTime,
							)}`
						:	""),
					color:
						options.user instanceof GuildMember ? options.user.displayColor : undefined,
					thumbnail:
						config.guild.icon ? { url: config.guild.iconURL() || "" } : undefined,
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
							url: constants.domains.scradd + "/ban-appeal",
						},
					],
				},
			],
		})
		.catch(() => void 0);

	await config.guild.bans.create(options.user, {
		reason:
			(options.reason ? options.reason + "\n" : "") +
			`> Banned by ${interaction.user.tag}${
				options.unbanTime ? ` until ${options.unbanTime.toDateString()}` : ""
			}`,
		deleteMessageSeconds: deleteLength,
	});
	await interaction.reply(
		`${constants.emojis.statuses.yes} Banned ${options.user.toString()}!${
			dmed ? "" : " I was not able to DM them."
		}${options.reason ? " " + options.reason : ""}${
			options.unbanTime ?
				`\nI will unban them ${time(options.unbanTime, TimestampStyles.RelativeTime)}.`
			:	""
		}`,
	);
	await queueReminders();
}
