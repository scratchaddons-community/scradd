import {
	SlashCommandBuilder,
	Message,
	ButtonBuilder,
	ButtonComponent,
	SelectMenuBuilder,
	EmbedBuilder,
	escapeMarkdown,
	ButtonStyle,
	MessageType,
	ComponentType,
	Embed,
	SelectMenuComponentOptionData,
} from "discord.js";
import Fuse from "fuse.js";

import addons from "../common/20addons/addons.js";
import CONSTANTS from "../common/CONSTANTS.js";
import { CURRENTLY_PLAYING, checkIfUserPlaying } from "../common/20addons/gameUtils.js";
import manifest from "../common/20addons/manifest.js";
import questionsByAddon from "../common/20addons/questions.js";
import { generateHash } from "../lib/text.js";
import { MessageActionRowBuilder } from "../types/ActionRowBuilder.js";

const fuse = new Fuse(addons, {
	findAllMatches: true,
	ignoreLocation: true,
	includeScore: true,

	keys: [
		{
			name: "id",
			weight: 1,
		},
		{
			name: "name",
			weight: 1,
		},
	],
});

const questions = Object.values(questionsByAddon)
	.flat()
	.filter(
		({ question }, index, array) =>
			!array.some((foundQuestion, id) => foundQuestion.question === question && id > index),
	)
	.sort(
		(one, two) =>
			(one.order || Number.POSITIVE_INFINITY) - (two.order || Number.POSITIVE_INFINITY) ||
			(one.userAsking.toLowerCase() < two.userAsking.toLowerCase() ? -1 : 1),
	)
	.reduce((accumulator, { group, userAsking }) => {
		/** @param {number} [index] */
		function addToGroup(index = 0) {
			accumulator[`${group}`] ??= [];

			if ((accumulator[`${group}`]?.[+index]?.length || 0) < 25) {
				/** @type {string[][]} */ (accumulator[`${group}`])[+index] ??= [];
				accumulator[`${group}`]?.[+index]?.push(userAsking);
			} else {
				addToGroup(index + 1);
			}
		}

		addToGroup();

		return accumulator;
	}, /** @type {{ [key: string]: string[][] }} */ ({}));

const selectGroupButton = (/** @type {string | undefined} */ defaultValue) =>
	new SelectMenuBuilder()
		.setPlaceholder("Select a group")
		.setCustomId(generateHash("group"))
		.setOptions(
			Object.keys(questions)
				.map((group) => ({
					default: typeof defaultValue === "string" ? group === defaultValue : false,
					label: group,
					value: group,
				}))
				.sort(({ label: one }, { label: two }) => (one === two ? 0 : one < two ? -1 : 1)),
		);

/**
 * Determine the best question to ask next.
 *
 * @param {[string, number][]} addonProbabilities - The probabilities of each addon being the answer.
 * @param {string[]} [askedQuestions] - Questions to ignore.
 *
 * @returns {string[] | undefined} - A new question to ask.
 */
function getNextQuestions(addonProbabilities, askedQuestions = []) {
	/** @type {{ [key: string]: number }} */
	const frequencies = {};

	for (const question of /**
	 * @type {{
	 * 	question: string;
	 * 	statement: string;
	 * 	dependencies?:
	 * 		| {
	 * 				[key: string]: boolean;
	 * 		  }
	 * 		| undefined;
	 * }[]}
	 */ (
		Object.entries(questionsByAddon)
			.map(([addon, questions]) =>
				Array.from({
					length: Math.round(
						((Array.from(addonProbabilities)
							.reverse()
							.findIndex(([id]) => id === addon) || 0) +
							1) /
							addonProbabilities.length +
							((addonProbabilities.find(([id]) => id === addon)?.[1] || 0) + 1),
					),
				}).fill(
					questions.filter(
						(questionInfo) => !askedQuestions.includes(questionInfo.question),
					),
				),
			)
			.flat(Number.POSITIVE_INFINITY)
	)) {
		frequencies[`${question.question}`] ??= 0;
		frequencies[`${question.question}`]++;
	}

	const frequenciesArray = Object.entries(frequencies);

	if (frequenciesArray.length === 0) return;

	return frequenciesArray
		.sort(() => Math.random() - 0.5)
		.reduce((previous, current, _, { length }) => {
			const currentDistance = Math.abs(current[1] / length - 0.5);
			const previousDistance = Math.abs((previous[0]?.[1] || 0) / length - 0.5);

			return currentDistance < previousDistance
				? current[1] < Math.round(length / 9)
					? []
					: [current]
				: currentDistance > previousDistance
				? previous
				: [...previous, current];
		}, /** @type {typeof frequenciesArray} */ ([]))
		.map(([question]) => question);
}

