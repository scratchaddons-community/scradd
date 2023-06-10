import {
	type APIActionRowComponent,
	type APIStringSelectComponent,
	ButtonStyle,
	ChatInputCommandInteraction,
	Collection,
	ComponentType,
	escapeMarkdown,
	GuildMember,
	InteractionCollector,
	type MappedInteractionTypes,
	type MessageComponentType,
	type Snowflake,
	TextInputStyle,
} from "discord.js";
import constants from "../../common/constants.js";
import { addonSearchOptions, addons } from "../../common/extension.js";
import type AddonManifest from "../../common/types/addonManifest.js";
import { defineModal } from "../../lib/components.js";
import { disableComponents } from "../../util/discord.js";
import { generateHash } from "../../util/text.js";
import { COLLECTOR_TIME, commandMarkdown, CURRENTLY_PLAYING } from "./misc.js";
import QUESTIONS_BY_ADDON, { type GroupName, GROUP_NAMES } from "./questions.js";
import { matchSorter } from "match-sorter";

const QUESTIONS_BY_CATEGORY = Object.values(QUESTIONS_BY_ADDON)
	.flat()
	.filter(
		({ question }, index, array) =>
			!array.some((foundQuestion, id) => foundQuestion.question === question && id > index),
	)
	.sort(
		(one, two) =>
			(one.order ?? Number.POSITIVE_INFINITY) - (two.order ?? Number.POSITIVE_INFINITY) ||
			(one.markdownless.toLowerCase() < two.markdownless.toLowerCase() ? -1 : 1),
	)
	.reduce<{ [name in GroupName]: string[] }>(
		(accumulator, { group, markdownless }) => {
			const accumulated = accumulator[group];
			accumulated?.push(markdownless);
			// eslint-disable-next-line no-param-reassign -- This isn’t problematic.
			accumulator[group] = accumulated;

			return accumulator;
		},
		{ "Addon name": [], "Categorization": [], "Credits": [], "Misc": [] },
	);

const games = new Collection<
	Snowflake,
	{
		collector: InteractionCollector<MappedInteractionTypes[MessageComponentType]>;
		addon: AddonManifest & { id: string };
		guessed: string[];
	}
>();

