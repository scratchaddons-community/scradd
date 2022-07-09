import { MessageActionRow, MessageButton } from "discord.js";
import fetch from "node-fetch";

import { Embed } from "@discordjs/builders";
import { censor } from "../../../common/moderation/automod.js";
import CONSTANTS from "../../../common/CONSTANTS.js";
import { escapeMessage } from "../../../lib/markdown.js";
import log from "../../../common/moderation/logging.js";
import { roundDownToMultipleTen } from "../../../lib/numbers.js";
const rawCount =
	/** @type {{ count: number; _chromeCountDate: string }} */
	(await fetch("https://scratchaddons.com/usercount.json").then((res) => res.json())).count;

const count = new Intl.NumberFormat().format(roundDownToMultipleTen(rawCount));

/** @type {import("../../../types/event").default<"guildMemberAdd">} */
const event = {
	async event(member) {
		if (member.guild.id !== process.env.GUILD_ID) return;
		await log(member.guild, `Member ${member.toString()} joined!`, "members");
		const channel = await member.guild.channels.fetch(process.env.PUBLIC_LOGS_CHANNEL || "");
		if (!channel?.isText()) return;

		/** @param {number} number */
		const nth = (number) =>
			"**" +
			number +
			([, "st", "nd", "rd"][(number / 10) % 10 ^ 1 && number % 10] || "th") +
			"**" +
			(`${number}`.includes("69")
				? " (nic" + "e".repeat(Math.floor(number.toString().length / 2)) + ")"
				: /^[1-9]0+$/.test(number + "")
				? " (" + "🥳".repeat(number.toString().length - 1) + ")"
				: "");

		const greetings = [
			`Everybody please welcome ${member.toString()} to ${
				member.guild.name
			}; they’re our ${nth(member.guild.memberCount)} member!`,
			`A big shoutout to ${member.toString()}, we're glad you've joined us as our ${nth(
				member.guild.memberCount,
			)} member!`,
			`Here we go again… ${member.toString()} is here, as our ${nth(
				member.guild.memberCount,
			)} member!`,
			`||Do I always have to let you know when there is a new member?|| ${member.toString()} is here (our ${nth(
				member.guild.memberCount,
			)}), so everyone wave hello!`,
			`What's that? A new member? Yes, ${member.toString()}'s our ${nth(
				member.guild.memberCount,
			)}!`,
			`Welcome:tm: ${member.toString()}! You're our ${nth(member.guild.memberCount)} member!`,
		];

		await Promise.all([
			channel.send({
				content: greetings[Math.floor(Math.random() * greetings.length)],
				files: `${member.guild.memberCount}`.includes("87")
					? [
							"https://cdn.discordapp.com/attachments/938438561588453438/965676538605502535/was_that_The_Bite_of_87.wav",
					  ]
					: [],
			}),
			member
				.send({
					components: [
						new MessageActionRow().addComponents([
							new MessageButton()
								.setStyle("LINK")
								.setLabel("Go chat!")
								.setURL(
									`https://discord.com/channels/${member.guild.id}/${channel.id}`,
								),
						]),
					],

					embeds: [
						new Embed()
							.setDescription(
								`**Welcome, ${member.toString()}, to the official ${escapeMessage(
									member.guild.name,
								)} Discord server!** Here, you will find lots of useful channels, friendly members, a [fair amount of bots](https://discord.com/channels/${
									member.guild.id
								}/${
									process.env.BOTS_CHANNEL
								}), [Scratch Addons devs](https://discord.com/channels/${
									member.guild.id
								}/826250884279173162), [a potato army](<https://discord.gg/Y7B3hJCgw8>), and even <@557632229719670794> himself. You can [see what addons are being developed](https://discord.com/channels/${
									member.guild.id
								}/806605006072709130), [become a beta tester](https://discord.com/channels/${
									member.guild.id
								}/809066418687311872), and get [help with coding on Scratch](https://discord.com/channels/${
									member.guild.id
								}/806609527281549312). Read [the fair rules](https://discord.com/channels/${
									member.guild.id
								}/${
									member.guild.rulesChannel?.id
								}) and get some <#806896002479947827>. If you never need any help, feel free to send me a DM to contact the mods!\n\nThanks for being part of the ${count}+ users who have installed Scratch Addons!${
									member.guild.verificationLevel === "HIGH"
										? "\n\n*Also, sorry if you can’t talk yet. We get raided whenever we turn that off 😔.*"
										: ""
								}`,
							)
							.setFooter({ text: `~ the ${escapeMessage(member.guild.name)} Team` })
							.setAuthor({
								name: member.guild.name,
								iconURL: member.guild.iconURL() ?? undefined,
							}),
					],
				})
				.catch(() => {}),
		]);

		const censored = censor(member.displayName);
		if (censored) {
			await member.setNickname(censored.censored);
			await member
				.send({
					content:
						CONSTANTS.emojis.statuses.no +
						" I censored some bad words in your username. If you change your nickname to include bad words, you may be warned.",
				})
				.catch(() => {});
		}
	},
};

export default event;
