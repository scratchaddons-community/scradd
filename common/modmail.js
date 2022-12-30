import { GuildMember, Colors, MessageMentions, User, ComponentType, ButtonStyle } from "discord.js";

import client from "../client.js";
import { disableComponents, extractMessageExtremities, messageToText } from "../util/discord.js";
import { escapeMessage } from "../util/markdown.js";
import { asyncFilter } from "../util/promises.js";
import { generateHash } from "../util/text.js";
import CONSTANTS from "./CONSTANTS.js";
// import { getStrikesForMember } from "../commands/strikes.js";

export const MODMAIL_COLORS = {
	opened: Colors.Gold,
	closed: Colors.DarkGreen,
	confirm: Colors.Blurple,
};

export const MODMAIL_UNSUPPORTED =
	"Please note that reactions, replies, edits, and deletions are not supported";

/**
 * Generate a webhook message from a message sent by a user.
 *
 * @param {import("discord.js").Message} message - Message sent by a user.
 *
 * @returns {Promise<import("discord.js").WebhookCreateMessageOptions>} - Webhook message.
 */
export async function generateModmailMessage(message) {
	const { files, embeds } = extractMessageExtremities(message);

	const member =
		(message.interaction &&
			(await CONSTANTS.guild?.members.fetch(message.interaction.user.id).catch(() => {}))) ||
		message.member ||
		(await CONSTANTS.guild?.members.fetch(message.author.id).catch(() => {}));

	return {
		avatarURL: (member || message.author).displayAvatarURL(),
		content: (await messageToText(message, false)) || undefined,
		embeds,
		files,
		username: member?.displayName ?? message.author.username,
	};
}

/**
 * Given a modmail ticket thread, return the user who messages are being sent to.
 *
 * @param {import("discord.js").ThreadChannel} thread - Modmail ticket thread.
 *
 * @returns {Promise<void | GuildMember>} - User who messages are being sent to.
 */
export async function getUserFromModmail(thread) {
	const starter = await thread.fetchStarterMessage().catch(() => {});
	const embed = starter?.embeds[0];

	if (!embed?.description) return;

	const userId = MessageMentions.UsersPattern.exec(embed.description)?.[1] ?? embed.description;

	return await CONSTANTS.guild.members.fetch(userId).catch(() => {});
}

/**
 * Given a user, find a ticket thread that sends messages to them.
 *
 * @param {import("discord.js").GuildMember | import("discord.js").User} user - The user to search for.
 *
 * @returns {Promise<import("discord.js").ThreadChannel | void>} - Ticket thread.
 */
export async function getThreadFromMember(user) {
	if (!CONSTANTS.channels.modmail) return;

	const { threads } = await CONSTANTS.channels.modmail.threads.fetchActive();

	return (
		await asyncFilter(
			threads.toJSON(),
			async (thread) => (await getUserFromModmail(thread))?.id === user.id && thread,
		).next()
	).value;
}

/**
 * Let a user know that their ticket has been closed.
 *
 * @param {import("discord.js").ThreadChannel} thread - Ticket thread.
 * @param {{ reason?: string; user?: import("discord.js").User | import("discord.js").GuildMember }} meta - The reason for closing the
 *   ticket.
 *
 * @returns {Promise<import("discord.js").Message<false> | undefined>} - Message sent to user.
 */
export async function sendClosedMessage(thread, { reason, user } = {}) {
	const member = await getUserFromModmail(thread);

	const moderator =
		(user instanceof User && (await CONSTANTS.guild.members.fetch(user.id).catch(() => {}))) ||
		user;

	return (
		await Promise.all([
			thread
				.fetchStarterMessage()
				.catch(() => {})
				.then((starter) =>
					starter?.edit({
						embeds: [
							{
								...starter.embeds[0]?.data,
								title: "Modmail ticket closed!",
								color: MODMAIL_COLORS.closed,
							},
						],
					}),
				),
			member?.send({
				embeds: [
					{
						title: "Modmail ticket closed!",
						timestamp: thread.createdAt?.toISOString(),

						footer: {
							icon_url: CONSTANTS.guild.iconURL() ?? undefined,
							text: "Any future messages will start a new ticket.",
						},

						color: MODMAIL_COLORS.closed,
						description: reason,

						author: moderator && {
							icon_url: moderator.displayAvatarURL(),

							name:
								moderator instanceof GuildMember
									? moderator.displayName
									: moderator.username,
						},
					},
				],
			}),
		])
	)[1];
}
/**
 * Close a Modmail ticket.
 *
 * @param {import("discord.js").ThreadChannel} thread - Modmail ticket thread.
 * @param {import("discord.js").User} user - User who closed the ticket.
 * @param {string} [reason] - The reason for closing the ticket.
 */
