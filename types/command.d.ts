import { SlashCommandBuilder } from "@discordjs/builders";
import type { CommandInteraction } from "discord.js";

type ComandInfo = {
	data:
		| SlashCommandSubcommandsOnlyBuilder
		| Omit<SlashCommandBuilder, "addSubcommand" | "addSubcommandGroup">;
	interaction: (interaction: CommandInteraction) => Promise<void> | void;
};

export default ComandInfo;
