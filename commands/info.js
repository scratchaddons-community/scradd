/** @file Show Information about the bot. */
import fileSystem from "fs/promises";
import path from "path";
import url from "url";

import { SlashCommandBuilder } from "@discordjs/builders";
import { Client, Message, MessageActionRow, MessageSelectMenu } from "discord.js";

import { BOARD_CHANNEL, BOARD_EMOJI, MIN_REACTIONS } from "../common/board.js";
import { MODMAIL_CHANNEL } from "../common/modmail.js";
import escapeMessage from "../lib/escape.js";
import generateHash from "../lib/generateHash.js";
import join from "../lib/joinWithAnd.js";
import CONSTANTS from "../common/CONSTANTS.js";

const pkg = JSON.parse(
	await fileSystem.readFile(
		path.resolve(path.dirname(url.fileURLToPath(import.meta.url)), "../package.json"),
		"utf8",
	),
);

const moderator = `<@&${escapeMessage(process.env.MODERATOR_ROLE || "")}>`;
const developers = `<@&${escapeMessage(process.env.DEVELOPER_ROLE || "")}>`;

/**
 * Get all users with a role.
 *
 * @param {string} roleId - Role to fetch.
 * @param {Client} client - Client to use.
 *
 * @returns {Promise<string>} - Users with the role.
 */
async function getRole(roleId, client) {
	const guild = await client.guilds.fetch(CONSTANTS.servers.testing);
	const role = await guild.roles.fetch(roleId);
	const members = Array.from(role?.members.values() || []);

	return join(members);
}

/**
 * @type {{
 * 	description(client: Client): string | Promise<string>;
 * 	emoji: string;
 * 	name: string;
 * }[]}
 */
