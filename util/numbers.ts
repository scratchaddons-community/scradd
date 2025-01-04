



export type Duration =
	| `a ${"few seconds" | "minute" | "day" | "month" | "year"}`
	| "an hour"
	| `${number} ${"minutes" | "hours" | "days" | "months" | "years"}`;
export function formatDuration(duration: number): Duration {
	const seconds = duration / 1000;

	const perMinute = 60;
	const perHour = perMinute * 60;
	const perDay = perHour * 24;
	const perMonth = perDay * (365.25 / 12);
	const perYear = perMonth * 12;

	const secondsThreshold = 45;
	const minutesThreshold = 45;
	const hoursThreshold = 21.5;
	const daysThreshold = 25.5;
	const monthsThreshold = 10.5;

	if (seconds < secondsThreshold) return "a few seconds" as const;
	if (seconds < minutesThreshold * perMinute) {
		const minutes = Math.round(seconds / perMinute);
		return minutes === 1 ? ("a minute" as const) : (`${minutes} minutes` as const);
	}
	if (seconds < hoursThreshold * perHour) {
		const hours = Math.round(seconds / perHour);
		return hours === 1 ? ("an hour" as const) : (`${hours} hours` as const);
	}
	if (seconds < daysThreshold * perDay) {
		const days = Math.round(seconds / perDay);
		return days === 1 ? ("a day" as const) : (`${days} days` as const);
	}
	if (seconds < monthsThreshold * perMonth) {
		const months = Math.round(seconds / perMonth);
		return months === 1 ? ("a month" as const) : (`${months} months` as const);
	}

	const years = Math.round(seconds / perYear);
	return years === 1 ? ("a year" as const) : (`${years} years` as const);
}
