import {
	ButtonStyle,
	ComponentType,
	TextInputStyle,
	inlineCode,
	type ChatInputCommandInteraction,
	type GuildMember,
	type Snowflake,
	type User,
} from "discord.js";
import fileSystem from "node:fs/promises";
import config from "../../common/config.js";
import constants from "../../common/constants.js";
import { disableComponents } from "../../util/discord.js";
import { joinWithAnd } from "../../util/text.js";
import tryCensor from "../automod/misc.js";
import warn from "../punishments/warn.js";
import { recentXpDatabase } from "../xp/util.js";
import { CURRENTLY_PLAYING, GAME_COLLECTOR_TIME, checkIfUserPlaying } from "./misc.js";

const MAX_WRONGS = 7,
	HINT_PENALTY = 2;

const CONSONANTS = [
		"B",
		"C",
		"D",
		"F",
		"G",
		"H",
		"J",
		"K",
		"L",
		"M",
		"N",
		"P",
		"Q",
		"R",
		"S",
		"T",
		"V",
		"W",
		"X",
		"Z",
	] as const,
	VOWELS = [
		"A",
		"E",
		"I",
		"O",
		"U",
		"Y",
		"0",
		"1",
		"2",
		"3",
		"4",
		"5",
		"6",
		"7",
		"8",
		"9",
		"_",
		".",
	] as const;
const CHARACTERS = [...CONSONANTS, ...VOWELS] as const;

export default async function hangman(
	interaction: ChatInputCommandInteraction<"cached" | "raw">,
): Promise<void> {
	if (await checkIfUserPlaying(interaction)) return;
	const { user, displayColor } = await getMember(interaction.user);
	let color: number | undefined;

	const guesses: ((typeof CHARACTERS)[number] | Lowercase<string>)[] = [];
	const message = await interaction.reply({ embeds: [{ title: "Hangman" }], fetchReply: true });
	await tick();

	const collector = message
		.createMessageComponentCollector({
			filter: (componentInteraction) => componentInteraction.user.id === interaction.user.id,
			idle: GAME_COLLECTOR_TIME,
		})
		.on("collect", async (componentInteraction) => {
			if (!componentInteraction.isButton()) {
				await componentInteraction.deferUpdate();
				const [guess] = componentInteraction.values;
				if (!guess || !CHARACTERS.includes(guess)) return;
				guesses.push(guess);
				await tick();
				return;
			}

			if (componentInteraction.customId === "hint") {
				await componentInteraction.reply({
					ephemeral: true,
					content: `This will use ${HINT_PENALTY} of your incorrect guesses, and will change the embed color to the user’s role color. Are you sure you want to do this?`,
					components: [
						{
							type: ComponentType.ActionRow,
							components: [
								{
									type: ComponentType.Button,
									label: "Ok",
									style: ButtonStyle.Success,
									customId: componentInteraction.id + "-hint",
								},
							],
						},
					],
				});
				const buttonInteraction = await interaction.channel
					?.awaitMessageComponent({
						time: constants.collectorTime,
						componentType: ComponentType.Button,
						filter: (buttonInteraction) =>
							buttonInteraction.customId === componentInteraction.id + "-hint",
					})
					.catch(() => void 0);
				if (buttonInteraction) {
					await buttonInteraction.deferUpdate();
					await componentInteraction.deleteReply();
					color = displayColor;
					await tick();
				}
			} else if (componentInteraction.customId === "guess") {
				await componentInteraction.showModal({
					title: "Guess Member",
					customId: componentInteraction.id,
					components: [
						{
							type: ComponentType.ActionRow,
							components: [
								{
									type: ComponentType.TextInput,
									style: TextInputStyle.Short,
									label: "Member’s username",
									required: true,
									customId: "username",
								},
							],
						},
					],
				});
				const modalInteraction = await componentInteraction
					.awaitModalSubmit({
						time: constants.collectorTime,
						filter: (modalInteraction) =>
							modalInteraction.customId === componentInteraction.id,
					})
					.catch(() => void 0);

				if (!modalInteraction) return;
				await modalInteraction.deferUpdate();
				const guess = modalInteraction.fields.getTextInputValue("username").toUpperCase();

				const censored = tryCensor(guess);
				if (censored) {
					await warn(
						interaction.user,
						censored.words.length === 1 ? "Used a banned word" : "Used banned words",
						censored.strikes,
						`Guessed ${guess} on Hangman`,
					);
					return await interaction.reply({
						ephemeral: true,
						content: `${constants.emojis.statuses.no} Please ${
							censored.strikes < 1 ? "don’t say that here" : "watch your language"
						}!`,
					});
				}

				if (/^[\d.A-Z_]+$/.test(guess))
					if (guess.toLowerCase() === user.username) collector.stop("win");
					else guesses.push(CHARACTERS.includes(guess) ? guess : guess.toLowerCase());
				await tick();
			}
		})
		.on("end", async (_, reason) => {
			const image = await makeCanvasFiles(
				user.displayAvatarURL({ forceStatic: true, size: 64 }),
				reason === "win",
			);

			await message.reply({
				content: `# You ${reason === "win" ? "saved" : "killed"} ${user.toString()}!\n${
					{
						idle: "You didn’t save them in time, so they died \\:(",
						end: "You gave up saving them, so they died \\:(\nWhat kind of person *are* you?⁉",
						lose: "You couldn’t guess their username right, so they died \\:(",
						win: "Great job!",
					}[reason] ?? "R.I.P."
				}`,
				files: image,
				allowedMentions: { users: [] },
			});
			await message.edit({ components: disableComponents(message.components) });
			CURRENTLY_PLAYING.delete(interaction.user.id);
		});

	CURRENTLY_PLAYING.set(interaction.user.id, {
		url: message.url,
		end() {
			collector.stop("end");
		},
	});

	async function tick(): Promise<void> {
		const word = Array.from(user.username.toUpperCase(), (letter) =>
			CHARACTERS.includes(letter) && guesses.includes(letter) ? letter : "-",
		).join("");
		const wrongs = guesses
			.filter((guess) => guess.length > 1 || !word.includes(guess))
			.toSorted((one, two) => two.length - one.length || one.localeCompare(two));

		const [consonants, vowels] = [CONSONANTS, VOWELS].map((letters) =>
			letters
				.filter((letter) => !guesses.includes(letter))
				.map((label) => ({ value: label, label })),
		);

		const wrongCount = (color === undefined ? 0 : HINT_PENALTY) + wrongs.length;

		await message.edit({
			embeds: [
				{
					color,
					author: { name: "Hangman" },
					title: "Use the select menus below to guess a prominent server member’s username",
					description: `**(not display name!)**\n\n${
						wrongs.length ?
							`Incorrect guesses: ${joinWithAnd(wrongs, inlineCode)}\n`
						:	""
					}## \`${word.toLowerCase()}\``,
					footer: { text: `${wrongCount}/${MAX_WRONGS} incorrect answers` },
					image: { url: "attachment://hangman.png" },
				},
			],
			components: [
				...(consonants?.length ?
					[
						{
							type: ComponentType.ActionRow,
							components: [
								{
									type: ComponentType.StringSelect,
									customId: "consonants",
									placeholder: "Consonants",
									options: consonants,
								} as const,
							],
						},
					]
				:	[]),
				...(vowels?.length ?
					[
						{
							type: ComponentType.ActionRow,
							components: [
								{
									type: ComponentType.StringSelect,
									customId: "vowels",
									placeholder: "Vowels/Numbers/Symbols",
									options: vowels,
								} as const,
							],
						},
					]
				:	[]),
				{
					type: ComponentType.ActionRow,
					components: [
						{
							label: "Guess",
							style: ButtonStyle.Success,
							type: ComponentType.Button,
							customId: "guess",
						},
						...(color === undefined && wrongCount < MAX_WRONGS - HINT_PENALTY ?
							[
								{
									label: "Hint",
									style: ButtonStyle.Primary,
									type: ComponentType.Button,
									customId: "hint",
								} as const,
							]
						:	[]),
						{
							label: "End",
							style: ButtonStyle.Danger,
							type: ComponentType.Button,
							customId: `${interaction.user.id}_endGame`,
						},
					],
				},
			],
			files: [
				{
					attachment: await fileSystem.readFile(
						`./modules/games/hangman-photos/${Math.min(wrongCount, MAX_WRONGS - 1)}.png`,
					),
					name: "hangman.png",
				},
			],
		});

		if (wrongCount >= MAX_WRONGS) collector.stop("lose");
		else if (!word.includes("-")) collector.stop("win");
	}
}

