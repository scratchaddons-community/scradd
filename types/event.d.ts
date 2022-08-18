import type { ClientEvents, Client, Awaitable } from "discord.js";

/** A function to process events. */
type Event<K extends ClientEvent> = K extends "ready"
	? never
	: (...args: ClientEvents[K]) => Awaitable<void>;
export default Event;

export type ClientEvent = Exclude<keyof ClientEvents, "ready">;
