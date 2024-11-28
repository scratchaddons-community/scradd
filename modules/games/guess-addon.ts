import type { ChatInputCommandInteraction, Message } from "discord.js";
import type { AddonQuestion, Dependencies } from "./addon-questions.js";

import addons from "@sa-community/addons-data" with { type: "json" };
import scratchAddons from "@sa-community/addons-data/manifest.json" with { type: "json" };
import { ButtonStyle, ComponentType, GuildMember } from "discord.js";
import {
	disableComponents,
	escapeAllMarkdown,
	footerSeperator,
	mentionChatCommand,
} from "strife.js";

import constants from "../../common/constants.js";
import QUESTIONS_BY_ADDON from "./addon-questions.js";
import { checkIfUserPlaying, CURRENTLY_PLAYING, GAME_COLLECTOR_TIME } from "./misc.js";

type Probability = readonly [string, number];
type Probabilities = Probability[];

export default async function guessAddon(interaction: ChatInputCommandInteraction): Promise<void> {
	if (await checkIfUserPlaying(interaction)) return;
	await reply();

	/**
	 * Respond to an interaction with a question.
	 *
	 * @param askedQuestions - Questions to ignore.
	 * @param addonProbabilities - Current probabilities of each addon being correct. MUST be sorted.
	 * @param askedCount - Count of messages that have already been asked.
	 * @param backInfo - Information about the previous question.
	 * @param justAnswered - The response to the previous question.
	 * @returns Sent message.
	 */
	async function reply(
		askedQuestions: string[] = [],
		addonProbabilities: Probabilities = addons
			.map((addon) => [addon.addonId, 0] as const)
			.toSorted(() => Math.random() - 0.5),
		askedCount = 0,
		backInfo:
			| string
			| false
			| { probabilities: Probabilities; askedQuestions: string[]; justAsked: string } = false,
		justAnswered = "",
	): Promise<Message | undefined> {
		const questions =
			typeof backInfo === "string" ?
				[backInfo]
			:	getNextQuestions(addonProbabilities, askedQuestions);

		const oldMessage = interaction.replied ? await interaction.fetchReply() : undefined;

		if ((addonProbabilities[1]?.[1] || 0) + 4 < (addonProbabilities[0]?.[1] || 0)) {
			await answerWithAddon(
				addonProbabilities,
				askedCount,
				askedQuestions,
				backInfo,
				justAnswered,
			);
			return;
		}

		if (!questions[0]) {
			if ((addonProbabilities[1]?.[1] || 0) < (addonProbabilities[0]?.[1] || 0)) {
				await answerWithAddon(
					addonProbabilities,
					askedCount,
					askedQuestions,
					backInfo,
					justAnswered,
				);
				return;
			}

			if (!oldMessage) throw new ReferenceError("No questions exist on initialization");

			await interaction.editReply({ components: disableComponents(oldMessage.components) });

			await interaction.followUp(
				`🤯 You beat me! How *did* you do that? You were thinking of an actual addon, right? (Also, I only know about addons available in v${
					scratchAddons.version_name
				})`,
			);

			CURRENTLY_PLAYING.delete(interaction.user.id);
			return;
		}

		const message = await interaction[interaction.replied ? "editReply" : "reply"]({
			components: [
				{
					type: ComponentType.ActionRow,

					components: [
						{
							type: ComponentType.Button,
							label: "Yes",
							style: ButtonStyle.Success,
							customId: `yes.${interaction.id}`,
						},
						{
							type: ComponentType.Button,
							label: "I think so",
							style: ButtonStyle.Success,
							customId: `probably.${interaction.id}`,
						},
						{
							type: ComponentType.Button,
							label: "I don’t know",
							style: ButtonStyle.Primary,
							customId: `dontKnow.${interaction.id}`,
						},
						{
							type: ComponentType.Button,
							label: "I don’t think so",
							style: ButtonStyle.Danger,
							customId: `not.${interaction.id}`,
						},
						{
							type: ComponentType.Button,
							label: "No",
							style: ButtonStyle.Danger,
							customId: `no.${interaction.id}`,
						},
					],
				},
				{
					type: ComponentType.ActionRow,

					components: [
						{
							type: ComponentType.Button,
							label: "Back",
							style: ButtonStyle.Secondary,
							customId: `back.${interaction.id}`,
							disabled: typeof backInfo !== "object",
						},
						{
							type: ComponentType.Button,
							label: "End",
							style: ButtonStyle.Secondary,
							customId: `end.${interaction.id}`,
						},
					],
				},
			],

			embeds: [
				{
					color: constants.themeColor,

					author: {
						icon_url: (interaction.member instanceof GuildMember ?
							interaction.member
						:	interaction.user
						).displayAvatarURL(),

						name: (interaction.member instanceof GuildMember ?
							interaction.member
						:	interaction.user
						).displayName,
					},

					title: "🤔 Think of an addon…",

					description: `${
						oldMessage?.embeds[0]?.description ?
							`${oldMessage.embeds[0].description} **${justAnswered}**\n`
						:	""
					}- ${questions[0]}`,

					footer: {
						text:
							oldMessage?.embeds[0]?.footer?.text.replace(
								/\d+ questions?/,
								(previousCount) =>
									`${1 + Number(previousCount.split(" ")[0])} question${
										previousCount === "0 questions" ? "" : "s"
									}`,
							) ??
							`Answer my questions using the buttons below${footerSeperator}0 questions asked`,
					},
				},
			],

			fetchReply: true,
		});

		CURRENTLY_PLAYING.set(interaction.user.id, { url: message.url });

		const collector = message.createMessageComponentCollector({
			componentType: ComponentType.Button,

			filter: (buttonInteraction) => buttonInteraction.user.id === interaction.user.id,

			time: GAME_COLLECTOR_TIME,
		});

		collector
			.on("collect", async (buttonInteraction) => {
				if (buttonInteraction.customId.startsWith("end.")) {
					CURRENTLY_PLAYING.delete(interaction.user.id);
					await interaction.editReply({
						components: disableComponents(message.components),
					});
					await buttonInteraction.reply("🛑 Ended the game.");

					collector.stop();
					return;
				}

				await buttonInteraction.deferUpdate();

				if (buttonInteraction.customId.startsWith("back.")) {
					if (typeof backInfo !== "object")
						throw new TypeError("backInfo must be an object to go back");

					const nextMessage = await reply(
						backInfo.askedQuestions,
						backInfo.probabilities,
						askedCount - 1,
						backInfo.justAsked,
						("label" in buttonInteraction.component &&
							buttonInteraction.component.label) ||
							undefined,
					);

					if (nextMessage)
						CURRENTLY_PLAYING.set(interaction.user.id, { url: nextMessage.url });
					else CURRENTLY_PLAYING.delete(interaction.user.id);

					collector.stop();
					return;
				}

				const probabilityShift =
					buttonInteraction.customId.startsWith("yes.") ? 2
					: buttonInteraction.customId.startsWith("probably.") ? 1
					: buttonInteraction.customId.startsWith("not.") ? -1
					: buttonInteraction.customId.startsWith("no.") ? -2
					: 0;

				const previouslyAsked = [...askedQuestions];
				const newProbabilities = answerQuestion(
					questions[0] ?? "",
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
						justAsked: questions[0] ?? "",
						probabilities: addonProbabilities,
					},
					("label" in buttonInteraction.component && buttonInteraction.component.label) ||
						"",
				);

				if (nextMessage)
					CURRENTLY_PLAYING.set(interaction.user.id, { url: nextMessage.url });
				else CURRENTLY_PLAYING.delete(interaction.user.id);

				collector.stop();
			})
			.on("end", async (collected) => {
				if (collected.size) return;

				CURRENTLY_PLAYING.delete(interaction.user.id);

				await interaction.editReply({ components: disableComponents(message.components) });
				await interaction.followUp(
					`🛑 ${interaction.user.toString()}, you didn’t answer my question! I’m going to end the game.`,
				);
			});

		return message;
	}

	/**
	 * Reply to an interaction when the addon is determined.
	 *
	 * @param addonProbabilities - The probabilities of each addon being correct.
	 * @param askedCount - How many questions have been asked already.
	 * @param askedQuestions - Questions that should not be asked.
	 * @param backInfo - Information about the previous question.
	 * @param justAnswered - The response to the previous question.
	 */
	async function answerWithAddon(
		addonProbabilities: Probabilities,
		askedCount: number,
		askedQuestions: string[],
		backInfo:
			| string
			| false
			| { probabilities: Probabilities; askedQuestions: string[]; justAsked: string },
		justAnswered: string,
	): Promise<void> {
		const foundAddon = addons.find(({ addonId }) => addonId === addonProbabilities[0]?.[0]);

		if (!foundAddon) {
			throw new ReferenceError(
				`Addon ${
					addonProbabilities[0]?.[0] ?? ""
				} referenced in addonProbabilities not found in addons`,
			);
		}

		const nextChoice = addons.find(({ addonId }) => addonId === addonProbabilities[1]?.[0])
			?.manifest.name;

		const oldMessage = await interaction.fetchReply();

		await interaction.editReply({
			components: disableComponents(oldMessage.components),

			embeds: [
				{
					...oldMessage.embeds[0]?.toJSON(),

					description: `${
						oldMessage.embeds[0]?.description ?
							`${oldMessage.embeds[0]?.description ?? ""} **${justAnswered}**\n`
						:	""
					}- Is it the **${foundAddon.manifest.name}** addon?`,
				},
			],
		});

		const message = await interaction.followUp({
			components: [
				{
					type: ComponentType.ActionRow,

					components: [
						{
							type: ComponentType.Button,
							label: "Back",
							style: ButtonStyle.Secondary,
							customId: `back.${interaction.id}`,
							disabled: typeof backInfo !== "object",
						},
						{
							type: ComponentType.Button,
							label: "No it’s not, continue!",
							style: ButtonStyle.Primary,
							customId: `continue.${interaction.id}`,
						},
					],
				},
			],

			content: `${constants.emojis.misc.addon} Your addon is **${escapeAllMarkdown(
				foundAddon.manifest.name,
			)}**!`,

			embeds: [
				{
					title: foundAddon.manifest.name,

					description: `${
						Object.entries(QUESTIONS_BY_ADDON)
							.find(([id]) => id === addonProbabilities[0]?.[0])?.[1]
							?.map(({ statement }) => `- ${statement}`)
							.join("\n") ?? ""
					}\n\n*Run ${await mentionChatCommand(
						"addon",
						interaction.guild ?? undefined,
					)} for more information about this addon!*`,

					author: {
						icon_url: (interaction.member instanceof GuildMember ?
							interaction.member
						:	interaction.user
						).displayAvatarURL(),

						name: (interaction.member instanceof GuildMember ?
							interaction.member
						:	interaction.user
						).displayName,
					},

					color: constants.themeColor,

					thumbnail: { url: `${constants.urls.addonImages}/${foundAddon.addonId}.png` },

					url: `${constants.urls.settings}#addon-${foundAddon.addonId}`,

					footer: {
						text: `Guessed after ${askedCount} questions.${
							nextChoice ? `${footerSeperator}Next choice: ${nextChoice}` : ""
						}`,
					},
				},
			],
		});

		CURRENTLY_PLAYING.delete(interaction.user.id);

		const collector = message.createMessageComponentCollector({
			componentType: ComponentType.Button,

			filter: (buttonInteraction) => buttonInteraction.user.id === interaction.user.id,

			max: 1,
			time: constants.collectorTime,
		});

		collector
			.on("collect", async (buttonInteraction) => {
				if (await checkIfUserPlaying(buttonInteraction)) return;

				await buttonInteraction.reply({
					components: [
						{
							type: ComponentType.ActionRow,

							components: [
								{
									type: ComponentType.Button,
									label: "Game",
									style: ButtonStyle.Link,
									url: oldMessage.url,
								},
							],
						},
					],

					ephemeral: true,
				});

				const nextMessage =
					buttonInteraction.customId.startsWith("back.") ?
						typeof backInfo === "object" ?
							await reply(
								backInfo.askedQuestions,
								backInfo.probabilities,
								askedCount - 1,
								backInfo.justAsked,
								("label" in buttonInteraction.component &&
									buttonInteraction.component.label) ||
									undefined,
							)
						:	new TypeError("backInfo must be an object to go back")
					:	await reply(
							askedQuestions,
							addonProbabilities.slice(1),
							askedCount + 1,
							false,
							"No",
						);

				if (nextMessage) {
					if (nextMessage instanceof TypeError) throw nextMessage;
					CURRENTLY_PLAYING.set(interaction.user.id, { url: nextMessage.url });
				}
			})
			.on("end", async () => {
				CURRENTLY_PLAYING.delete(interaction.user.id);
				await interaction.editReply({
					embeds: [
						{
							...oldMessage.embeds[0]?.toJSON(),

							description: `${oldMessage.embeds[0]?.description ?? ""} **Yes**`,
						},
					],
				});
			});
	}
}

