import importScripts from "./importScripts.js";

const commands = await importScripts("commands");
commands.forEach((command, name) => {
	if (!command.data.name) {
		command.data.setName(name);
	}
});

export default commands;
