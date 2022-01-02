import type { CacheType, Interaction, Message } from "discord.js";

export default function (
	interaction:
		| Interaction<CacheType>
		| Message<boolean>
		| { guildId: string; channelId: string },
	display: string,
	tooltip: string,
): string {
	return `[${display}](https://discord.com/channels/${interaction.guildId}/${interaction.channelId} "${tooltip}")`;
}
