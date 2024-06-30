import { defineButton, defineEvent, defineModal } from "strife.js";
import {
	confirmAcceptAppeal,
	confirmRejectAppeal,
	submitAcceptAppeal,
	submitRejectAppeal,
} from "./appeals/appeals.js";
import confirmInterest, { fillInterest, submitInterest } from "./staff-interest.js";
import type { Snowflake } from "discord.js";
import config from "../../common/config.js";

export const banDates: Record<Snowflake, number> = {};
defineEvent("guildBanAdd", (ban) => {
	if (ban.guild.id === config.guild.id) banDates[ban.user.id] = Date.now();
});

defineButton("confirmInterest", confirmInterest);
defineButton("modInterestForm", fillInterest);
defineModal("modInterestForm", submitInterest);

defineButton("acceptAppeal", confirmAcceptAppeal);
defineModal("acceptAppeal", submitAcceptAppeal);
defineButton("rejectAppeal", confirmRejectAppeal);
defineModal("rejectAppeal", submitRejectAppeal);
