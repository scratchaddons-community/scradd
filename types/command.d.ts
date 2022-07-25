import type { SlashCommandBuilder, SlashCommandSubcommandsOnlyBuilder } from "@discordjs/builders";
import type { CommandInteraction } from "discord.js";

type ComandInfo = {
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
