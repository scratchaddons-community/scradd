const auto = process.env.NODE_ENV !== "production";
const callbacks = [() => true, () => false] as const;

export default {
	_canvas:
		(await import("@napi-rs/canvas").then(...callbacks)) &&
		(await import("chart.js").then(...callbacks)),
	autosTypeInChat: auto,
	joins: auto,
};
