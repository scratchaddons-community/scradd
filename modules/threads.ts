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
} from "discord.js";
import constants from "../common/constants.js";
import { parseTime } from "../util/numbers.js";
import { SpecialReminders, remindersDatabase } from "./reminders.js";
import { disableComponents } from "../util/discord.js";

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
							"How long until closing the thread, a UNIX timestamp to close it at, or “never” (defaults to 1 hour)",
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
			const roles = options.roles?.split("|") ?? [];
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
				options,
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
		threadsDatabase.updateById(
			{ id: interaction.channel?.id || "", keepOpen: false },
			getThreadConfig(interaction.channel),
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
		await interaction.reply(`${constants.emojis.statuses.yes} Canceled ${type}!`);
	}
});

defineEvent("guildMemberUpdate", async (_, member) => {
	await Promise.all(
		threadsDatabase.data.map(async (options) => {
			const roles = (options.roles ?? "").split("|");
			if (!roles.length) return;
			const thread = await config.guild.channels.fetch(options.id).catch(() => {});
			if (!thread?.isThread()) return;
			if (roles.some((role) => member.roles.resolve(role)))
				await thread.members.add(member, "Has qualifying role");
			else await thread.members.remove(member.id, "Has no qualifying role");
		}),
	);
});

defineEvent("threadCreate", async (thread, newlyCreated) => {
	if (thread.guild.id !== config.guild.id || !newlyCreated) return;

	const { roles } = getThreadConfig(thread);
	if (roles)
		await thread.send({
			content: roles.split("|").map(roleMention).join(""),
			allowedMentions: { parse: ["roles"] },
		});
});

defineEvent("threadUpdate", async ({ archived: wasArchived }, thread) => {
	const options = getThreadConfig(thread);
	if (thread.archived && options.keepOpen) await thread.setArchived(false, "Keeping thread open");
	if (wasArchived && !thread.archived) {
		await Promise.all(
			options.roles?.split("|").map(async (roleId) => {
				const role = await config.guild.roles.fetch(roleId).catch(() => {});
				if (!role) return;
				return await addRoleToThread({ role, thread });
			}) ?? [],
		);
	}
});

function getThreadConfig(thread: AnyThreadChannel) {
	return (
		threadsDatabase.data.find((found) => found.id === thread.id) ??
		{
			[config.channels.mod?.id || ""]: {
				roles: config.roles.mod?.id || null,
				keepOpen: false,
			},
			[config.channels.modlogs?.id || ""]: {
				roles: config.roles.mod?.id || null,
				keepOpen: true,
			},
			[config.channels.exec?.id || ""]: {
				roles: config.roles.exec?.id || null,
				keepOpen: false,
			},
			[config.channels.admin?.id || ""]: {
				roles: config.roles.admin?.id || null,
				keepOpen: false,
			},
		}[thread.parent?.id || ""] ?? { roles: null, keepOpen: false }
	);
}

function addRoleToThread({ role, thread }: { role: Role; thread: AnyThreadChannel }) {
	return Promise.all(role.members.map((member) => thread.members.add(member, "Has qualifying role initially")));
}
