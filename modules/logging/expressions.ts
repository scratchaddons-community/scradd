import {
	Base,
	type AuditLogEvent,
	type GuildAuditLogsEntry,
	formatEmoji,
	type APISticker,
} from "discord.js";
import log, { LoggingEmojis, extraAuditLogsInfo } from "./misc.js";
import { unifiedDiff } from "difflib";

export async function emojiCreate(entry: GuildAuditLogsEntry<AuditLogEvent.EmojiCreate>) {
	if (!(entry.target instanceof Base)) return;
	await log(
		`${LoggingEmojis.Expressions} ${entry.target.toString()} created${extraAuditLogsInfo(
			entry,
		)}`,
		"server",
	);
}
export async function emojiUpdate(entry: GuildAuditLogsEntry<AuditLogEvent.EmojiUpdate>) {
	for (const change of entry.changes) {
		if (change.key !== "name") return;
		await log(
			`${LoggingEmojis.Expressions} ${formatEmoji(entry.target?.id ?? "")} (:${
				change.old
			}:) renamed to :${change.new}:${extraAuditLogsInfo(entry)}`,
			"server",
		);
	}
}
export async function emojiDelete(entry: GuildAuditLogsEntry<AuditLogEvent.EmojiDelete>) {
	if (!entry.target) return;
	await log(
		`${LoggingEmojis.Expressions} :${
			"name" in entry.target
				? entry.target.name
				: entry.changes.find((change) => change.key === "name")?.old
		}: (ID: ${entry.target.id}) deleted${extraAuditLogsInfo(entry)}`,
		"server",
	);
}

export async function stickerCreate(entry: GuildAuditLogsEntry<AuditLogEvent.StickerCreate>) {
	await log(
		`${LoggingEmojis.Expressions} Sticker ${entry.target.name} (ID: ${
			entry.target.id
		}) created${extraAuditLogsInfo(entry)}`,
		"server",
		{ files: [entry.target.url] },
	);
}
export async function stickerUpdate(entry: GuildAuditLogsEntry<AuditLogEvent.StickerUpdate>) {
	for (const change of entry.changes) {
		const key = change.key as Extract<typeof change.key, keyof APISticker>;
		switch (key) {
			case "name": {
				await log(
					`${LoggingEmojis.Expressions} Sticker ${change.old} (ID: ${
						entry.target.id
					}) renamed to :${change.new}:${extraAuditLogsInfo(entry)}`,
					"server",
				);
				break;
			}
			case "description": {
				await log(
					`${LoggingEmojis.Expressions} Sticker ${entry.target.name}’s description (ID: ${
						entry.target.id
					}) changed${extraAuditLogsInfo(entry)}`,
					"server",
					{
						files: [
							{
								content: unifiedDiff(
									`${(change.old as APISticker["description"]) ?? ""}`.split(
										"\n",
									),
									`${entry.target.description ?? ""}`.split("\n"),
									{ lineterm: "" },
								)
									.join("\n")
									.replace(/^-{3} \n\+{3} \n/, ""),

								extension: "diff",
							},
						],
					},
				);
				break;
			}
			case "tags": {
				await log(
					`${LoggingEmojis.Expressions} Sticker ${
						entry.target.name
					}’s related emoji (ID: ${entry.target.id}) set to ${
						change.new
					}${extraAuditLogsInfo(entry)}`,
					"server",
				);
			}
		}
	}
}
export async function stickerDelete(entry: GuildAuditLogsEntry<AuditLogEvent.StickerDelete>) {
	await log(
		`${LoggingEmojis.Expressions} Sticker ${entry.target.name} (ID: ${
			entry.target.id
		}) deleted${extraAuditLogsInfo(entry)}`,
		"server",
		{ files: [entry.target.url] },
	);
}
