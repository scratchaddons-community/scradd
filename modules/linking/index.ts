import assert from "node:assert";
import http from "node:http";

import { client, logError } from "strife.js";

import constants from "../../common/constants.ts";
import pkg from "../../package.json" with { type: "json" };
import { getRequestUrl } from "../../util/text.ts";
import linkScratchRole from "./scratch.ts";

if (process.env.PORT) {
	const server = http.createServer(async (request, response) => {
		try {
			const requestUrl = await new Promise<URL>((resolve) => {
				resolve(getRequestUrl(request));
			}).catch(() => void 0);
			if (!requestUrl)
				return response
					.writeHead(422, { "content-type": "text/plain" })
					.end("422 Unprocessable Content");

			const pathname = (
				requestUrl.pathname.endsWith("/") ?
					requestUrl.pathname.slice(0, -1)
				:	requestUrl.pathname).toLowerCase();
			switch (pathname) {
				case "/link-scratch": {
					return await linkScratchRole(request, response);
				}
				case "/icon.png": {
					const options = { extension: "png", forceStatic: true, size: 128 } as const;
					return response
						.writeHead(301, { location: client.user.displayAvatarURL(options) })
						.end();
				}
			}

			response.writeHead(301, { location: pkg.homepage }).end();
		} catch (error) {
			const channel = await client.channels.fetch(constants.channels.logs);
			assert(channel?.isSendable());
			await logError({
				error,
				event: request.url ?? "",
				channel,
				emoji: constants.emojis.statuses.no,
			}).catch(console.error);
			response
				.writeHead(500, { "content-type": "text/plain" })
				.end("500 Internal Server Error");
		}
	});

	await new Promise<void>((resolve) => {
		server.listen(process.env.PORT, resolve);
	});
	console.log("Server up!");
}