export default async function player(interaction: ChatInputCommandInteraction<"cached" | "raw">) {
	const doneQuestions = new Set<string>();
	const addon = addons[Math.floor(Math.random() * addons.length)];

	if (!addon) throw new ReferenceError("No addons exist");

	/**
	 * Generates a select menu of question groups.
	 *
	 * @param doneGroups - Groups to ignore.
	 * @param defaultValue - The group to select by default.
	 *
	 * @returns The select menus.
	 */
	function generateGroupSelect(
		doneGroups: GroupName[] = [],
		defaultValue?: GroupName,
	): APIActionRowComponent<APIStringSelectComponent> {
		return {
			type: ComponentType.ActionRow,

			components: [
				{
					type: ComponentType.StringSelect,
					placeholder: "Select a group",
					custom_id: generateHash("group"),

					options: GROUP_NAMES.filter((group) => !doneGroups.includes(group))
						.map((group) => ({
							default: group === defaultValue,
							label: group,
							value: group,
						}))
						.sort(({ label: one }, { label: two }) => one.localeCompare(two)),
				},
			],
		};
	}

	/**
	 * Answer a question.
	 *
	 * @param groupName - The group the question is in.
	 * @param question - The question to answer. Omit to just switch to the group without answering anything.
	 */
	async function answerQuestion(groupName: GroupName, question?: string) {
		if (question) doneQuestions.add(question);

		const doneGroups = Object.entries(QUESTIONS_BY_CATEGORY).reduce<GroupName[]>(
			(accumulator, [group, questions]) => {
				if (questions.every((subQuestion) => doneQuestions.has(subQuestion)))
					accumulator.push(group);

				return accumulator;
			},
			[],
		);

		const questions = QUESTIONS_BY_CATEGORY[groupName].filter(
			(question) => !doneQuestions.has(question),
		);
		const maxLength = Math.ceil(questions.length / Math.ceil(questions.length / 25));
		const groupSelects = questions.reduce<APIActionRowComponent<APIStringSelectComponent>[]>(
			(result, question, index) => {
				const arrayIndex = Math.floor(index / maxLength);
				result[arrayIndex] ??= {
					type: ComponentType.ActionRow,

					components: [
						{
							type: ComponentType.StringSelect,
							placeholder: `Select a question (continued)`,
							custom_id: generateHash(groupName),
							options: [],
						},
					],
				};

				result[arrayIndex]?.components[0]?.options.push({
					label: question,
					value: `${groupName}.${QUESTIONS_BY_CATEGORY[groupName].indexOf(question)}`,
				});
				return result;
			},
			[
				{
					type: ComponentType.ActionRow,

					components: [
						{
							type: ComponentType.StringSelect,
							placeholder: `Select a question (irreversible)`,
							custom_id: generateHash(groupName),
							options: [],
						},
					],
				},
			],
		);

		const reply = await interaction.fetchReply();
		const buttons = reply.components.at(-1);

		const foundInAddon = QUESTIONS_BY_ADDON[addon?.id ?? ""]?.find(
			({ markdownless }) => markdownless === question,
		);

		await interaction.editReply({
			components: [
				generateGroupSelect(doneGroups, groupName),
				...groupSelects,
				...(buttons ? [buttons] : []),
			],

			embeds: question
				? [
						{
							...reply.embeds[0]?.toJSON(),

							description: `${reply.embeds[0]?.description ?? ""}\n- ${
								(
									foundInAddon ??
									Object.values(QUESTIONS_BY_ADDON)
										.flat()
										.find(({ markdownless }) => markdownless === question)
								)?.question ?? question
							} **${foundInAddon ? "Yes" : "No"}**`.trim(),

							footer: {
								text:
									reply.embeds[0]?.footer?.text.replace(
										/\d+ questions?/,
										(previousCount) =>
											`${
												1 + Number(previousCount.split(" ")[0] ?? 0)
											} question${
												previousCount === "0 questions" ? "" : "s"
											}`,
									) ?? "",
							},
						},
				  ]
				: undefined,
		});
	}

	const message = await interaction.reply({
		components: [
			generateGroupSelect(),
			{
				type: ComponentType.ActionRow,

				components: [
					{
						type: ComponentType.Button,
						label: "Give up",
						style: ButtonStyle.Danger,
						customId: generateHash("end"),
					},
					{
						type: ComponentType.Button,
						label: "Hint",
						style: ButtonStyle.Secondary,
						customId: generateHash("hint"),
					},
					{
						type: ComponentType.Button,
						label: "Guess",
						style: ButtonStyle.Success,
						customId: generateHash("guess"),
					},
				],
			},
		],

		embeds: [
			{
				color: constants.themeColor,

				author: {
					icon_url: (interaction.member instanceof GuildMember
						? interaction.member
						: interaction.user
					).displayAvatarURL(),

					name:
						interaction.member instanceof GuildMember
							? interaction.member.displayName
							: interaction.user.username,
				},

				title: "Guess the addon!",

				footer: {
					text: `Pick a question for me to answer from a dropdown below${constants.footerSeperator}0 questions asked`,
				},
			},
		],

		fetchReply: true,
	});

	CURRENTLY_PLAYING.set(interaction.user.id, message.url);

	const collector = message.createMessageComponentCollector({
		filter: (componentInteraction) => componentInteraction.user.id === interaction.user.id,

		time: COLLECTOR_TIME,
	});
	games.set(interaction.user.id, { addon, collector, guessed: [] });

	collector
		.on("collect", async (componentInteraction) => {
			if (componentInteraction.customId.startsWith("hint.")) {
				const hint = [...(QUESTIONS_BY_ADDON[addon.id] ?? [])]
					.sort(() => Math.random() - 0.5)
					.find((question) => !doneQuestions.has(question.markdownless));

				await componentInteraction.reply({
					content: `💡 ${hint?.statement ?? "I don’t have a hint for you!"}`,
					ephemeral: !hint,
				});

				await (hint
					? answerQuestion(hint.group, hint.markdownless)
					: interaction.editReply({
							components: message.components.map((row) => ({
								type: ComponentType.ActionRow,

								components: row.components.filter(
									(component) => !component.customId?.startsWith("hint."),
								),
							})),
					  }));
				collector.resetTimer();

				return;
			}

			if (componentInteraction.customId.startsWith("end.")) {
				await componentInteraction.reply(
					`😦 Why did you quit? That’s no fun! (PS, the addon I was thinking of was **${addon.name}**.)`,
				);

				collector.stop();

				return;
			}

			if (componentInteraction.customId.startsWith("guess.")) {
				await componentInteraction.showModal({
					title: "Guess Addon",
					customId: "_guessModal",

					components: [
						{
							type: ComponentType.ActionRow,

							components: [
								{
									type: ComponentType.TextInput,
									customId: "addon",
									label: "Which addon do you think it is?",
									required: true,
									style: TextInputStyle.Short,
								},
							],
						},
					],
				});

				return;
			}

			if (!componentInteraction.isStringSelectMenu())
				throw new TypeError("Unknown button pressed");

			const selected = componentInteraction.values[0] ?? "";
			const [groupName, questionIndex] = selected.split(".");

			if (!groupName || !GROUP_NAMES.includes(groupName))
				throw new ReferenceError(`Unknown group: ${groupName}`);

			await componentInteraction.deferUpdate();
			collector.resetTimer();

			await answerQuestion(
				groupName,
				questionIndex && QUESTIONS_BY_CATEGORY[groupName]?.[Number(questionIndex)],
			);
		})
		.on("end", async (_, reason) => {
			CURRENTLY_PLAYING.delete(interaction.user.id);
			games.delete(interaction.user.id);

			const reply = await interaction.fetchReply();

			interaction.editReply({ components: disableComponents(reply.components) });
			if (reason === "time") {
				await interaction.followUp(
					`🛑 ${interaction.user.toString()}, you didn’t ask me any questions! I’m going to end the game. (PS, the addon I was thinking of was **${
						addon.name
					}**.)`,
				);
			}
		});
}

