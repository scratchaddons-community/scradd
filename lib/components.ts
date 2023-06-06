import type {
	AnySelectMenuInteraction,
	ButtonInteraction,
	ModalSubmitInteraction,
} from "discord.js";

export const buttons: Record<string, (interaction: ButtonInteraction, id: string) => any> = {};
export function defineButton(
	buttonName: string,
	button: (interaction: ButtonInteraction, id: string) => any,
) {
	if(buttons[buttonName])
		throw new ReferenceError("Button callback for button " + buttonName  + " already exists");
	buttons[buttonName] = button;
}

export const modals: Record<string, (interaction: ModalSubmitInteraction, id: string) => any> = {};
export function defineModal(
	modalName: string,
	modal: (interaction: ModalSubmitInteraction, id: string) => any,
) {
	if(modals[modalName])
		throw new ReferenceError("Modal callback for modal " + modalName  + " already exists");
	modals[modalName] = modal;
}

export const selects: Record<string, (interaction: AnySelectMenuInteraction, id: string) => any> =
	{};
export function defineSelect(
	selectName: string,
	select: (interaction: AnySelectMenuInteraction, id: string) => any,
) {
	if(selects[selectName])
		throw new ReferenceError("Select callback for select " + selectName  + " already exists");
	selects[selectName] = select;
}
