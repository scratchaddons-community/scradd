import { Message, SelectMenuBuilder, SlashCommandBuilder, time, ComponentType } from "discord.js";

import { BOARD_CHANNEL, BOARD_EMOJI, MIN_REACTIONS } from "../common/board.js";
import { MODMAIL_CHANNEL, UNSUPPORTED } from "../common/modmail.js";
import { escapeMessage, replaceBackticks } from "../lib/markdown.js";
import { generateHash } from "../lib/text.js";
import { joinWithAnd } from "../lib/text.js";
import CONSTANTS from "../common/CONSTANTS.js";
import { SUGGESTION_EMOJIS } from "./suggestion.js";
import { pkg } from "../lib/files.js";
import { MessageActionRowBuilder } from "../types/ActionRowBuilder.js";
import { disableComponents } from "../lib/message.js";
import client from "../client.js";

const moderator = `<@&${escapeMessage(process.env.MODERATOR_ROLE ?? "")}>`;
const developers = `<@&${escapeMessage(process.env.DEVELOPER_ROLE ?? "")}>`;

/**
 * Get all users with a role.
 *
 * @param {import("discord.js").Snowflake} roleId - Role to fetch.
 *
 * @returns {Promise<string>} - Users with the role.
 */
async function getRole(roleId) {
	const guild = await client.guilds.fetch(CONSTANTS.testingServer);
	const role = await guild.roles.fetch(roleId);
	const members = Array.from(role?.members.values() ?? []);

	return joinWithAnd(members);
}

const BLOB_ROOT = CONSTANTS.urls.scraddRepo + "/blob/main";

/**
 * @type {{
 * 	description: (() => import("discord.js").Awaitable<string>) | string;
 * 	edit?: (
 * 		interaction: import("discord.js").ChatInputCommandInteraction<undefined>,
 * 		Reply: Message,
 * 	) => import("discord.js").Awaitable<string>;
 * 	emoji: string;
 * 	name: string;
 * }[]}
 */