defineModal("guessModal", async (interaction) => {
	const game = games.get(interaction.user.id);
	if (!game) return;

	const query = interaction.fields.getTextInputValue("addon");
	const addon = matchSorter(addons, query, addonSearchOptions)[0];

	game.collector.resetTimer();

	if (!addon) {
		await interaction.reply({
			content: `${constants.emojis.statuses.no} Could not find the **${query}** addon!`,
			ephemeral: true,
		});
		return;
	}
	if (game.guessed.includes(addon.id)) {
		await interaction.reply({
			content: `${constants.emojis.statuses.no} You already guessed **${addon.name}**!`,
			ephemeral: true,
		});
		return;
	}
	await interaction.message?.edit({
		embeds: [
			{
				...interaction.message.embeds[0]?.toJSON(),

				description: `${interaction.message.embeds[0]?.description ?? ""}\n- Is it the **${
					addon.name
				}** addon? **${addon.id === game.addon.id ? "Yes" : "No"}**`.trim(),

				footer: {
					text:
						interaction.message.embeds[0]?.footer?.text.replace(
							/\d+ questions?/,
							(previousCount) =>
								`${1 + Number(previousCount.split(" ")[0] ?? 0)} question${
									previousCount === "0 questions" ? "" : "s"
								}`,
						) ?? "",
				},
			},
		],
	});

	if (addon.id !== game.addon.id) {
		await interaction.reply(
			`${constants.emojis.statuses.no} Nope, the addon is not **${addon.name}**…`,
		);
		game.guessed.push(addon.id);
		return;
	}

	await interaction.reply({
		content: `${constants.emojis.statuses.yes} The addon *is* **${escapeMarkdown(
			game.addon.name,
		)}**! You got it right!`,

		embeds: [
			{
				title: game.addon.name,

				description: `${
					Object.entries(QUESTIONS_BY_ADDON)
						.find(([id]) => id === game.addon.id)?.[1]
						?.map(({ statement }) => `- ${statement}`)
						.join("\n") ?? ""
				}${commandMarkdown}`,

				author: {
					icon_url: (interaction.member instanceof GuildMember
						? interaction.member
						: interaction.user
					).displayAvatarURL(),

					name:
						interaction.member instanceof GuildMember
							? interaction.member.displayName
							: interaction.user.username,
				},

				color: constants.themeColor,

				thumbnail: {
					url: `${constants.urls.addonImageRoot}/${encodeURI(game.addon.id)}.png`,
				},

				url: `${constants.urls.settingsPage}#addon-${encodeURIComponent(game.addon.id)}`,
			},
		],
	});

	game.collector.stop();
});
