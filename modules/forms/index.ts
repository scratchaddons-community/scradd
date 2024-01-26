import { defineButton, defineModal } from "strife.js";
import confirmInterest, { fillInterest, submitIntrest } from "./modInterest.js";
import {
	confirmRejectAppeal,
	confirmAcceptAppeal,
	submitRejectAppeal,
	submitAcceptAppeal,
} from "./appeals/appeals.js";

defineButton("confirmInterest", confirmInterest);
defineButton("modInterestForm", fillInterest);
defineModal("modInterestForm", submitIntrest);

defineButton("acceptAppeal", confirmAcceptAppeal);
defineModal("acceptAppeal", submitAcceptAppeal);
defineButton("rejectAppeal", confirmRejectAppeal);
defineModal("rejectAppeal", submitRejectAppeal);
