import { unifiedDiff } from "difflib";
import {
	ComponentType,
	TextInputStyle,
	type InteractionResponse,
	type MessageContextMenuCommandInteraction,
	type ModalSubmitInteraction,
} from "discord.js";
import config from "../../common/config.js";
import constants from "../../common/constants.js";
import { databaseThread } from "../../common/database.js";
import { getBaseChannel, getMessageJSON } from "../../util/discord.js";
import { generateError } from "../logging/errors.js";
import log, { LogSeverity, LoggingEmojis, shouldLog } from "../logging/misc.js";

export default async function editMessage(
	interaction: MessageContextMenuCommandInteraction,
): Promise<InteractionResponse | undefined> {
	if (
		!interaction.targetMessage.editable ||
		config.channels.board?.id === interaction.channel?.id ||
		(config.channels.modlogs?.id === getBaseChannel(interaction.channel)?.id &&
			databaseThread.id !== interaction.channel?.id)
	) {
		return await interaction.reply({
			content: `${constants.emojis.statuses.no} Can not edit this message!`,
			ephemeral: true,
		});
	}

	const pre =
		JSON.stringify(getMessageJSON(interaction.targetMessage), undefined, "  ").match(
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
				{
					attachment: Buffer.from(
						JSON.stringify(generateError(error), undefined, "  "),
						"utf8",
					),

					name: "error.json",
				},
				{ attachment: Buffer.from(text, "utf8"), name: "json.json" },
			],
		});
	});
	if (!json) return;
	const message = await interaction.channel?.messages.fetch(id);
	if (!message) throw new TypeError("Used command in DM!");
	const oldJSON = getMessageJSON(message);
	const edited = await message.edit(json).catch(async (error: unknown) => {
		await interaction.reply({
			ephemeral: true,
			content: `${constants.emojis.statuses.no} An error occurred while editing the message.`,

			files: [
				{
					attachment: Buffer.from(
						JSON.stringify(generateError(error), undefined, "  "),
						"utf8",
					),

					name: "error.json",
				},
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
		JSON.stringify({ ...getMessageJSON(edited), content: undefined }, undefined, "  ").split(
			"\n",
		),
		{ lineterm: "" },
	)
		.join("\n")
		.replace(/^-{3} \n\+{3} \n/, "");

	if (contentDiff) files.push({ content: contentDiff, extension: "diff" });
	if (extraDiff) files.push({ content: extraDiff, extension: "diff" });

	if (files.length) {
		await log(
			`${
				LoggingEmojis.MessageEdit
			} Message by ${edited.author.toString()} in ${edited.channel.toString()} (ID: ${
				edited.id
			}) edited by ${interaction.user.toString()}`,
			(interaction.guild?.id !== config.guild.id &&
				interaction.guild?.publicUpdatesChannel) ||
				LogSeverity.ServerChange,
			{
				buttons: [{ label: "Message", url: edited.url }],
				files:
					interaction.guild?.id !== config.guild.id || shouldLog(edited.channel) ?
						files
					:	[],
			},
		);
	}
}
