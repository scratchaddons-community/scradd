import { ComponentType, TextInputStyle } from "discord.js";
import client from "../client.js";
import CONSTANTS from "../common/CONSTANTS.js";
import { defineCommand } from "../common/types/command.js";
import { generateError } from "../util/logError.js";

const redguy = await client.users.fetch("771422735486156811");

const command = defineCommand({
	data: {
		description: `(${
			process.env.NODE_ENV === "production" ? redguy.username : "Scradd dev"
		} only) Run code on Scradd`,

		restricted: true,
	},

	async interaction(interaction) {
		if (process.env.NODE_ENV === "production" && interaction.user.id !== redguy.id)
			return await interaction.reply({
				ephemeral: true,
				content: `${
					CONSTANTS.emojis.statuses.no
				} This command is reserved for ${redguy.toString()} only!`,
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
	},

	modals: {
		async run(interaction) {
			const code = interaction.fields.getTextInputValue("code");
			try {
				await interaction.reply({
					files: [
						{ attachment: Buffer.from(code, "utf8"), name: "code.js" },
						{
							attachment: Buffer.from(
								JSON.stringify(await eval(code), undefined, "  ") ?? "null",
								"utf8",
							),
							name: "output.json",
						},
					],
				});
			} catch (error) {
				await interaction.reply({
					files: [
						{ attachment: Buffer.from(code, "utf8"), name: "code.js" },
						{
							attachment: Buffer.from(generateError(error), "utf8"),
							name: "error.json",
						},
					],
				});
			}
		},
	},
});
export default command;
