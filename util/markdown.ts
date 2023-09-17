import { escapeMarkdown, escapeMaskedLink, hyperlink, type Snowflake } from "discord.js";
import config from "../common/config.js";

/** @todo Remove after https://github.com/discordjs/discord.js/pull/9463 is merged. */
export function escapeMessage(text: string): string {
	return escapeMarkdown(text, {
		heading: true,
		bulletedList: true,
		numberedList: true,
		maskedLink: true,
	});
}

export function stripMarkdown(text: string): string {
	return text.replaceAll(
		/(?<!\\)\\|```\S*\s+(.+?)\s*```|(?<!\\)\*\*(.+?)(?<!\\)\*\*|(?<!\\)__(.+?)(?<!\\)__|(?<!\\\*?)\*(.+?)(?<!\\|\*)\*|(?<!\\_?)_(.+?)(?<!\\|_)_|~~(.+?)(?<!\\)~~|`(.+?)(?<!\\|`)`|^> (.+?)/gms,
		"$1$2$3$4$5$6$7$8",
	);
}

export function tooltip(
	display: string,
	tooltipText?: string | undefined,
	guildId: Snowflake = config.guild.id,
): string {
	return tooltipText
		? hyperlink(display, `https://discord.com/channels/${guildId}`, tooltipText)
		: escapeMaskedLink(display);
}
