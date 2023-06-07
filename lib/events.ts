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
const allEvents: Record<string, Event[]> = {};
const preEvents: Record<string, Event> = {};

export default function defineEvent<EventName extends ClientEvent>(
	eventName: EventName,
	event: (...args: ClientEvents[EventName]) => unknown,
) {
	allEvents[eventName] ??= [];
	allEvents[eventName]?.push(event as Event);
}
defineEvent.pre = function pre<EventName extends ClientEvent>(
	eventName: EventName,
	event: (...args: ClientEvents[EventName]) => Awaitable<boolean>,
) {
	if (preEvents[eventName])
		throw new ReferenceError("Pre event for event " + eventName + " already exists");
	preEvents[eventName] = event as Event;
	allEvents[eventName] ??= [];
};

export function getEvents(): { [E in ClientEvent]?: Event } {
	const parsedEvents: Record<string, Event> = {};

	for (const eventName in allEvents) {
		const preEvent = preEvents[eventName];
		const events = allEvents[eventName] ?? [];

		const event = async (...args: any) => {
			const results = await Promise.allSettled(events.map((event) => event(...args)));
			const failures = results.filter(
				(result): result is PromiseRejectedResult => result.status === "rejected",
			);

			if (failures.length === 1) throw failures[0]?.reason;
			if (failures.length) throw AggregateError(failures);
		};

		parsedEvents[eventName] = preEvent
			? async function (...args: any) {
					if (await preEvent(...args)) await event(...args);
			  }
			: event;
	}

	return parsedEvents;
}
