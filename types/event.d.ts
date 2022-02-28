import type { ClientEvents } from "discord.js";

type Event<K extends keyof ClientEvents> = {
	once?: boolean;
	apply?: boolean;
	event(...args: ClientEvents[K]): Awaitable<void>;
};
export default Event;