const OPTIONS = [
	{
		description: () =>
			`Hello! I am Scradd v${pkg.version}, a Discord bot for the Scratch Addons community! Pick an option in the dropdown below to learn more about my features.`,

		emoji: "👋",
		name: "Hello!",
	},
	{
		description: () =>
			`After a message gets **${escapeMessage(`${MIN_REACTIONS}`)}** ${escapeMessage(
				BOARD_EMOJI,
			)} reactions, I will post it to <#${escapeMessage(
				BOARD_CHANNEL,
			)}>. This is useful for cases such as the following:\n- when you want to [highlight a good piece of work made by someone in the server](https://discord.com/channels/806602307750985799/938809898660155453/943246143452770364) so more people see it\n- when you want to [give somone credit for making or saying something funny](https://discord.com/channels/806602307750985799/938809898660155453/944108757686841344)\n- when someone says [something that without context makes no sense](https://discord.com/channels/806602307750985799/938809898660155453/941848293170876486)\n- and etcetera.\n\nYou cannot react to your own messages with ${escapeMessage(
				BOARD_EMOJI,
			)} to prevent abusing the potatoboard. Also, if I autoreact to a message with ${escapeMessage(
				BOARD_EMOJI,
			)}, it does not count towards the ${escapeMessage(
				`${MIN_REACTIONS}`,
			)} needed to be posted.\n\nYou can use the [\`/explorepotatoes\`](<https://github.com/scratchaddons-community/scradd/blob/main/commands/explorepotatoes.js>) command to find a random message from the potatoboard. You can filter by the user or by minimum number of ${escapeMessage(
				BOARD_EMOJI,
			)} reactions.\n\nMost of the code handling potatoboard starts from [messageReactionAdd.js](<https://github.com/scratchaddons-community/scradd/blob/main/events/messageReactionAdd.js>).`,

		emoji: BOARD_EMOJI,
		name: "Potatoboard",
	},
	{
		description: () =>
			`Users can use the [\`/suggestion create\`](<https://github.com/scratchaddons-community/scradd/blob/main/commands/suggestion.js>) command to post a suggestion to <#${escapeMessage(
				process.env.SUGGESTION_CHANNEL || "",
			)}>. I will react to the suggestion with 👍 and 👎 for people to vote on it, as well as open a thread for discussion on it. One of ${developers} can use the \`/suggestion answer\` command in the thread to answer a suggestion. ${developers}, the ${moderator}s, and the user who originally posted the suggestion (the OP) can run \`/suggestion delete\` to delete the suggestion if needed. The OP may also run the \`/suggestion edit\` command to edit the suggestion if they made a typo or something like that. Finally, the \`/suggestion get-top\` command can be used to get the top suggestions. By default it returns all suggestions, but you can filter by the suggestion’s OP and/or the suggestion’s answer. This can be used to find things such as your most liked suggestions, suggestions you could go answer if you are a dev, suggestions you could implement if you are a dev, and so on.\n\nSimilar [\`/bugreport\`](<https://github.com/scratchaddons-community/scradd/blob/main/commands/bugreport.js>) commands also exist but with a few key differences: the words used in the commands are slightly different, no reactions are added to reports, the possible answers are different, and there is no \`/bugreport get-top\`.`,

		emoji: "👍",
		name: "Suggestions",
	},
	{
		description: () =>
			`Users may DM me to send private messages to all the ${moderator}s at once. I will send all their messages to a thread in <#${escapeMessage(
				MODMAIL_CHANNEL,
			)}> (through a webhook so the user’s original avatar and nickname is used) and react to it with <:yes:940054094272430130>. If sending any message fails, I will react with <:no:940054047854047282>. I will DM the user any messages ${moderator}s send in the thread (anonymously; the ${moderator}s’ identities are not revealed), following the same reaction rules. Reactions, replies, edits, and deletions are not supported.\nThe source code for these is in [\`messageCreate.js\`](<https://github.com/scratchaddons-community/scradd/blob/main/events/messageCreate.js>).\nWhen the ticket is resolved, a ${moderator} can use the \`/modmail close\` command to lock the thread, edit the thread starting message to indicate its closed status, and DM the user. The ${moderator} can specify a reason that will be posted in the thread as well as sent to the user. \n\nIf the ${moderator}s want to contact a user for any reason, they can use the [\`/modmail start\`](<https://github.com/scratchaddons-community/scradd/blob/main/commands/modmail.js>) command to start a modmail with a user themselves. It will open a new thread in <#${escapeMessage(
				MODMAIL_CHANNEL,
			)}> and DM the user that a Modmail has been started. The ${moderator}s can then ask the user what they need to ask, for instance, requesting them to change an innappropriate status.`,

		emoji: "🛡",
		name: "Modmail",
	},
	{
		description: () =>
			`- [\`/addon\`](<https://github.com/scratchaddons-community/scradd/blob/main/commands/addon.js>): Search for an addon by name, description, or internal ID and return various information about it. Don\’t specify a filter to get a random addon. You can click on the addon\’s name to get a link straight to the settings page to enable it.\n- [\`/info\`](<https://github.com/scratchaddons-community/scradd/blob/main/commands/info.js>) (this command): A help command to learn more about the bot and its functions.\n- [\`/say\`](<https://github.com/scratchaddons-community/scradd/blob/main/commands/say.js>): A ${moderator}-only (to prevent abuse) command that makes me mimic what you tell me to say. Note that the person who used the command will not be named publically, but ${moderator}s are able to find out still by looking in <#${escapeMessage(
				process.env.ERROR_CHANNEL || "",
			)}>.`,

		emoji: "➕",
		name: "Miscellaneous commands",
	},
	{
		description: () =>
			"I automatically react to some messages as easter eggs. How many reactions can you find? There are currently **17**! (Yes, you can just read the source code to find them, but please don’t spoil them - it’s fun for people to find them themselves.)\nThere are also **3** automatic responses when using now-removed <@" +
			CONSTANTS.robotop +
			"> commands and the like. These are not needed to be kept secret. They are: prompt users to use `/suggestion create` instead of `r!suggest`, tell people not to ping others when using `r!mimic`, and call people out when they abuse the spoiler hack. The source code for these is in [`messageCreate.js`](<https://github.com/scratchaddons-community/scradd/blob/main/events/messageCreate.js>).",

		emoji: "✅",
		name: "Autoreactions and responses",
	},
	{
		description: async (client) =>
			`Code written by (in no particular order): ${await getRole(
				CONSTANTS.roles.developers,
				client,
			)}.\nLogo by <@691223009515667457> and <@765910070222913556>.\nBeta testers (also in no particular order): ${await getRole(
				CONSTANTS.roles.testers,
				client,
			)}.\nCloud-hosted on [opeNode.io](https://www.openode.io/open-source/scradd).\nThird-party code libraries used: ${join(
				Object.keys(pkg.dependencies),
				(dependency) => `\`${escapeMessage(dependency)}\``,
			)}`,

		emoji: "📝",
		name: "Credits",
	},
	{
		description: () =>
			"I am open-source! The source code is available [on Github](https://github.com/scratchaddons-community/scradd).",

		emoji: "👨‍💻",
		name: "Source Code",
	},
];

/** @type {import("../types/command").default} */
const info = {
	data: new SlashCommandBuilder().setDescription("Learn about me!"),

	async interaction(interaction) {
		const hash = generateHash("info");
		const DEFAULT_KEY = "Hello!";
		const defaultContent =
			(await OPTIONS.find(({ name }) => name === DEFAULT_KEY)?.description(
				interaction.client,
			)) || "";
		const message = await interaction.reply({
			allowedMentions: { users: [] },

			components: [
				new MessageActionRow().addComponents(
					new MessageSelectMenu()
						.setMinValues(1)
						.setMaxValues(1)
						.setPlaceholder("Select one")
						.setCustomId(hash)
						.addOptions(
							Array.from(
								Object.entries(OPTIONS).map(([key, { emoji }]) => ({
									default: key === DEFAULT_KEY,
									emoji,
									label: key,
									value: key,
								})),
							),
						),
				),
			],

			content: defaultContent,
			ephemeral: true,
			fetchReply: true,
		});

		/**
		 * Disable the select menu.
		 *
		 * @returns {Promise<import("discord-api-types").APIMessage | Message<boolean>>} - The
		 *   original message.
		 */
		async function disable() {
			if (!(message instanceof Message)) {
				return await interaction.editReply({
					allowedMentions: { users: [] },
					content: message.content,
				});
			}

			return await interaction.editReply({
				allowedMentions: { users: [] },

				components: message.components.map((components) =>
					components.setComponents(
						components.components.map((component) => component.setDisabled(true)),
					),
				),

				content: message.content,
			});
		}

		/**
		 * Add a collector to the message to update it when an option in the select menu is selected.
		 *
		 * @returns {Promise<import("discord-api-types").APIMessage | Message<boolean>>} - The
		 *   original message.
		 */
		async function addCollector() {
			if (!(message instanceof Message)) return await disable();

			return await message
				.awaitMessageComponent({
					componentType: "SELECT_MENU",

					filter: (selectInteraction) =>
						selectInteraction.user.id === interaction.user.id,

					time: 30_000,
				})
				.then(async (selectInteraction) => {
					const promises = [];

					promises.push(selectInteraction.deferUpdate());

					const select = message.components[0]?.components[0];

					if (select?.type !== "SELECT_MENU")
						throw new TypeError("Expected first component to be a select menu");

					const chosen = selectInteraction.values[0] || "";

					select.options = select.options.map((option) => ({
						...option,
						default: option.value === chosen,
					}));
					promises.push(
						interaction.editReply({
							allowedMentions: { users: [] },
							components: [new MessageActionRow().addComponents(select)],

							content:
								(await OPTIONS.find(
									(option) => option.name === chosen,
								)?.description(interaction.client)) || defaultContent,
						}),
					);
					await Promise.all(promises);
					addCollector().catch(disable);

					return message;
				})
				.catch(disable);
		}

		addCollector().catch(disable);
	},
};

export default info;
