import {
	ButtonStyle,
	ChatInputCommandInteraction,
	ComponentType,
	escapeMarkdown,
	GuildMember,
	Message,
} from "discord.js";
import constants from "../../common/constants.js";
import { addons, manifest } from "../../common/extension.js";
import { disableComponents } from "../../util/discord.js";
import { generateHash } from "../../util/text.js";
import { checkIfUserPlaying, COLLECTOR_TIME, commandMarkdown, CURRENTLY_PLAYING } from "./misc.js";
import QUESTIONS_BY_ADDON, { type AddonQuestion, type Dependencies } from "./questions.js";

type Probability = readonly [string, number];
type Probabilities = Probability[];
export default async function bot(interaction: ChatInputCommandInteraction<"cached" | "raw">) {
	await reply();

	/**
	 * Respond to an interaction with a question.
	 *
	 * @param askedQuestions - Questions to ignore.
	 * @param addonProbabilities - Current probabilities of each addon being correct. MUST be sorted.
	 * @param askedCount - Count of messages that have already been asked.
	 * @param backInfo - Information about the previous question.
	 * @param justAnswered - The response to the previous question.
	 *
	 * @returns Sent message.
	 */
	async function reply(
		askedQuestions: string[] = [],
		addonProbabilities: Probabilities = addons
			.map((addon) => [addon.id, 0] as const)
			.sort(() => Math.random() - 0.5),
		askedCount = 0,
		backInfo:
			| string
			| false
			| {
					probabilities: Probabilities;
					askedQuestions: string[];
					justAsked: string;
			  } = false,
		justAnswered = "",
	): Promise<Message | void> {
		const questions =
			typeof backInfo === "string"
				? [backInfo]
				: getNextQuestions(addonProbabilities, askedQuestions);

		const oldMessage = interaction.replied ? await interaction.fetchReply() : undefined;

		if ((addonProbabilities[1]?.[1] || 0) + 4 < (addonProbabilities[0]?.[1] || 0))
			return await answerWithAddon(
				addonProbabilities,
				askedCount,
				askedQuestions,
				backInfo,
				justAnswered,
			);

		if (!questions[0]) {
			if ((addonProbabilities[1]?.[1] || 0) < (addonProbabilities[0]?.[1] || 0)) {
				return await answerWithAddon(
					addonProbabilities,
					askedCount,
					askedQuestions,
					backInfo,
					justAnswered,
				);
			}

			if (!oldMessage) throw new ReferenceError("No questions exist on initialization");

			await interaction.editReply({
				components: disableComponents(oldMessage.components),
			});

			await interaction.followUp(
				`🤯 You beat me! How *did* you do that? You were thinking of an actual addon, right? (Also, I only know about addons available in v${
					manifest.version_name ?? manifest.version
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
							customId: generateHash("yes"),
						},
						{
							type: ComponentType.Button,
							label: "I think so",
							style: ButtonStyle.Success,
							customId: generateHash("probably"),
						},
						{
							type: ComponentType.Button,
							label: "I don’t know",
							style: ButtonStyle.Primary,
							customId: generateHash("dontKnow"),
						},
						{
							type: ComponentType.Button,
							label: "I don’t think so",
							style: ButtonStyle.Danger,
							customId: generateHash("not"),
						},
						{
							type: ComponentType.Button,
							label: "No",
							style: ButtonStyle.Danger,
							customId: generateHash("no"),
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
							customId: generateHash("back"),
							disabled: typeof backInfo !== "object",
						},
						{
							type: ComponentType.Button,
							label: "End",
							style: ButtonStyle.Secondary,
							customId: generateHash("end"),
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

					title: "🤔 Think of an addon…",

					description: `${
						oldMessage?.embeds[0]?.description
							? `${oldMessage.embeds[0].description} **${justAnswered}**\n`
							: ""
					}- ${questions[0]}`,

					footer: {
						text:
							oldMessage?.embeds[0]?.footer?.text.replace(
								/\d+ questions?/,
								(previousCount) =>
									`${1 + Number(previousCount.split(" ")[0] ?? 0)} question${
										previousCount === "0 questions" ? "" : "s"
									}`,
							) ??
							`Answer my questions using the buttons below${constants.footerSeperator}0 questions asked`,
					},
				},
			],

			fetchReply: true,
		});

		CURRENTLY_PLAYING.set(interaction.user.id, message.url);

		const collector = message.createMessageComponentCollector({
			componentType: ComponentType.Button,

			filter: (buttonInteraction) => buttonInteraction.user.id === interaction.user.id,

			time: COLLECTOR_TIME,
		});

		collector
			.on("collect", async (buttonInteraction) => {
				if (buttonInteraction.customId.startsWith("end.")) {
					CURRENTLY_PLAYING.delete(interaction.user.id);
					await interaction.editReply({
						components: disableComponents(message.components),
					});
					await buttonInteraction.reply("🛑 Ended the game.");

					return collector.stop();
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
						buttonInteraction.component.label ?? undefined,
					);

					if (nextMessage) CURRENTLY_PLAYING.set(interaction.user.id, nextMessage.url);
					else CURRENTLY_PLAYING.delete(interaction.user.id);

					return collector.stop();
				}

				const probabilityShift = buttonInteraction.customId.startsWith("yes.")
					? 2
					: buttonInteraction.customId.startsWith("probably.")
					? 1
					: buttonInteraction.customId.startsWith("not.")
					? -1
					: buttonInteraction.customId.startsWith("no.")
					? -2
					: 0;

				const previouslyAsked = Array.from(askedQuestions);
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
					buttonInteraction.component.label ?? "",
				);

				if (nextMessage) CURRENTLY_PLAYING.set(interaction.user.id, nextMessage.url);
				else CURRENTLY_PLAYING.delete(interaction.user.id);

				collector.stop();
			})
			.on("end", async (collected) => {
				if (collected.size > 0) return;

				CURRENTLY_PLAYING.delete(interaction.user.id);

				await interaction.editReply({
					components: disableComponents(message.components),
				});
				await interaction.followUp(
					`🛑 ${interaction.user.toString()},you didn’t answer my question! I’m going to end the game.`,
				);
			});

		return message;
	}

	/**
	 * Determine the best question to ask next.
	 *
	 * @param addonProbabilities - The probabilities of each addon being the answer.
	 * @param askedQuestions - Questions to ignore.
	 *
	 * @returns A new question to ask.
	 */
	function getNextQuestions(
		addonProbabilities: Probabilities,
		askedQuestions: string[] = [],
	): string[] {
		const frequencies: { [key: string]: number } = {};

		const questions = Object.entries(QUESTIONS_BY_ADDON)
			.map(([addon, questions]) =>
				Array.from<AddonQuestion[]>({
					length: Math.round(
						(Array.from(addonProbabilities).findLastIndex(([id]) => id === addon) + 1) /
							addonProbabilities.length +
							((addonProbabilities.find(([id]) => id === addon)?.[1] ?? 0) + 1),
					),
				}).fill(
					questions.filter(
						(questionInfo) => !askedQuestions.includes(questionInfo.question),
					),
				),
			)
			.flat(2);

		for (const question of questions) {
			frequencies[question.question] ??= 0;
			frequencies[question.question]++;
		}

		const frequenciesArray = Object.entries(frequencies);

		return frequenciesArray
			.reduce<typeof frequenciesArray>((previous, current, _, { length }) => {
				const currentDistance = Math.abs(current[1] / length - 0.5);
				const previousDistance = Math.abs((previous[0]?.[1] ?? 0) / length - 0.5);

				return currentDistance < previousDistance
					? current[1] < Math.round(length / 9)
						? []
						: [current]
					: currentDistance > previousDistance
					? previous
					: [...previous, current];
			}, [])
			.map(([question]) => question)
			.sort(() => Math.random() - 0.5);
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
			| {
					probabilities: Probabilities;
					askedQuestions: string[];
					justAsked: string;
			  },
		justAnswered: string,
	) {
		const foundAddon = addons.find(({ id }) => id === addonProbabilities[0]?.[0]);

		if (!foundAddon) {
			throw new ReferenceError(
				`Addon ${
					addonProbabilities[0]?.[0] ?? ""
				} referenced in addonProbabilities not found in addons`,
			);
		}

		const nextChoice = addons.find(({ id }) => id === addonProbabilities[1]?.[0])?.name;

		const oldMessage = await interaction.fetchReply();

		await interaction.editReply({
			components: disableComponents(oldMessage.components),

			embeds: [
				{
					...oldMessage.embeds[0]?.toJSON(),

					description: `${
						oldMessage.embeds[0]?.description
							? `${oldMessage.embeds[0]?.description ?? ""} **${justAnswered}**\n`
							: ""
					}- Is it the **${foundAddon.name}** addon?`,
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
							customId: generateHash("back"),
							disabled: typeof backInfo !== "object",
						},
						{
							type: ComponentType.Button,
							label: "No it’s not, continue!",
							style: ButtonStyle.Primary,
							customId: generateHash("continue"),
						},
					],
				},
			],

			content: `${constants.emojis.misc.addon} Your addon is **${escapeMarkdown(
				foundAddon.name,
			)}**!`,

			embeds: [
				{
					title: foundAddon.name,

					description: `${
						Object.entries(QUESTIONS_BY_ADDON)
							.find(([id]) => id === addonProbabilities[0]?.[0])?.[1]
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
						url: `${constants.urls.addonImageRoot}/${encodeURI(foundAddon.id)}.png`,
					},

					url: `${constants.urls.settingsPage}#addon-${encodeURIComponent(
						foundAddon.id,
					)}`,

					footer: {
						text: `Guessed after ${askedCount} questions.${
							process.env.NODE_ENV === "production"
								? ""
								: `${constants.footerSeperator}Probability: ${addonProbabilities[0]?.[1]}`
						}${
							nextChoice
								? `${constants.footerSeperator}Next choice: ${nextChoice}${
										process.env.NODE_ENV === "production"
											? ""
											: ` (probability ${addonProbabilities[1]?.[1]})`
								  }`
								: ""
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
									label: "Go to game",
									style: ButtonStyle.Link,
									url: oldMessage.url,
								},
							],
						},
					],

					ephemeral: true,
				});

				const nextMessage = buttonInteraction.customId.startsWith("back.")
					? typeof backInfo === "object"
						? // eslint-disable-next-line @typescript-eslint/no-use-before-define -- These functions depend on each other.
						  await reply(
								backInfo.askedQuestions,
								backInfo.probabilities,
								askedCount - 1,
								backInfo.justAsked,
								buttonInteraction.component.label ?? undefined,
						  )
						: new TypeError("backInfo must be an object to go back")
					: // eslint-disable-next-line @typescript-eslint/no-use-before-define -- These functions depend on each other.
					  await reply(
							askedQuestions,
							addonProbabilities.slice(1),
							askedCount + 1,
							false,
							"No",
					  );

				if (nextMessage) {
					if (nextMessage instanceof TypeError) throw nextMessage;
					CURRENTLY_PLAYING.set(interaction.user.id, nextMessage.url);
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
 * Update probabilities based on an answered question.
 *
 * @param justAsked - The question that was answered.
 * @param probabilityShift - How much to care.
 * @param probabilitiesBefore - The probabilities of addons before this question.
 * @param askedQuestions - Questions that were already asked. This function will be modify this array.
 *
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
		const addon = QUESTIONS_BY_ADDON[addonId] ?? [];
		const questionInfo = addon.find(({ question }) => question === justAsked);

		if (probabilityShift > 0 && questionInfo?.dependencies)
			// eslint-disable-next-line fp/no-mutating-assign -- This is meant to mutate.
			Object.assign(dependencies, questionInfo.dependencies);

		const allDependencies = addon.reduce<Dependencies>(
			(accumulated, { dependencies: addonDependencies = {} }) => ({
				...accumulated,
				...addonDependencies,
			}),
			{},
		);

		if (
			allDependencies[justAsked] !== undefined &&
			((probabilityShift > 0 && !allDependencies[justAsked]) ||
				(probabilityShift < 0 && allDependencies[justAsked] !== false))
		) {
			justAskedQuestions.push(
				...addon
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
				askedQuestions.includes(current[0])
					? accumulated
					: answerQuestion(
							current[0],
							(current[1] ? 1 : -1) * probabilityShift,
							Array.from(accumulated).sort((one, two) => two[1] - one[1]),
							askedQuestions,
					  ),
			initialUpdated,
		)
		.sort((one, two) => two[1] - one[1]);

	askedQuestions.push(...justAskedQuestions);

	return result;
}
