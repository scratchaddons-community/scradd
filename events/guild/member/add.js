import { guild } from "../../../client.js";
import { changeNickname } from "../../../common/moderation/automod.js";
import log from "../../../common/moderation/logging.js";
import { nth } from "../../../lib/numbers.js";

/** @type {import("../../../types/event").default<"guildMemberAdd">} */
export default async function event(member) {
	if (member.guild.id !== process.env.GUILD_ID) return;
	await log(`👋 Member ${member.toString()} joined!`, "members");
	const channel = await guild.channels.fetch(process.env.PUBLIC_LOGS_CHANNEL || "");
	if (!channel?.isTextBased()) return;

	const greetings = [
		`👋 Everybody please welcome ${member.toString()} to ${guild.name}; they’re our ${nth(
			guild.memberCount,
		)} member!`,
		`📢 A big shoutout to ${member.toString()}, we’re glad you’ve joined us as our ${nth(
			guild.memberCount,
		)} member!`,
		`➡ Here we go again… ${member.toString()} is here, our ${nth(guild.memberCount)} member!`,
		`||🙄 Do I always have to let you know when there is a new member?|| ${member.toString()} is here (our ${nth(
			guild.memberCount,
		)})!`,
		`🧐 What’s that? A new member? Yes, ${member.toString()}’s our ${nth(guild.memberCount)}!`,
		`Welcome:tm: ${member.toString()}! You’re our ${nth(guild.memberCount)} member!`,
	];

	await channel.send({
		content: greetings[Math.floor(Math.random() * greetings.length)],
		files: `${guild.memberCount}`.includes("87")
			? [
					"https://cdn.discordapp.com/attachments/938438561588453438/965676538605502535/was_that_The_Bite_of_87.wav",
			  ]
			: [],
	});

	await changeNickname(member, false);
}
