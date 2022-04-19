/** @file Runs Commands when used. */
import { GuildMember } from "discord.js";
import { censor, warn } from "../../common/mod.js";
import commands from "../../common/commands.js";

/** @type {import("../../types/event").default<"interactionCreate">} */
const event = {
	async event(interaction) {
		if (!interaction.isCommand()) return;
		try {
			if (interaction.commandName !== "is-bad-word") {
				const censored = censorOptions(interaction.options.data);

				if (censored.isBad) {
					await Promise.all([
						interaction.reply({ ephemeral: true, content: "Watch your language!" }),
						warn(
							interaction.member instanceof GuildMember
								? interaction.member
								: interaction.user,
							"Watch your language!",
							censored.strikes,
						),
					]);
					return;
				}
			}

			const command = commands.get(interaction.commandName);

			if (!command)
				throw new ReferenceError(`Command \`${interaction.commandName}\` not found.`);

			await command.interaction(interaction);
		} catch (error) {
			await interaction.reply({ ephemeral: true, content: "An error occurred." });
			throw error;
		}
	},
};

export default event;

/** @param {readonly import("discord.js").CommandInteractionOption[]} options */
function censorOptions(options) {
	let strikes = 0,
		isBad = false;
	options.forEach((option) => {
		if (typeof option.value === "string") {
			const censored = censor(option.value);
			if (censored) {
				isBad = true;
				strikes += censored.strikes;
			}
		}
		if (option.options) {
			const censored = censorOptions(option.options);
			console.log(censored);
			if (censored.isBad) {
				isBad = true;
				strikes += censored.strikes;
			}
		}
	});

	return { isBad, strikes };
}
