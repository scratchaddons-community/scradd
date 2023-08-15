import {
	Collection,
	type ChatInputCommandInteraction,
	ComponentType,
	ButtonStyle,
	type APIMessageComponentEmoji,
	type Snowflake,
	ButtonInteraction,
	Message,
	type PartialMessage,
	User,
	ThreadAutoArchiveDuration,
	ChannelType,
	type RepliableInteraction,
} from "discord.js";
import config from "../../common/config.js";
import { GAME_COLLECTOR_TIME, CURRENTLY_PLAYING, checkIfUserPlaying } from "./misc.js";
import constants from "../../common/constants.js";
import { disableComponents } from "../../util/discord.js";
import { logGame, playNeeded } from "./tourney.js";

const EMPTY_TILE = "⬛";

const deletedPings = new Set<Snowflake>();

const instructionsButton = {
	type: ComponentType.Button,
	label: "Instructions",
	customId: "_showMemoryInstructions",
	style: ButtonStyle.Secondary,
} as const;

export default async function memoryMatch(
	interaction: ChatInputCommandInteraction<"cached" | "raw">,
) {
	const otherUser = interaction.options.getUser("user", true);
	if (otherUser.bot || interaction.user.id === otherUser.id) {
		return await interaction.reply({
			ephemeral: true,
			content: `${constants.emojis.statuses.no} You can’t play against that user!`,
			components: [
				{
					type: ComponentType.ActionRow,
					components: [instructionsButton],
				},
			],
		});
	}

	const easyMode = interaction.options.getBoolean("easy-mode") ?? false;
	const bonusTurns = interaction.options.getBoolean("bonus-turns") ?? true;

	const needToPlay = await playNeeded([interaction.user.id, otherUser.id]);
	const tourneyQualifies = !easyMode && bonusTurns && needToPlay;
	if (needToPlay && !tourneyQualifies) {
		return await interaction.reply({
			ephemeral: true,
			content: `${constants.emojis.statuses.no} You need to play that user in the Memory Match Tournament! Please start a game with easy mode off and bonus turns on.`,
			components: [
				{
					type: ComponentType.ActionRow,
					components: [
						instructionsButton,
						{
							type: ComponentType.Button,
							label: "Tournament Information",
							url: "https://discord.com/channels/806602307750985799/1129445243331301447/1129445243331301447",
							style: ButtonStyle.Link,
						},
					],
				},
			],
		});
	}

	const message = await interaction.reply({
		fetchReply: true,
		content: `${
			constants.emojis.misc.challenge
		} **${otherUser.toString()}, you are challenged to a game of Memory Match${
			easyMode || !bonusTurns
				? ` (${easyMode ? "easy mode" : ""}${easyMode && !bonusTurns ? "; " : ""}${
						bonusTurns ? "" : "no bonus turns"
				  })`
				: ""
		} by ${interaction.user.toString()}!** Do you accept?${
			tourneyQualifies
				? "\n\n__This game will be a part of the Memory Match Tournament!__"
				: ""
		}`,
		components: [
			{
				type: ComponentType.ActionRow,
				components: [
					{
						type: ComponentType.Button,
						label: "Game on!",
						style: ButtonStyle.Success,
						customId: `confirm-${interaction.id}`,
					},
					{
						type: ComponentType.Button,
						label: "Not now…",
						customId: `cancel-${interaction.id}`,
						style: ButtonStyle.Danger,
					},
					instructionsButton,
				],
			},
		],
	});

	const collector = message
		.createMessageComponentCollector({
			componentType: ComponentType.Button,
			time: GAME_COLLECTOR_TIME,
		})
		.on("collect", async (buttonInteraction) => {
			const isUser = interaction.user.id === buttonInteraction.user.id;
			const isOtherUser = otherUser.id === buttonInteraction.user.id;

			if (buttonInteraction.customId.startsWith("cancel-")) {
				await buttonInteraction.deferUpdate();
				if (isUser || isOtherUser) {
					await message.edit({ components: disableComponents(message.components) });
					collector.stop();
				}
			}

			if (!buttonInteraction.customId.startsWith("confirm-")) return;

			if (isOtherUser) {
				collector.stop();
				await playGame(buttonInteraction, {
					users: ([interaction.user, otherUser] satisfies [User, User]).sort(
						() => Math.random() - 0.5,
					),
					easyMode,
					bonusTurns,
					useThread: interaction.options.getBoolean("thread") ?? true,
				});
			} else await buttonInteraction.deferUpdate();
		})
		.on("end", async (_, reason) => {
			if (reason === "time")
				await message.edit({ components: disableComponents(message.components) });
		});
}

