import type { ClientEvents, Client } from "discord.js";

type Event<K extends keyof ClientEvents> = {
	/** Pass `true` to make this callback only fire on the event's first fire. */
	once?: boolean = false;
	/** Pass `false` to disable this callback. */
	apply?: boolean = true;
	/** A funcion to process events. */
	event(this: Client<true>, ...args: ClientEvents[K]): void | Promise<void>;
};
export default Event;
