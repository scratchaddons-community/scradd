import { SlashCommandBuilder } from "@discordjs/builders";
import type { CacheType, CommandInteraction } from "discord.js";

type ComandInfo = {
	data:
		| SlashCommandSubcommandsOnlyBuilder
		| Omit<SlashCommandBuilder, "addSubcommand" | "addSubcommandGroup">;
	interaction: (interaction: CommandInteraction<CacheType>) => Promise<void> | void;
};

export default ComandInfo;
