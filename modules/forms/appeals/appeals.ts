import {
	ComponentType,
	MessageMentions,
	TextInputStyle,
	type ButtonInteraction,
	type ModalSubmitInteraction,
} from "discord.js";
import { escapeAllMarkdown, client } from "strife.js";
import config, { getInitialThreads } from "../../../common/config.js";
import constants from "../../../common/constants.js";
import { getAllMessages } from "../../../util/discord.js";
import { LoggingEmojis } from "../../logging/util.js";
import generateAppeal, { NEEDED_ACCEPT, NEEDED_REJECT, parseIds } from "./generate-appeal.js";

export const appealThread =
	getInitialThreads(config.channels.mod, "Ban Appeal Forms").first() ??
	(await config.channels.mod.threads.create({
		name: "Ban Appeal Forms",
		reason: "For ban appeal forms",
	}));
const appeals = Object.fromEntries(
	(await getAllMessages(appealThread))
		.filter((message) => message.author.id === client.user.id && message.embeds.length)
		.map((message) => {
			const decision = message.embeds[1]?.title;
			return [
				message.embeds[0]?.description ?? "",
				{
					unbanned: decision === "Accepted",
					note: message.embeds[1]?.fields.find(
						(field) => field.name == `${decision ?? ""} Note`,
					)?.value,
					date: new Date(message.createdTimestamp + 691_200_000).toDateString(),
				},
			];
		}),
);
export default appeals;

export async function confirmAcceptAppeal(
	interaction: ButtonInteraction,
	counts: string,
): Promise<void> {
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
		title: "Accept Ban Appeal (user may see the reason)",
	});
}
export async function confirmRejectAppeal(
	interaction: ButtonInteraction,
	counts: string,
): Promise<void> {
	const value = interaction.message.embeds[1]?.fields.find(
		(field) => field.name == "Rejected Note",
	)?.value;
	await interaction.showModal({
		components: [
			{
				components: [
					{
						customId: "note",
						label: "Why shouldn’t they be unbanned?",
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
		title: "Reject Ban Appeal (user may see the reason)",
	});
}
export async function submitAcceptAppeal(
	interaction: ModalSubmitInteraction,
	ids: string,
): Promise<void> {
	const users = parseIds(ids);
	await interaction.reply({
		content: `${
			LoggingEmojis.Punishment
		} ${interaction.user.toString()} accepted the ban appeal.`,
		ephemeral: users.accepters.has(interaction.user.id),
	});
	users.accepters.add(interaction.user.id);
	users.rejecters.delete(interaction.user.id);

	const note = escapeAllMarkdown(interaction.fields.getTextInputValue("note"));
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
		const unbanned = await config.guild.bans
			.remove(
				MessageMentions.UsersPattern.exec(mention)?.[1] ?? "",
				`Appealed ban` +
					(interaction.message ? ` - see ${interaction.message.url} for context` : ""),
			)
			.then(() => true)
			.catch(() => false);
		appeals[mention] = { unbanned: true, note, date: new Date().toISOString() };
		await interaction.message?.reply(
			`${constants.emojis.statuses[unbanned ? "yes" : "no"]} ${mention} has ${
				unbanned ? "" : "already "
			}been unbanned.`,
		);
	}
}
export async function submitRejectAppeal(
	interaction: ModalSubmitInteraction,
	ids: string,
): Promise<void> {
	const users = parseIds(ids);
	await interaction.reply({
		content: `${
			LoggingEmojis.Punishment
		} ${interaction.user.toString()} rejected the ban appeal.`,
		ephemeral: users.rejecters.has(interaction.user.id),
	});
	users.rejecters.add(interaction.user.id);
	users.accepters.delete(interaction.user.id);

	const note = escapeAllMarkdown(interaction.fields.getTextInputValue("note"));
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
		await interaction.message?.reply(
			`${constants.emojis.statuses.yes} ${mention} will not be unbanned.`,
		);
	}
}
