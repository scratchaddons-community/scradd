import { warn } from "../../../common/moderation/warns.js";
import { censor } from "../../../common/moderation/automod.js";

/** @type {import("../../../types/event").default<"guildMemberUpdate">} */
const event = {
	async event(oldMember, newMember) {
		if (newMember.guild.id !== process.env.GUILD_ID) return;
		if (!oldMember.roles.premiumSubscriberRole && newMember.roles.premiumSubscriberRole) {
			const channel = await newMember.guild.channels.fetch(
				process.env.PUBLIC_LOGS_CHANNEL || "",
			);
			if (!channel?.isText()) throw new Error("PUBLIC_LOGS_CHANNEL is not a text channel.");

			const boosts = [
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
			if (!modTalk) throw new TypeError("Could not find mod talk");
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