async function playGame(
	interaction: ButtonInteraction,
	{
		users,
		easyMode,
		useThread,
		bonusTurns,
	}: { users: [User, User]; easyMode: boolean; useThread: boolean; bonusTurns: boolean },
) {
	if (await checkIfUserPlaying(interaction)) {
		await interaction.message.edit({
			components: disableComponents(interaction.message.components),
		});
		return;
	}
	const otherUser = users.find((user) => user.id !== interaction.user.id) ?? interaction.user;
	if (CURRENTLY_PLAYING.get(otherUser.id)) {
		await interaction.message.edit({
			components: disableComponents(interaction.message.components),
		});
		await interaction.reply({
			content: `${constants.emojis.statuses.no} <@${otherUser}> is playing a different game now!`,
			ephemeral: true,
		});
		return;
	}

	await interaction.deferUpdate();
	const tournament = !easyMode && bonusTurns && (await playNeeded([users[0].id, users[1].id]));
	const scores: [string[], string[]] = [[], ["22"]];
	const chunks = await setupGame(easyMode ? 4 : 2);
	const message = await interaction.message.edit(getBoard(0));
	const thread =
		useThread &&
		(message.channel.type === ChannelType.GuildAnnouncement ||
			message.channel.type === ChannelType.GuildText)
			? await message.startThread({
					name: `Memory Match: ${users[0].displayName} versus ${users[1].displayName}`,
					reason: "To play the game",
					autoArchiveDuration: ThreadAutoArchiveDuration.OneHour,
			  })
			: undefined;

	let turn = 0;
	let turnInfo = await setupTurn(turn);
	let totalTurns = 0;
	const shown = new Set<string>();

	const collector = message
		.createMessageComponentCollector({
			componentType: ComponentType.Button,
			idle: GAME_COLLECTOR_TIME,
		})
		.on("collect", async (buttonInteraction) => {
			if (turnInfo.user.id !== buttonInteraction.user.id || shown.size > 1) {
				await buttonInteraction.deferUpdate();
				return;
			}

			if (turnInfo.timeout) clearTimeout(turnInfo.timeout);
			turnInfo.timeout = undefined;
			shown.add(buttonInteraction.customId);
			await interaction.message.edit(getBoard(turn, shown));

			if (shown.size === 1) {
				await buttonInteraction.deferUpdate();
				return;
			}
			totalTurns++;

			const selected = Array.from(
				shown,
				([row = 6, column = 6]) => chunks[+row]?.[+column] ?? {},
			);

			const match = selected.every(
				(item) => item.name === selected[0]?.name && item.id === selected[0]?.id,
			);
			if (match) {
				scores[turn % 2]?.push(...shown);
				await interaction.message.edit(getBoard(turn));

				if (scores[0].length + scores[1].length === 25) {
					collector.stop();
					return await endGame();
				}
			}
			if (!match || !bonusTurns) {
				turn++;

				deletedPings.add(turnInfo.ping.id);
				await turnInfo.ping.delete();
				turnInfo = await setupTurn(turn);
			}
			shown.clear();
			await buttonInteraction.deferUpdate();
		})
		.on("end", async (_, endReason) => {
			if (endReason === "idle") {
				await turnInfo.ping.edit({
					components: disableComponents(turnInfo.ping.components),
				});
				return endGame(
					`🛑 ${turnInfo.user.toString()}, you didn’t take your turn!`,
					turnInfo.user,
				);
			}
			if (endReason === "end") {
				await turnInfo.ping.edit({
					components: disableComponents(turnInfo.ping.components),
				});
				return;
			}
		});

	CURRENTLY_PLAYING.set(users[0].id, {
		url: message.url,
		end() {
			collector?.stop("end");
			return endGame(`🛑 ${users[0].toString()} ended the game`, users[0]);
		},
	});
	CURRENTLY_PLAYING.set(users[1].id, {
		url: message.url,
		end() {
			collector?.stop("end");
			return endGame(`🛑 ${users[1].toString()} ended the game`, users[1]);
		},
	});

	async function setupTurn(turn: number) {
		const user = users[turn % 2] ?? users[0];
		const content = `🎲 ${user.toString()}, your turn!`;
		const gameLinkButton = {
			label: "Game",
			style: ButtonStyle.Link,
			type: ComponentType.Button,
			url: message.url,
		} as const;
		const endGameButton = {
			label: "End",
			style: ButtonStyle.Danger,
			type: ComponentType.Button,
			customId: `${users.map((user) => user.id).join("-")}_endGame`,
		} as const;

		const ping = await (thread
			? thread.send({
					content,
					components: [
						{
							type: ComponentType.ActionRow,
							components: [gameLinkButton, endGameButton],
						},
					],
			  })
			: message.reply({
					content,
					components: [{ type: ComponentType.ActionRow, components: [endGameButton] }],
			  }));

		const timeout = turn
			? setTimeout(() => interaction.message.edit(getBoard(turn)), GAME_COLLECTOR_TIME / 60)
			: undefined;

		return { user, ping, timeout };
	}

	function getBoard(turn: number, shown = new Set<string>()) {
		const firstTurn = turn % 2 ? "" : "__",
			secondTurn = turn % 2 ? "__" : "";

		return {
			content: `${firstTurn}${constants.emojis.misc.blue} ${users[0].toString()} - **${
				scores[0].length
			}** point${scores[0].length === 1 ? "" : "s"}${firstTurn}\n${secondTurn}${
				constants.emojis.misc.green
			} ${users[1].toString()} - **${scores[1].length}** point${
				scores[1].length === 1 ? "" : "s"
			}${secondTurn}${
				tournament ? "\n\n__This game will be a part of the Memory Match Tournament!__" : ""
			}`,

			components: chunks.map((chunk, rowIndex) => ({
				type: ComponentType.ActionRow,
				components: chunk.map((emoji, index) => {
					const id = rowIndex.toString() + index.toString();
					const discovered = [...shown, ...scores].includes(id);

					return {
						type: ComponentType.Button,
						emoji: discovered ? emoji : EMPTY_TILE,
						customId: id,
						style: ButtonStyle[
							scores[0]?.includes(id)
								? "Primary"
								: scores[1]?.includes(id)
								? "Success"
								: "Secondary"
						],
						disabled: discovered,
					} as const;
				}),
			})),

			allowedMentions: { users: [] },
		};
	}

	async function endGame(content?: string, user?: User) {
		CURRENTLY_PLAYING.delete(users[0].id);
		CURRENTLY_PLAYING.delete(users[1].id);

		await message.edit({ components: disableComponents((await message.fetch()).components) });

		const firstScore = scores[0].length - (users[0].id === user?.id ? 2 : 0),
			secondScore = scores[1].length - (users[1].id === user?.id ? 2 : 0);

		const firstUser = `${users[0].toString()} - **${firstScore}** point${
				firstScore === 1 ? "" : "s"
			}`,
			secondUser = `${users[1].toString()} - **${secondScore}** point${
				secondScore === 1 ? "" : "s"
			}`;
		const secondWon = firstScore < secondScore;
		const winner = await config.guild.members.fetch(users[+secondWon]?.id || "");

		await thread?.setArchived(true, "Game over");

		const { url } = await message.reply({
			content,
			embeds: [
				{
					description: `👑 ${secondWon ? secondUser : firstUser}\n${
						secondWon
							? `${constants.emojis.misc.blue} ${firstUser}`
							: `${constants.emojis.misc.green} ${secondUser}`
					}`,
					title: `Memory Match ${tournament ? "Tournament " : ""}Results`,
					color: winner.displayColor,
					thumbnail: { url: winner.displayAvatarURL() },
					footer: {
						text: `${totalTurns.toLocaleString()} turn${
							totalTurns === 1 ? "" : "s"
						} taken`,
					},
				},
			],
		});

		if (tournament) {
			await logGame({
				winner: users[+secondWon]?.id ?? "",
				loser: users[+!secondWon]?.id ?? "",
				url,
			});
		}
	}
}

