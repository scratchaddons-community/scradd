import { MessageActionRow, MessageButton, MessageEmbed } from "discord.js";
import fetch from "node-fetch";

const rawCount =
	/** @type {{ count: number; _chromeCountDate: string }} */
	(await fetch("https://scratchaddons.com/usercount.json").then((res) => res.json())).count;

const count = new Intl.NumberFormat().format(
	+(
		Math.floor(rawCount / +("1" + "0".repeat(`${rawCount}`.length - 1))) +
		"0".repeat(`${rawCount}`.length - 1)
	),
);

/** @type {import("../../../types/event").default<"guildMemberAdd">} */
const event = {
	async event(member) {
		const channel = await member.client.channels.fetch(process.env.PUBLIC_LOGS_CHANNEL || "");
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
			}, they’re our ${nth(member.guild.memberCount)} member!`,
			`Y’all should welcome ${member.toString()} to ${
				member.guild.name
			}, as they’re our ${nth(member.guild.memberCount)} member!`,
			`Here we go again… ${member.toString()} is here, as our ${nth(
				member.guild.memberCount,
			)} member!`,
			`||Do I always have to let you know when there is a new member?|| ${member.toString()} is here (our ${nth(
				member.guild.memberCount,
			)}), so everyone wave hello!`,
		];

		await Promise.all([
			channel.send({ content: greetings[Math.floor(Math.random() * greetings.length)] }),
			member
				.createDM()
				.then((dm) =>
					dm.send({
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
							new MessageEmbed()
								.setDescription(
									`Welcome, ${member.toString()}, to the official ${
										member.guild.name
									} Discord server. Here, you will find lots of useful channels, friendly members, a [fair amount of bots](https://discord.com/channels/${
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
									}) and get some <#806896002479947827>. If you never need any help, feel free to send me a DM!\n\nThanks for being part of the ${count}+ users who have installed Scratch Addons!\n\n*Also, sorry if you can’t talk yet. We get raided whenever we turn that off 😔.*`,
								)
								.setFooter({ text: "~ Scratch Addons Team" })
								.setAuthor({
									name: member.guild.name,
									iconURL: member.guild.iconURL() ?? undefined,
								})
								.setTimestamp(member.joinedAt),
						],
					}),
				)
				.catch(() => {}),
		]);
	},
};

export default event;
