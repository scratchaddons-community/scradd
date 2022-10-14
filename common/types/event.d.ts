import type { ClientEvents } from "discord.js";

/** A function to process events. */
type Event<K extends ClientEvent = ClientEvent> = (...args: ClientEvents[K]) => any;
export default Event;

export type ClientEvent = Exclude<keyof ClientEvents, "ready">;
