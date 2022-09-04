import { Snowflake } from "discord.js";
type Databases = {
	board: {
		/** The number of reactions this message has. */
		reactions: number;
		/** The ID of the user who posted this. */
		user: Snowflake;
		/** The ID of the channel this message is in. */
		channel: Snowflake;
		/** The ID of the message on the board. */
		onBoard?: Snowflake;
		/** The ID of the original message. */
		source: Snowflake;
	};
	warn: {
		/** The ID of the user who was warned. */
		user: Snowflake;
		/** The timestamp when this warn expires. */
		expiresAt: number;
		/** The ID of the message in #mod-log with more information. */
		info: Snowflake;
	};
	mute: {
		/** The ID of the user who was muted. */
		user: Snowflake;
		/** The timestamp when this mute is no longer taken into account when calculating future mute times. */
		expiresAt: number;
	};
	xp: {
		/** The ID of the user. */
		user: Snowflake;
		/** How much XP they have. */
		xp: number;
	};
};
export default Databases;
