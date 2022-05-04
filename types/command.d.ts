import type { SlashCommandBuilder, SlashCommandSubcommandsOnlyBuilder } from "@discordjs/builders";
import type { CommandInteraction, ApplicationCommandPermissionData } from "discord.js";

type ComandInfo = {
	/** Pass `true` to ignore bad words in this command's options. */
	uncensored?: boolean = false;
	/**
	 * A builder instance that has constructed the command.
	 *
	 * @throws {Error} An error is thrown if `.setName` is called on this builder - the file name is used.
	 */
	data: Command;
	/**
	 * Pass `true` to make this a global command. This has the side effect of allowing the command
	 * to be used in DMs.
	 */
	dm?: boolean = false;
	/** Pass `false` to disable this command. */
	apply?: boolean = true;
	/** A function that processes interactions to this command. */
	interaction: (interaction: CommandInteraction) => Promise<void> | void;
};

export default ComandInfo;
export type Command =
	| import("@discordjs/builders").SlashCommandSubcommandsOnlyBuilder
	| Omit<
			import("@discordjs/builders").SlashCommandBuilder,
			"addSubcommand" | "addSubcommandGroup"
	  >;
