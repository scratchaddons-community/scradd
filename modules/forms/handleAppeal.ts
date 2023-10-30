import {
	ButtonStyle,
	ComponentType,
	userMention,
	TextInputStyle,
	ButtonInteraction,
	ModalSubmitInteraction,
	MessageMentions,
	Embed,
	type MessageActionRowComponent,
	type ActionRowData,
} from "discord.js";
import config from "../../common/config.js";
import constants from "../../common/constants.js";
import { LoggingEmojis } from "../logging/misc.js";
import { convertBase } from "../../util/numbers.js";
import { joinWithAnd } from "../../util/text.js";
import appeals, { thread } from "./getAppeals.js";
import { escapeMessage } from "../../util/markdown.js";

const NEEDED_ACCEPT = 2,
	NEEDED_REJECT = 1;

export async function confirmAcceptAppeal(interaction: ButtonInteraction, counts: string) {
	const value = interaction.message.embeds[1]?.fields.find(
		(field) => field.name == "Accepted Note",
	)?.value;
	await interaction.showModal({
		components: [
			{
				components: [
					{
						customId: "note",
						label: "Why should they be unbanned?",
						style: TextInputStyle.Paragraph,
						type: ComponentType.TextInput,
						value: value === "N/A" ? undefined : value,
						minLength: 10,
						maxLength: 1024,
					},
				],

				type: ComponentType.ActionRow,
			},
		],

		customId: `${counts}_acceptAppeal`,
		title: "Accept Ban Appeal",
	});
}
export async function confirmRejectAppeal(interaction: ButtonInteraction, counts: string) {
	const value = interaction.message.embeds[1]?.fields.find(
		(field) => field.name == "Rejected Note",
	)?.value;
	await interaction.showModal({
		components: [
			{
				components: [
					{
						customId: "note",
						label: "Why should they not be unbanned?",
						style: TextInputStyle.Paragraph,
						type: ComponentType.TextInput,
						value: value === "N/A" ? undefined : value,
						minLength: 10,
						maxLength: 1024,
					},
				],

				type: ComponentType.ActionRow,
			},
		],

		customId: `${counts}_rejectAppeal`,
		title: "Reject Ban Appeal",
	});
}
export async function submitAcceptAppeal(interaction: ModalSubmitInteraction, ids: string) {
	const users = parseIds(ids);
	await interaction.reply({
		content: `${LoggingEmojis.Punishment} ${interaction.user} accepted the ban appeal.`,
		ephemeral: users.accepters.has(interaction.user.id),
	});
	users.accepters.add(interaction.user.id);
	users.rejecters.delete(interaction.user.id);

	const note = escapeMessage(interaction.fields.getTextInputValue("note"));
	await interaction.message?.edit(
		generateAppeal(
			{
				components: interaction.message.components[1],
				appeal: interaction.message.embeds[0],
			},
			{
				accepted: note,
				rejected: interaction.message.embeds[1]?.fields.find(
					(field) => field.name == "Rejected Note",
				)?.value,
			},
			users,
		),
	);

	if (users.accepters.size >= NEEDED_ACCEPT) {
		const mention = interaction.message?.embeds[0]?.description ?? "";
		await config.guild.bans.remove(
			mention.match(MessageMentions.UsersPattern)?.[1] ?? "",
			`Appealed ban - see ${interaction.message?.url} for context`,
		);
		appeals[mention] = { unbanned: true, note, date: new Date().toISOString() };
		await thread.send(`${mention} has beeen unbanned.`);
	}
}
export async function submitRejectAppeal(interaction: ModalSubmitInteraction, ids: string) {
	const users = parseIds(ids);
	await interaction.reply({
		content: `${LoggingEmojis.Punishment} ${interaction.user} rejected the ban appeal.`,
		ephemeral: users.rejecters.has(interaction.user.id),
	});
	users.rejecters.add(interaction.user.id);
	users.accepters.delete(interaction.user.id);

	const note = escapeMessage(interaction.fields.getTextInputValue("note"));
	await interaction.message?.edit(
		generateAppeal(
			{
				components: interaction.message.components[1],
				appeal: interaction.message.embeds[0],
			},
			{
				accepted: interaction.message.embeds[1]?.fields.find(
					(field) => field.name == "Accepted Note",
				)?.value,
				rejected: note,
			},
			users,
		),
	);

	if (users.rejecters.size >= NEEDED_REJECT) {
		const mention = interaction.message?.embeds[0]?.description ?? "";
		appeals[mention] = { unbanned: false, note, date: new Date().toISOString() };
		await thread.send(`${mention} will not be unbanned.`);
	}
}

function parseIds(ids: string) {
	const users = ids
		.split("/")
		.map((ids) => ids.split("-").map((id) => convertBase(id, convertBase.MAX_BASE, 10)));
	const accepters = new Set(users[0]),
		rejecters = new Set(users[1]);
	accepters.delete("0");
	rejecters.delete("0");
	return { accepters, rejecters };
}

function generateAppeal(
	data: { components?: ActionRowData<MessageActionRowComponent>; appeal?: Embed },
	notes: { accepted?: string; rejected?: string },
	users: { accepters: Set<string>; rejecters: Set<string> },
) {
	return {
		components: [
			getAppealComponents(users),
			data.components ?? { type: ComponentType.ActionRow, components: [] },
		],
		embeds: [
			data.appeal ?? {},
			{
				title:
					users.accepters.size === NEEDED_ACCEPT
						? "Accepted"
						: users.rejecters.size === NEEDED_REJECT
						? "Rejected"
						: "Pending",
				fields: [
					{
						name: "Accepters",
						value: joinWithAnd([...users.accepters], userMention) || "Nobody",
						inline: true,
					},
					{
						name: "Rejecters",
						value: joinWithAnd([...users.rejecters], userMention) || "Nobody",
						inline: true,
					},
					{ name: constants.zws, value: constants.zws, inline: true },
					{ name: "Accepted Note", value: notes.accepted ?? "N/A", inline: true },
					{ name: "Rejected Note", value: notes.rejected ?? "N/A", inline: true },
				],
			},
		],
	};
}

export function getAppealComponents({
	accepters = new Set<string>(),
	rejecters = new Set<string>(),
} = {}) {
	const counts = `${Array.from(accepters, (id) => convertBase(id, 10, convertBase.MAX_BASE)).join(
		"-",
	)}/${Array.from(rejecters, (id) => convertBase(id, 10, convertBase.MAX_BASE)).join("-")}`;
	return {
		components: [
			{
				style: ButtonStyle.Success,
				type: ComponentType.Button,
				customId: `${counts}_acceptAppeal`,
				label: `Accept (${accepters.size}/${NEEDED_ACCEPT})`,
				disabled: rejecters.size === NEEDED_REJECT || accepters.size === NEEDED_ACCEPT,
			} as const,
			{
				style: ButtonStyle.Danger,
				type: ComponentType.Button,
				customId: `${counts}_rejectAppeal`,
				label: `Reject (${rejecters.size}/${NEEDED_REJECT})`,
				disabled: rejecters.size === NEEDED_REJECT || accepters.size === NEEDED_ACCEPT,
			} as const,
		],
		type: ComponentType.ActionRow,
	};
}
