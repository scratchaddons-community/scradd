import { Client, Intents, MessageEmbed } from "discord.js";
import dotenv from "dotenv";
import commands from "./lib/commands/index.js";
import "./lib/commands/deploy.js";
import url from "url";
import path from "path";
import importScripts from "./lib/fileSystem/importScriptsInFolder.js";

process.on("unhandledException", console.error);
process.on("unhandledRejection", console.error);
dotenv.config();

const client = new Client({ intents: [Intents.FLAGS.GUILDS] });

const dirname = path.dirname(url.fileURLToPath(import.meta.url));
const eventsDir = path.resolve(dirname, "./events");
const events = await importScripts(eventsDir);

events.forEach(async(execute, event) => client.on(event, async(...args) => {
	try {
	return execute(...args);
} catch (error) {
	try {
		console.error(error);

		const embed = new MessageEmbed()
			.setTitle("Error!")
			.setDescription(
				`Uhoh! I found an error! (event ${event})\n\`\`\`json\n${JSON.stringify(error).replaceAll(
					"[3 backticks]",
					"```",
				)}\`\`\``,
			).setColor("#ff000");
		(await client.channels.fetch("798964196921835540")).send({
			content: "<@771422735486156811> <@799565073374380063> <@765910070222913556>",
			embeds: [embed],
		});
		return;
	} catch (errorError) {
		console.error(errorError);
	}
}
}))

client.login(process.env.BOT_TOKEN);
