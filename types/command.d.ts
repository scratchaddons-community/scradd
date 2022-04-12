import type { SlashCommandBuilder, SlashCommandSubcommandsOnlyBuilder } from "@discordjs/builders";
import type { CommandInteraction, ApplicationCommandPermissionData } from "discord.js";

type ComandInfo = {
	permissions?: ApplicationCommandPermissionData[] | "DM";
	data: Command;
	apply?: boolean;
	interaction: (interaction: CommandInteraction) => Promise<void> | void;
};

export default ComandInfo;
export type Command =
	| import("@discordjs/builders").SlashCommandSubcommandsOnlyBuilder
	| Omit<
			import("@discordjs/builders").SlashCommandBuilder,
			"addSubcommand" | "addSubcommandGroup"
	  >;
