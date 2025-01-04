/* eslint-disable @typescript-eslint/explicit-function-return-type */
/* eslint-disable @typescript-eslint/explicit-module-boundary-types */
import constants from "../common/constants.ts";
import { gracefulFetch } from "./promises.ts";

export async function fetchUser(username: string) {
	const user = await gracefulFetch<
		| {
				id: number;
				username: string;
				scratchteam: boolean;
				history: { joined: string; login?: string };
				profile: {
					id: number;
					avatar?: string;
					images: {
						"90x90": string;
						"60x60": string;
						"55x55": string;
						"50x50": string;
						"32x32": string;
					};
					status: string;
					bio: string;
					country: string;
				};
		  }
		| { code: string; message: string }
	>(`${constants.urls.scratchApi}/users/${username}/`);
	return !user || "code" in user ? undefined : user;
}
