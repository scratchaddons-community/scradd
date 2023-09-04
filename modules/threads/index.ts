import { defineButton, defineEvent, defineSubcommands } from "strife.js";
import config from "../../common/config.js";
import { ApplicationCommandOptionType, roleMention, ChannelType } from "discord.js";
import { syncMembers, updateMemberThreads, updateThreadMembers } from "../threads/syncMembers.js";
import { autoClose, cancelThreadChange, setUpAutoClose } from "../threads/autoClose.js";
import { getThreadConfig } from "./misc.js";

defineEvent("threadCreate", async (thread) => {
	if (thread.type === ChannelType.PrivateThread || thread.guild.id !== config.guild.id) return;
	const { roles } = getThreadConfig(thread);
	if (roles.length)
		await thread.send({
			content: roles.map(roleMention).join(""),
			allowedMentions: { parse: ["roles"] },
		});
});

defineSubcommands(
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
		if (interaction.options.getSubcommand(true) === "sync-members")
			return syncMembers(interaction);
		await setUpAutoClose(interaction);
	},
);

defineButton("cancelThreadChange", cancelThreadChange);
defineEvent("threadUpdate", autoClose);

defineEvent("guildMemberUpdate", updateMemberThreads);
defineEvent("threadUpdate", updateThreadMembers);
