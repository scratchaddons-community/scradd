import {
	ApplicationCommand,
	ApplicationCommandOptionType,
	ApplicationCommandType,
	MessageMentions,
} from "discord.js";
import { commands, defineChatCommand, defineEvent } from "strife.js";
import { OPERATION_PREFIX, parseArguments, splitFirstArgument } from "./misc.js";
import constants from "../../common/constants.js";
import config from "../../common/config.js";
import tryCensor, { badWordsAllowed } from "../automod/misc.js";
import warn from "../punishments/warn.js";
import hasPermission, { handleCommandPermissionUpdate } from "./permissions.js";
import { getAllSchemas } from "./util.js";
import { mentionChatCommand } from "../../util/discord.js";

const fullPingRegex = new RegExp(`^${MessageMentions.UsersPattern.source}$`);

defineChatCommand(
	{
		name: "do",
		description: "Make me do something…",
		censored: false,
		options: {
			operation: {
				type: ApplicationCommandOptionType.String,
				description: "The operation to do",
				required: true,
			},
		},
	},
	async (interaction, { operation }) => {
		const [commandName, args] = splitFirstArgument(operation);
		if (fullPingRegex.test(commandName)) {
			return await interaction.reply({
				ephemeral: true,
				content: `${constants.emojis.statuses.no} I said “some*thing*” not “some*one*”-`,
			});
		}

		const allSchemas = await getAllSchemas(interaction.guild);
		const schema = allSchemas.find(({ name }) => name === commandName);
		const command =
			commands[commandName]?.[0] || (!(schema instanceof ApplicationCommand) && schema);
		if (!command || !schema) {
			return await interaction.reply({
				ephemeral: true,
				content: `${constants.emojis.statuses.no} Could not find the \`${OPERATION_PREFIX}${commandName}\` operation!`,
			});
		}

		const options =
			("type" in schema ? schema.type : ApplicationCommandType.ChatInput) !==
				ApplicationCommandType.ChatInput ||
			(await parseArguments(args, schema.options ?? []));
		if (options === false) {
			return await interaction.reply({
				ephemeral: true,
				content: `${constants.emojis.statuses.no} Invalid options!`, // todo show help
			});
		}
		if (options === true)
			return await interaction.reply({
				ephemeral: true,
				content: `${constants.emojis.statuses.no} The \`${await mentionChatCommand(
					commandName,
					interaction.guild ?? undefined,
				)}\` command is not supported as an operation!`,
			});

		const permission = await hasPermission(
			schema,
			interaction.inCachedGuild()
				? interaction.member
				: interaction.inRawGuild()
				? { ...interaction.member, id: interaction.user.id }
				: interaction.user,
			interaction.channel || undefined,
		);
		if (!permission) {
			return await interaction.reply({
				ephemeral: true,
				content: `${constants.emojis.statuses.no} You don’t have permission to do the \`${OPERATION_PREFIX}${commandName}\` operation!`,
			});
		}

		const shouldCensor =
			interaction.guild?.id === config.guild.id &&
			(command.censored === "channel"
				? !badWordsAllowed(interaction.channel)
				: command.censored ?? true);
		const censoredOptions = shouldCensor && tryCensor(operation);
		if (censoredOptions && censoredOptions.strikes) {
			await interaction.reply({
				ephemeral: true,
				content: `${constants.emojis.statuses.no} ${
					censoredOptions.strikes < 1 ? "That’s not appropriate" : "Language"
				}!`,
			});
			await warn(
				interaction.user,
				"Please watch your language!",
				censoredOptions.strikes,
				`Used command \`${interaction.toString()}\``,
			);
			return;
		}

		// eslint-disable-next-line @typescript-eslint/ban-types
		await (command.command as Function)(interaction, options);
	},
);

defineEvent("applicationCommandPermissionsUpdate", handleCommandPermissionUpdate);
