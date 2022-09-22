import { ActionRowBuilder } from "discord.js";

/** @extends {ActionRowBuilder<import("discord.js").ButtonBuilder | import("discord.js").SelectMenuBuilder>} */
export class MessageActionRowBuilder extends ActionRowBuilder {
	constructor() {
		super();
	}
}
