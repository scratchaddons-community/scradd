import { defineButton, defineModal } from "strife.js";
import {
	confirmAcceptAppeal,
	confirmRejectAppeal,
	submitAcceptAppeal,
	submitRejectAppeal,
} from "./appeals/appeals.js";
import confirmInterest, { fillInterest, submitInterest } from "./mod-interest.js";

defineButton("confirmInterest", confirmInterest);
defineButton("modInterestForm", fillInterest);
defineModal("modInterestForm", submitInterest);

defineButton("acceptAppeal", confirmAcceptAppeal);
defineModal("acceptAppeal", submitAcceptAppeal);
defineButton("rejectAppeal", confirmRejectAppeal);
defineModal("rejectAppeal", submitRejectAppeal);
