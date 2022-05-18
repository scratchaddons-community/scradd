/** @file Let A user know when their Modmail thread is archived or unarchived. */
import { GuildMember, MessageEmbed } from "discord.js";
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
				`'s archive after inactivity time set to ${
					{
						60: "1 Hour",
						1440: "24 Hours",
						4320: "3 Days",
						10080: "1 Week",
						MAX: "",
					}[newThread.autoArchiveDuration || 1440] || newThread.autoArchiveDuration
				}`,
			);
		}
		if (oldThread.rateLimitPerUser !== newThread.rateLimitPerUser) {
			logs.push("'s slowmode was set to " + newThread.rateLimitPerUser + " seconds");
		}

		await Promise.all(
			logs.map(
				(edit) =>
					newThread.guild &&
					log(newThread.guild, `Thread ${oldThread.toString()}` + edit + `!`, "channels"),
			),
		);
		const censored = censor(newThread.name);
		if (censored&& !badWordsAllowed(newThread)) {
			await newThread.setName(censored.censored);
			const owner = await newThread.fetchOwner();
			if (owner?.guildMember)
				await warn(owner.guildMember, "Watch your language!", censored.strikes);
		}

		if (
			newThread.archived &&
			LOG_GROUPS.includes(newThread.name) &&
			newThread.parent?.id === process.env.LOGS_CHANNEL
		) {
			return await newThread.setArchived(false);
		}
		const latestMessage = (await oldThread.messages.fetch({ limit: 1 })).first();
		if (
			newThread.parent?.id !== MODMAIL_CHANNEL ||
			oldThread.archived === newThread.archived ||
			(newThread.archived &&
				latestMessage?.interaction?.commandName === "modmail" &&
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
								.setFooter({ text: UNSUPPORTED })
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
