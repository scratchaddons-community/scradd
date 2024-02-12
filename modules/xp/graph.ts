import type { AnySelectMenuInteraction } from "discord.js";
import { recentXpDatabase } from "./util.js";
import { createCanvas, type SKRSContext2D } from "@napi-rs/canvas";
import { Chart } from "chart.js/auto";

export default async function graph(interaction: AnySelectMenuInteraction): Promise<void> {
	if (!interaction.isUserSelectMenu())
		throw new TypeError("weeklyXpGraph SelectMenu not a UserSelectMenu!");

	if (interaction.user.id !== interaction.message.interaction?.user.id) return;

	const recentXp = recentXpDatabase.data.toSorted((one, two) => one.time - two.time);
	const maxDate = (recentXp[0]?.time ?? 0) + 604_800_000;
	const datasets = interaction.users
		.map((user) => {
			const data = recentXp
				.filter((gain) => gain.time < maxDate && gain.user === user.id)
				.reduce<{ x: number; y: number }[]>((accumulator, xp) => {
					const previous = accumulator.at(-1) ?? { y: 0, x: recentXp[0]?.time ?? 0 };
					return [
						...accumulator,
						...Array.from(
							{ length: Math.floor((xp.time - previous.x) / 3_600_000) },
							(_, index) => ({ y: previous.y, x: previous.x + 3_600_000 * index }),
						),
						{ x: xp.time, y: xp.xp + previous.y },
					];
				}, []);
			return {
				label: user.displayName,
				data: [
					...(data.length ? data : [{ y: 0, x: recentXp[0]?.time ?? 0 }]),
					{ x: maxDate, y: data.at(-1)?.y ?? 0 },
				],
			};
		})
		.toSorted((one, two) => (two.data.at(-1)?.y ?? 0) - (one.data.at(-1)?.y ?? 0));

	const canvas = createCanvas(1000, 750);
	const context = canvas.getContext("2d") as CanvasRenderingContext2D & SKRSContext2D;

	const defaultColor = Chart.defaults.color;
	Chart.defaults.color = "#fff";
	new Chart(context, {
		options: {
			parsing: false,
			scales: {
				x: { type: "time", grid: { display: false } },
				y: { min: 0 },
			},
			elements: { point: { radius: 0 } },
		},
		plugins: [
			{
				id: "customCanvasBackgroundColor",
				beforeDraw(chart) {
					chart.ctx.save();
					chart.ctx.globalCompositeOperation = "destination-over";
					chart.ctx.fillStyle = "#444";
					chart.ctx.fillRect(0, 0, chart.width, chart.height);
					chart.ctx.restore();
				},
			},
		],
		type: "line",
		data: { datasets },
	});

	await interaction.deferUpdate();
	await interaction.message.edit({
		files: [{ attachment: canvas.toBuffer("image/png"), name: "graph.png" }],
	});

	Chart.defaults.color = defaultColor;
}
