import type { MessageReaction, Snowflake } from "discord.js";
import type { CustomOperation } from "../util.ts";

import { escapeMarkdown, Faces, User } from "discord.js";
import { client } from "strife.js";

import constants from "../../../common/constants.ts";
import emojis from "../../../common/emojis.ts";
import { executeEmojis, executeMessages } from "../../../common/strings.ts";
import { ignoredReactionPurges } from "../../logging/messages.ts";
import { getSettings, userSettingsDatabase } from "../../settings.ts";

const counts: Record<Snowflake, number> = {};

const data: CustomOperation = {
	name: "shhhhh",
	description: escapeMarkdown(Faces.Shrug),
	permissions: (user) => !(user instanceof User),
	async command(interaction) {
		const settings = await getSettings(interaction.user);
		if (settings.execute) {
			await interaction.reply("🎉");
			return;
		}

		counts[interaction.user.id] =
			((counts[interaction.user.id] ?? -1) + 1) % executeMessages.length;
		const content = executeMessages.at(counts[interaction.user.id] ?? 0) ?? executeMessages[0];

		const message = await interaction.reply({ content, fetchReply: true });
		ignoredReactionPurges.add(message.id);

		const reactions: MessageReaction[] = [];
		for (const emoji of emojis.toSorted(() => Math.random() - 0.5)) {
			await Promise.all([
				reactions.at(-3)?.remove(),
				message.react(emoji).then(
					(reaction) => reactions.push(reaction),
					() => void 0,
				),
			]);
			if (reactions.length === executeEmojis.length) break;
		}
		for (const reaction of reactions.slice(-3)) await reaction.users.remove(client.user);
		await message.reactions.removeAll();

		let progress = -1;
		const collector = message
			.createReactionCollector({ idle: constants.collectorTime })
			.on("collect", async (reaction, user) => {
				if (user.id !== interaction.user.id) return await reaction.users.remove(user);

				const newProgress = progress + 1;

				if (
					executeEmojis[newProgress] &&
					(!reaction.emoji.name ||
						!executeEmojis[newProgress]?.includes(reaction.emoji.name))
				) {
					progress = -1;
					return await message.reactions.removeAll();
				}

				if (executeEmojis[newProgress + 1]) {
					progress = newProgress;
					return;
				}

				collector.stop();
				userSettingsDatabase.updateById(
					{ id: interaction.user.id, execute: true },
					settings,
				);
				return await message.reply(`${user.toString()} unlocked a secret! Shhhhh… 👀`);
			})
			.on("end", async () => {
				await message.reactions.removeAll();
				await message.edit(`~~${content}~~`);
			});
	},
};

export default data;
