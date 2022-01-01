import { Client, Intents, MessageEmbed } from "discord.js";
import dotenv from "dotenv";
import commands from "./getCommands.js";
import "./sendCommands.js";

dotenv.config();

const client = new Client({ intents: [Intents.FLAGS.GUILDS] });

client
	.once("ready", () =>
		console.log(`Connected to Discord with ID`, client.application?.id),
	)
	.on("disconnect", () => console.warn("Disconnected from Discord"))
	.on("debug", console.debug)
	.on("warn", console.warn)
	.on("error", console.error)
	.on("interactionCreate", async (interaction) => {
		if (!interaction.isCommand()) return;
		try {
			const command = commands[interaction.commandName];
			if (!command) return;
			return command.onInteraction(interaction);
		} catch (error) {
			try {
				console.error(error);

				const embed = new MessageEmbed()
					.setTitle("Error!")
					.setDescription(
						`Uhoh! I found an error!\n\`\`\`json\n${JSON.stringify(
							error,
						).replaceAll("```", "[3 backticks]")}\`\`\``,
					);
				interaction.reply({
					content: "<@771422735486156811>",
					embeds: [embed],
				});
				return;
			} catch (errorError) {
				console.error(errorError);
			}
		}
	})
	.login(process.env.BOT_TOKEN);
	