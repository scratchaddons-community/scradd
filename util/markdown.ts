import { escapeMarkdown, formatEmoji, type Snowflake } from "discord.js";

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

export function formatAnyEmoji(
	options:
		| { animated?: boolean | null; id: Snowflake; name?: string | null }
		| { animated?: false | null; id?: null; name: string }
		| { animated?: false | null; id?: null; name?: null }
		| null
		| undefined,
): string {
	return typeof options?.id === "string"
		? formatEmoji({
				...options,
				animated: options.animated ?? false,
				name: options.name ?? undefined,
		  })
		: options?.name ?? "_";
}
