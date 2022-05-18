import warn from "../../../common/moderation/warns.js";
import { censor } from "../../../common/moderation/automod.js";
import log from "../../../common/moderation/logging.js";

/** @type {import("../../../types/event").default<"guildMemberUpdate">} */
const event = {
	async event(oldMember, newMember) {
		if (newMember.guild.id !== process.env.GUILD_ID) return;
		const logs = [];
		if (oldMember.avatar !== newMember.avatar) {
			logs.push(
				newMember.avatar
					? " set their server avatar to <" + newMember.avatarURL()+">"
					: " removed their server avatar",
			);
		}

		if (oldMember.communicationDisabledUntil !== newMember.communicationDisabledUntil) {
			logs.push(
				newMember.communicationDisabledUntil
					? " timed out until <t:" +
							Math.round(+newMember.communicationDisabledUntil / 1000) +
							">"
					: " un timed out",
			);
		}
		if (oldMember.nickname !== newMember.nickname) {
			logs.push(
				newMember.nickname
					? " was nicknamed " + newMember.nickname
					: "'s nickname was removed",
			);
		}
		await Promise.all(
			logs.map((edit) => log(newMember.guild, `Member ${newMember.toString()}${edit}!`, "members")),
		);
		if (!oldMember.roles.premiumSubscriberRole && newMember.roles.premiumSubscriberRole) {
			const channel = await newMember.guild.channels.fetch(
				process.env.PUBLIC_LOGS_CHANNEL || "",
			);
			if (!channel?.isText())
				throw new TypeError("PUBLIC_LOGS_CHANNEL is not a text channel.");

			const boosts = [ // todo: unreliable
				`YO! ${newMember.toString()} just BOOSTED THE SERVER!!! ${
					newMember.guild.name
				} now has **${newMember.guild.premiumSubscriptionCount} BOOSTS**`,
				`Hype, ${newMember.toString()} just BOOSTED! Thanks! We're at **${
					newMember.guild.premiumSubscriptionCount
				} boosts** now`,
				`POG - we now have **${
					newMember.guild.premiumSubscriptionCount
				} boosts**, THANKS TO ${newMember.toString()}`,
				`Someone with presumably nothing better to do just BOOSTED ${
					newMember.guild.name
				}, which now has **${
					newMember.guild.premiumSubscriptionCount
				} BOOSTS**! Hooray! (${newMember.toString()}, to be specific)`,
				`${newMember.toString()} just boosted the server! I hope they didn't have to steal their parents' credit card… But it doesn't matter, as we have **${
					newMember.guild.premiumSubscriptionCount
				} boosts** now!`,
			];

			await channel.send({
				content:
					boosts[Math.floor(Math.random() * boosts.length)] +
					"!".repeat(newMember.guild.premiumSubscriptionCount || 0),
			});
		}
		const censored = censor(newMember.displayName);
		if (censored) {
			const modTalk = newMember.guild.publicUpdatesChannel;
			if (!modTalk) throw new ReferenceError("Could not find mod talk");
			await (newMember.moderatable
				? newMember.setNickname(censored.censored)
				: modTalk.send({
						allowedMentions: { users: [] },
						content: `Missing permissions to change ${newMember.toString()}'s nickname to \`${
							censored.censored
						}\`.`,
				  }));
			await warn(newMember, "Watch your language!", censored.strikes);
		}
	},
};

export default event;

// todo: permissions and roles updates are not logged but they should be
