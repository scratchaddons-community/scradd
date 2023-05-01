import CONSTANTS from "../../../common/CONSTANTS.js";

import type Event from "../../../common/types/event";
import { ButtonStyle, ChannelType, ComponentType } from "discord.js";
import log, { shouldLog } from "../logging.js";

defineEvent("threadCreate", async (thread, newlyCreated) => {
	if (thread.guild.id !== CONSTANTS.guild.id || !newlyCreated) return;

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
});
