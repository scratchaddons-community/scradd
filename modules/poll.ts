import { ApplicationCommandOptionType, ComponentType, TextInputStyle } from "discord.js";
import constants from "../common/constants.js";
import { reactAll } from "../util/discord.js";
import { BOARD_EMOJI } from "./board/misc.js";
import twemojiRegexp from "@twemoji/parser/dist/lib/regex.js";
import { defineChatCommand, defineEvent, client, defineModal } from "strife.js";

const DEFAULT_SHAPES = ["🔺", "🔶", "🟡", "🟩", "🔹", "💜", "🟤", "🏳️"];
const bannedReactions = new Set(BOARD_EMOJI);

defineChatCommand(
	{
		name: "poll",
		description: "Poll people on a question",
		access: false,
		options: {
			"vote-mode": {
				type: ApplicationCommandOptionType.Boolean,
				description: "Restrict people to one reaction on this poll (defaults to true)",
			},
		},
	},

	async (interaction, options) => {
		await interaction.showModal({
			title: "Set Up Poll",
			components: [
				{
					type: ComponentType.ActionRow,
					components: [
						{
							type: ComponentType.TextInput,
							customId: "question",
							label: "The question to ask",
							required: true,
							style: TextInputStyle.Short,
							maxLength: 256,
						},
					],
				},
				{
					type: ComponentType.ActionRow,
					components: [
						{
							type: ComponentType.TextInput,
							customId: "options",
							label: `Options (one per line; max of ${DEFAULT_SHAPES.length})`,
							required: true,
							style: TextInputStyle.Paragraph,
							value: "👍 Yes\n👎 No",
						},
					],
				},
			],
			customId: Number(options["vote-mode"] ?? true) + "_poll",
		});
	},
);

defineModal("poll", async (interaction, voteMode) => {
	const regexp = new RegExp(`^${twemojiRegexp.default.source}`);

	const { customReactions, options } = interaction.fields
		.getTextInputValue("options")
		.split("\n")
		.reduce<{
			customReactions: (string | undefined)[];
			options: string[];
		}>(
			({ customReactions, options }, option) => {
				const emoji = option.match(regexp)?.[0];
				return {
					options: [...options, (emoji ? option.replace(emoji, "") : option).trim()],
					customReactions: [
						...customReactions,
						!emoji || customReactions.includes(emoji) || bannedReactions.has(emoji)
							? undefined
							: emoji,
					],
				};
			},
			{ customReactions: [], options: [] },
		); // TODO: censor it
	if (options.length > DEFAULT_SHAPES.length)
		return await interaction.reply({
			ephemeral: true,
			content: `${constants.emojis.statuses.no} You can’t have over ${
				DEFAULT_SHAPES.length
			} option${DEFAULT_SHAPES.length === 1 ? "" : "s"}!`,
		});

	const shapes = DEFAULT_SHAPES.filter((emoji) => !customReactions.includes(emoji));
	const reactions = customReactions.map((emoji) => emoji ?? shapes.shift() ?? "");

	const message = await interaction.reply({
		embeds: [
			{
				color: constants.themeColor,
				title: interaction.fields.getTextInputValue("question"),
				description: options
					.map((option, index) => `${reactions[index]} ${option}`)
					.join("\n"),
				footer:
					voteMode === "1" ? { text: "You can only vote once on this poll." } : undefined,
			},
		],
		fetchReply: true,
	});
	await reactAll(message, reactions);
});

defineEvent("messageReactionAdd", async (partialReaction, partialUser) => {
	const reaction = partialReaction.partial ? await partialReaction.fetch() : partialReaction;
	const message = reaction.message.partial ? await reaction.message.fetch() : reaction.message;
	const user = partialUser.partial ? await partialUser.fetch() : partialUser;

	const { emoji } = reaction;

	if (
		message.author.id === client.user.id &&
		message.interaction?.commandName === "poll" &&
		message.embeds[0]?.footer?.text &&
		user.id !== client.user.id
	) {
		const emojis = message.embeds[0].description?.match(/^\S+/gm);
		const isPollEmoji = emojis?.includes(emoji.name || "");
		if (isPollEmoji) {
			const promises = message.reactions.valueOf().map(async (otherReaction) => {
				if (
					emoji.name !== otherReaction.emoji.name &&
					emojis?.includes(otherReaction.emoji.name || "")
				)
					await otherReaction.users.remove(user);
			});
			await Promise.all(promises);
		}
	}
});
