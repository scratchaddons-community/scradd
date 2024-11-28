import constants from "../../common/constants.ts";
import { DEFAULT_XP } from "../xp/misc.ts";

export const EXPIRY_LENGTH = 1_260_000 * (constants.env === "production" ? 1440 : 1),
	STRIKES_PER_MUTE = 3,
	MUTE_LENGTHS = [8, 16, 36],
	PARTIAL_STRIKE_COUNT = 1 / (STRIKES_PER_MUTE + 1),
	DEFAULT_STRIKES = 1,
	XP_PUNISHMENT = DEFAULT_XP * -2,
	MAX_STRIKES = Math.round(STRIKES_PER_MUTE * 1.5);
