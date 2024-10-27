import { unifiedDiff } from "difflib";
import type { AuditLogEvent } from "discord.js";
import { formatAnyEmoji } from "../../util/markdown.js";
import log, { LogSeverity, LoggingEmojis, extraAuditLogsInfo, type AuditLog } from "./misc.js";

export async function emojiCreate(entry: AuditLog<AuditLogEvent.EmojiCreate>): Promise<void> {
	await log(
		`${LoggingEmojis.Expression} ${formatAnyEmoji(entry.target)} created${extraAuditLogsInfo(
			entry,
		)}`,
		LogSeverity.ImportantUpdate,
	);
}
export async function emojiUpdate(entry: AuditLog<AuditLogEvent.EmojiUpdate>): Promise<void> {
	for (const change of entry.changes) {
		if (change.key !== "name") return;
		await log(
			`${LoggingEmojis.Expression} ${formatAnyEmoji(entry.target)} ${
				change.old ? `(:${change.old}\\:) ` : ``
			}renamed to :${
				typeof change.new === "string" ?
					change.new
				:	("name" in entry.target && entry.target.name) || "emoji"
			}\\:${extraAuditLogsInfo(entry)}`,
			LogSeverity.ImportantUpdate,
		);
	}
}
export async function emojiDelete(entry: AuditLog<AuditLogEvent.EmojiDelete>): Promise<void> {
	const oldName =
		"name" in entry.target ?
			entry.target.name
		:	entry.changes.find(
				(change): change is { key: "name"; old: string } =>
					change.key === "name" && typeof change.old === "string",
			)?.old;
	await log(
		`${LoggingEmojis.Expression} :${oldName ?? "emoji"}\\: (ID: ${
			entry.target.id
		}) deleted${extraAuditLogsInfo(entry)}`,
		LogSeverity.ImportantUpdate,
	);
}

export async function stickerCreate(entry: AuditLog<AuditLogEvent.StickerCreate>): Promise<void> {
	await log(
		`${LoggingEmojis.Expression} Sticker ${entry.target.name} (ID: ${
			entry.target.id
		}) created${extraAuditLogsInfo(entry)}`,
		LogSeverity.ImportantUpdate,
		{ files: [entry.target.url] },
	);
}
export async function stickerUpdate(entry: AuditLog<AuditLogEvent.StickerUpdate>): Promise<void> {
	for (const change of entry.changes) {
		switch (change.key) {
			case "name": {
				await log(
					`${LoggingEmojis.Expression} Sticker ${change.old ?? "emoji"} (ID: ${
						entry.target.id
					}) renamed to ${change.new ?? entry.target.name}${extraAuditLogsInfo(entry)}`,
					LogSeverity.ImportantUpdate,
				);
				break;
			}
			case "description": {
				await log(
					`${LoggingEmojis.Expression} Sticker ${entry.target.name}’s description (ID: ${
						entry.target.id
					}) changed${extraAuditLogsInfo(entry)}`,
					LogSeverity.ImportantUpdate,
					{
						files: [
							{
								content: unifiedDiff(
									change.old?.split("\n") ?? [],
									entry.target.description?.split("\n") ?? [],
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
					`${LoggingEmojis.Expression} Sticker ${
						entry.target.name
					}’s related emoji (ID: ${entry.target.id}) ${
						change.new ? `set to ${change.new}` : "removed"
					}${extraAuditLogsInfo(entry)}`,
					LogSeverity.ImportantUpdate,
				);
				break;
			}
			default: {
				break;
			}
		}
	}
}
export async function stickerDelete(entry: AuditLog<AuditLogEvent.StickerDelete>): Promise<void> {
	await log(
		`${LoggingEmojis.Expression} Sticker ${entry.target.name} (ID: ${
			entry.target.id
		}) deleted${extraAuditLogsInfo(entry)}`,
		LogSeverity.ImportantUpdate,
		{ files: [entry.target.url] },
	);
}
