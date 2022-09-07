import { AttachmentBuilder, Collection, User } from "discord.js";
import client, { guild } from "../../../client.js";
import CONSTANTS from "../../../common/CONSTANTS.js";
import { changeNickname } from "../../../common/moderation/automod.js";
import log from "../../../common/moderation/logging.js";
import { nth } from "../../../lib/numbers.js";
import fileSystem from "fs/promises";
import url from "url";
import path from "path";
import Database from "../../../common/database.js";
import breakRecord from "../../../common/records.js";

const usersDatabase = new Database("joins");
await usersDatabase.init();

/** @type {import("../../../common/types/event").default<"guildMemberAdd">} */
export default async function event(member) {
	if (member.guild.id !== process.env.GUILD_ID) return;
	await log(`👋 Member ${member.toString()} joined!`, "members");

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

	await CONSTANTS.channels.general?.send({
		content: greetings[Math.floor(Math.random() * greetings.length)],
		files: `${guild.memberCount}`.includes("87")
			? [
					new AttachmentBuilder(
						await fileSystem.readFile(
							path.resolve(
								path.dirname(url.fileURLToPath(import.meta.url)),
								"../../../common/audio/biteOf87.wav",
							),
						),
						{ name: `file.wav` },
					),
			  ]
			: [],
	});

	await changeNickname(member, false);

	const inviters = (await guild.invites.fetch()).reduce((acc, invite) => {
		const inviter = invite.inviter?.id || "";
		acc.set(inviter, (acc.get(inviter) || 0) + (invite.uses || 0));
		return acc;
	}, /** @type {Collection<import("discord.js").Snowflake, number>} */ (new Collection()));
	inviters.map(async (count, user) => {
		if (count < 20) return;
		const member = await guild.members.fetch(user).catch(() => {});
		if (
			!member ||
			member.id === "279855717203050496" ||
			member.user.bot ||
			!CONSTANTS.roles.epic ||
			member.roles.resolve(CONSTANTS.roles.epic.id)
		)
			return;
		await member.roles.add(CONSTANTS.roles.epic);
		await CONSTANTS.channels.general?.send(
			`🎊 ${member.toString()} Thanks for inviting 20+ people! Here's ${CONSTANTS.roles.epic.toString()} as a thank-you.`,
		);
	});

	usersDatabase.data = [
		{ user: member.id, timestamp: Date.now() },
		...usersDatabase.data.filter(({ timestamp }) => timestamp + 86_400_000 > Date.now()),
	];
	const users = (
		await Promise.all(
			usersDatabase.data.map(({ user }) => client.users.fetch(user).catch(() => {})),
		)
	).filter(/** @returns {user is User} */ (user) => !!user);
	await breakRecord(9, users, users.length);
}
