import { ChannelType } from "discord.js";

import CONSTANTS from "../common/CONSTANTS.js";
import log from "../common/logging.js";

import type Event from "../common/types/event";

const event: Event<"voiceStateUpdate"> = async function event(oldState, newState) {
	if (!newState.member || newState.guild.id !== CONSTANTS.guild.id) return;

	const logs = [];
	if (oldState.channel?.id !== newState.channel?.id && !newState.member.user.bot) {
		if (oldState.channel && oldState.channel.type !== ChannelType.GuildStageVoice)
			logs.push(`left voice channel ${oldState.channel.toString()}`);

		if (newState.channel && newState.channel.type !== ChannelType.GuildStageVoice) {
			logs.push(
				`joined voice channel ${newState.channel.toString()}, ${
					newState.mute ? "" : "un"
				}muted and ${newState.deaf ? "" : "un"}deafened`,
			);
		}
	} else if (newState.channel) {
		if (Boolean(oldState.serverMute) !== Boolean(newState.serverMute))
			logs.push(`was${newState.serverMute ? "" : " un"} server muted`);
		else if (Boolean(oldState.mute) !== Boolean(newState.mute))
			logs.push(`${newState.mute ? "" : "un"}muted in ${newState.channel.toString()}`);

		if (Boolean(oldState.serverDeaf) !== Boolean(newState.serverDeaf))
			logs.push(`was${newState.serverDeaf ? "" : " un"} server deafened`);
		else if (Boolean(oldState.deaf) !== Boolean(newState.deaf))
			logs.push(`${newState.deaf ? "" : "un"}deafened in ${newState.channel.toString()}`);

		if (Boolean(oldState.suppress) !== Boolean(newState.suppress)) {
			logs.push(
				`${
					newState.suppress ? "moved to the audience" : "became a speaker"
				} in ${newState.channel.toString()}`,
			);
		}
		if (Boolean(oldState.streaming) !== Boolean(newState.streaming)) {
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
				newState.member && log(`🔊 Member ${newState.member.toString()} ${edit}!`, "voice"),
		),
	);
};
export default event;
