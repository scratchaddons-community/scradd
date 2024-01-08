import {
	type ApplicationCommand,
	ApplicationCommandOptionType,
	ApplicationCommandType,
	Collection,
	type GuildResolvable,
	ApplicationCommandPermissionType,
	GuildMember,
	PermissionsBitField,
	MessageMentions,
} from "discord.js";
import { commands, defineChatCommand } from "strife.js";
import { parseArguments, splitFirstArgument } from "./misc.js";
import constants from "../../common/constants.js";
import config from "../../common/config.js";
import tryCensor, { badWordsAllowed } from "../automod/misc.js";
import warn from "../punishments/warn.js";

const OPERATION_PREFIX = "~ ";

const commandSchemas = new Collection<
	string,
	ApplicationCommand<object | { guild: GuildResolvable }>
>();
const fullPingRegex = new RegExp(`^${MessageMentions.UsersPattern.source}$`);

defineChatCommand(
	{
		name: "do",
		description: "Make me do something…",
		censored: false,
		access: true,
		options: {
			operation: {
				type: ApplicationCommandOptionType.String,
				description: "The operation to do",
				required: true,
			},
		},
	},
	async (interaction, { operation }) => {
		if (!commandSchemas.size) {
			const globalCommands = await interaction.client.application.commands.fetch();
			const guildCommands = (await interaction.guild?.commands.fetch()) ?? new Collection();
			// eslint-disable-next-line unicorn/prefer-spread
			for (const [, command] of globalCommands.concat(guildCommands)) {
				commandSchemas.set(command.name, command);
			}
		}

		const [commandName, args] = splitFirstArgument(operation.replace(/^~\s+/, ""));
		if (fullPingRegex.test(commandName)) {
			return await interaction.reply({
				ephemeral: true,
				content: `${constants.emojis.statuses.no} I said “some*thing*” not “some*one*”-`,
			});
		}

		const commandData = commands[commandName]?.[0];
		const commandSchema = commandSchemas.get(commandName);

		if (!commandData || !commandSchema) {
			return await interaction.reply({
				ephemeral: true,
				content: `${constants.emojis.statuses.no} Could not find the \`${OPERATION_PREFIX}${commandName}\` operation!`,
			});
		}

		const isInGuild = interaction.inGuild();
		const admin =
			isInGuild &&
			(interaction.member instanceof GuildMember
				? interaction.member.permissions
				: new PermissionsBitField(BigInt(interaction.member.permissions))
			).has("Administrator");
		const defaultPermission = isInGuild
			? admin || !commandData.restricted
			: commandSchema.dmPermission ?? false;

		const permissions =
			(isInGuild &&
				(await commandSchema.permissions
					.fetch({ guild: interaction.guild })
					.catch(() => void 0))) ||
			[];
		const channelPermission =
			admin ||
			(permissions.find(
				({ id, type }) =>
					type === ApplicationCommandPermissionType.Channel &&
					id === interaction.channel?.id,
			)?.permission ??
				true);
		const userPermission =
			admin ||
			(permissions.find(
				({ id, type }) =>
					type === ApplicationCommandPermissionType.User && id === interaction.user.id,
			)?.permission ??
				true);
		const rolePermissions = permissions.filter(
			({ id, type }) =>
				type === ApplicationCommandPermissionType.Role &&
				(interaction.member instanceof GuildMember
					? interaction.member.roles.resolve(id)
					: interaction.member?.roles.includes(id)),
		);
		const rolePermission =
			admin ||
			(rolePermissions.length
				? rolePermissions.some(({ permission }) => permission)
				: defaultPermission);

		if (!channelPermission || !userPermission || !rolePermission) {
			return await interaction.reply({
				ephemeral: true,
				content: `${constants.emojis.statuses.no} You don’t have permission to do the \`${OPERATION_PREFIX}${commandName}\` operation!`,
			});
		}

		const shouldCensor =
			interaction.guild?.id === config.guild.id &&
			(commandData.censored === "channel"
				? !badWordsAllowed(interaction.channel)
				: commandData.censored ?? true);
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

		const options =
			commandSchema.type !== ApplicationCommandType.ChatInput ||
			(await parseArguments(args, commandSchema.options));
		if (options === true)
			return await interaction.reply({
				ephemeral: true,
				content: `${constants.emojis.statuses.no} The \`${commandName}\` command is not supported as an operation!`, // todo mention it
			});
		if (options === false) {
			return await interaction.reply({
				ephemeral: true,
				content: `${constants.emojis.statuses.no} Invalid options!`, // todo show help
			});
		}

		// eslint-disable-next-line @typescript-eslint/ban-types
		await (commandData.command as Function)(interaction, options);
	},
);
