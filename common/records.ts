import { User, TextBasedChannel, EmbedBuilder, GuildMember, Message } from "discord.js";
import { guild } from "../client.js";
import { convertSnowflakeToDate, millisecondsToTime } from "../lib/numbers.js";
import { joinWithAnd } from "../lib/text.js";
import CONSTANTS from "./CONSTANTS.js";
import Database, { Databases } from "./database.js";

export const recordsDatabase = new Database("records");
await recordsDatabase.init();

export default async function breakRecord(
	index: Databases["records"]["record"],
	users: (User | GuildMember)[],
	count: number,
	channel: TextBasedChannel | Message = CONSTANTS.channels.general ||
		(() => {
			throw new ReferenceError("Could not find general channel");
		})(),
) {
	const oldRecord = recordsDatabase.data.find((record) => RECORDS[record.record]);
	if (oldRecord) {
		if (oldRecord.count >= count) return;

		const brokenRecord = RECORDS[index];

		const embed = new EmbedBuilder()
			.setTitle(`${brokenRecord.name} record broken!`)
			.setDescription(
				`__${joinWithAnd(users)}__ broke __${joinWithAnd(
					oldRecord.users.split("|"),
					(id) => `<@${id}>`,
				)}'s__ record!`,
			)
			.setFields(
				{
					name: "Previous record",
					value:
						brokenRecord.type === "time"
							? millisecondsToTime(oldRecord.count)
							: oldRecord.count.toLocaleString(),
				},
				{
					name: "New record",
					value:
						brokenRecord.type === "time"
							? millisecondsToTime(count)
							: count.toLocaleString(),
				},
			);
		oldRecord.message && embed.setTimestamp(convertSnowflakeToDate(oldRecord.message));

		const message =
			channel instanceof Message
				? await channel.reply({ content: "🎊", embeds: [embed] })
				: await channel.send({ content: "🎊", embeds: [embed] });

		recordsDatabase.data = recordsDatabase.data.map((foundRecord) =>
			foundRecord.record === index
				? {
						record: index,
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
				record: index,
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
	{ name: "Longest time in VC", type: "time" },
	{ name: "Most messages sent in an hour", type: "count" },
	{ name: "Most new members in a day", type: "count" },
] as const;
