import {SlashCommandBuilder} from "@discordjs/builders"
import type { CacheType, CommandInteraction } from "discord.js";

type ComandInfo = {
	command: Omit<SlashCommandBuilder, "addSubcommand" | "addSubcommandGroup">
	onInteraction: (interaction: CommandInteraction<CacheType>) => (Promise<void>|void)
}

export default ComandInfo
