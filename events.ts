import type { ClientEvents } from "discord.js";

type ReservedClientEvent = "ready" | "warn" | "debug" | "error" | "interactionCreate";
export type ClientEvent = Exclude<keyof ClientEvents, ReservedClientEvent>;
export type Event<E extends ClientEvent> =(...args: ClientEvents[E]) => unknown
export const events: { [E in ClientEvent]?: Event<E> } = {};

export default function defineEvent<EventName extends ClientEvent>(
	eventName: EventName,
	event: NonNullable<typeof events[EventName]>,
) {
	const old = events[eventName];
	if (old) {
		events[eventName] = async function (...args) {
			old(...args);
			event(...args);
		} as typeof event;
	} else {
		events[eventName] = event;
	}
}
