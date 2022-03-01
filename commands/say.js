import { SlashCommandBuilder } from "@discordjs/builders";
import { escapeForInlineCode } from "../lib/escape.js";

/** @type {import("../types/command").default} */
const info = {
	data: new SlashCommandBuilder()
		.setDescription(
			"(Mods only) Say what you tell me to say. Won’t publically share the author.",
		)
		.setDefaultPermission(false)
		.addStringOption((input) =>
			input.setName("message").setDescription("What you want me to say").setRequired(true),
		),

	async interaction(interaction) {
		const content = interaction.options.getString("message") || "";

		const message = await interaction.channel?.send({
			content: content,
			allowedMentions: { parse: ["users"], roles: [] },
		});
		if (message) {
			const channel = await interaction.guild?.channels.fetch(
				process.env.ERROR_CHANNEL || "",
			);
			await Promise.all([
				interaction.reply({
					content: "<:yes:940054094272430130>",
					ephemeral: true,
				}),
				channel?.isText() &&
					channel.send({
						content: `${interaction.user.toString()} used \`/say\` in ${message.channel.toString()} to say \`${escapeForInlineCode(
							content,
						)}\` (https://discord.com/channels/${process.env.GUILD_ID || ""}/${
							message.channel.id
						}/${message.id})`,
						allowedMentions: { users: [] },
					}),
			]);
		}
	},

	permissions: [{ id: process.env.MODERATOR_ROLE || "", permission: true, type: "ROLE" }],
};

export default info;
