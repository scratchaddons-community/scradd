// eslint-disable-next-line @typescript-eslint/no-explicit-any
export async function gracefulFetch<T = any>(apiUrl: string): Promise<T | undefined> {
	const response = await fetch(apiUrl)
		.then((response) => response.json() as T)
		.catch(console.error);
	console.log(response, apiUrl);
	return !response || (typeof response === "object" && "error" in response && response.error) ?
			undefined
		:	response;
}
