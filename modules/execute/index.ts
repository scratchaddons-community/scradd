import type {
	ApplicationCommandSubCommand,
	Awaitable,
	ChatInputCommandInteraction,
} from "discord.js";

import {
	ApplicationCommand,
	ApplicationCommandOptionType,
	ApplicationCommandType,
	MessageMentions,
} from "discord.js";
import { commands, defineChatCommand, defineEvent } from "strife.js";

import config from "../../common/config.js";
import constants from "../../common/constants.js";
import { mentionChatCommand } from "../../util/discord.js";
import tryCensor, { badWordsAllowed } from "../automod/misc.js";
import warn from "../punishments/warn.js";
import { OPERATION_PREFIX, parseArguments, splitFirstArgument } from "./misc.js";
import {
	getHelpForOperation,
	getSchemasFromInteraction,
	listOperations,
} from "./operations/help.js";
import hasPermission, { handleCommandPermissionUpdate } from "./permissions.js";
import { getAllSchemas } from "./util.js";

defineChatCommand(
	{
		name: "execute",
		description: "Make me do something…",
		censored: false,
		options: {
			operation: {
				type: ApplicationCommandOptionType.String,
				description: "The operation to execute",
				required: true,
			},
		},
		access: true,
	},
	async (interaction, { operation }) => {
		const [commandName, args] = splitFirstArgument(operation);

		const match = MessageMentions.UsersPattern.exec(commandName);
		if (match?.index === 0) {
			return await interaction.reply({
				ephemeral: true,
				content: `${constants.emojis.statuses.no} I said “some*thing*” not “some*one*”-`,
			});
		}

		const allSchemas = await getAllSchemas(interaction.guild);
		const schema = allSchemas.find(({ name }) => name === commandName);
		const command =
			commands[commandName]?.[0] ?? (!(schema instanceof ApplicationCommand) && schema);
		if (!command || !schema) {
			return await interaction.reply({
				ephemeral: true,
				content: `${constants.emojis.statuses.no} Could not find the \`${OPERATION_PREFIX}${commandName}\` operation!`,
				embeds: [await listOperations(await getSchemasFromInteraction(interaction))],
			});
		}

		const permission = await hasPermission(
			schema,
			interaction.member ?? interaction.user,
			interaction.channel ?? undefined,
		);
		if (!permission) {
			return await interaction.reply({
				ephemeral: true,
				content: `${constants.emojis.statuses.no} You don’t have permission to execute the \`${OPERATION_PREFIX}${commandName}\` operation!`,
			});
		}

		const options =
			("type" in schema ? schema.type : ApplicationCommandType.ChatInput) !==
				ApplicationCommandType.ChatInput ||
			(await parseArguments(args, schema.options ?? []));
		if (options === true || (options && options.options === true))
			return await interaction.reply({
				ephemeral: true,
				content: `${constants.emojis.statuses.no} The \`${await mentionChatCommand(
					commandName,
					interaction.guild ?? undefined,
				)}\` command is not supported as an operation!`,
			});
		if (options === false) {
			return await interaction.reply({
				ephemeral: true,
				content: `${constants.emojis.statuses.no} Invalid options!`,
				embeds: [getHelpForOperation(schema, await getSchemasFromInteraction(interaction))],
			});
		}
		if (options.options === false) {
			return await interaction.reply({
				ephemeral: true,
				content: `${constants.emojis.statuses.no} Invalid options!`,
				embeds: [
					getHelpForOperation(
						(schema.options ?? []).find(
							(option): option is ApplicationCommandSubCommand =>
								option.type == ApplicationCommandOptionType.Subcommand &&
								option.name === options.subcommand,
						) ?? schema,
						await getSchemasFromInteraction(interaction),
						schema.name,
					),
				],
			});
		}

		const shouldCensor =
			interaction.guild?.id === config.guild.id &&
			(command.censored === "channel" ?
				!badWordsAllowed(interaction.channel)
			:	(command.censored ?? true));
		const censoredOptions = shouldCensor && tryCensor(operation);
		if (censoredOptions && censoredOptions.strikes) {
			await interaction.reply({
				ephemeral: true,
				content: `${constants.emojis.statuses.no} Please ${
					censoredOptions.strikes < 1 ? "don’t say that here" : "watch your language"
				}!`,
			});
			await warn(
				interaction.user,
				censoredOptions.words.length === 1 ? "Used a banned word" : "Used banned words",
				censoredOptions.strikes,
				`Used command \`${interaction.toString()}\``,
			);
			return;
		}

		await (
			command.command as (
				interaction: ChatInputCommandInteraction,
				options: object,
			) => Awaitable<void>
		)(interaction, options);
	},
);

defineEvent("applicationCommandPermissionsUpdate", handleCommandPermissionUpdate);
