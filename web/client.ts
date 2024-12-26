/* eslint-env browser */

const spoilers = [...document.querySelectorAll(".discord-spoiler")];
for (const spoiler of spoilers)
	spoiler.addEventListener("click", () => {
		if (spoiler.classList.contains("discord-spoiler")) {
			spoiler.classList.remove("discord-spoiler");
			spoiler.classList.add("discord-spoiler--revealed");
		}
	});

const emojis = [
	"⚠️",
	"✨",
	"❤️‍🔥",
	"⭐",
	"🍀",
	"🍡",
	"🍢",
	"🎉",
	"🏅",
	"🏆",
	"🐹",
	"👀",
	"👋",
	"👑",
	"💐",
	"💖",
	"💗",
	"💙",
	"💚",
	"💛",
	"💜",
	"💝",
	"💪",
	"💯",
	"🔥",
	"🤗",
	"🤣",
	"🤩",
	"🥑",
	"🥔",
	"🥳",
	"🦆",
	"🧡",
	"🪀",
	"😀",
	"😉",
	"😌",
	"😎",
	"😏",
	"😚",
	"🙈",
	"🚀",
	"🛡",
] as const;

let active = false;
let cursor = 0;
const CODE = [
	"arrowup",
	"arrowup",
	"arrowdown",
	"arrowdown",
	"arrowleft",
	"arrowright",
	"arrowleft",
	"arrowright",
	"b",
	"a",
];
document.addEventListener("keydown", ({ key }) => {
	if (document.activeElement === document.body && key.toLowerCase() === CODE[cursor]) cursor++;
	else cursor = 0;

	if (cursor !== CODE.length) return;

	if (active) active = false;
	else emojisplosions();
	cursor = 0;
});

const container = document.createElement("div");
document.body.prepend(container);
const domNodesToActors = new WeakMap<EventTarget, EmojiActor>();
function emojisplosions(): void {
	active = true;

	function blastAndSchedule(): void {
		if (!active) return;
		if (document.visibilityState === "visible") {
			const blastEmojiCount = Math.floor(Math.random() * 15) + 5;
			const actors = Array.from({ length: blastEmojiCount }).map(() => new EmojiActor());

			animate(actors);
		}
		setTimeout(blastAndSchedule, Math.floor(Math.random() * 1401) + 700);
	}

	container.addEventListener("click", ({ target }) => {
		const actor = target && domNodesToActors.get(target);
		if (!actor) return;

		actor.opacity = 1;
		actor.velocity.y = actor.velocity.y / 2 - 15;
	});
	setTimeout(blastAndSchedule, 0);
}
class EmojiActor {
	readonly element = Object.assign(document.createElement("span"), {
		className: "emojisplosion",
		textContent: `${emojis[Math.floor(Math.random() * emojis.length)] ?? emojis[0]}\uFE0F`,
	});
	opacity = 1;
	position = {
		rotation: Math.floor(Math.random() * 15) + -7,
		x: Math.random() * innerWidth,
		y: Math.random() * innerHeight,
	};
	velocity = {
		rotation: Math.floor(Math.random() * 15) + -7,
		x: Math.floor(Math.random() * 15) + -7,
		y: Math.floor(Math.random() * 15) + -21,
	};

	constructor() {
		this.element.style.fontSize = `${Math.floor(Math.random() * 12) + 24}px`;
		domNodesToActors.set(this.element, this);
		this.updateElement();
		container.append(this.element);
	}

	act(timeElapsed: number): boolean {
		this.opacity -= timeElapsed / 6000;
		if (this.opacity <= 0) return true;

		this.velocity.rotation *= 0.98;
		this.velocity.y += 0.35;

		this.position.rotation += this.velocity.rotation;
		this.position.x += (this.velocity.x * timeElapsed) / 60;
		this.position.y += (this.velocity.y * timeElapsed) / 60;

		const windowHeight = globalThis.outerHeight || document.documentElement.clientHeight;
		const windowWidth = globalThis.outerWidth || document.documentElement.clientWidth;

		if (this.position.y - this.element.clientHeight > windowHeight + 350) return true;
		if (this.position.y + this.element.clientHeight < -350) return true;
		if (this.position.x - this.element.clientWidth > windowWidth + 350) return true;
		if (this.position.x + this.element.clientWidth < -350) return true;

		this.updateElement();
		return false;
	}

	private updateElement(): void {
		this.element.style.opacity = this.opacity.toString();
		this.element.style.transform = `translate(${this.position.x}px, ${
			this.position.y
		}px) rotate(${Math.round(this.position.rotation)}deg)`;
	}
}
function animate(actors: EmojiActor[]): void {
	let previousTime = performance.now();

	function tick(currentTime: number): void {
		const timeElapsed = currentTime - previousTime;

		// eslint-disable-next-line no-param-reassign
		actors = actors.filter((actor) => {
			if (!actor.act(timeElapsed)) return true;

			actor.element.remove();
			return false;
		});
		if (!actors.length) return;

		previousTime = currentTime;
		requestAnimationFrame(tick);
	}

	requestAnimationFrame(tick);
}
