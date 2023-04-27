import {
	CacheType,
	ChatInputCommandInteraction,
	ComponentType,
	ModalSubmitInteraction,
	TextInputStyle,
	User,
} from "discord.js";
import client from "../../client.js";
import CONSTANTS from "../../common/CONSTANTS.js";
import { generateError } from "../../util/logError.js";

export default async function getCode(interaction: ChatInputCommandInteraction<"cached" | "raw">) {
	const { owner } = await client.application.fetch();
	const owners =
		owner instanceof User
			? [owner.id]
			: [...(owner?.members.map((member) => member.user.id) ?? [])];
	if (process.env.NODE_ENV === "production" && !owners.includes(interaction.user.id))
		return await interaction.reply({
			ephemeral: true,
			content: `${CONSTANTS.emojis.statuses.no} This command is reserved for ${
				process.env.NODE_ENV === "production"
					? owner instanceof User
						? owner.username
						: "the " + owner?.name + " team"
					: "Scradd developers"
			} only!`,
		});

	await interaction.showModal({
		title: "Run Code",
		customId: "_run",
		components: [
			{
				type: ComponentType.ActionRow,
				components: [
					{
						type: ComponentType.TextInput,
						style: TextInputStyle.Paragraph,
						label: "Code To Run",
						required: true,
						customId: "code",
					},
				],
			},
		],
	});
}

export async function run(interaction: ModalSubmitInteraction<CacheType>) {
	await interaction.deferReply();
	const code = interaction.fields.getTextInputValue("code");
	const output = await eval(code);
	const type = typeof output;
	try {
		await interaction.editReply({
			files: [
				{ attachment: Buffer.from(code, "utf8"), name: "code.js" },
				{
					attachment: Buffer.from(
						["bigint", "symbol", "function"].includes(type)
							? `"${output}"`
							: type === "object"
							? JSON.stringify(output, undefined, "  ")
							: type === "undefined"
							? "undefined"
							: output.toString(),
						"utf8",
					),
					name: `output.${
						["bigint", "symbol", "function", "object"].includes(type) ? "json" : "txt"
					}`,
				},
			],
		});
	} catch (error) {
		await interaction.editReply({
			files: [
				{ attachment: Buffer.from(code, "utf8"), name: "code.js" },
				{
					attachment: Buffer.from(generateError(error), "utf8"),
					name: "error.json",
				},
			],
		});
	}
}
