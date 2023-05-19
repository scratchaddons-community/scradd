import {
	ApplicationCommandType,
	ApplicationCommandOptionType,
	User,
	cleanContent,
	ComponentType,
	Constants,
	MessageType,
	Snowflake,
} from "discord.js";
import { client } from "../../lib/client.js";
import defineCommand from "../../lib/commands.js";
import { cleanDatabaseListeners } from "../../common/database.js";
import { defineModal } from "../../lib/components.js";
import editMessage, { submitEdit } from "./edit.js";
import getCode, { run } from "./run.js";
import sayCommand, { say } from "./say.js";
import { messageToText } from "../../util/discord.js";
import Fuse from "fuse.js";
import { truncateText } from "../../util/text.js";
import { stripMarkdown } from "../../util/markdown.js";

defineCommand(
	{
		name: "Edit Message",
		restricted: true,
		type: ApplicationCommandType.Message,
	},
	editMessage,
);
defineModal("edit", submitEdit);

const { owner } = await client.application.fetch();
defineCommand(
	{
		name: "run",
		description: `(${
			process.env.NODE_ENV === "production"
				? owner instanceof User
					? owner.username
					: owner?.name + " team"
				: "Scradd dev"
		} only) Run code on Scradd`,

		restricted: true,
	},
	getCode,
);
defineModal("run", run);

defineCommand(
	{
		name: "kill",
		description: `(${process.env.NODE_ENV === "production" ? "Admin" : "Scradd dev"} only) ${
			process.env.NODE_ENV === "production" ? "Restarts" : "Kills"
		} the bot`,

		restricted: true,
	},

	async (interaction) => {
		await cleanDatabaseListeners();
		await interaction.reply("Killing bot…");
		process.emitWarning(`${interaction.user.tag} is killing the bot`);
		// eslint-disable-next-line unicorn/no-process-exit -- This is how you restart the process on Railway.
		process.exit(1);
	},
);

const fetchedChannels = new Set<Snowflake>();
defineCommand(
	{
		name: "say",
		description: "(Mods only) Send a message",

		options: {
			message: {
				type: ApplicationCommandOptionType.String,
				description: "Message content",
				maxLength: 2000,
			},
			reply: {
				type: ApplicationCommandOptionType.String,
				description: "The ID of a message to reply to",
				minLength: 17,
				async autocomplete(interaction) {
					if (!interaction.channel) return await interaction.respond([]);
					if (!fetchedChannels.has(interaction.channel.id)) {
						interaction.channel.messages
							.fetch({ limit: 100 })
							.then(() => fetchedChannels.add(interaction.channel?.id ?? ""));
					}
					const messages = await Promise.all(
						interaction.channel.messages.cache
							.sort((one, two) => +two.createdAt - +one.createdAt)
							.filter((message) =>
								(Constants.NonSystemMessageTypes as MessageType[]).includes(
									message.type,
								),
							)
							.map(async (message) => ({
								...message,
								content: await messageToText(message, false),
							})) ?? [],
					);
					const reply = interaction.options.getString("reply", true);
					if (!reply)
						return await interaction.respond(messages.slice(0, 25).map(getMessageInfo));

					const fuse = new Fuse(messages, {
						findAllMatches: true,
						ignoreLocation: true,
						includeScore: true,

						keys: [
							{ name: "content", weight: 1 },
							{ name: "embeds.title", weight: 0.8 },
							{ name: "embeds.description", weight: 0.7 },
							{ name: "embeds.fields.name", weight: 0.6 },
							{ name: "embeds.fields.value", weight: 0.6 },
							{ name: "id", weight: 0.5 },
							{ name: "embeds.footer.text", weight: 0.4 },
							{ name: "embeds.author.name", weight: 0.3 },
							{ name: "interaction.commandName", weight: 0.3 },
							{ name: "attachments.name", weight: 0.3 },
							{ name: "sticker.name", weight: 0.3 },
							{ name: "author.username", weight: 0.2 },
							{ name: "components.label", weight: 0.2 },
							{ name: "components.placeholder", weight: 0.1 },
						],
					});
					await interaction.respond(
						fuse
							.search(reply)
							.filter(({ score }, index) => index < 25 && (score ?? 0) < 0.1)
							.map((message) => getMessageInfo(message.item)),
					);
					function getMessageInfo(message: typeof messages[number]) {
						const component = message.components[0]?.components[0];
						return {
							name: `@${message.author.username} - ${truncateText(
								message.content
									? stripMarkdown(
											interaction.channel
												? cleanContent(message.content, interaction.channel)
												: message.content,
									  )
									: message.embeds[0]?.title ||
											message.stickers.first()?.name ||
											(component?.type === ComponentType.Button
												? component.label
												: component?.placeholder) ||
											message.attachments.first()?.name ||
											"",
								40,
							)} (${new Date(message.createdTimestamp).toLocaleDateString("en-us", {
								month: "short",
								day: "2-digit",
								hour: "2-digit",
								minute: "2-digit",
								second: "2-digit",
								hour12: true,
							})})`,
							value: message.id,
						};
					}
				},
			},
		},

		restricted: true,
		censored: "channel",
	},

	sayCommand,
);
defineModal("say", async (interaction,reply) => {
	await say(interaction, interaction.fields.getTextInputValue("message"), reply || undefined);
});