/**
 * Determine the best question to ask next.
 *
 * @param addonProbabilities - The probabilities of each addon being the answer.
 * @param askedQuestions - Questions to ignore.
 * @returns A new question to ask.
 */
function getNextQuestions(
	addonProbabilities: Probabilities,
	askedQuestions: string[] = [],
): string[] {
	const frequencies: Record<string, number> = {};

	const questions = Object.entries(QUESTIONS_BY_ADDON)
		.map(([addon, questions]) =>
			Array.from<AddonQuestion[]>({
				length: Math.round(
					(addonProbabilities.findLastIndex(([id]) => id === addon) + 1) /
						addonProbabilities.length +
						((addonProbabilities.find(([id]) => id === addon)?.[1] ?? 0) + 1),
				),
			}).fill(
				questions.filter((questionInfo) => !askedQuestions.includes(questionInfo.question)),
			),
		)
		// eslint-disable-next-line unicorn/no-magic-array-flat-depth
		.flat(2);

	for (const question of questions)
		frequencies[question.question] = (frequencies[question.question] ?? 0) + 1;

	const frequenciesArray = Object.entries(frequencies);

	return frequenciesArray
		.reduce<typeof frequenciesArray>((previous, current, _, { length }) => {
			const currentDistance = Math.abs(current[1] / length - 0.5);
			const previousDistance = Math.abs((previous[0]?.[1] ?? 0) / length - 0.5);

			return (
				currentDistance < previousDistance ?
					current[1] < Math.round(length / 9) ?
						[]
					:	[current]
				: currentDistance > previousDistance ? previous
				: [...previous, current]
			);
		}, [])
		.map(([question]) => question)
		.toSorted(() => Math.random() - 0.5);
}

