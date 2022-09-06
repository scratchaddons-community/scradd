import { User, TextBasedChannel, EmbedBuilder, GuildMember, Message } from "discord.js";
import { guild } from "../client.js";
import { convertSnowflakeToDate, millisecondsToTime } from "../lib/numbers.js";
import { joinWithAnd } from "../lib/text.js";
import CONSTANTS from "./CONSTANTS.js";
import Database, { Databases } from "./database.js";

export const recordsDatabase = new Database("records");
await recordsDatabase.init();

export default async function breakRecord(
	brokenRecord: Databases["records"]["record"],
	users: (User | GuildMember)[],
	count: number,
	channel: TextBasedChannel | Message = CONSTANTS.channels.general ||
		(() => {
			throw new ReferenceError("Could not find general channel");
		})(),
) {
	const oldRecord = recordsDatabase.data.find((record) => RECORDS[record.record]);
	if (oldRecord) {
		if (oldRecord.count > count) return;

		const embed = new EmbedBuilder()
			.setTitle(`${RECORDS[brokenRecord].name} record broken!`)
			.setDescription(
				`__${joinWithAnd(users)}__ broke __${joinWithAnd(
					oldRecord.users.split("|"),
					(id) => `<@${id}>`,
				)}'s__ record!`,
			)
			.setFields(
				{ name: "Previous record", value: millisecondsToTime(oldRecord.count) },
				{ name: "New record", value: millisecondsToTime(count) },
			);
		oldRecord.message && embed.setTimestamp(convertSnowflakeToDate(oldRecord.message));

		const message = await (channel instanceof Message ? channel.reply : channel.send)({
			content: "🎊",
			embeds: [embed],
		});

		recordsDatabase.data = recordsDatabase.data.map((foundRecord) =>
			foundRecord.record === brokenRecord
				? {
						record: brokenRecord,
						channel: channel.id,
						count,
						message: message.id,
						users: users.map((user) => user.id).join("|"),
				  }
				: foundRecord,
		);
	} else {
		recordsDatabase.data = [
			...recordsDatabase.data,
			{
				record: brokenRecord,
				count,
				users: users.map((user) => user.id).join("|"),
			},
		];
	}
}

export const RECORDS = [
	{ name: "Most dead channel", type: "time" },
	{ name: "Most people in VC", type: "count" },
	{ name: "Most XP in an hour", type: "count" },
	{ name: "Most potatoed message", type: "count" },
	{
		name: `${
			guild.nameAcronym.length === 2 ? guild.nameAcronym : guild.name
		} server ban speedrun any%`,
		type: "time",
	},
	{ name: "Most reactions on a message", type: "count" },
	{ name: "Most people talking in an hour", type: "count" },
	{ name: "Longest time in vc", type: "time" },
] as const;
