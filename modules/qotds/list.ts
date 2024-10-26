import {
	ButtonStyle,
	ComponentType,
	GuildMember,
	type AnySelectMenuInteraction,
	type ButtonInteraction,
	type ChatInputCommandInteraction,
} from "discord.js";
import config from "../../common/config.js";
import constants from "../../common/constants.js";
import { disableComponents, paginate } from "strife.js";
import { truncateText } from "../../util/text.js";
import { ignoredDeletions } from "../logging/messages.js";
import { Question, questions } from "./send.js";

export async function listQuestions(interaction: ChatInputCommandInteraction): Promise<void> {
	const message = await interaction.deferReply({ ephemeral: true, fetchReply:true });

	await paginate(
		questions,
		({ question }) => question ?? "",
		(data) => message.edit(data),
		{
			title: "Upcoming QOTDs",
			singular: "QOTD",

			user: interaction.user,
			pageLength: 10,
			totalCount: questions.length,

			timeout: constants.collectorTime,
			color: constants.themeColor,

			generateComponents(filtered) {
				return [
					{
						type: ComponentType.StringSelect,
						customId: "_viewQuestion",
						placeholder: "View more information on a QOTD",

						options: filtered.map((question) => ({
							label: truncateText(question.question ?? "", 100),
							description:
								(question.description && truncateText(question.description, 100)) ??
								undefined,
							value: question._id ?? "",
						})),
					},
				];
			},
		},
	);
}

export async function viewQuestion(interaction: AnySelectMenuInteraction): Promise<void> {
	if (
		!(interaction.member instanceof GuildMember ?
			interaction.member.roles.resolve(config.roles.exec.id)
		:	interaction.member?.roles.includes(config.roles.exec.id))
	) {
		await interaction.reply({
			ephemeral: true,
			content: `${constants.emojis.statuses.no} You don’t have permission to view this QOTD!`,
		});
		return;
	}

	const [id] = interaction.values;
	const question = await Question.findById(id).exec();
	await interaction.reply(
		question ?
			{
				ephemeral: true,
				embeds: [
					{
						color: constants.themeColor,
						title: question.question ?? undefined,
						description: question.description ?? undefined,
					},
				],
				components: [
					{
						type: ComponentType.ActionRow,
						components: [
							{
								customId: (question._id ?? "") + "_removeQuestion",
								type: ComponentType.Button,
								label: "Remove",
								style: ButtonStyle.Danger,
							},
							// TODO: edit?
						],
					},
				],
			}
		:	{
				ephemeral: true,
				content: `${constants.emojis.statuses.no} Could not find that QOTD! Was it deleted?`,
			},
	);
}

export async function removeQuestion(interaction: ButtonInteraction, id = ""): Promise<void> {
	if (
		!(interaction.member instanceof GuildMember ?
			interaction.member.roles.resolve(config.roles.exec.id)
		:	interaction.member?.roles.includes(config.roles.exec.id))
	) {
		await interaction.reply({
			ephemeral: true,
			content: `${constants.emojis.statuses.no} You don’t have permission to remove this QOTD!`,
		});
		return;
	}

	const message = await interaction.reply({
		fetchReply: true,
		content: "🗑 Are you sure you want to remove this QOTD?",
		embeds: interaction.message.flags.has("Ephemeral") ? interaction.message.embeds : [],
		components: [
			{
				type: ComponentType.ActionRow,
				components: [
					{
						type: ComponentType.Button,
						label: "Delete",
						style: ButtonStyle.Danger,
						customId: "confirm",
					},
					{
						type: ComponentType.Button,
						label: "Cancel",
						customId: "cancel",
						style: ButtonStyle.Secondary,
					},
				],
			},
		],
	});
	message
		.createMessageComponentCollector({
			componentType: ComponentType.Button,
			filter: (buttonInteraction) => interaction.user.id === buttonInteraction.user.id,
			max: 1,
			time: constants.collectorTime,
		})
		.on("collect", async (buttonInteraction) => {
			if (buttonInteraction.customId === "cancel") {
				ignoredDeletions.add(message.id);
				await message.delete();
			} else {
				await Question.findByIdAndDelete(id).exec();

				const index = questions.findIndex((question) => question._id === id);
				if (index !== -1) questions.splice(index, 1);
				await message.edit({
					content: `${constants.emojis.statuses.yes} Removed QOTD!`,
					components: [],
				});

				await interaction.message.edit({
					components: disableComponents(interaction.message.components),
				});
			}

			await buttonInteraction.deferUpdate();
		});

	return;
}
