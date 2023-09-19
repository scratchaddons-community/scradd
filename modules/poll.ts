import {
	type ActionRowData,
	ApplicationCommandOptionType,
	ComponentType,
	type ModalActionRowComponentData,
	TextInputStyle,
} from "discord.js";
import constants from "../common/constants.js";
import { reactAll } from "../util/discord.js";
import { BOARD_EMOJI } from "./board/misc.js";
import twemojiRegexp from "@twemoji/parser/dist/lib/regex.js";
import { defineChatCommand, defineEvent, client, defineModal } from "strife.js";

const DEFAULT_SHAPES = ["🔺", "🟡", "🟩", "🔷", "💜"];
const DEFAULT_VALUES = ["👍 Yes", "👎 No"];
const bannedReactions = new Set(BOARD_EMOJI);

defineChatCommand(
	{
		name: "poll",
		description: "Poll people on a question",
		access: false,
		options: {
			"question": {
				type: ApplicationCommandOptionType.String,
				required: true,
				description: "The question to ask (specify questions on the next screen)",
				maxLength: 94,
			},
			"options": {
				type: ApplicationCommandOptionType.Integer,
				description: "The number of options to have (defaults to 2)",
				minValue: 1,
				maxValue: 5,
			},
			"vote-mode": {
				type: ApplicationCommandOptionType.Boolean,
				description: "Restrict people to one reaction on this poll (defaults to true)",
			},
		},
	},

	async (interaction, options) => {
		const optionCount = options.options ?? 2;
		const components = [];
		for (let index = 0; index < optionCount; index++)
			components.push({
				type: ComponentType.ActionRow,
				components: [
					{
						type: ComponentType.TextInput,
						customId: `${index}`,
						label: `Option #${index + 1}`,
						required: true,
						style: TextInputStyle.Short,
						value:
							optionCount <= DEFAULT_VALUES.length
								? DEFAULT_VALUES[index]
								: undefined,
					},
				],
			} satisfies ActionRowData<ModalActionRowComponentData>);

		await interaction.showModal({
			title: "Set Up Poll",
			components,
			customId: Number(options["vote-mode"] ?? true) + options.question + "_poll",
		});
	},
);

defineModal("poll", async (interaction, [voteMode, ...characters] = "") => {
	const question = characters.join("");
	const regexp = new RegExp(`^${twemojiRegexp.default.source}`);

	const { customReactions, options } = interaction.fields.fields.reduce<{
		customReactions: (string | undefined)[];
		options: string[];
	}>(
		({ customReactions, options }, field) => {
			const emoji = field.value.match(regexp)?.[0];
			return {
				options: [
					...options,
					(emoji ? field.value.replace(emoji, "") : field.value).trim(),
				],
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
	const shapes = DEFAULT_SHAPES.filter((emoji) => !customReactions.includes(emoji));
	const reactions = customReactions.map((emoji) => emoji ?? shapes.shift() ?? "");

	const message = await interaction.reply({
		embeds: [
			{
				color: constants.themeColor,
				title: question,
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
