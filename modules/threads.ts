import { client, defineButton, defineCommand, defineEvent } from "strife.js";
import Database from "../common/database.js";
import config from "../common/config.js";
import {
	ApplicationCommandOptionType,
	type AnyThreadChannel,
	type Snowflake,
	roleMention,
	TimestampStyles,
	time,
	ComponentType,
	ButtonStyle,
	Role,
	GuildMember,
	ChannelType,
} from "discord.js";
import constants from "../common/constants.js";
import { parseTime } from "../util/numbers.js";
import { SpecialReminders, remindersDatabase } from "./reminders/misc.js";
import { disableComponents } from "../util/discord.js";
import queueReminders from "./reminders/send.js";

export const threadsDatabase = new Database<{
	id: Snowflake;
	roles: string | null;
	keepOpen: boolean;
}>("threads");
await threadsDatabase.init();

defineCommand(
	{
		name: "thread",
		description: "Commands to manage threads",
		restricted: true,
		subcommands: {
			"close-in": {
				description: "Close this thread after a specified amount of time",
				options: {
					time: {
						type: ApplicationCommandOptionType.String,
						required: true,
						description:
							"How long until closing the thread, a UNIX timestamp to close it at, or “never”",
					},
				},
			},
			"lock-in": {
				description: "Lock this thread after a specified amount of time",
				options: {
					time: {
						type: ApplicationCommandOptionType.String,
						required: true,
						description:
							"How long until locking the thread or a UNIX timestamp to lock it at",
					},
				},
			},
			"sync-members": {
				description: "Automatically sync members of a role with members of this thread",
				options: {
					role: {
						type: ApplicationCommandOptionType.Role,
						required: true,
						description: "The role to add or remove from this thread",
					},
				},
			},
		},
	},
	async (interaction) => {
		if (!interaction.channel?.isThread())
			return await interaction.reply({
				ephemeral: true,
				content: `${constants.emojis.statuses.no} This command can only be used in threads!`,
			});

		const options = getThreadConfig(interaction.channel);
		const command = interaction.options.getSubcommand(true);
		if (command === "sync-members") {
			const role = interaction.options.getRole("role", true);
			const roles = options.roles;
			if (roles.includes(role.id)) {
				threadsDatabase.updateById(
					{
						id: interaction.channel.id,
						roles: roles.filter((found) => found !== role.id).join("|"),
					},
					options,
				);
				return await interaction.reply(
					`${
						constants.emojis.statuses.yes
					} I will no longer add all ${role.toString()} to this thread! (note that *I* will not remove them)`,
				);
			}

			threadsDatabase.updateById(
				{ id: interaction.channel.id, roles: [...roles, role.id].join("|") },
				options,
			);
			await interaction.reply(
				`${
					constants.emojis.statuses.yes
				} I will add all ${role.toString()} to this thread!`,
			);

			if (role instanceof Role) await addRoleToThread({ role, thread: interaction.channel });
			return;
		}

		const timer = interaction.options.getString("time", true).toLowerCase().trim();
		if (timer === "never") {
			if (command === "lock-in")
				return await interaction.reply({
					ephemeral: true,
					content: `${constants.emojis.statuses.no} That option is not supported for this command!`,
				});

			threadsDatabase.updateById(
				{ id: interaction.channel.id, keepOpen: !options.keepOpen },
				{ roles: options.roles.join("|") },
			);

			return await interaction.reply({
				content: `${constants.emojis.statuses.yes} This thread will ${
					options.keepOpen ? "not " : ""
				}be prevented from closing!`,

				components: options.keepOpen
					? []
					: [
							{
								type: ComponentType.ActionRow,
								components: [
									{
										type: ComponentType.Button,
										label: "Undo",
										customId: "noclose_cancelThreadChange",
										style: ButtonStyle.Danger,
									},
								],
							},
					  ],
			});
		}

		const date = parseTime(timer);
		if (+date < Date.now() + 900_000 || +date > Date.now() + 1_814_400_000) {
			return await interaction.reply({
				ephemeral: true,
				content: `${constants.emojis.statuses.no} Could not parse the time! Make sure to pass in the value as so: \`1h30m\`, for example. Note that I can’t close the thread sooner than 15 minutes or later than 3 weeks.`,
			});
		}

		remindersDatabase.data = [
			...remindersDatabase.data,
			{
				channel: interaction.channel.id,
				date: +date,
				reminder: undefined,
				user: client.user.id,
				id: SpecialReminders[command === "close-in" ? "CloseThread" : "LockThread"],
			},
		];
		await queueReminders();

		const type = command.split("-")[0];
		await interaction.reply({
			content: `${constants.emojis.statuses.yes} I’ll ${type} this thread ${time(
				date,
				TimestampStyles.RelativeTime,
			)}!`,
			components: [
				{
					type: ComponentType.ActionRow,
					components: [
						{
							type: ComponentType.Button,
							label: "Cancel",
							customId: `${type}_cancelThreadChange`,
							style: ButtonStyle.Danger,
						},
					],
				},
			],
		});
	},
);

