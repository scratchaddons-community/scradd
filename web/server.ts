import { createReadStream, promises as fileSystem } from "node:fs";
import http from "node:http";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { client, logError } from "strife.js";

import config from "../common/config.js";
import constants from "../common/constants.js";
import { prepareExit } from "../common/database.js";
import appealRequest from "../modules/forms/appeals/show-appeal.js";
import linkScratchRole from "../modules/roles/scratch.js";
import suggestionsPage from "../modules/suggestions/web.js";
import pkg from "../package.json" with { type: "json" };
import { getRequestUrl } from "../util/text.js";

const CSS_FILE = (await fileSystem.readFile("./web/style.css", "utf8")).replaceAll(
	"#000",
	"#" + constants.themeColor.toString(16),
);
const CLIENT_JS_FILE = await fileSystem.readFile("./dist/web/client.js", "utf8");
const DISCORD_CSS_FILE = await fileSystem.readFile("./web/discord.css", "utf8");
const DIRECTORIES = {
	images: path.resolve("./.private/images"),
	sora: path.dirname(fileURLToPath(import.meta.resolve("@fontsource-variable/sora"))),
};
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
			case "/prepare-exit": {
				if (requestUrl.searchParams.get("auth") !== process.env.EXIT_AUTH)
					return response
						.writeHead(403, { "content-type": "text/plain" })
						.end("403 Forbidden");

				await prepareExit();
				response.writeHead(200, { "content-type": "text/plain" }).end("200 OK");

				return;
			}
			case "/ban-appeal": {
				return await appealRequest(request, response);
			}
			case "/link-scratch": {
				return await linkScratchRole(request, response);
			}
			case "/style.css": {
				return response.writeHead(200, { "content-type": "text/css" }).end(CSS_FILE);
			}
			case "/client.js": {
				return response
					.writeHead(200, { "content-type": "text/javascript" })
					.end(CLIENT_JS_FILE);
			}
			case "/discord.css": {
				return response
					.writeHead(200, { "content-type": "text/css" })
					.end(DISCORD_CSS_FILE);
			}
			case "/icon.png": {
				const options = { extension: "png", forceStatic: true, size: 128 } as const;
				return response
					.writeHead(301, {
						location:
							config.guild.iconURL(options) ?? client.user.displayAvatarURL(options),
					})
					.end();
			}
		}

		const segments = pathname.split("/");
		const [, first] = segments;
		if (first && Object.keys(DIRECTORIES).includes(first)) {
			const filePath = path.join(DIRECTORIES[first], segments.slice(2).join("/"));
			if (
				await fileSystem.access(filePath).then(
					() => true,
					() => false,
				)
			)
				return createReadStream(filePath).pipe(response);
		} else if (first === "suggestions") {
			return await suggestionsPage(request, response, segments[2]);
		}

		response
			.writeHead(301, {
				location:
					config.guild.features.includes("DISCOVERABLE") ?
						`https://discord.com/servers/${config.guild.id}`
					:	pkg.homepage,
			})
			.end();
	} catch (error) {
		await logError({
			error,
			event: request.url ?? "",
			channel: config.channels.errors,
			emoji: constants.emojis.statuses.no,
		}).catch(console.error);
		response.writeHead(500, { "content-type": "text/plain" }).end("500 Internal Server Error");
	}
});

await new Promise<void>((resolve) => server.listen(process.env.PORT, resolve));
console.log("Server up!");
export default server;