/**
 * Update probabilities based on an answered question.
 *
 * @param justAsked - The question that was answered.
 * @param probabilityShift - How much to care.
 * @param probabilitiesBefore - The probabilities of addons before this question.
 * @param askedQuestions - Questions that were already asked. This function will modify this array.
 * @returns The new probabilities.
 */
function answerQuestion(
	justAsked: string,
	probabilityShift: number,
	probabilitiesBefore: Probabilities,
	askedQuestions: string[] = [],
): Probabilities {
	const justAskedQuestions = [justAsked];

	const dependencies: Dependencies = {};
	const initialUpdated = probabilitiesBefore.map(([addonId, probability]): Probability => {
		const addonQuestions = QUESTIONS_BY_ADDON[addonId] ?? [];
		const questionInfo = addonQuestions.find(({ question }) => question === justAsked);

		if (probabilityShift > 0 && questionInfo?.dependencies)
			Object.assign(dependencies, questionInfo.dependencies);

		const allDependencies = addonQuestions.reduce<Dependencies>(
			(accumulated, { dependencies: addonDependencies = {} }) => ({
				...accumulated,
				...addonDependencies,
			}),
			{},
		);

		if (
			allDependencies[justAsked] !== undefined &&
			((probabilityShift > 0 && !allDependencies[justAsked]) ||
				(probabilityShift < 0 && allDependencies[justAsked]))
		) {
			justAskedQuestions.push(
				...addonQuestions
					.filter(({ dependencies: addonDependencies = {} }) =>
						Object.keys(addonDependencies).includes(justAsked),
					)
					.map(({ question }) => question),
			);

			return [
				addonId,
				probability + (questionInfo ? probabilityShift : 0) - Math.abs(probabilityShift),
			];
		}

		return [addonId, probability + (questionInfo ? probabilityShift : 0)];
	});

	const result = Object.entries(dependencies)
		.reduce(
			(accumulated, current) =>
				askedQuestions.includes(current[0]) ? accumulated : (
					answerQuestion(
						current[0],
						(current[1] ? 1 : -1) * probabilityShift,
						accumulated.toSorted((one, two) => two[1] - one[1]),
						askedQuestions,
					)
				),
			initialUpdated,
		)
		.toSorted((one, two) => two[1] - one[1]);

	askedQuestions.push(...justAskedQuestions);

	return result;
}