defineButton("cancelThreadChange", async (interaction, type) => {
	if (
		!config.roles.mod ||
		!(interaction.member instanceof GuildMember
			? interaction.member.roles.resolve(config.roles.mod.id)
			: interaction.member?.roles.includes(config.roles.mod.id))
	) {
		return await interaction.reply({
			ephemeral: true,
			content: `${constants.emojis.statuses.no} You don’t have permission to cancel this!`,
		});
	}

	await interaction.message.edit({
		components: disableComponents(interaction.message.components),
	});
	if (!interaction.channel?.isThread())
		throw new TypeError("cancelThreadChange clicked outside of thread");
	if (type === "noclose") {
		const oldConfig = getThreadConfig(interaction.channel);
		threadsDatabase.updateById(
			{ id: interaction.channel?.id || "", keepOpen: false },
			{ roles: oldConfig.roles.join("|") },
		);
		await interaction.reply(
			`${constants.emojis.statuses.yes} This thread will not be prevented from closing!`,
		);
	} else {
		remindersDatabase.data = remindersDatabase.data.filter(
			(reminder) =>
				!(
					reminder.id ===
						SpecialReminders[type === "close" ? "CloseThread" : "LockThread"] &&
					reminder.user === client.user.id &&
					reminder.channel === interaction.channel?.id
				),
		);
		await queueReminders();

		await interaction.reply(`${constants.emojis.statuses.yes} Canceled ${type}!`);
	}
});

defineEvent("guildMemberUpdate", async (_, member) => {
	if (member.guild.id !== config.guild.id) return;
	await Promise.all(
		threadsDatabase.data.map(async (options) => {
			const roles = options.roles?.split("|");
			if (!roles?.length) return;
			const thread = await config.guild.channels.fetch(options.id).catch(() => {});
			if (!thread?.isThread()) return;
			if (roles.some((role) => member.roles.resolve(role)))
				await thread.members.add(member, "Has qualifying role");
			else {
				await thread.members.remove(member.id, "Has no qualifying role");
			}
		}),
	);
});

defineEvent("threadCreate", async (thread) => {
	if (thread.type === ChannelType.PrivateThread || thread.guild.id !== config.guild.id) return;
	const { roles } = getThreadConfig(thread);
	if (roles.length)
		await thread.send({
			content: roles.map(roleMention).join(""),
			allowedMentions: { parse: ["roles"] },
		});
});

defineEvent("threadUpdate", async ({ archived: wasArchived, locked: wasLocked }, thread) => {
	if (thread.guild.id !== config.guild.id) return;
	const options = getThreadConfig(thread);
	if (thread.archived && options.keepOpen) await thread.setArchived(false, "Keeping thread open");
	if (wasArchived && !thread.archived) {
		await Promise.all(
			options.roles.map(async (roleId) => {
				const role = await config.guild.roles.fetch(roleId).catch(() => {});
				if (!role) return;
				return await addRoleToThread({ role, thread });
			}) ?? [],
		);
	}

	if (!wasLocked && thread.locked && thread.parent?.type === ChannelType.GuildForum) {
		const date = Date.now() + 43_200_000;
		remindersDatabase.data = [
			...remindersDatabase.data,
			{
				channel: thread.id,
				date: date,
				reminder: undefined,
				user: client.user.id,
				id: SpecialReminders.CloseThread,
			},
		];
		await queueReminders();

		await thread.send({
			content: `${constants.emojis.statuses.yes} I’ll close this thread ${time(
				Math.round(date / 1_000),
				TimestampStyles.RelativeTime,
			)}!`,
			components: [
				{
					type: ComponentType.ActionRow,
					components: [
						{
							type: ComponentType.Button,
							label: "Cancel",
							customId: "close_cancelThreadChange",
							style: ButtonStyle.Danger,
						},
					],
				},
			],
		});
	}

	if (thread.archived && !thread.locked && thread.parent?.id === config.channels.tickets?.id) {
		await thread.setArchived(false, "To lock it");
		await thread.setLocked(true, "Was closed");
		await thread.setArchived(true, "Was closed");
	}
});

function getThreadConfig(thread: AnyThreadChannel) {
	const found = threadsDatabase.data.find((found) => found.id === thread.id);

	return found
		? { keepOpen: found.keepOpen, roles: found.roles?.split("|") ?? [] }
		: {
				[config.channels.mod?.id || ""]: {
					roles: config.roles.mod ? [config.roles.mod?.id] : [],
					keepOpen: false,
				},
				[config.channels.modlogs?.id || ""]: {
					roles: config.roles.mod ? [config.roles.mod?.id] : [],
					keepOpen: true,
				},
				[config.channels.exec?.id || ""]: {
					roles: config.roles.exec ? [config.roles.exec?.id] : [],
					keepOpen: false,
				},
				[config.channels.admin?.id || ""]: {
					roles: config.roles.admin ? [config.roles.admin?.id] : [],
					keepOpen: false,
				},
		  }[thread.parent?.id || ""] ?? { roles: [], keepOpen: false };
}

function addRoleToThread({ role, thread }: { role: Role; thread: AnyThreadChannel }) {
	return Promise.all(
		role.members.map((member) => thread.members.add(member, "Has qualifying role initially")),
	);
}