const OPTIONS = [
	{
		description: `Hello! I'm **Scradd v${pkg.version}**, a Discord bot for the **Scratch Addons** community! **Pick an option** in the dropdown below to **learn more about my features**.`,

		emoji: "👋",
		name: "Hello!",
	},
	{
		description:
			`Users can use the **[\`/suggestion create\`](<${BLOB_ROOT}/commands/suggestion.js>) command** to post a suggestion to <#${escapeMessage(
				process.env.SUGGESTION_CHANNEL ?? "",
			)}>. I will **react to the suggestion** with ${joinWithAnd(
				SUGGESTION_EMOJIS[0] || [],
			)} for people to vote on it, as well as **open a thread** for discussion on it. One of ${developers} can use the \`/suggestion answer\` command in the thread to **answer a suggestion**. The OP may run the \`/suggestion edit\` command to **edit the suggestion** if they made a typo or something like that. Finally, the \`/suggestion get-top\` command can be used to **get the top suggestions**. By default it returns all suggestions, but you can **filter by the suggestion’s OP and/or the suggestion’s answer**. This can be used to find things such as **your most liked suggestions**, **suggestions you could go answer** (if you are a dev), **suggestions you could implement** (also if you are a dev), and so on.\n` +
			`\n` +
			`Similar **[\`/bug-report\`](<${BLOB_ROOT}/commands/bug-report.js>) commands** also exist but with a few key differences: **the wording used** in the commands are slightly different, **no reactions** are added to reports, the possible **answers are different**, and there is **no \`/bug-report get-top\`**.`,

		emoji: "👍",
		name: "Suggestions",
	},
	{
		description:
			`After a message gets **${escapeMessage(`${MIN_REACTIONS}`)} ${escapeMessage(
				BOARD_EMOJI,
			)} reactions**, I will post it to <#${escapeMessage(
				BOARD_CHANNEL,
			)}>. This is useful for cases such as the following:\n` +
			`- when you want to [**highlight a good piece of work made by someone in the server**](https://discord.com/channels/806602307750985799/938809898660155453/943246143452770364) so more people see it\n` +
			`- when you want to [**give somone credit for making or saying something funny**](https://discord.com/channels/806602307750985799/938809898660155453/949148897396260904)\n` +
			`- when someone says [**something that without context makes no sense**](https://discord.com/channels/806602307750985799/938809898660155453/941848293170876486)\n` +
			`- and etcetera.\n` +
			`\n` +
			`You **cannot react to your own messages** with ${escapeMessage(
				BOARD_EMOJI,
			)} to **prevent abusing** the potatoboard.\n` +
			`\n` +
			`You can use the **[\`/explorepotatoes\`](<${BLOB_ROOT}/commands/explorepotatoes.js>) command** to find **a random message from the potatoboard**. You can filter by the **user**, **channel**, and/or minimum number of ${escapeMessage(
				BOARD_EMOJI,
			)} **reactions**.\n` +
			`\n` +
			`Most of the code handling Potatoboard starts from **[messageReactionAdd.js](<${BLOB_ROOT}/events/messageReactionAdd.js>)**.`,

		emoji: BOARD_EMOJI,
		name: "Potatoboard",
	},
	{
		description:
			`Users may **DM me to send private messages to all the ${moderator}s** at once. I will send all their messages to **a thread in <#${escapeMessage(
				MODMAIL_CHANNEL,
			)}>** (through a webhook so the user’s original avatar and nickname is used) and **react to it with ${
				CONSTANTS.emojis.statuses.yes
			}**. If sending any message fails, I will **react with ${
				CONSTANTS.emojis.statuses.no
			}**. I will **DM the user any messages the ${moderator}s send in the thread**, using the same reactions. ${UNSUPPORTED}\n` +
			`The source **code for these is in [\`messageCreate.js\`](<${BLOB_ROOT}/events/messageCreate.js>)**.\n` +
			`When the ticket is resolved, **a ${moderator} can use the \`/modmail close\` command** to **lock the thread**, **edit the thread starting message** to indicate its closed status, and **DM the user**. The ${moderator} **must specify a reason** for doing so that will be **posted in the thread** as well as **sent to the user**. \n` +
			`\n` +
			`If the ${moderator}s want to contact a user for any reason, they can **use the [\`/modmail start\`](<${BLOB_ROOT}/commands/modmail.js>) command to start a modmail** with a user themselves. It will **open a new thread** in <#${escapeMessage(
				MODMAIL_CHANNEL,
			)}> and **DM the user** that a Modmail has been started. The ${moderator}s **can then ask the user what they need to ask**, for instance, requesting them to **change an innappropriate status**.`,

		emoji: "🛡",
		name: "Modmail",
	},
	{
		description:
			`- [__**\`/addon\`**__](<${BLOB_ROOT}/commands/addon.js>): **Search for an addon** by name, description, or internal ID and return various information about it. Don\’t specify a filter to get **a random addon**. You can **click on the addon\’s name** to get a link straight to the settings page **to enable it**. The **\`compact\` option** (enabled by default everywhere except in <#${process.env.BOTS_CHANNEL}>) shows **less information** to avoid **flooding the chat**.\n` +
			`- [__**\`/info\`**__](<${BLOB_ROOT}/commands/info.js>) (this command): **A help command** to learn about **the bot**, learn how to use **its functions**, and **debug it** if it it lagging. The \`ephemeral\` option controls whether or not the information is shown publically.\n` +
			`- [__**\`/say\`**__](<${BLOB_ROOT}/commands/say.js>): A ${moderator}-only (to prevent abuse) command that **makes me mimic** what you tell me to say. Note that the person who used the command **will not be named publically**, but ${moderator}s **are able to find out still** by looking in <#${escapeMessage(
				process.env.LOGS_CHANNEL ?? "",
			)}>.`,

		emoji: "➕",
		name: "Miscellaneous commands",
	},
	{
		description:
			"I **automatically react to some messages** as easter eggs. **How many reactions can you find?** There are currently **17**! (Yes, you may just read the source code to find them, but **please don’t spoil them** - it’s more fun for people to find them themselves.)\n" +
			`There are also **2** automatic responses. Unlike autoreactions, **these are not kept secret**, as they have a actual meaningful purpose. They are: **prompt users to use \`/suggestion create\`** instead of \`r!suggest\` and **call members out** when they abuse the spoiler hack.`,

		emoji: "✅",
		name: "Autoreactions and responses",
	},
	{
		description: async () =>
			`**Coders**: ${await getRole(CONSTANTS.roles.developers)}.\n` +
			`**Designers**: ${await getRole(CONSTANTS.roles.designers)}.\n` +
			`**Beta testers**: ${await getRole(CONSTANTS.roles.testers)}.\n` +
			`(none in any particular order)\n\n` +
			`Cloud-**hosted** on [opeNode.io](https://www.openode.io/open-source/scradd).\n` +
			`Third-party code **libraries** used: ${joinWithAnd(
				Object.keys(pkg.dependencies),
				(dependency) => `\`${replaceBackticks(escapeMessage(dependency))}\``,
			)}`,

		emoji: "📝",
		name: "Credits",
	},
	{
		description: `I'm **open-source**! The source code is available [**on GitHub**](${CONSTANTS.urls.scraddRepo}).`,

		emoji: "💻",
		name: "Source Code",
	},
	{
		description: "Pinging…",
		edit: (interaction, reply) =>
			`__**Bot info:**__\n` +
			`**Ping**: ${Math.abs(+reply.createdAt - +interaction.createdAt)}ms\n` +
			`Last **restarted**  ${time(interaction.client.readyAt ?? new Date(), "R")}\n` +
			`Current **version**: v${pkg.version}\n` +
			`\n__**Configuration:**__\n` +
			`**Mode**: ${process.env.NODE_ENV === "production" ? "Production" : "Testing"}\n` +
			`**Board** channel: ${
				process.env.BOARD_CHANNEL ? `<#${process.env.BOARD_CHANNEL}>` : "*None*"
			}\n` +
			`**Logs** channel: ${
				process.env.LOGS_CHANNEL ? `<#${process.env.LOGS_CHANNEL}>` : "*None*"
			}\n` +
			`**Modmail** channel: ${
				process.env.MODMAIL_CHANNEL ? `<#${process.env.MODMAIL_CHANNEL}>` : "*None*"
			}\n` +
			`**Public logs** channel: ${
				process.env.MODMAIL_CHANNEL ? `<#${process.env.PUBLIC_LOGS_CHANNEL}>` : "*None*"
			}\n` +
			`**Suggestions** channel: ${
				process.env.SUGGESTION_CHANNEL ? `<#${process.env.SUGGESTION_CHANNEL}>` : "*None*"
			}\n` +
			`**Bugs** channel: ${
				process.env.BUGS_CHANNEL ? `<#${process.env.BUGS_CHANNEL}>` : "*None*"
			}\n` +
			`**Bots** channel: ${
				process.env.BOTS_CHANNEL ? `<#${process.env.BOTS_CHANNEL}>` : "*None*"
			}\n` +
			`**Mods** role: ${
				process.env.MODERATOR_ROLE ? `<@&${process.env.MODERATOR_ROLE}>` : "*None*"
			}\n` +
			`**Devs** role: ${
				process.env.DEVELOPER_ROLE ? `<@&${process.env.DEVELOPER_ROLE}>` : "*None*"
			}`,
		emoji: "🐛",
		name: "Debug info",
	},
];

/** @type {import("../types/command").default} */
const info = {
	data: new SlashCommandBuilder().setDescription("Learn about me").addStringOption((input) =>
		input
			.setName("tab")
			.setDescription("Which tab to open first")
			.addChoices(
				...OPTIONS.map(({ emoji, name }) => {
					return { name: emoji + " " + name, value: name };
				}),
			)
			.setRequired(false),
	),
	dm: true,
	async interaction(interaction) {
		const hash = generateHash("info");
		const defaultKey = interaction.options.getString("tab") ?? OPTIONS[0]?.name;
		let currentOption = OPTIONS.find(({ name }) => name === defaultKey);
		const defaultContent = currentOption?.description ?? "";
		const message = await interaction.reply({
			allowedMentions: { users: [] },

			components: [
				new MessageActionRowBuilder().addComponents(
					new SelectMenuBuilder()
						.setMinValues(1)
						.setMaxValues(1)
						.setPlaceholder("Select one")
						.setCustomId(hash)
						.addOptions(
							Object.values(OPTIONS).map(({ emoji, name }) => ({
								default: name === defaultKey,
								emoji,
								label: name,
								value: name,
							})),
						),
				),
			],

			content: defaultContent,
			fetchReply: true,
		});
		if (currentOption?.edit)
			await interaction.editReply({
				allowedMentions: { users: [] },
				components: message.components,

				content: await currentOption?.edit(interaction, message),
			});

		/** Disable the select menu. */
		async function disable() {
			return await interaction.editReply({
				allowedMentions: { users: [] },

				components: disableComponents(message.components),

				content: message.content,
			});
		}

		/** Add a collector to the message to update it when an option in the select menu is selected. */
		async function addCollector() {
			return await message
				.awaitMessageComponent({
					componentType: ComponentType.SelectMenu,

					filter: (selectInteraction) =>
						selectInteraction.user.id === interaction.user.id,

					time: CONSTANTS.collectorTime,
				})
				.then(async (selectInteraction) => {
					const promises = [];

					promises.push(selectInteraction.deferUpdate());

					const select = SelectMenuBuilder.from(selectInteraction.component);
					const chosen = selectInteraction.values[0];

					const option = OPTIONS.find((option) => option.name === chosen);
					promises.push(
						interaction.editReply({
							allowedMentions: { users: [] },
							components: [
								new MessageActionRowBuilder().addComponents(
									select.setOptions(
										select.options.map((option) =>
											option.setDefault(option.data.value === chosen),
										),
									),
								),
							],

							content:
								(await (option?.edit
									? option?.edit(interaction, message)
									: option?.description(interaction.client))) ?? defaultContent,
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
	enable: false,
};

export default info;
