import constants from "../../common/constants.ts";
import { DEFAULT_XP } from "../xp/misc.ts";

export const EXPIRY_LENGTH = 1_260_000 * (constants.env === "production" ? 1440 : 1);
export const STRIKES_PER_MUTE = 3;
export const MUTE_LENGTHS = [8, 16, 36];
export const PARTIAL_STRIKE_COUNT = 1 / (STRIKES_PER_MUTE + 1);
export const DEFAULT_STRIKES = 1;
export const XP_PUNISHMENT = DEFAULT_XP * -2;
export const MAX_STRIKES = Math.round(STRIKES_PER_MUTE * 1.5);