async function setupGame(difficulty: 2 | 4) {
	const allEmojis = new Collection(
		[
			"🥔",
			"🍡",
			"🥑",
			"😏",
			"🦆",
			"🇫🇷",
			"📻",
			"😭",
			"🗿",
			"👀",
			"🧐",
			"🤨",
			"🥶",
			"💀",
			"💩",
			"🍢",
			...(process.env.NODE_ENV === "production"
				? [
						{ name: "bowling_ball", id: "1104935019232899183" },
						{ name: "hog", id: "1090372592642306048" },
						{ name: "mater", id: "1073805840584282224" },
						{ name: "new", id: "1091409541079507104" },
						{ name: "rick", id: "962421165295554601", animated: true },
						{ name: "rip", id: "1082693496739201205" },
						{ name: "sxd", id: "962798819572056164" },
						{ name: "wasteof", id: "1044651861682176080" },
						{ name: "callum", id: "1119305606323523624" },
				  ]
				: []),
		].map((emoji): [string, APIMessageComponentEmoji] =>
			typeof emoji === "string" ? [emoji, { name: emoji }] : [emoji.id, emoji],
		),
	// eslint-disable-next-line unicorn/prefer-spread
	).concat(
		(await config.guild.emojis.fetch())
			.filter((emoji) => emoji.available)
			.mapValues((emoji) => ({
				id: emoji.id,
				name: emoji.name ?? undefined,
				animated: emoji.animated || undefined,
			})),
	);
	const selected = allEmojis.random(24 / difficulty);
	const emojis = [...selected, ...Array.from({ length: difficulty - 1 }).fill(selected)].sort(
		() => Math.random() - 0.5,
	);

	const chunks = [];
	while (emojis.length) {
		chunks.push(
			chunks.length === 2
				? [...emojis.splice(0, 2), [{ name: EMPTY_TILE }], ...emojis.splice(0, 2)]
				: emojis.splice(0, 5),
		);
	}

	return chunks;
}

