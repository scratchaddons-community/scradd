import { ButtonBuilder, ButtonStyle, EmbedBuilder, ThreadAutoArchiveDuration } from "discord.js";
import {
	MODMAIL_COLORS,
	getUserFromModmail,
	sendClosedMessage,
	sendOpenedMessage,
	MODMAIL_UNSUPPORTED,
} from "../../common/modmail.js";
import warn from "../../common/moderation/warns.js";
import { badWordsAllowed, censor } from "../../common/moderation/automod.js";
import log, { LOG_GROUPS } from "../../common/moderation/logging.js";
import { DATABASE_THREAD } from "../../common/database.js";
import CONSTANTS from "../../common/CONSTANTS.js";
import { MessageActionRowBuilder } from "../../common/types/ActionRowBuilder.js";

/** @type {import("../../common/types/event").default<"threadUpdate">} */
export default async function event(oldThread, newThread) {
	if (newThread.guild.id !== process.env.GUILD_ID) return;

	const logs = [];
	if (oldThread.archived !== newThread.archived) {
		logs.push(` ${newThread.archived ? "closed" : "opened"}`);
	}
	if (oldThread.locked !== newThread.locked) {
		logs.push(` ${newThread.locked ? "locked" : "unlocked"}`);
	}
	if (oldThread.autoArchiveDuration !== newThread.autoArchiveDuration) {
		logs.push(
			`’s hide after inactivity set to ${
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
		(newThread.name === DATABASE_THREAD ||
			/** @type {readonly string[]} */ (LOG_GROUPS).includes(newThread.name)) &&
		newThread.parent?.id === CONSTANTS.channels.modlogs?.id
	) {
		await newThread.setArchived(false);
	}

	await Promise.all(
		logs.map((edit) =>
			log(`📃 Thread ${newThread.toString()}` + edit + `!`, "channels", {
				components: [
					new MessageActionRowBuilder().addComponents(
						new ButtonBuilder()
							.setLabel("View Thread")
							.setStyle(ButtonStyle.Link)
							.setURL(newThread.url),
					),
				],
			}),
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
		newThread.parent?.id !== CONSTANTS.channels.modmail?.id ||
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
	const member = await getUserFromModmail(newThread);

	await Promise.all([
		newThread.fetchStarterMessage().then((starter) => {
			starter
				?.edit({
					embeds: [
						(starter.embeds[0]
							? EmbedBuilder.from(starter.embeds[0])
							: new EmbedBuilder()
						)
							.setTitle("Modmail ticket opened!")
							.setFooter({
								text:
									MODMAIL_UNSUPPORTED +
									CONSTANTS.footerSeperator +
									"Messages starting with an equals sign (=) are ignored.",
							})
							.setColor(MODMAIL_COLORS.opened),
					],
				})
				.catch(console.error);
		}),
		member && sendOpenedMessage(member),
	]);
}
