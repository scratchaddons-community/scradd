import type { AnySelectMenuInteraction, ButtonInteraction, ModalSubmitInteraction } from "discord.js";

export const buttons: Record<string, (interaction: ButtonInteraction, id: string) => any> = {};
export function defineButton(
	buttonName: string,
	button: (interaction: ButtonInteraction, id: string) => any,
) {
	buttons[buttonName] = button;
}

export const modals: Record<string, (interaction: ModalSubmitInteraction, id: string) => any> = {};
export function defineModal(
	modalName: string,
	modal: (interaction: ModalSubmitInteraction, id: string) => any,
) {
	modals[modalName] = modal;
}

export const selects: Record<string, (interaction: AnySelectMenuInteraction, id: string) => any> = {};
export function defineSelect(
	selectName: string,
	select: (interaction: AnySelectMenuInteraction, id: string) => any,
) {
	selects[selectName] = select;
}
