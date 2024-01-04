import { defineButton, defineChatCommand, defineModal } from "strife.js";
import confirmInterest, { fillInterest, submitIntrest } from "./modInterest.js";
import {
	confirmRejectAppeal,
	confirmAcceptAppeal,
	submitRejectAppeal,
	submitAcceptAppeal,
} from "./appeals.js";

defineChatCommand(
	{ name: "mod-interest-form", description: "Fill out a moderator interest form" },
	confirmInterest,
);
defineButton("modInterestForm", fillInterest);
defineModal("modInterestForm", submitIntrest);

defineButton("acceptAppeal", confirmAcceptAppeal);
defineModal("acceptAppeal", submitAcceptAppeal);
defineButton("rejectAppeal", confirmRejectAppeal);
defineModal("rejectAppeal", submitRejectAppeal);
