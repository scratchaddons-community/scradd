import importScripts from "./importScriptsInFolder.js";

const commands = await importScripts("commands");
commands.forEach((c, name) => {
	const commands = Array.isArray(c) ? c : [c];
	for (const command of commands) {
		console.log(command);
		if (!command.data.name) {
			command.data.setName(name);
		}
	}
});

export default commands;