/**
 * Update probabilities based on an answered question.
 *
 * @param {string} justAsked - The question that was answered.
 * @param {number} probabilityShift - How much to care.
 * @param {[string, number][]} probabilitiesBefore - The probabilities of addons before this question.
 * @param {string[]} [askedQuestions] - Questions that were already asked. This function will be modify this array.
 *
 * @returns {[string, number][]} - The new probabilities.
 */
function answerQuestion(justAsked, probabilityShift, probabilitiesBefore, askedQuestions = []) {
	const justAskedQuestions = [justAsked];

	/** @type {{ [key: string]: boolean }} */
	const dependencies = {};
	const initialUpdated = probabilitiesBefore.map(([addonId, probability]) => {
		const addon = questionsByAddon[`${addonId}`];
		const questionInfo = addon?.find(({ question }) => question === justAsked);

		if (probabilityShift > 0 && questionInfo?.dependencies)
			Object.assign(dependencies, questionInfo.dependencies);

		const allDependencies =
			addon?.reduce(
				(accumulator, { dependencies: addonDependencies = {} }) => ({
					...accumulator,
					...addonDependencies,
				}),
				/** @type {{ [key: string]: boolean }} */ ({}),
			) || {};

		if (
			typeof allDependencies[`${justAsked}`] !== "undefined" &&
			((probabilityShift > 0 && !allDependencies[`${justAsked}`]) ||
				(probabilityShift < 0 && allDependencies[`${justAsked}`] !== false))
		) {
			if (addon) {
				justAskedQuestions.push(
					...addon
						.filter(({ dependencies: addonDependencies = {} }) =>
							Object.keys(addonDependencies)?.includes(justAsked),
						)
						.map(({ question }) => question),
				);
			}

			return /** @type {[string, number]} */ ([
				addonId,
				probability + (questionInfo ? probabilityShift : 0) - Math.abs(probabilityShift),
			]);
		}

		return /** @type {[string, number]} */ ([
			addonId,
			probability + (questionInfo ? probabilityShift : 0),
		]);
	});

	const result = Object.entries(dependencies)
		.reduce(
			(accumulated, current) =>
				askedQuestions.includes(current[0])
					? accumulated
					: answerQuestion(
							current[0],
							(current[1] ? +1 : -1) * probabilityShift,
							accumulated.sort((one, two) => two[1] - one[1]),
							askedQuestions,
					  ),
			initialUpdated,
		)
		.sort((one, two) => two[1] - one[1]);

	askedQuestions.push(...justAskedQuestions);

	return result;
}

