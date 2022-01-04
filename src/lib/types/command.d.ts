import { SlashCommandBuilder } from "@discordjs/builders";
import type { CacheType, CommandInteraction } from "discord.js";

type ComandInfo = {
	data: Omit<SlashCommandBuilder, "addSubcommand" | "addSubcommandGroup" | "name">;
	interaction: (interaction: CommandInteraction<CacheType>) => Promise<void> | void;
};

export default ComandInfo;
