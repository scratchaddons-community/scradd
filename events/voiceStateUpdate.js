import { ChannelType } from "discord.js";
import Database from "../common/database.js";
import log from "../common/moderation/logging.js";
import breakRecord from "../common/records.js";

export const vcUsersDatabase = new Database("vc_users");
await vcUsersDatabase.init();

/** @type {import("../common/types/event").default<"voiceStateUpdate">} */
export default async function event(oldState, newState) {
	if (!newState.member || newState.guild.id !== process.env.GUILD_ID) return;

	const logs = [];
	if (oldState.channel?.id !== newState.channel?.id || !newState.channel) {
		if (newState.channel) {
			logs.push(
				`joined voice channel ${newState.channel.toString()}, ${
					newState.mute ? "" : "un"
				}muted and ${newState.deaf ? "" : "un"}deafened`,
			);

			await breakRecord(
				1,
				newState.channel.members.toJSON(),
				newState.channel.members.size,
				newState.channel.type === ChannelType.GuildVoice ? newState.channel : undefined,
			);
		}
		if (oldState.channel) {
			logs.push(`left voice channel ${oldState.channel.toString()}`);
		}

		if (newState.channel && oldState.channel) {
			vcUsersDatabase.data = vcUsersDatabase.data.map((data) =>
				data.user === newState.member?.id
					? {
							user: data.user,
							channel: newState.channel?.id || "",
							time: Date.now(),
					  }
					: data,
			);
		} else if (!newState.channel) {
			vcUsersDatabase.data = vcUsersDatabase.data.filter(
				(data) => data.user !== newState.member?.id,
			);
			const longest = vcUsersDatabase.data.sort((a, b) => a.time - b.time)[0];
			longest?.user === newState.member.id &&
				(await breakRecord(
					6,
					[newState.member],
					Date.now() - longest.time,
					oldState.channel?.type === ChannelType.GuildVoice
						? oldState.channel
						: undefined,
				));
		} else {
			vcUsersDatabase.data = [
				...vcUsersDatabase.data,
				{ user: newState.member.id, channel: newState.channel?.id, time: Date.now() },
			];
		}
	} else {
		if (oldState.serverMute !== newState.serverMute) {
			logs.push(`was${newState.serverMute ? "" : " un"} server muted`);
		} else if (oldState.mute !== newState.mute) {
			logs.push(`${newState.mute ? "" : " un"}muted in ${newState.channel.toString()}`);
		}
		if (oldState.serverDeaf !== newState.serverDeaf) {
			logs.push(`was${newState.serverDeaf ? "" : " un"} server deafened`);
		} else if (oldState.deaf !== newState.deaf) {
			logs.push(`${newState.deaf ? "" : " un"}deafened in ${newState.channel.toString()}`);
		}
		if (oldState.suppress !== newState.suppress) {
			logs.push(
				`${
					newState.suppress ? "moved to the audience" : "became a speaker"
				} in ${newState.channel.toString()}`,
			);
		}
		if (oldState.streaming !== newState.streaming) {
			logs.push(
				`${
					newState.streaming ? "started" : "stopped"
				} streaming in ${newState.channel.toString()}`,
			);
		}
	}

	await Promise.all(
		logs.map(
			(edit) =>
				newState.member &&
				log(`🔊 Member ${newState.member.toString()} ` + edit + `!`, "voice"),
		),
	);
}
