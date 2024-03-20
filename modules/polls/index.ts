import { ApplicationCommandOptionType, ComponentType, TextInputStyle } from "discord.js";
import { client, defineChatCommand, defineEvent, defineModal, defineSubcommands } from "strife.js";
import poll from "./poll.js";
import { addQuestion, listQuestions } from "./qotd.js";
import { DEFAULT_SHAPES } from "./misc.js";

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
							style: TextInputStyle.Paragraph,
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

	const { emoji } = reaction;

	if (
		message.author.id === client.user.id &&
		message.interaction?.commandName === "poll" &&
		// TODO: enforce on QOTDs
		message.embeds[0]?.footer?.text &&
		user.id !== client.user.id
	) {
		const emojis = message.embeds[0].description?.match(/^\S+/gm);
		const isPollEmoji = emojis?.includes(emoji.name || "");
		if (isPollEmoji) {
			for (const [, otherReaction] of message.reactions.valueOf()) {
				if (
					emoji.name !== otherReaction.emoji.name &&
					emojis?.includes(otherReaction.emoji.name || "")
				)
					await otherReaction.users.remove(user);
			}
		}
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
		access: false,
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
