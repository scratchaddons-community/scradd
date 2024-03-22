import {
	ApplicationCommandOptionType,
	ChannelType,
	ComponentType,
	TextInputStyle,
} from "discord.js";
import {
	client,
	defineButton,
	defineChatCommand,
	defineEvent,
	defineModal,
	defineSelect,
	defineSubcommands,
} from "strife.js";
import poll from "./poll.js";
import { addQuestion, listQuestions, removeQuestion, viewQuestion } from "./qotd.js";
import { DEFAULT_SHAPES } from "./misc.js";
import config from "../../common/config.js";

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

defineModal("poll", poll);

defineEvent("messageReactionAdd", async (partialReaction, partialUser) => {
	const reaction = partialReaction.partial ? await partialReaction.fetch() : partialReaction;
	const message = reaction.message.partial ? await reaction.message.fetch() : reaction.message;
	const user = partialUser.partial ? await partialUser.fetch() : partialUser;

	if (message.author.id !== client.user.id || user.id === client.user.id) return;
	if (
		(message.interaction?.commandName !== "poll" || !message.embeds[0]?.footer?.text) &&
		(message.channel.type !== ChannelType.PublicThread ||
			message.channel.parent?.id !== config.channels.qotd)
	)
		return;

	const emojis = (message.embeds[0]?.description ?? message.content).match(/^\S+/gm);
	if (!reaction.emoji.name || !emojis?.includes(reaction.emoji.name)) return;

	for (const [, other] of message.reactions
		.valueOf()
		.filter(
			({ emoji }) => emoji.name !== reaction.emoji.name && emojis.includes(emoji.name || "_"),
		)) {
		await other.users.remove(user);
	}
});

defineSubcommands(
	{
		name: "qotd",
		description: "Manage Questions of The Day",

		subcommands: {
			add: { description: "Add a Question of The Day" },
			list: { description: "List Questions of The Day" },
		},

		restricted: true,
	},
	async (interaction, { subcommand }) => {
		switch (subcommand) {
			case "add": {
				await addQuestion(interaction);
				break;
			}
			case "list": {
				await listQuestions(interaction);
				break;
			}
		}
	},
);

defineSelect("viewQuestion", viewQuestion);
defineButton("removeQuestion", removeQuestion);
