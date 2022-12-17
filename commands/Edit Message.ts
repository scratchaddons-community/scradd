import {
	ApplicationCommandType,
	ButtonStyle,
	ComponentType,
	MessageType,
	ModalSubmitInteraction,
	TextInputStyle,
} from "discord.js";
import CONSTANTS from "../common/CONSTANTS.js";
import log, { getLoggingThread } from "../common/logging.js";
import { defineCommand } from "../common/types/command.js";
import { getBaseChannel, getMessageJSON } from "../util/discord.js";
import { generateError } from "../util/logError.js";
import jsonDiff from "json-diff";
import diffLib from "difflib";
import { DATABASE_THREAD } from "../common/database.js";
const databaseThread = await getLoggingThread(DATABASE_THREAD);

const command = defineCommand({
	data: {
		type: ApplicationCommandType.Message,
		restricted: true,
	},

	async interaction(interaction) {
		if (
			interaction.targetMessage.type !== MessageType.Default ||
			[
				CONSTANTS.channels.board?.id,
				CONSTANTS.channels.modmail?.id,
				CONSTANTS.channels.old_suggestions?.id,
			].includes(interaction.channel?.id) ||
			(CONSTANTS.channels.modlogs?.id === getBaseChannel(interaction.channel)?.id &&
				databaseThread.id !== interaction.channel?.id)
		)
			return await interaction.reply({
				ephemeral: true,
				content: `${CONSTANTS.emojis.statuses.no} Can not edit this message!`,
			});

		const pre =
			JSON.stringify(getMessageJSON(interaction.targetMessage), null, "  ").match(
				/.{1,4000}/gsy,
			) || [];
		await interaction.showModal({
			title: "Edit Message",
			customId: `edit.${interaction.targetMessage.id}`,
			components: [
				{
					type: ComponentType.ActionRow,
					components: [
						{
							customId: "json1",
							label: "JSON #1",
							style: TextInputStyle.Paragraph,
							type: ComponentType.TextInput,
							value: pre[0],
						},
					],
				},
				{
					type: ComponentType.ActionRow,
					components: [
						{
							customId: "json2",
							label: "JSON #2 (concatenated with the above)",
							style: TextInputStyle.Paragraph,
							type: ComponentType.TextInput,
							required: false,
							value: pre[1],
						},
					],
				},
			],
		});
	},
});
export default command;

export async function edit(interaction: ModalSubmitInteraction) {
	const text =
		interaction.fields.getTextInputValue("json1") +
		interaction.fields.getTextInputValue("json2");
	const json = await new Promise((resolve) => resolve(JSON.parse(text))).catch((error) => {
		interaction.reply({
			ephemeral: true,
			content: `${CONSTANTS.emojis.statuses.no} An error occurred while parsing the JSON.`,
			files: [
				{
					attachment: Buffer.from(
						JSON.stringify(
							{ ...generateError(error, true), stack: undefined },
							null,
							"  ",
						),
						"utf-8",
					),
					name: "error.json",
				},
				{ attachment: Buffer.from(text, "utf-8"), name: "json.json" },
			],
		});
	});
	if (!json) return;
	const message = await interaction.channel?.messages.fetch(
		interaction.customId.split(".")[1] || "",
	);
	const edited = await message?.edit(json).catch((error) => {
		interaction.reply({
			ephemeral: true,
			content: `${CONSTANTS.emojis.statuses.no} An error occurred while editing the message.`,
			files: [
				{
					attachment: Buffer.from(
						JSON.stringify({ ...generateError(error, true) }, null, "  "),
						"utf-8",
					),
					name: "error.json",
				},
				{ attachment: Buffer.from(text, "utf-8"), name: "json.json" },
			],
		});
	});

	if (!message || !edited) return;

	await interaction.reply({
		content: `${CONSTANTS.emojis.statuses.yes} Successfully edited message!`,
		ephemeral: true,
	});

	const files = [];
	const contentDiff =
		message?.content !== null &&
		diffLib
			.unifiedDiff((message?.content ?? "").split("\n"), edited.content.split("\n"))
			.join("\n");

	const extraDiff = jsonDiff.diffString(
		{ ...getMessageJSON(message), content: undefined },
		{ ...getMessageJSON(edited), content: undefined },
		{ color: false },
	);

	if (contentDiff)
		files.push({
			attachment: Buffer.from(
				contentDiff.replace(/^--- \n{2}\+\+\+ \n{2}@@ .+ @@\n{2}/, ""),
				"utf-8",
			),
			name: "content.diff",
		});

	if (extraDiff)
		files.push({
			attachment: Buffer.from(extraDiff, "utf-8"),
			name: "extra.diff",
		});

	if (files.length)
		log(
			`✏ Message by ${edited.author.toString()} in ${edited.channel.toString()} edited by ${interaction.user.toString()}!`,
			"messages",
			{
				files,
				components: [
					{
						type: ComponentType.ActionRow,
						components: [
							{
								type: ComponentType.Button,
								label: "View Message",
								style: ButtonStyle.Link,
								url: edited.url,
							},
						],
					},
				],
			},
		);
}
