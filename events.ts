import type { ClientEvents } from "discord.js";
import type { ClientEvent } from "./common/types/event.js";

export const events: { [E in ClientEvent]?: (...args: ClientEvents[E]) => unknown } = {};

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
