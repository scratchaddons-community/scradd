import {
	ButtonStyle,
	ComponentType,
	userMention,
	type ActionRowData,
	type Embed,
	type InteractionButtonComponentData,
	type MessageActionRowComponent,
	type MessageEditOptions,
} from "discord.js";
import constants from "../../../common/constants.js";
import { convertBase } from "../../../util/numbers.js";
import { joinWithAnd } from "../../../util/text.js";

export const NEEDED_ACCEPT = 4,
	NEEDED_REJECT = 3;

export default function generateAppeal(
	data: { components?: ActionRowData<MessageActionRowComponent>; appeal?: Embed },
	notes: { accepted?: string; rejected?: string },
	users: { accepters: Set<string>; rejecters: Set<string> },
): MessageEditOptions {
	return {
		components: [
			getAppealComponents(users),
			data.components ?? { type: ComponentType.ActionRow, components: [] },
		],
		embeds: [
			data.appeal ?? {},
			{
				title:
					users.accepters.size === NEEDED_ACCEPT ? "Accepted"
					: users.rejecters.size === NEEDED_REJECT ? "Rejected"
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

export function parseIds(input: string): { accepters: Set<string>; rejecters: Set<string> } {
	const users = input
		.split("|")
		.map((ids) => ids.split("+").map((id) => convertBase(id, convertBase.MAX_BASE, 10)));
	const accepters = new Set(users[0]),
		rejecters = new Set(users[1]);
	accepters.delete("0");
	rejecters.delete("0");
	return { accepters, rejecters };
}

export function getAppealComponents({
	accepters = new Set<string>(),
	rejecters = new Set<string>(),
} = {}): {
	type: ComponentType.ActionRow;
	components: [InteractionButtonComponentData, InteractionButtonComponentData];
} {
	const counts = `${Array.from(accepters, (id) => convertBase(id, 10, convertBase.MAX_BASE)).join(
		"+",
	)}|${Array.from(rejecters, (id) => convertBase(id, 10, convertBase.MAX_BASE)).join("+")}`;
	return {
		components: [
			{
				style: ButtonStyle.Success,
				type: ComponentType.Button,
				customId: `${counts}_acceptAppeal`,
				label: `Accept (${accepters.size}/${NEEDED_ACCEPT})`,
				disabled: rejecters.size >= NEEDED_REJECT || accepters.size >= NEEDED_ACCEPT,
			} as const,
			{
				style: ButtonStyle.Danger,
				type: ComponentType.Button,
				customId: `${counts}_rejectAppeal`,
				label: `Reject (${rejecters.size}/${NEEDED_REJECT})`,
				disabled: rejecters.size >= NEEDED_REJECT || accepters.size >= NEEDED_ACCEPT,
			} as const,
		],
		type: ComponentType.ActionRow,
	};
}
