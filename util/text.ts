import type { IncomingMessage } from "node:http";

import constants from "../common/constants.ts";

/**
 * Slice a string so that it fits into a given length.
 *
 * @param text - The string to truncate.
 * @param maxLength - The maximum length of the string.
 * @returns The truncated string.
 */
export function truncateText(text: string, maxLength: number, multiline = false): string {
	const condensed = ((!multiline && text.split("\n")[0]) || text.replaceAll(/\n+/g, "\n")).trim();
	const trimmed = condensed.slice(0, maxLength);
	const segments = Array.from(new Intl.Segmenter().segment(trimmed), ({ segment }) => segment);

	if (trimmed.length > maxLength) segments.pop();
	const output = segments.join("").trim();
	return output === text ? output : (
			`${output.slice(0, output.length === maxLength ? -1 : undefined)}…`
		);
}

export function getRequestUrl(request: IncomingMessage): URL {
	return new URL(
		request.url ?? "",
		constants.env === "development" && request.headers["x-forwarded-host"] ?
			`${request.headers["x-forwarded-proto"]?.toString() || "http"}://${request.headers[
				"x-forwarded-host"
			].toString()}`
		:	constants.urls.scradd,
	);
}