export async function messageDelete(message: Message | PartialMessage) {
	return !deletedPings.delete(message.id);
}

export function showMemoryInstructions(interaction: RepliableInteraction) {
	return interaction.reply({
		ephemeral: true,
		content:
			"## Memory Match Instructions\n" +
			"### The objective is to find matching emoji pairs by clicking on tiles and remembering which emoji is where.\n" +
			`The first player is determined randomly. Since they get an advantage by going first, the second player gets the middle tile as a bonus point. The two players are assigned colors (${constants.emojis.misc.blue} ${constants.emojis.misc.green}), which are shown above the board.\n` +
			"Take turns flipping two tiles at a time by clicking them. Both players will be able to see the flipped emojis. *💡 Protip: unless you’re sure of a match, click tiles you haven’t seen before to expand your knowledge of the board.*\n" +
			"If you find matching emojis, those two tiles will not be flipped back over, but change to your color instead. You will also receive two points and a bonus turn (unless bonus turns are disabled via `bonus-turns`).\n" +
			`If the two flipped tiles do not match, it will be the other player’s turn. The tiles will be flipped back over once the other player starts their turn or after ${
				GAME_COLLECTOR_TIME / 60 / 1000
			} seconds.\n` +
			"*By default, there are only two of each emoji. However, in easy mode (`easy-mode`), there are four of each, which means there’s two matches for each emoji.*\n" +
			"Continue taking turns until all the tiles are flipped over. The player with the highest number of points at the end wins the game.\n" +
			`If a player ends the game, either by pressing the “End Game” button or not taking their turn within ${
				GAME_COLLECTOR_TIME / 60 / 1000
			} minutes, they lose 2 points.\n` +
			"**Enjoy playing Memory Match and have fun testing your and your opponents’ memory skills!**",
	});
}
