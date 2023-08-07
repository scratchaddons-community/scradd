import { cleanDatabaseListeners } from "../common/database.js";
import http from "node:http";

http.createServer((request, response) => {
	try {
		const requestUrl = new URL(request.url ?? "", `https://${request.headers.host}`);

		if (requestUrl.pathname === "/clean-database-listeners") {
			if (requestUrl.searchParams.get("auth") !== process.env.CDBL_AUTH)
				response.writeHead(403, { "Content-Type": "text/plain" }).end("Forbidden");
			else {
				process.emitWarning("cleanDatabaseListeners called");
				cleanDatabaseListeners().then(() => {
					process.emitWarning("cleanDatabaseListeners ran");
					response.writeHead(200, { "Content-Type": "text/plain" }).end("Success");
				});
			}
		} else {
			response.writeHead(404, { "Content-Type": "text/plain" }).end("Not Found");
		}
	} catch (error) {
		response.writeHead(500).end(error.name + ": " + error.message);
	}
}).listen(process.env.PORT, () => {
	console.log("Server up!");
});
