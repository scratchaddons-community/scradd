import client from "../../client.js";
import { suggestionAnswers, suggestionsDatabase } from "../../commands/get-top-suggestions.js";
import censor, { badWordsAllowed } from "../../common/language.js";
import CONSTANTS from "../../common/CONSTANTS.js";
import warn from "../../common/punishments.js";

import type Event from "../../common/types/event";
import { ButtonStyle, ChannelType, ComponentType } from "discord.js";
import log, { shouldLog } from "../../common/logging.js";

const event: Event<"threadCreate"> = async function event(thread, newlyCreated) {
	if (thread.guild.id !== CONSTANTS.guild.id || !newlyCreated) return;

	if (thread.parent?.id === CONSTANTS.channels.suggestions?.id) {
		suggestionsDatabase.data = [
			...suggestionsDatabase.data,
			{
				answer: suggestionAnswers[0],
				author: thread.ownerId ?? client.user.id,
				count: 0,
				id: thread.id,
				title: thread.name,
			},
		];
	}

	if (thread.type === ChannelType.PrivateThread && shouldLog(thread))
		await log(`📃 Private thread ${thread.toString()} created!`, "channels", {
			components: [
				{
					components: [
						{
							label: "View Thread",
							type: ComponentType.Button,
							style: ButtonStyle.Link,
							url: thread.url,
						},
					],

					type: ComponentType.ActionRow,
				},
			],
		});

	const toPing = [
		CONSTANTS.channels.contact?.id,
		CONSTANTS.channels.mod?.id,
		CONSTANTS.channels.modlogs?.id,
	].includes(thread.parent?.id)
		? CONSTANTS.roles.mod?.toString()
		: thread.parent?.id === CONSTANTS.channels.exec?.id
		? "<@&1046043735680630784>"
		: thread.parent?.id === CONSTANTS.channels.admin?.id
		? "<@&806603332944134164>"
		: undefined;
	if (toPing) await thread.send({ content: toPing, allowedMentions: { parse: ["roles"] } });

	if (badWordsAllowed(thread)) return;
	const censored = censor(thread.name);
	if (censored) {
		await thread.setName(censored.censored.replaceAll(/#+/g, "x"), "Censored bad word");

		const owner = await thread.fetchOwner();
		if (owner) {
			await thread.send(`${owner.toString()}, language!`);
			if (owner.guildMember) {
				await warn(
					owner.guildMember,
					"Watch your language!",
					censored.strikes,
					`Made thread titled:\n${thread.name}`,
				);
			}
		}
	}
};
export default event;
