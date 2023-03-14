import { unifiedDiff } from "difflib";
import {
	ApplicationCommandType,
	ButtonStyle,
	ComponentType,
	MessageType,
	TextInputStyle,
	type MessageEditOptions,
} from "discord.js";
import { diffString } from "json-diff";

import CONSTANTS from "../common/CONSTANTS.js";
import { DATABASE_THREAD } from "../common/database.js";
import log, { getLoggingThread, shouldLog } from "../common/logging.js";
import { defineCommand } from "../common/types/command.js";
import { getBaseChannel, getMessageJSON } from "../util/discord.js";
import { generateError } from "../util/logError.js";

const databaseThread = await getLoggingThread(DATABASE_THREAD);

const command = defineCommand({
	data: { restricted: true, type: ApplicationCommandType.Message },

	async interaction(interaction) {
		if (
			interaction.targetMessage.type !== MessageType.Default ||
			!interaction.targetMessage.editable ||
			CONSTANTS.channels.board?.id === interaction.channel?.id ||
			(CONSTANTS.channels.modlogs?.id === getBaseChannel(interaction.channel)?.id &&
				databaseThread.id !== interaction.channel?.id)
		) {
			return await interaction.reply({
				content: `${CONSTANTS.emojis.statuses.no} Can not edit this message!`,
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
							customId: "json1",
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
							customId: "json2",
							label: "JSON #2 (concatenated with the above)",
							style: TextInputStyle.Paragraph,
							type: ComponentType.TextInput,
							value: pre[1],
						},
					],

					type: ComponentType.ActionRow,
				},
			],

			customId: `${interaction.targetMessage.id}_edit`,
			title: "Edit Message",
		});
	},

	modals: {
		async edit(interaction, id) {
			const text =
				interaction.fields.getTextInputValue("json1") +
				interaction.fields.getTextInputValue("json2");
			const json = await new Promise<MessageEditOptions>((resolve) => {
				resolve(JSON.parse(text));
			}).catch(async (error: unknown) => {
				await interaction.reply({
					content: `${CONSTANTS.emojis.statuses.no} An error occurred while parsing the JSON.`,
					ephemeral: true,

					files: [
						{
							attachment: Buffer.from(
								JSON.stringify(
									{ ...generateError(error, true), stack: undefined },
									undefined,
									"  ",
								),
								"utf8",
							),

							name: "error.json",
						},
						{ attachment: Buffer.from(text, "utf8"), name: "json.json" },
					],
				});
			});
			if (!json) return;
			const message = await interaction.channel?.messages.fetch(id ?? "");
			if (!message) throw new TypeError("Used command in DM!");
			const oldJSON = getMessageJSON(message);
			const edited = await message.edit(json).catch(async (error: unknown) => {
				await interaction.reply({
					ephemeral: true,
					content: `${CONSTANTS.emojis.statuses.no} An error occurred while editing the message.`,

					files: [
						{
							attachment: Buffer.from(
								JSON.stringify({ ...generateError(error, true) }, undefined, "  "),
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
				content: `${CONSTANTS.emojis.statuses.yes} Successfully edited message!`,
				ephemeral: true,
			});

			const files = [];
			const contentDiff = unifiedDiff(
				oldJSON.content.split("\n"),
				edited.content.split("\n"),
			).join("\n");

			const extraDiff = diffString(
				{ ...oldJSON, content: undefined },
				{ ...getMessageJSON(edited), content: undefined },
				{ color: false },
			);

			if (contentDiff) {
				files.push({
					attachment: Buffer.from(
						contentDiff.replace(/^--- \n{2}\+\+\+ \n{2}@@ .+ @@\n{2}/, ""),
						"utf8",
					),

					name: "content.diff",
				});
			}

			if (extraDiff) {
				files.push({ attachment: Buffer.from(extraDiff, "utf8"), name: "extra.diff" });
			}

			if (files.length > 0) {
				await log(
					`✏ Message by ${edited.author.toString()} in ${edited.channel.toString()} edited by ${interaction.user.toString()}!`,
					"messages",
					{
						components: [
							{
								components: [
									{
										label: "View Message",
										style: ButtonStyle.Link,
										type: ComponentType.Button,
										url: edited.url,
									},
								],

								type: ComponentType.ActionRow,
							},
						],

						files: shouldLog(edited.channel) ? files : [],
					},
				);
			}
		},
	},
});
export default command;
