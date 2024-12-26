import type {
	InteractionResponse,
	MessageContextMenuCommandInteraction,
	ModalSubmitInteraction,
} from "discord.js";

import { unifiedDiff } from "difflib";
import { ComponentType, TextInputStyle } from "discord.js";
import { getBaseChannel, getMessageJSON, stringifyError } from "strife.js";

import config from "../../common/config.ts";
import constants from "../../common/constants.ts";
import { databaseThread } from "../../common/database.ts";
import { chatThread } from "../autos/chat.ts";
import log, { shouldLog } from "../logging/misc.ts";
import { LoggingEmojis, LogSeverity } from "../logging/util.ts";

export default async function editMessage(
	interaction: MessageContextMenuCommandInteraction,
): Promise<InteractionResponse | undefined> {
	if (
		!interaction.targetMessage.editable ||
		interaction.targetMessage.interactionMetadata ||
		chatThread?.id === interaction.channel?.id ||
		config.channels.board?.id === interaction.channel?.id ||
		(config.channels.modlogs.id === getBaseChannel(interaction.channel)?.id &&
			databaseThread.id !== interaction.channel?.id)
	)
		return await interaction.reply({
			content: `${constants.emojis.statuses.no} Can not edit this message!`,
			ephemeral: true,
		});

	const pre =
		JSON.stringify(await getMessageJSON(interaction.targetMessage), undefined, "  ").match(
			/.{1,4000}/gsy,
		) ?? [];
	await interaction.showModal({
		components: [
			{
				components: [
					{
						customId: "jsonOne",
						label: "JSON #1",
						style: TextInputStyle.Paragraph,
						type: ComponentType.TextInput,
						value: pre[0],
					},
				],

				type: ComponentType.ActionRow,
			},
			{
				components: [
					{
						customId: "jsonTwo",
						label: "JSON #2 (concatenated with the above)",
						style: TextInputStyle.Paragraph,
						type: ComponentType.TextInput,
						value: pre[1],
						required: false,
					},
				],

				type: ComponentType.ActionRow,
			},
		],

		customId: `${interaction.targetMessage.id}_edit`,
		title: "Edit Message",
	});
}

export async function submitEdit(interaction: ModalSubmitInteraction, id: string): Promise<void> {
	const text =
		interaction.fields.getTextInputValue("jsonOne") +
		interaction.fields.getTextInputValue("jsonTwo");
	const json = await new Promise((resolve) => {
		resolve(JSON.parse(text));
	}).catch(async (error: unknown) => {
		await interaction.reply({
			content: `${constants.emojis.statuses.no} An error occurred while parsing the JSON.`,
			ephemeral: true,

			files: [
				{ attachment: Buffer.from(stringifyError(error), "utf8"), name: "error.json" },
				{ attachment: Buffer.from(text, "utf8"), name: "json.json" },
			],
		});
	});
	if (!json) return;
	const message = await interaction.channel?.messages.fetch(id);
	if (!message) throw new TypeError("Used command in DM!");
	const oldJSON = await getMessageJSON(message);
	const edited = await message.edit(json).catch(async (error: unknown) => {
		await interaction.reply({
			ephemeral: true,
			content: `${constants.emojis.statuses.no} An error occurred while editing the message.`,

			files: [
				{ attachment: Buffer.from(stringifyError(error), "utf8"), name: "error.json" },
				{ attachment: Buffer.from(text, "utf8"), name: "json.json" },
			],
		});
	});

	if (!edited) return;

	await interaction.reply({
		content: `${constants.emojis.statuses.yes} Successfully edited message!`,
		ephemeral: true,
	});

	const files = [];
	const contentDiff = unifiedDiff(oldJSON.content.split("\n"), edited.content.split("\n"), {
		lineterm: "",
	})
		.join("\n")
		.replace(/^-{3} \n\+{3} \n/, "");
	const extraDiff = unifiedDiff(
		JSON.stringify({ ...oldJSON, content: undefined }, undefined, "  ").split("\n"),
		JSON.stringify(
			{ ...(await getMessageJSON(edited)), content: undefined },
			undefined,
			"  ",
		).split("\n"),
		{ lineterm: "" },
	)
		.join("\n")
		.replace(/^-{3} \n\+{3} \n/, "");

	if (contentDiff) files.push({ content: contentDiff, extension: "diff" });
	if (extraDiff) files.push({ content: extraDiff, extension: "diff" });

	if (!files.length) return;
	await log(
		`${LoggingEmojis.MessageEdit} [Message](<${
			edited.url
		}>) by ${edited.author.toString()} in ${edited.channel.toString()} edited by ${interaction.user.toString()}`,
		(interaction.guild?.id !== config.guild.id && interaction.guild?.publicUpdatesChannel) ||
			LogSeverity.ServerChange,
		{
			files:
				interaction.guild?.id !== config.guild.id || shouldLog(edited.channel) ? files : [],
		},
	);
}
