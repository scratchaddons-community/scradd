import { GuildMember, MessageEmbed, ThreadAutoArchiveDuration } from "discord.js";
import {
	COLORS,
	getMemberFromThread,
	MODMAIL_CHANNEL,
	sendClosedMessage,
	sendOpenedMessage,
	UNSUPPORTED,
} from "../../common/modmail.js";
import { Embed } from "@discordjs/builders";
import warn from "../../common/moderation/warns.js";
import { badWordsAllowed, censor } from "../../common/moderation/automod.js";
import log, { LOG_GROUPS } from "../../common/moderation/logging.js";
import { DATABASE_THREAD } from "../../common/databases.js";
import CONSTANTS from "../../common/CONSTANTS.js";

/** @type {import("../../types/event").default<"threadUpdate">} */
const event = {
	async event(oldThread, newThread) {
		if (newThread.guild.id !== process.env.GUILD_ID) return;

		const logs = [];
		if (oldThread.archived !== newThread.archived) {
			logs.push(` ${newThread.archived ? "archived" : "unarchived"}`);
		}
		if (oldThread.locked !== newThread.locked) {
			logs.push(` ${newThread.locked ? "locked" : "unlocked"}`);
		}
		if (oldThread.autoArchiveDuration !== newThread.autoArchiveDuration) {
			logs.push(
				`’s archive after inactivity time set to ${
					{
						[ThreadAutoArchiveDuration.OneHour]: "1 Hour",
						[ThreadAutoArchiveDuration.OneDay]: "24 Hours",
						[ThreadAutoArchiveDuration.ThreeDays]: "3 Days",
						[ThreadAutoArchiveDuration.OneWeek]: "1 Week",
					}[newThread.autoArchiveDuration || ThreadAutoArchiveDuration.OneDay] ||
					newThread.autoArchiveDuration
				}`,
			);
		}
		if (oldThread.rateLimitPerUser !== newThread.rateLimitPerUser) {
			logs.push(
				"’s slowmode was set to " +
					newThread.rateLimitPerUser +
					` second${newThread.rateLimitPerUser === 1 ? "" : "s"}`,
			);
		}

		if (
			newThread.archived &&
			// @ts-expect-error -- We are trying to tell if the type matches.
			(LOG_GROUPS.includes(newThread.name) || newThread.name === DATABASE_THREAD) &&
			newThread.parent?.id === process.env.LOGS_CHANNEL
		) {
			await newThread.setArchived(false);
		}

		await Promise.all(
			logs.map(
				(edit) =>
					newThread.guild &&
					log(
						newThread.guild,
						`Thread ${oldThread.toString()} (${newThread.url})` + edit + `!`,
						"channels",
					),
			),
		);
		const censored = censor(newThread.name);
		if (censored && !badWordsAllowed(newThread)) {
			await newThread.setName(oldThread.name);
			const owner = await newThread.fetchOwner();
			if (owner?.guildMember)
				await warn(
					owner.guildMember,
					`Watch your language!`,
					censored.strikes,
					"Renamed thread to:\n" + newThread.name,
				);
		}

		const latestMessage = (await oldThread.messages.fetch({ limit: 1 })).first();
		if (
			newThread.parent?.id !== MODMAIL_CHANNEL ||
			oldThread.archived === newThread.archived ||
			(newThread.archived &&
				latestMessage?.interaction?.commandName === "modmail close" &&
				Date.now() - +latestMessage.createdAt < 60_000)
		)
			return;

		if (newThread.archived) {
			await sendClosedMessage(newThread);
			return;
		}
		const member = await getMemberFromThread(newThread);
		if (!(member instanceof GuildMember)) return;

		await Promise.all([
			newThread.fetchStarterMessage().then((starter) => {
				starter
					.edit({
						embeds: [
							(starter.embeds[0] ? new MessageEmbed(starter.embeds[0]) : new Embed())
								.setTitle("Modmail ticket opened!")
								.setFooter({
									text:
										UNSUPPORTED +
										CONSTANTS.footerSeperator +
										"Messages starting with an equals sign (=) are ignored.",
								})
								.setColor(COLORS.opened),
						],
					})
					.catch(console.error);
			}),
			sendOpenedMessage(member),
		]);
	},
};

export default event;
