/* eslint-disable @typescript-eslint/explicit-function-return-type */
/* eslint-disable @typescript-eslint/explicit-module-boundary-types */
import constants from "../common/constants.js";
import { gracefulFetch } from "./promises.js";

export async function fetchUser(username: string) {
	const user = await gracefulFetch<
		| {
				username: string;
				id: null;
				sys_id: number;
				joined: "1970-01-01T00:00:00.000Z";
				country: null;
				bio: null;
				work: null;
				status: null;
				school: null;
		  }
		| {
				username: string;
				id: number;
				sys_id: number;
				joined: string;
				country: string;
				bio: string;
				work: string;
				status: "New Scratcher" | "Scratch Team" | "Scratcher";
				school: number | null;
				statistics?: {
					ranks: {
						country: {
							loves: number;
							favorites: number;
							comments: number;
							views: number;
							followers: number;
							following: number;
						};
						loves: number;
						favorites: number;
						comments: number;
						views: number;
						followers: number;
						following: number;
					};
					loves: number;
					favorites: number;
					comments: number;
					views: number;
					followers: number;
					following: number;
				};
		  }
		| { error: "UserNotFoundError" | "UserNotValidError" }
	>(`${constants.urls.scratchdb}/user/info/${username}/`);
	const scratchUser =
		!user || "error" in user || !user.id
			? await gracefulFetch<
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
			  >(`${constants.urls.scratchApi}/users/${username}/`)
			: user;
	return !scratchUser || "code" in scratchUser || !scratchUser.id ? undefined : scratchUser;
}
