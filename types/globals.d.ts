declare global {
	namespace NodeJS {
		interface ProcessEnv {
			GUILD_ID: string;
			BOT_TOKEN: string;
			NODE_ENV: "development" | "production";
			/** @deprecated This doesn't exist! */
			[key: string]: never;
		}
	}
}
export {};