/** @type {import("../types/command").default} */
const info = {
	data: new SlashCommandBuilder()
		.setDescription("Commands to play a game where I or a user guess an addon.")
		.addSubcommand((subcommand) =>
			subcommand.setName("bot").setDescription("You think of an addon and I guess!"),
		)
		.addSubcommand((subcommand) =>
			subcommand.setName("player").setDescription("I think of an addon and you guess!"),
		),

	async interaction(interaction) {
		const command = interaction.options.getSubcommand();

		switch (command) {
			case "bot":
				if (!(await checkIfUserPlaying(interaction))) {
					await interaction.reply({
						content:
							"Think of an addon. Answer my questions about it and I will try to guess which one you are thinking of!",
					});
					await reply();

					/**
					 * Respond to an interaction with a question.
					 *
					 * - The interaction to respond to.
					 *
					 * @param {string[]} [askedQuestions] - Questions to ignore.
					 * @param {[string, number][]} [addonProbabilities] - Current probabilities of each addon being correct. MUST be sorted.
					 * @param {number} [askedCount] - Count of messages that have already been asked.
					 * @param {| false
					 * 	| string
					 * 	| {
					 * 			probabilities: [string, number][];
					 * 			askedQuestions: string[];
					 * 			justAsked: string;
					 * 	  }} [backInfo]
					 *   - Information about the previous question.
					 *
					 * @param justAnswered
					 *
					 * @returns {Promise<Message | undefined>} - Sent message.
					 */
					async function reply(
						askedQuestions = [],
						addonProbabilities = addons
							.map((addon) => /** @type {[string, number]} */ ([addon.id, 0]))
							.sort(() => Math.random() - 0.5),
						askedCount = 0,
						backInfo = false,
						justAnswered = "",
					) {
						const questions =
							typeof backInfo === "string"
								? [backInfo]
								: getNextQuestions(addonProbabilities, askedQuestions);

						const oldMessage = await interaction.fetchReply();

						if (process.env.NODE_ENV !== "production") {
							console.log(
								addonProbabilities[0],
								addonProbabilities[1],
								addonProbabilities[3],
							);
						}

						if (
							(addonProbabilities[1]?.[1] || 0) + 4 <
							(addonProbabilities[0]?.[1] || 0)
						) {
							await answerWithAddon(
								/** @type {Message<boolean>} */ (oldMessage),
								addonProbabilities,
								askedCount,
								askedQuestions,
								backInfo,
								justAnswered,
							);

							return;
						}

						if (!questions?.[0]) {
							if (
								(addonProbabilities[1]?.[1] || 0) <
								(addonProbabilities[0]?.[1] || 0)
							) {
								await answerWithAddon(
									/** @type {Message<boolean>} */ (oldMessage),
									addonProbabilities,
									askedCount,
									askedQuestions,
									backInfo,
									justAnswered,
								);

								return;
							}

							await interaction.editReply({
								components: oldMessage.components.map((row) =>
									MessageActionRowBuilder.from(row).setComponents(
										row.components.map((component) =>
											component.setDisabled(true),
										),
									),
								),

								embeds: [
									new EmbedBuilder(
										/** @type {!Embed} */ (oldMessage.embeds[0]).toJSON(),
									),
								],
							});

							await /** @type {Message<boolean>} */ (oldMessage).reply({
								content: `${interaction.user.toString()}, you beat me! How *did* you do that? You were thinking of an actual addon, right? (Also, I only know about addons available in v${
									manifest.version
								})`,
							});

							CURRENTLY_PLAYING.delete(interaction.user.id);

							return;
						}

						const message = await interaction.editReply({
							components: [
								new MessageActionRowBuilder().addComponents(
									new ButtonBuilder()
										.setLabel("Yes")
										.setStyle(ButtonStyle.Success)
										.setCustomId(generateHash("yes")),
									new ButtonBuilder()
										.setLabel("I think so")
										.setStyle(ButtonStyle.Success)
										.setCustomId(generateHash("probably")),
									new ButtonBuilder()
										.setLabel("I don’t know")
										.setStyle(ButtonStyle.Primary)
										.setCustomId(generateHash("dontKnow")),
									new ButtonBuilder()
										.setLabel("I don’t think so")
										.setStyle(ButtonStyle.Danger)
										.setCustomId(generateHash("not")),
									new ButtonBuilder()
										.setLabel("No")
										.setStyle(ButtonStyle.Danger)
										.setCustomId(generateHash("no")),
								),
								new MessageActionRowBuilder().addComponents(
									...(typeof backInfo === "object"
										? [
												new ButtonBuilder()
													.setLabel("Back")
													.setStyle(ButtonStyle.Secondary)
													.setCustomId(generateHash("back")),
										  ]
										: []),
									new ButtonBuilder()
										.setLabel("End")
										.setStyle(ButtonStyle.Secondary)
										.setCustomId(generateHash("end")),
								),
							],

							embeds: [
								new EmbedBuilder(
									/** @type {!Embed} */ (oldMessage.embeds[0]).toJSON(),
								).setDescription(
									(oldMessage.embeds[0]?.description
										? `${
												oldMessage.embeds[0]?.description || ""
										  } **${justAnswered}**\n`
										: "") + questions[0],
								),
							],
						});

						if (!(message instanceof Message))
							throw new TypeError("message is not a Message");

						CURRENTLY_PLAYING.set(interaction.user.id, message);

						const collector = message.createMessageComponentCollector({
							componentType: ComponentType.Button,

							filter: (buttonInteraction) =>
								buttonInteraction.user.id === interaction.user.id,

							time: 120_000,
						});

						collector
							.on("collect", async (buttonInteraction) => {
								if (buttonInteraction.customId.startsWith("end")) {
									CURRENTLY_PLAYING.delete(interaction.user.id);
									await Promise.all([
										buttonInteraction.reply({
											content: `${interaction.user.toString()} chose to end game early.`,
										}),
										interaction.editReply({
											components: message.components.map((row) =>
												MessageActionRowBuilder.from(row).setComponents(
													row.components.map((component) =>
														component.setDisabled(true),
													),
												),
											),

											embeds: [
												new EmbedBuilder(
													/** @type {!Embed} */ (
														oldMessage.embeds[0]
													).toJSON(),
												),
											],
										}),
									]);

									collector.stop();

									return;
								}

								await buttonInteraction.deferUpdate();

								if (buttonInteraction.customId.startsWith("back")) {
									if (typeof backInfo !== "object") {
										await buttonInteraction.reply({
											content: "You can't go back here!",
											ephemeral: true,
										});
										collector.resetTimer();

										return;
									}

									const nextMessage = await reply(
										backInfo.askedQuestions,
										backInfo.probabilities,
										askedCount - 1,
										backInfo.justAsked,
										buttonInteraction.component.label || "",
									);

									if (nextMessage)
										CURRENTLY_PLAYING.set(interaction.user.id, nextMessage);
									else CURRENTLY_PLAYING.delete(interaction.user.id);

									collector.stop();
								} else {
									const probabilityShift = buttonInteraction.customId.startsWith(
										"yes",
									)
										? 2
										: buttonInteraction.customId.startsWith("probably")
										? 1
										: buttonInteraction.customId.startsWith("not")
										? -1
										: buttonInteraction.customId.startsWith("no")
										? -2
										: 0;

									const previouslyAsked = Array.from(askedQuestions);
									const newProbabilities = answerQuestion(
										questions[0] || "",
										probabilityShift,
										addonProbabilities,
										askedQuestions,
									);

									const nextMessage = await reply(
										askedQuestions,
										newProbabilities,
										askedCount + 1,
										{
											askedQuestions: previouslyAsked,
											justAsked: questions[0] || "",
											probabilities: addonProbabilities,
										},
										buttonInteraction.component.label || "",
									);

									if (nextMessage)
										CURRENTLY_PLAYING.set(interaction.user.id, nextMessage);
									else CURRENTLY_PLAYING.delete(interaction.user.id);

									collector.stop();
								}
							})
							.on("end", async (collected) => {
								if (collected.size === 0) {
									CURRENTLY_PLAYING.delete(interaction.user.id);
									await Promise.all([
										interaction.followUp(
											`${interaction.user.toString()}, you didn’t answer my question! I’m going to end the game.`,
										),
										interaction.editReply({
											components: message.components.map((row) =>
												MessageActionRowBuilder.from(row).setComponents(
													row.components.map((component) =>
														component.setDisabled(true),
													),
												),
											),
										}),
									]);
								}
							});

						return message;
					}

					/**
					 * Reply to an interaction with an embed saying that the addon has been guessed and a button to keep playing.
					 *
					 * @param {import("discord.js").Message} oldMessage - Interaction to reply to.
					 * @param {[string, number][]} addonProbabilities - The probabilities of each addon being correct.
					 * @param {number} askedCount - How many questions have been asked already.
					 * @param {string[]} askedQuestions - Questions that should not be asked.
					 * @param {| false
					 * 	| string
					 * 	| {
					 * 			probabilities: [string, number][];
					 * 			askedQuestions: string[];
					 * 			justAsked: string;
					 * 	  }} backInfo
					 *   - Information about the previous question.
					 *
					 * @param justAnswered
					 */
					async function answerWithAddon(
						oldMessage,
						addonProbabilities,
						askedCount,
						askedQuestions,
						backInfo,
						justAnswered = "",
					) {
						const foundAddon = addons.find(
							({ id }) => id === addonProbabilities[0]?.[0],
						);

						if (!foundAddon) {
							throw new ReferenceError(
								`Addon ${
									addonProbabilities[0]?.[0] || ""
								} referenced in addonProbabilities not found in addons!`,
							);
						}

						const nextChoice = addons.find(
							({ id }) => id === addonProbabilities[1]?.[0],
						)?.name;

						await oldMessage.edit({
							components: [
								new MessageActionRowBuilder().addComponents(
									new ButtonBuilder()
										.setLabel("Yes")
										.setStyle(ButtonStyle.Success)
										.setCustomId(generateHash("yes"))
										.setDisabled(true),
									new ButtonBuilder()
										.setLabel("I think so")
										.setStyle(ButtonStyle.Success)
										.setCustomId(generateHash("probably"))
										.setDisabled(true),
									new ButtonBuilder()
										.setLabel("I don’t know")
										.setStyle(ButtonStyle.Primary)
										.setCustomId(generateHash("dontKnow"))
										.setDisabled(true),
									new ButtonBuilder()
										.setLabel("I don’t think so")
										.setStyle(ButtonStyle.Danger)
										.setCustomId(generateHash("not"))
										.setDisabled(true),
									new ButtonBuilder()
										.setLabel("No")
										.setStyle(ButtonStyle.Danger)
										.setCustomId(generateHash("no"))
										.setDisabled(true),
								),
								new MessageActionRowBuilder().addComponents(
									...(typeof backInfo === "object"
										? [
												new ButtonBuilder()
													.setLabel("Back")
													.setStyle(ButtonStyle.Secondary)
													.setCustomId(generateHash("back"))
													.setDisabled(true),
										  ]
										: []),
									new ButtonBuilder()
										.setLabel("End")
										.setStyle(ButtonStyle.Secondary)
										.setCustomId(generateHash("end"))
										.setDisabled(true),
								),
							],

							embeds: [
								new EmbedBuilder(
									/** @type {!Embed} */ (oldMessage.embeds[0]).toJSON(),
								).setDescription(
									`${
										oldMessage.embeds[0]?.description || ""
											? `${
													oldMessage.embeds[0]?.description || ""
											  } **${justAnswered}**\n`
											: ""
									}Is it the **${foundAddon.name}** addon?`,
								),
							],
						});

						const message = await oldMessage.reply({
							components: [
								new MessageActionRowBuilder().addComponents(
									...(typeof backInfo === "object"
										? [
												new ButtonBuilder()
													.setLabel("Back")
													.setStyle(ButtonStyle.Secondary)
													.setCustomId(generateHash("back")),
										  ]
										: []),

									new ButtonBuilder()
										.setLabel("No it’s not, continue!")
										.setStyle(ButtonStyle.Primary)
										.setCustomId(generateHash("continue")),
								),
							],

							content: `${interaction.user.toString()}, your addon is **${escapeMarkdown(
								foundAddon.name,
							)}**!`,

							embeds: [
								new EmbedBuilder()
									.setTitle(foundAddon.name)
									.setDescription(
										`${
											Object.entries(questionsByAddon)
												.find(
													([id]) => id === addonProbabilities[0]?.[0],
												)?.[1]
												?.map(({ statement }) => `* ${statement}`)
												.join("\n") || ""
										}\n\n*Run <@929928324959055932>'s \`/addon\` command for more information about this addon!*`,
									)
									.setAuthor(
										interaction.member &&
											"displayAvatarURL" in interaction.member
											? {
													iconURL: interaction.member.displayAvatarURL(),

													name: interaction.member.displayName,
											  }
											: {
													iconURL: interaction.user.displayAvatarURL(),

													name: interaction.user.username,
											  },
									)
									.setColor(CONSTANTS.themeColor)
									.setThumbnail(
										`https://scratchaddons.com/assets/img/addons/${encodeURI(
											foundAddon.id,
										)}.png`,
									)
									.setURL(
										`https://scratch.mit.edu/scratch-addons-extension/settings#addon-${encodeURIComponent(
											foundAddon.id,
										)}`,
									)
									.setFooter({
										text: `Guessed after ${askedCount} questions.${
											CONSTANTS.footerSeperator
										}Probability: ${addonProbabilities[0]?.[1]}${
											nextChoice
												? `${CONSTANTS.footerSeperator}Next choice: ${nextChoice} (probability ${addonProbabilities[1]?.[1]})`
												: ""
										}`,
									}),
							],
						});

						if (!(message instanceof Message))
							throw new TypeError("message is not a Message");

						CURRENTLY_PLAYING.delete(interaction.user.id);

						const collector = message.createMessageComponentCollector({
							componentType: ComponentType.Button,

							filter: (buttonInteraction) =>
								buttonInteraction.user.id === interaction.user.id,

							max: 1,
							time: 30_000,
						});

						collector
							.on("collect", async (buttonInteraction) => {
								if (await checkIfUserPlaying(buttonInteraction)) return;

								if (buttonInteraction.customId.startsWith("back")) {
									if (typeof backInfo !== "object") {
										await buttonInteraction.reply({
											content: `${interaction.user.toString()}, you can't go back here!`,
											ephemeral: true,
										});
										collector.resetTimer();

										return;
									}

									await buttonInteraction.reply({
										components: [
											new MessageActionRowBuilder().addComponents(
												new ButtonBuilder()
													.setLabel("Go to game")
													.setStyle(ButtonStyle.Link)
													.setURL(
														`https://discord.com/channels/${encodeURI(
															oldMessage.guild?.id || "@me",
														)}/${encodeURI(
															oldMessage.channel.id,
														)}/${encodeURI(oldMessage.id)}`,
													),
											),
										],

										ephemeral: true,
									});

									const nextMessage = await reply(
										backInfo.askedQuestions,
										backInfo.probabilities,
										askedCount - 1,
										backInfo.justAsked,
										ButtonBuilder.from(
											/** @type {ButtonComponent} */ (
												buttonInteraction.component
											),
										).data.label || "",
									);

									if (nextMessage)
										CURRENTLY_PLAYING.set(interaction.user.id, nextMessage);

									return;
								}

								await buttonInteraction.reply({
									components: [
										new MessageActionRowBuilder().addComponents(
											new ButtonBuilder()
												.setLabel("Go to game")
												.setStyle(ButtonStyle.Link)
												.setURL(
													`https://discord.com/channels/${encodeURI(
														oldMessage.guild?.id || "@me",
													)}/${encodeURI(
														oldMessage.channel.id,
													)}/${encodeURI(oldMessage.id)}`,
												),
										),
									],

									ephemeral: true,
								});

								const nextMessage = await reply(
									askedQuestions,
									addonProbabilities.slice(1),
									askedCount + 1,
									false,
									"No",
								);

								if (nextMessage)
									CURRENTLY_PLAYING.set(interaction.user.id, nextMessage);
							})
							.on("end", async () => {
								CURRENTLY_PLAYING.delete(interaction.user.id);
								await message.edit({
									components: message.components.map((row) =>
										MessageActionRowBuilder.from(row).setComponents(
											row.components.map((component) =>
												component.setDisabled(true),
											),
										),
									),

									embeds: [
										new EmbedBuilder(
											/** @type {!Embed} */ (message.embeds[0]).toJSON(),
										),
									],
								});
							});
					}
				}
				break;
			case "player":
				if (await checkIfUserPlaying(interaction)) return;

				/** @type {Set<string>} */
				const doneQuestions = new Set();

				const addon = addons[Math.floor(Math.random() * addons.length)];

				if (!addon) throw new ReferenceError("No addons exist!");

				if (process.env.NODE_ENV !== "production") console.log(addon.id);

				const message = await interaction.reply({
					components: [
						new MessageActionRowBuilder().addComponents(selectGroupButton()),
						new MessageActionRowBuilder().addComponents([
							new ButtonBuilder()
								.setLabel("End")
								.setStyle(ButtonStyle.Secondary)
								.setCustomId(generateHash("end")),
							new ButtonBuilder()
								.setLabel("Hint")
								.setStyle(ButtonStyle.Secondary)
								.setCustomId(generateHash("hint")),
						]),
					],

					content:
						"Select a question for me to answer from one of the dropdowns below. When you have an idea of what the addon I'm thinking of might be, reply to this message with its name!",

					embeds: [
						new EmbedBuilder()
							.setColor(CONSTANTS.themeColor)
							.setAuthor(
								interaction.member && "displayAvatarURL" in interaction.member
									? {
											iconURL: interaction.member.displayAvatarURL(),

											name: interaction.member.displayName,
									  }
									: {
											iconURL: interaction.user.displayAvatarURL(),

											name: interaction.user.username,
									  },
							)
							.setTitle("Guess the addon!")
							.setFooter({
								text: `Pick a question for me to answer from a dropdown below${CONSTANTS.footerSeperator}0 questions asked`,
							}),
					],

					fetchReply: true,
				});

				if (!(message instanceof Message)) throw new TypeError("message is not a Message");

				CURRENTLY_PLAYING.set(interaction.user.id, message);

				const componentCollector = message.createMessageComponentCollector({
					filter: (componentInteraction) =>
						componentInteraction.user.id === interaction.user.id,
					time: 120_000,
				});

				const messageCollector = message.channel.createMessageCollector({
					filter: (collectedMessage) =>
						collectedMessage.author.id === interaction.user.id &&
						collectedMessage.type === MessageType.Reply &&
						collectedMessage.reference?.messageId === message.id,
				});

				messageCollector
					.on("collect", async (collectedMessage) => {
						const { item, score } = fuse.search(collectedMessage.content)[0] ?? {};

						componentCollector.resetTimer();
						messageCollector.resetTimer();

						if (!item || (score && score > 1)) {
							await collectedMessage.reply({
								content: `I couldn't find that addon!`,
							});
							return;
						}

						const editPromise = interaction.editReply({
							embeds: [
								new EmbedBuilder(/** @type {!Embed} */ (message.embeds[0]).toJSON())
									.setDescription(
										`${message.embeds[0]?.description || ""}\n* Is it the ${
											item.name
										} addon? **${item.id === addon.id ? "Yes" : "No"}**`.trim(),
									)
									.setFooter({
										text:
											message.embeds[0]?.footer?.text.replace(
												/\d+ questions?/,
												(previousCount) =>
													`${
														1 + +(previousCount.split(" ")[0] || 0)
													} question${
														previousCount === "0 questions" ? "" : "s"
													}`,
											) || "",
									}),
							],
						});

						if (item.id !== addon.id) {
							await Promise.all([
								editPromise,
								collectedMessage.reply({
									content: `${interaction.user.toString()}, that's not the right addon!`,
								}),
							]);
							return;
						}

						await Promise.all([
							editPromise,
							collectedMessage.reply({
								content: `${interaction.user.toString()}, the addon *is* **${escapeMarkdown(
									addon.name,
								)}**! You got it right!`,

								embeds: [
									new EmbedBuilder()
										.setTitle(addon.name)
										.setDescription(
											`${
												Object.entries(questionsByAddon)
													.find(([id]) => id === addon.id)?.[1]
													?.map(({ statement }) => `* ${statement}`)
													.join("\n") || ""
											}\n\n*Run <@929928324959055932>'s \`/addon\` command for more information about this addon!*`,
										)
										.setAuthor(
											interaction.member &&
												"displayAvatarURL" in interaction.member
												? {
														iconURL:
															interaction.member.displayAvatarURL(),

														name: interaction.member.displayName,
												  }
												: {
														iconURL:
															interaction.user.displayAvatarURL(),

														name: interaction.user.username,
												  },
										)
										.setColor(CONSTANTS.themeColor)
										.setThumbnail(
											`https://scratchaddons.com/assets/img/addons/${encodeURI(
												addon.id,
											)}.png`,
										)
										.setURL(
											`https://scratch.mit.edu/scratch-addons-extension/settings#addon-${encodeURIComponent(
												addon.id,
											)}`,
										),
								],
							}),
						]);

						messageCollector.stop();
					})
					.on("end", () => {
						componentCollector.stop("GOT_CORRECT_ANSWER");
					});

				componentCollector
					.on("collect", async (componentInteraction) => {
						/**
						 * @param {string} question
						 * @param {string} groupName
						 * @param {boolean} updateEmbed
						 */
						async function answerQuestion(
							question,
							groupName,
							updateEmbed = true,
							split = [groupName],
						) {
							if (question) doneQuestions.add(question);

							const doneGroups = Object.entries(questions).reduce(
								(accumulator, [group, questions]) => {
									if (
										questions.every((subQuestions) =>
											subQuestions.every((question) =>
												doneQuestions.has(question),
											),
										)
									)
										accumulator.add(group);

									return accumulator;
								},
								/** @type {Set<string>} */ (new Set()),
							);

							const groupSelects =
								questions[`${groupName}`]?.reduce(
									(accumulator, group, selectIndex) => {
										const options = group
											.map((label, index) => ({
												label,
												value: `${groupName}.${selectIndex}.${index}`,
											}))
											.filter(({ label }) => !doneQuestions.has(label));

										const select = new SelectMenuBuilder()
											.setCustomId(generateHash(groupName))
											.setPlaceholder(
												`Select a question (${
													accumulator[0] ? "continued" : "irreversible"
												})`,
											)
											.setOptions(options);

										const row = new MessageActionRowBuilder().setComponents(
											select,
										);

										if (options.length > 0) accumulator.push(row);

										return accumulator;
									},
									/** @type {MessageActionRowBuilder[]} */ ([]),
								) || [];

							const groupSelection = selectGroupButton(split[0] || "");

							const groupsToSelect = groupSelection.options
								.map(
									(option) =>
										/** @type {SelectMenuComponentOptionData} */ ({
											default: option.data.default,
											label: option.data.label,
											value: option.data.value || "",
										}),
								)
								.filter((o) => !doneGroups.has(o.value));

							await interaction.editReply({
								components: [
									...(groupsToSelect.length > 0
										? [
												new MessageActionRowBuilder().setComponents([
													groupSelection.setOptions(...groupsToSelect),
												]),
												...groupSelects,
										  ]
										: []),
									new MessageActionRowBuilder().setComponents([
										new ButtonBuilder()
											.setLabel("End")
											.setStyle(ButtonStyle.Secondary)
											.setCustomId(generateHash("end")),
										new ButtonBuilder()
											.setLabel("Hint")
											.setStyle(ButtonStyle.Secondary)
											.setCustomId(generateHash("hint")),
									]),
								],

								embeds: updateEmbed
									? [
											new EmbedBuilder(
												/** @type {!Embed} */ (message.embeds[0]).toJSON(),
											)
												.setDescription(
													`${
														message.embeds[0]?.description || ""
													}\n* ${question} ${
														questionsByAddon[
															/** @type {import("../types/addonManifest") & { id: string }} */ (
																addon
															).id
														]?.find?.(
															({ userAsking }) =>
																userAsking === question,
														)
															? "**Yes**"
															: "**No**"
													}`.trim(),
												)
												.setFooter({
													text:
														message.embeds[0]?.footer?.text.replace(
															/\d+ questions?/,
															(previousCount) =>
																`${
																	1 +
																	+(
																		previousCount.split(
																			" ",
																		)[0] || 0
																	)
																} question${
																	previousCount === "0 questions"
																		? ""
																		: "s"
																}`,
														) || "",
												}),
									  ]
									: undefined,
							});
						}

						if (componentInteraction.customId.startsWith("hint")) {
							const hint = questionsByAddon[addon.id]
								?.sort(() => Math.random() - 0.5)
								.find((question) => !doneQuestions.has(question.userAsking));

							await componentInteraction.reply({
								content: `${interaction.user.toString()}, ${
									hint
										? `here's a hint. ${hint.statement}`
										: "I don't have a hint for you!"
								}`,
							});

							if (hint) await answerQuestion(hint.userAsking, hint.group);

							componentCollector.resetTimer();
							messageCollector.resetTimer();

							return;
						}

						if (componentInteraction.customId.startsWith("end")) {
							await componentInteraction.reply({
								content: `${interaction.user.toString()} chose to end game early. The addon I was thinking of was ${
									addon.name
								}.`,
							});

							componentCollector.stop();
							messageCollector.stop();

							return;
						}

						if (!componentInteraction.isSelectMenu()) return;

						const selected = componentInteraction.values[0] || "";
						const split = selected.split(".");
						const question =
							questions[`${split[0] || ""}`]?.[+(split[1] || 0)]?.[
								+(split[2] || 0)
							] || "";
						const groupName = split[0] || selected;

						await componentInteraction.deferUpdate();

						await answerQuestion(question, groupName, split.length === 3, split);

						componentCollector.resetTimer();
						messageCollector.resetTimer();
					})
					.on("end", async (collected) => {
						CURRENTLY_PLAYING.delete(interaction.user.id);

						await Promise.all([
							collected.size > 0 &&
							componentCollector.endReason !== "GOT_CORRECT_ANSWER"
								? Promise.resolve()
								: message.reply(
										`${interaction.user.toString()}, you didn’t ask me any questions! I’m going to end the game.`,
								  ),
							interaction.editReply({
								components: message.components.map((row) =>
									MessageActionRowBuilder.from(row).setComponents(
										row.components.map((component) =>
											component.setDisabled(true),
										),
									),
								),

								content: message.content || undefined,
							}),
						]);
					});
				break;
		}
	},
};

export default info;
