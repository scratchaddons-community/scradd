import type { Awaitable, ClientEvents } from "discord.js";

type ReservedClientEvent =
	| "ready"
	| "debug"
	| "warn"
	| "error"
	| "invalidated"
	| "guildUnavailable";
export type ClientEvent = Exclude<keyof ClientEvents, ReservedClientEvent>;
export type Event = (...args: ClientEvents[ClientEvent]) => unknown;
const events: Record<string, Event> = {};
const preEvents: Record<string, Event> = {};

export default function defineEvent<EventName extends ClientEvent>(
	eventName: EventName,
	event: (...args: ClientEvents[EventName]) => unknown,
) {
	const old = events[eventName];
	if (old) {
		events[eventName] = async function (...args: ClientEvents[EventName]) {
			old(...args);
			event(...args);
		} as Event;
	} else {
		events[eventName] = event as Event;
	}
}
defineEvent.pre = function pre<EventName extends ClientEvent>(
	eventName: EventName,
	event: (...args: ClientEvents[EventName]) => Awaitable<boolean>,
) {
	if (preEvents[eventName])
		throw new ReferenceError("Pre event already exists for event " + eventName);
	preEvents[eventName] = event as Event;
};

export function getEvents(): { [E in ClientEvent]?: Event } {
	for (const eventName in preEvents) {
		const event = preEvents[eventName];
		if (!event) continue;
		const old = events[eventName];
		if (old) {
			events[eventName] = async function (...args) {
				if (await event(...args)) old(...args);
			};
		} else {
			events[eventName] = event;
		}
	}
	return events;
}