export async function closeModmail(thread, user, reason) {
	await sendClosedMessage(thread, { reason, user });
	await thread.setArchived(true, "Modmail closed");
}

/**
 * Let a user know that the Mods want to talk to them.
 *
 * @param {GuildMember | User} user - The user to message.
 *
 * @returns {Promise<import("discord.js").Message<false> | false>} - The message sent.
 */
export async function sendOpenedMessage(user) {
	return await user
		.send({
			embeds: [
				{
					title: "Modmail ticket opened!",

					description: `The moderation team of **${escapeMessage(
						CONSTANTS.guild.name,
					)}** would like to talk to you. I will DM you their messages. You may send them messages by sending me DMs.`,

					footer: { text: MODMAIL_UNSUPPORTED },
					color: MODMAIL_COLORS.opened,
				},
			],
		})
		.catch(() => false);
}

/**
 * Generate a confirmation message for starting a modmail.
 *
 * @param {import("discord.js").APIEmbed} confirmEmbed - The embed explaining how modmail works.
 * @param {(buttonInteraction: import("discord.js").MessageComponentInteraction) => Promise<void>} onConfirm - A calback for when the
 *   modmail is started.
 * @param {(options: import("discord.js").BaseMessageOptions) => Promise<import("discord.js").Message>} reply - A callback to send the
 *   initial message.
 */
export async function generateModmailConfirm(confirmEmbed, onConfirm, reply) {
	const confirmId = generateHash("confirm");

	const cancelId = generateHash("cancel");

	const message = await reply({
		components: [
			{
				type: ComponentType.ActionRow,

				components: [
					{
						type: ComponentType.Button,
						label: "Confirm",
						style: ButtonStyle.Success,
						customId: confirmId,
					},
					{
						type: ComponentType.Button,
						label: "Cancel",
						customId: cancelId,
						style: ButtonStyle.Secondary,
					},
				],
			},
		],

		embeds: [confirmEmbed],
	});

	const collector = message.createMessageComponentCollector({
		filter: (buttonInteraction) => [confirmId, cancelId].includes(buttonInteraction.customId),

		time: CONSTANTS.collectorTime,
	});

	collector
		.on("collect", async (buttonInteraction) => {
			collector.stop();

			switch (buttonInteraction.customId) {
				case confirmId: {
					await onConfirm(buttonInteraction);

					break;
				}
				case cancelId: {
					await buttonInteraction.reply({
						content: `${CONSTANTS.emojis.statuses.no} Modmail canceled!`,
						ephemeral: true,
					});

					break;
				}
			}
		})
		.on("end", async () => {
			if (!message.interaction)
				await message.edit({ components: disableComponents(message.components) });
		});

	return collector;
}

/**
 * Generates functions to add temporary reactions to a modmail message.
 *
 * @param {import("discord.js").Message} message - The message to react to.
 *
 * @returns {readonly [
 * 	() => Promise<import("discord.js").MessageReaction>,
 * 	(error: unknown) => Promise<import("discord.js").MessageReaction>,
 * ]}
 *   - The functions.
 */
export function generateReactionFunctions(message) {
	return /** @type {const} */ ([
		async () => {
			const reaction = await message.react(CONSTANTS.emojis.statuses.yes);

			message.channel
				.createMessageCollector({ maxProcessed: 1, time: 5000 })
				.on("end", async () => {
					await reaction.users.remove(client.user || "");
				});

			return reaction;
		},
		async (error) => {
			console.error(error);

			return await message.react(CONSTANTS.emojis.statuses.no);
		},
	]);
}

/**
 * Open a modmail.
 *
 * @param {import("discord.js").APIEmbed} openedEmbed - The success embed to send.
 * @param {GuildMember | User} user - The user who to send modmail messages to.
 * @param {boolean} ping - Whether to ping `@here` in #modmail.
 */
export async function openModmail(openedEmbed, user, ping = false) {
	if (!CONSTANTS.channels.modmail) throw new ReferenceError("Cannot find modmail channel");

	const starterMessage = await CONSTANTS.channels.modmail.send({
		allowedMentions: { parse: ["everyone"] },
		content: ping && process.env.NODE_ENV === "production" ? "@here" : undefined,
		embeds: [openedEmbed],
	});
	const date = new Date();
	const thread = await starterMessage.startThread({
		name: `${(user instanceof User ? user : user.user).username} (${date
			.getUTCFullYear()
			.toLocaleString([], { useGrouping: false })}-${(date.getUTCMonth() + 1).toLocaleString(
			[],
			{ minimumIntegerDigits: 2 },
		)}-${date.getUTCDate().toLocaleString([], { minimumIntegerDigits: 2 })})`,

		reason: "Modmail opened",
	});

	await thread.setLocked(true, "Modmail opened");

	// await thread.send({ ...(await getStrikesForMember(user)), content: "=" });
	return thread;
}
