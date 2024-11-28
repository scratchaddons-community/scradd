import type { Snowflake } from "discord.js";

import { defineButton, defineEvent, defineModal } from "strife.js";

import config from "../../common/config.ts";
import {
	confirmAcceptAppeal,
	confirmRejectAppeal,
	submitAcceptAppeal,
	submitRejectAppeal,
} from "./appeals/appeals.ts";
import confirmInterest, { fillInterest, submitInterest } from "./staff-interest.ts";

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
