import { cleanDatabaseListeners } from "../common/database.js";
import http from "node:http";
import logError from "../modules/logging/errors.js";
import fileSystem from "node:fs/promises";
import { client } from "strife.js";
import config from "../common/config.js";
import constants from "../common/constants.js";
import showAppeal, { appeal } from "./appeal.js";

const CSS = (await fileSystem.readFile("./web/style.css", "utf8")).replaceAll(
	"#000",
	"#" + constants.themeColor.toString(16),
);

http.createServer(async (request, response) => {
	try {
		const requestUrl = new URL(
			request.url ?? "",
			`http${"encrypted" in request.socket ? "s" : ""}://${request.headers.host}`,
		);

		switch (requestUrl.pathname) {
			case "/clean-database-listeners":
			case "/clean-database-listeners/": {
				if (requestUrl.searchParams.get("auth") !== process.env.CDBL_AUTH)
					response.writeHead(403, { "content-type": "text/plain" }).end("Forbidden");

				process.emitWarning("cleanDatabaseListeners called");
				await cleanDatabaseListeners();
				process.emitWarning("cleanDatabaseListeners ran");
				response.writeHead(200, { "content-type": "text/plain" }).end("Success");

				break;
			}
			case "/ban-appeal":
			case "/ban-appeal/": {
				const data = await (request.method === "POST"
					? appeal(request)
					: showAppeal(request));
				const array = typeof data === "object";
				const string = typeof data === "string";
				const status = array ? data[0] : string ? 200 : data;
				const headers = array ? data[1] : { "content-type": "text/html" };
				const content = array && typeof data[0] === "string" ? data[0] : string ? data : "";

				response.writeHead(status, headers).end(content);
				break;
			}
			case "/style.css": {
				response.writeHead(200, { "content-type": "text/css" }).end(CSS);
				break;
			}
			case "/icon.png": {
				const options = { extension: "png", forceStatic: true, size: 128 } as const;
				response
					.writeHead(301, {
						location:
							config.guild.iconURL(options) ?? client.user.displayAvatarURL(options),
					})
					.end();
				break;
			}
			default: {
				response.writeHead(404, { "content-type": "text/plain" }).end("Not Found");
			}
		}
	} catch (error) {
		response.writeHead(500).end("Internal Server Error");
		await logError(error, request.url ?? "");
	}
}).listen(process.env.PORT, () => {
	console.log("Server up!");
});
