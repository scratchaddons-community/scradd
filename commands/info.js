import { SlashCommandBuilder } from "@discordjs/builders";
import { Message, MessageActionRow, MessageSelectMenu } from "discord.js";
import { BOARD_CHANNEL, BOARD_EMOJI, MIN_REACTIONS } from "../common/board.js";
import generateHash from "../lib/generateHash.js";

import fileSystem from "fs/promises";
import path from "path";
import url from "url";
import escape from "../lib/escape.js";
import { MODMAIL_CHANNEL } from "../common/modmail.js";

const pkg = JSON.parse(
	await fileSystem.readFile(
		path.resolve(path.dirname(url.fileURLToPath(import.meta.url)), "../package.json"),
		"utf8",
	),
);

/** @type {import("../types/command").default} */
const info = {
	apply: process.env.NODE_ENV !== "production",
	data: new SlashCommandBuilder().setDescription("Learn about me!"),

	async interaction(interaction) {
		const mod = `<@&${escape(process.env.MODERATOR_ROLE || "")}>`;
		const dev = `<@&${escape(process.env.DEVELOPER_ROLE || "")}>`;
		/** @type {{ [key: string]: { value: string; emoji?: string } }} */
		const OPTIONS = {
			"Hello!": {
				value: "Hello! I am Scradd, a Discord bot for the Scratch Addons community! Pick an option in the dropdown below to learn more about my features.",
				emoji: "👋",
			},
			"Potatoboard": {
				value: `After a message gets **${escape(MIN_REACTIONS + "")}** ${escape(
					BOARD_EMOJI,
				)} reactions, I will post it to <#${escape(
					BOARD_CHANNEL,
				)}>. This is useful for cases such as the following:\n- when you want to [highlight a good piece of work made by someone in the server](https://canary.discord.com/channels/806602307750985799/938809898660155453/943246143452770364) so more people see it\n- when you want to [give somone credit for making or saying something funny](https://canary.discord.com/channels/806602307750985799/938809898660155453/944108757686841344)\n- when someone says [something that without context makes no sense](https://canary.discord.com/channels/806602307750985799/938809898660155453/941848293170876486)\n- and etcetera.\n\nYou cannot react to your own messages with ${escape(
					BOARD_EMOJI,
				)} to prevent abusing the potatoboard. Also, if Scradd autoreacts to a message with ${escape(
					BOARD_EMOJI,
				)}, it does not count towards the ${escape(
					MIN_REACTIONS + "",
				)} needed to be posted.\n\nYou can use the [\`/explorepotatoes\`](https://github.com/scratchaddons-community/scradd/blob/main/commands/explorepotatoes.js) command to find a random message from the potatoboard. You can filter by the user or by minimum number of ${escape(
					BOARD_EMOJI,
				)} reactions.\n\nMost of the code handling potatoboard starts from [messageReactionAdd.js](https://github.com/scratchaddons-community/scradd/blob/main/events/messageReactionAdd.js).`,
				emoji: BOARD_EMOJI,
			},
			"Suggestions": {
				value: `Users can use the \`/suggestion create\` command to post a suggestion to <#${escape(
					process.env.SUGGESTION_CHANNEL || "",
				)}>. I will react to the suggestion with 👍 and 👎 for people to vote on it as well as open a thread for discussion on it. ${dev}s can use the \`/suggestion answer\` command in the thread to answer a suggestion following the guidelines in <#909944155139112970>. ${dev}s, ${mod}s, and the user who originally posted the suggestion (the OP) can run \`/suggestion delete\` to delete the suggestion if needed. The OP may also run the \`/suggestion edit\` command to edit the suggestion if they made a typo or something like that. Finally, the \`/suggestion get-top\` command can be used to get the top suggestions. By default it returns all suggestions, but you can filter by the suggestion’s OP and/or the suggestion’s answer. This can be used to find things such as your most liked suggestions, suggestions you could go answer, suggestions you could implement, and so on.\n\nSimilar \`/bugreport\` commands also exist but with a few key differences: the words used in the commands are slightly different, no reactions are added to reports, the possible answers are different, and there is no \`/bugreport get-top\`.`,
				emoji: "👍",
			},
			"Modmail": {
				value: `Users may DM me to send private messages to all the ${mod}s at once. I will send all their messages to a thread in <#${escape(
					MODMAIL_CHANNEL,
				)}> (through a webhook so the user’s original avatar and nickname is used) and react to it with <:yes:940054094272430130>. If sending any message fails, I will react with <:no:940054047854047282>. I will DM the user any messages ${mod}s send in the thread (anonymously; the ${mod}s’ identities are not revealed), following the same reaction rules. Reactions, replies, edits, and deletes are not supported.\nWhen the ticket is resolved, a ${mod} can use the \`/modmail close\` command to lock the thread, edit the thread strting message to indicate its closed status, and DM the user. The ${mod} can specify a reason that will be posted in the thread as well as sent to the user. \n\nIf the ${mod}s want to contact a user for any reason, they can use the \`/modmail start\` command to start a modmail with a user themselves. It will open a new thread in <#${escape(
					MODMAIL_CHANNEL,
				)}> and DM the user that a Modmail has been started. The ${mod}s can then ask the user what they need to ask, for instance, requesting them to change an innappropriate status.`,
				emoji: "🛡",
			},
			"Miscellaneous commands": {
				value: `(click a command name to view the source code)\n- [\`/addon\`](https://github.com/scratchaddons-community/scradd/blob/main/commands/addon.js): Search for an addon by name, description, or internal ID and return various information about it. Don\’t specify a filter to get a random addon. You can click on the addon\’s name to get a link straight to the settings page to enable it.\n- [\`/info\`](https://github.com/scratchaddons-community/scradd/blob/main/commands/info.js) (this command): A help command to learn more about the bot and its functions.\n- [\`/say\`](https://github.com/scratchaddons-community/scradd/blob/main/commands/say.js): A ${mod}-only (to prevent abuse) command that makes me mimic what you tell me to say. Note that the person who used the command will not be named publically, but ${mod}s are able to find out still by looking in <#${escape(
					process.env.ERROR_CHANNEL || "",
				)}>.`,
				emoji: "➕",
			},
			"Autoreactions and responses": {
				value: "I automatically reacts to some messages as little easter eggs. How many reactions can you find? There are currently **16** triggers. (Yes, you can just read the source code to find them, but please don’t spoil them - it’s fun for people to find them themselves.)\nThere are also **3** automatic responses when using now-removed <@323630372531470346> commands and the like. These are not needed to be kept secret. They are: prompt users to use `/suggestion create` instead of `r!suggest`,tell people not to ping others when using `r!mimic`, and call people out when they abuse the spoiler hack. The source code for these is in [`messageCreate.js`](https://github.com/scratchaddons-community/scradd/blob/main/events/messageCreate.js).",
				emoji: "✅",
			},
			"Credits": {
				value:
					"Code written by (in no particular order): " +
					(await getRole("938439909742616616")) +
					".\nIcon by <@691223009515667457> and <@765910070222913556>.\nCloud-hosted on [opeNode.io](https://www.openode.io/open-source/scradd).\nBeta testers (also in no particular order): " +
					(await getRole("938440159102386276")) +
					".\nThird-party code libraries used: " +
					join(
						Object.keys(pkg.dependencies),
						(dependency) => `\`${escape(dependency)}\``,
					),
				emoji: "📝",
			},
			"Source Code": {
				value: "Scradd is open-source! The source code is available [on Github](https://github.com/scratchaddons-community/scradd).",
				emoji: "👨‍💻",
			},
		};

		/**
		 * @template T
		 *
		 * @param {T[]} array
		 * @param {(item: T) => string} [callback]
		 */
		function join(array, callback = (item) => (`${item}`)) {
			const last = array.pop();

			if (typeof last === "undefined") return "(N/A)";
			if (array.length === 0) {
				return callback(last);
			}
			return array.map((item) => callback(item) + ", ").join("") + "and " + callback(last);
		}
		/**
		 * @param {string} roleId
		 *
		 * @returns
		 */
		async function getRole(roleId) {
			const guild = await interaction.client.guilds.fetch("938438560925761619");
			const role = await guild.roles.fetch(roleId);
			const members = Array.from(role?.members.values() || []);
			return join(members);
		}
		const hash = generateHash("info");
		const DEFAULT_KEY = "Hello!";
		const message = await interaction.reply({
			fetchReply: true,
			ephemeral: true,
			content: OPTIONS[DEFAULT_KEY]?.value || "",
			allowedMentions: { users: [] },
			components: [
				new MessageActionRow().addComponents(
					new MessageSelectMenu()
						.setMinValues(1)
						.setMaxValues(1)
						.setPlaceholder("Select one")
						.setCustomId(hash)
						.addOptions([
							...Object.entries(OPTIONS).map(([key, { emoji }]) => ({
								label: key,
								value: key,
								emoji,
								default: key === DEFAULT_KEY,
							})),
						]),
				),
			],
		});

		function disable() {
			if (!(message instanceof Message))
				return interaction.editReply({
					content: message.content,
					allowedMentions: { users: [] },
				});
			return interaction.editReply({
				content: message.content,
				allowedMentions: { users: [] },
				components: message.components.map((components) =>
					components.setComponents(
						components.components.map((component) => component.setDisabled(true)),
					),
				),
			});
		}

		function addCollector() {
			if (!(message instanceof Message)) return disable();

			return message
				.awaitMessageComponent({
					filter: (selectInteraction) =>
						selectInteraction.user.id === interaction.user.id,
					componentType: "SELECT_MENU",
					time: 30_000,
				})
				.then((selectInteraction) => {
					selectInteraction.deferUpdate();
					const select = message.components[0]?.components[0];
					if (select?.type !== "SELECT_MENU") throw "";
					const chosen = selectInteraction.values[0] || "";
					select.options = select.options.map((option) => ({
						...option,
						default: option.value === chosen,
					}));
					interaction.editReply({
						allowedMentions: { users: [] },
						content: OPTIONS[chosen]?.value || "",
						components: [new MessageActionRow().addComponents(select)],
					});
					addCollector();
				})
				.catch(disable);
		}
		addCollector();
	},
};

export default info;
