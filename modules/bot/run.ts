import {
	ComponentType,
	TextInputStyle,
	User,
	type ChatInputCommandInteraction,
	type InteractionResponse,
	type ModalSubmitInteraction,
} from "discord.js";
import { client } from "strife.js";
import constants from "../../common/constants.js";
import { stringifyError } from "../logging/errors.js";
import { ignoredDeletions } from "../logging/messages.js";

const censoredToken = client.token
	.split(".")
	.map((section, index) => (index > 1 ? "*".repeat(section.length) : section))
	.join(".");

export default async function getCode(
	interaction: ChatInputCommandInteraction<"cached" | "raw">,
): Promise<InteractionResponse | undefined> {
	const { owner } = await client.application.fetch();
	const owners =
		owner instanceof User ? [owner.id] : owner?.members.map((member) => member.id) ?? [];
	if (process.env.NODE_ENV === "production" && !owners.includes(interaction.user.id))
		return await interaction.reply({
			ephemeral: true,
			content: `${constants.emojis.statuses.no} This command is reserved for ${
				owner instanceof User ? owner.displayName : "the " + owner?.name + " team"
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
						label: "Code to run",
						required: true,
						customId: "code",
					},
				],
			},
		],
	});
}

export async function run(interaction: ModalSubmitInteraction): Promise<void> {
	await interaction.deferReply();
	const code = interaction.fields.getTextInputValue("code").trim();
	try {
		const output: unknown = await eval(
			"(async () => {\n" +
				(code.includes("\n") || code.includes("return") ? code : `return ${code}`) +
				"\n;})()",
		);

		const stringifiedOutput =
			typeof output === "bigint" || typeof output === "symbol" ?
				// eslint-disable-next-line unicorn/string-content
				`"${output.toString().replaceAll('"', String.raw`\"`)}"`
			: output === undefined ? "undefined"
			: typeof output === "object" ? JSON.stringify(output, undefined, "  ")
				// eslint-disable-next-line @typescript-eslint/no-base-to-string
			: output.toString();

		await interaction.editReply({
			files: [
				{ attachment: Buffer.from(code, "utf8"), name: "code.js" },
				{
					attachment: Buffer.from(
						stringifiedOutput.replaceAll(client.token, censoredToken),
						"utf8",
					),
					name: `output.${
						"string" === typeof output ? "txt"
						: "function" === typeof output ? "js"
						: "json"
					}`,
				},
			],
		});
	} catch (error) {
		await interaction.editReply({
			files: [
				{ attachment: Buffer.from(code, "utf8"), name: "code.js" },
				{ attachment: Buffer.from(stringifyError(error), "utf8"), name: "error.json" },
			],
		});
	}

	const pingMessage = await interaction.followUp(interaction.user.toString());
	ignoredDeletions.add(pingMessage.id);
	await pingMessage.delete();
}
