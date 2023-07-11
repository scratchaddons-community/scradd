import {
	type CacheType,
	ChatInputCommandInteraction,
	ComponentType,
	ModalSubmitInteraction,
	TextInputStyle,
	User,
} from "discord.js";
import { client } from "strife.js";
import constants from "../../common/constants.js";
import { generateError } from "../../common/logError.js";

export default async function getCode(interaction: ChatInputCommandInteraction<"cached" | "raw">) {
	const { owner } = await client.application.fetch();
	const owners =
		owner instanceof User ? [owner.id] : [...(owner?.members.map((member) => member.id) ?? [])];
	if (process.env.NODE_ENV === "production" && !owners.includes(interaction.user.id))
		return await interaction.reply({
			ephemeral: true,
			content: `${constants.emojis.statuses.no} This command is reserved for ${
				process.env.NODE_ENV === "production"
					? owner instanceof User
						? owner.displayName
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
	const code = interaction.fields.getTextInputValue("code").trim();
	try {
		const output = await eval(
			`(async () => {${
				code.includes("\n") || code.includes("return") ? code : `return ${code}`
			}})()`,
		);
		const type = typeof output;
		await interaction.editReply({
			files: [
				{ attachment: Buffer.from(code, "utf8"), name: "code.js" },
				{
					attachment: Buffer.from(
						["bigint", "symbol"].includes(type)
							? `"${output.toString().replaceAll('"', '\\"')}"`
							: type === "function"
							? output.toString()
							: type === "object"
							? JSON.stringify(output, undefined, "  ")
							: type === "undefined"
							? "undefined"
							: output.toString(),
						"utf8",
					),
					name: `output.${
						"string" === type ? "txt" : "function" === type ? "js" : "json"
					}`,
				},
			],
		});
	} catch (error) {
		await interaction.editReply({
			files: [
				{ attachment: Buffer.from(code, "utf8"), name: "code.js" },
				{ attachment: Buffer.from(generateError(error), "utf8"), name: "error.json" },
			],
		});
	}
}
