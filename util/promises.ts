// eslint-disable-next-line @typescript-eslint/no-explicit-any
export async function gracefulFetch<T = any>(apiUrl: string): Promise<T | undefined> {
	const response = await fetch(apiUrl)
		.then((response) => response.json() as T)
		.catch(() => void 0);
	return typeof response === "object" && response && "error" in response && response.error ?
			undefined
		:	response;
}
