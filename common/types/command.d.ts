import type {
	ChatInputCommandInteraction,
	ContextMenuCommandInteraction,
	AutocompleteInteraction,
	RESTPostAPIContextMenuApplicationCommandsJSONBody,
	RESTPostAPIChatInputApplicationCommandsJSONBody,
} from "discord.js";

export interface ContextMenuCommand {
	data: Omit<RESTPostAPIContextMenuApplicationCommandsJSONBody, "name">;

	/** A function that processes interactions to this command. */
	interaction: (interaction: ContextMenuCommandInteraction<"raw" | "cached">) => any;
}
export interface ChatInputCommand {
	/**
	 * Pass `false` to ignore bad words in this command’s options. Pass `"channel"` to only ignore bad words if the channel allows bad words.
	 *
	 * @default true
	 */
	censored?: boolean | "channel";
	data: Omit<RESTPostAPIChatInputApplicationCommandsJSONBody, "name" | "type">;

	/** A function that processes interactions to this command. */
	interaction: (interaction: ChatInputCommandInteraction<"raw" | "cached">) => any;
	autocomplete?: (interaction: AutocompleteInteraction<"raw" | "cached">) => any;
}
type Command = ContextMenuCommand | ChatInputCommand | undefined;
export default Command;
