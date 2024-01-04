import { DEFAULT_XP } from "../xp/misc.js";

export const EXPIRY_LENGTH = 1_260_000 * (process.env.NODE_ENV === "production" ? 1440 : 1),
	STRIKES_PER_MUTE = 3,
	MUTE_LENGTHS = [8, 16, 36],
	PARTIAL_STRIKE_COUNT = 1 / (STRIKES_PER_MUTE + 1),
	DEFAULT_STRIKES = 1,
	XP_PUNISHMENT = DEFAULT_XP * -2;
