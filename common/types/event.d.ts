import type { ClientEvents } from "discord.js";

/** A function to process events. */
type Event<K extends ClientEvent = ClientEvent> = (...args: ClientEvents[K]) => unknown;
export default Event;

export type ReservedClientEvent = "ready" | "warn" | "debug" | "error";
export type ClientEvent = Exclude<keyof ClientEvents, ReservedClientEvent>;
