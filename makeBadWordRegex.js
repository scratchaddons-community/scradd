import { regexps } from "./common/moderation/automod.js";
import { caesar } from "./lib/text.js";

regexps.forEach(({ source, flags }) =>
	console.log(
		new RegExp(
			caesar(
				source
					.replaceAll("[a-z0-9]", "[n-m0-9]")
					.replaceAll(/(?<=\\)[a-z]/gi, (letter) => caesar(letter)),
			),
			flags,
		),
	),
);
