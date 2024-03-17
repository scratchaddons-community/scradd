import { ApplicationCommandOptionType, ChannelType, roleMention } from "discord.js";
import { defineButton, defineEvent, defineSubcommands } from "strife.js";
import { paginate } from "../../util/discord.js";
import { autoClose, cancelThreadChange, setUpAutoClose } from "./auto-close.js";
import { getThreadConfig, threadsDatabase } from "./misc.js";
import { syncMembers, updateMemberThreads, updateThreadMembers } from "./sync-members.js";

defineEvent("threadCreate", async (thread) => {
	if (thread.type === ChannelType.PrivateThread) return;
	const threadConfig = getThreadConfig(thread);
	if (threadConfig.roles.length)
		await thread.send({
			content: threadConfig.roles.map(roleMention).join(""),
			allowedMentions: { parse: ["roles"] },
		});

	threadsDatabase.updateById(
		{ id: thread.id, keepOpen: threadConfig.keepOpen },
		{ roles: threadConfig.roles.join("|") },
	);
});

defineSubcommands(
	{
		name: "thread",
		description: "Manage threads",
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
			"list-unjoined": {
				description: "List public open threads that you are not in",
				options: {},
			},
		},
	},
	async (interaction, options) => {
		switch (options.subcommand) {
			case "sync-members": {
				return await syncMembers(interaction, options.options);
			}
			case "list-unjoined": {
				await interaction.deferReply({ ephemeral: true });
				const fetched = await interaction.guild?.channels.fetchActiveThreads();
				const threads = [];
				for (const [, thread] of fetched?.threads ?? []) {
					const permissions = thread.permissionsFor(interaction.user);
					if (
						!permissions?.has("ViewChannel") ||
						(thread.type === ChannelType.PrivateThread &&
							!permissions.has("ManageThreads"))
					)
						continue;
					try {
						await thread.members.fetch(interaction.user.id);
					} catch {
						threads.push(thread);
					}
				}

				const unjoined = threads.toSorted(
					(one, two) =>
						(one.parent &&
							two.parent &&
							(one.parent.rawPosition - two.parent.rawPosition ||
								one.parent.position - two.parent.position ||
								one.parent.name.localeCompare(two.parent.name))) ||
						one.name.localeCompare(two.name),
				);
				await paginate(
					unjoined,
					(thread) => thread.parent?.toString() + " > " + thread.toString(),
					(data) => interaction.editReply(data),
					{
						title: "Unjoined Threads",
						singular: "thread",
						failMessage: "You’ve joined all public open threads here!",
						user: interaction.user,
						ephemeral: true,
						totalCount: unjoined.length,
					},
				);
				return;
			}
			case "close-in":
			case "lock-in": {
				await setUpAutoClose(interaction, options);
				break;
			}
		}
	},
);

defineButton("cancelThreadChange", cancelThreadChange);
defineEvent("threadUpdate", autoClose);

defineEvent("guildMemberUpdate", updateMemberThreads);
defineEvent("threadUpdate", updateThreadMembers);