const ROLES = [
	config.roles.dev?.id,
	config.roles.epic?.id,
	config.roles.booster?.id,
	config.roles.active?.id,
];
async function getMember(player: User): Promise<GuildMember> {
	const members = await config.guild.members.fetch();
	const testers = await config.testingGuild?.members.fetch();
	const xp = recentXpDatabase.data.reduce<Record<Snowflake, number>>((accumulator, gain) => {
		accumulator[gain.user] = (accumulator[gain.user] ?? 0) + gain.xp;
		return accumulator;
	}, {});

	const member = members
		.filter(
			(member) =>
				member.user.discriminator === "0" &&
				member.user.username.length > 5 &&
				member.id !== player.id &&
				!tryCensor(member.user.username) &&
				(process.env.NODE_ENV !== "production" ||
					(xp[member.id] ?? 0) >= 250 ||
					testers?.get(member.id)?.displayColor ||
					ROLES.some((role) => role && member.roles.resolve(role))),
		)
		.random();

	if (!member) throw new ReferenceError("Could not find a member for hangman");
	return member;
}

async function makeCanvasFiles(
	url: string,
	win: boolean,
): Promise<{ attachment: Buffer; name: string }[]> {
	if (process.env.CANVAS === "false") return [];

	const { createCanvas, loadImage } = await import("@napi-rs/canvas");
	const canvas = createCanvas(200, 181);
	const context = canvas.getContext("2d");
	context.drawImage(
		await loadImage(`./modules/games/hangman-photos/${win ? "win" : MAX_WRONGS - 1}.png`),
		0,
		0,
		canvas.width,
		canvas.height,
	);
	const x = 136.5,
		y = win ? 38 : 20,
		size = 40;
	context.arc(x + size / 2, y + size / 2, size / 2, 0, Math.PI * 2);
	context.clip();
	context.drawImage(await loadImage(url), x, y, size, size);

	return [{ attachment: canvas.toBuffer("image/png"), name: "hangman.png" }];
}
