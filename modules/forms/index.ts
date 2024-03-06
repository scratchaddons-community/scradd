import { defineButton, defineModal } from "strife.js";
import confirmInterest, { fillInterest, submitInterest } from "./mod-interest.js";
import {
	confirmRejectAppeal,
	confirmAcceptAppeal,
	submitRejectAppeal,
	submitAcceptAppeal,
} from "./appeals/appeals.js";

defineButton("confirmInterest", confirmInterest);
defineButton("modInterestForm", fillInterest);
defineModal("modInterestForm", submitInterest);

defineButton("acceptAppeal", confirmAcceptAppeal);
defineModal("acceptAppeal", submitAcceptAppeal);
defineButton("rejectAppeal", confirmRejectAppeal);
defineModal("rejectAppeal", submitRejectAppeal);
