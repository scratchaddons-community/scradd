import { User, TextChannel, EmbedBuilder } from "discord.js";
import { convertSnowflakeToDate, millisecondsToTime } from "../lib/numbers.js";
import { joinWithAnd } from "../lib/text.js";
import Database, { Databases } from "./database.js";

export const recordsDatabase = new Database("records");
await recordsDatabase.init();

export async function breakRecord(
	brokenRecord: Databases["records"]["record"],
	users: User[],
	count: number,
	channel: TextChannel,
) {
	const oldRecord = recordsDatabase.data.find((record) => RECORDS[record.record]);
	if (oldRecord) {
		const embed = new EmbedBuilder()
			.setTitle(`${RECORDS[brokenRecord]} record broken!`)
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

		const message = await channel.send({ content: "🎊", embeds: [embed] });

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

export const RECORDS = ["Most dead channel"] as const;
