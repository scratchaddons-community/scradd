import type { SlashCommandBuilder, SlashCommandSubcommandsOnlyBuilder } from "@discordjs/builders";
import type { CommandInteraction, ApplicationCommandPermissionData } from "discord.js";

type ComandInfo = {
	data: Command;
	dm?:boolean;
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
