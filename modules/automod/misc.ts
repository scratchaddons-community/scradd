import { ChannelType, type TextBasedChannel } from "discord.js";
import config from "../../common/config.js";
import { getBaseChannel } from "../../util/discord.js";
import { caesar, normalize } from "../../util/text.js";
import { PARTIAL_STRIKE_COUNT } from "../punishments/misc.js";
import badWords from "./bad-words.js";

export const regexpFlags = "giu";
export const badWordRegexps = badWords.map(
	([strings = [], words = [], prefixes = []]) =>
		new RegExp(
			(strings.length ? `${decodeRegexps(strings)}|` : "(?!x)x") +
				`\\b(?:${words.length ? `(?:${decodeRegexps(words)})\\b` : "(?!x)x"}${
					prefixes.length ? `|${decodeRegexps(prefixes)}` : "(?!x)x"
				})`,
			regexpFlags,
		),
);
function decodeRegexps(regexps: RegExp[]): string {
	return regexps.map(decodeRegexp).join("|");
}
export function decodeRegexp({ source }: RegExp): string {
	return caesar(source).replaceAll(
		/(?<!\\)[ a-z]/gi,
		(letter) =>
			({
				" ": /[ ^w]/giu.source,
				"a": /[a⒜@*#⍺₳4ａⓐＡᵃₐᴬåǟÃąẚᴀɐɑɒαΑΔΛаАคภᎪᗅᗩꓮ🅰🇦-]/giu.source,
				"b": /[b⒝฿8ｂⓑℬʙɓꞵƅβвьҍⴆცꮟᏸᏼᑲᖯᗷꓐ🇧]/giu.source,
				"c": /[c⒞¢₵ｃⅽⓒℂℭᶜᴄƈϲⲥсꮯᐸᑕᑢᑦꓚ匚🇨]/giu.source,
				"d": /[d⒟🅱ɒｄⅾⅆⓓⅅđðᴅɖԁԃժꭰꮷᑯᗞᗪꓒꓓ𝐃🇩]/giu.source,
				"e": /[e⒠*#📧℮⋿£3ɐｅⅇℯⓔℰₑᴇꬲɛεеєҽⴹꭼꮛꓰ𝐄🇪-]/giu.source,
				"f": /[f⒡⸁₣ｆⓕℱᶠꜰꬵꞙƒʄẝϝғքᖴꓝ𝐅🇫]/giu.source,
				"g": /[g⒢₲ｇℊⓖɡɢᶃɠƍ🇬ԍցꮆꮐ🇬ᏻꓖ𝐆]/giu.source,
				"h": /[h⒣#ｈℎⓗℍℌℋₕħʜɦⱨɧℜηⲏнԋһհ🇭ክዘዪꮋꮒᕼんꓧ卄🇭𝐇]/giu.source,
				"i": /[i!¡⑴⒤ℹ🇮*#׀⇂|∣⍳❕❗⥜1１❶①⓵¹₁ｉⅰⅈℹⓘℐℑⁱıɪᶦᴉɩｌⅼℓǀιⲓіꙇӏוןاﺎﺍߊⵏꭵᛁꓲ-]/giu
					.source,
				"j": /[j⒥ℑｊⅉⓙⱼᴊʝɟʄϳ🇯јյꭻᒍᒚꓙ𝐉]/giu.source,
				"k": /[k⒦₭ｋⓚₖᴋƙʞκ🇰ⲕкӄҟҝꮶᛕꓗ𝐊]/giu.source,
				"l": /[l⒧׀|∣1ｉⅰℐℑɩｌⅼℓⓛ🇱ℒₗʟⱡɭɮꞁǀιⲓⳑіӏוןاﺎﺍߊⵏꮭꮮᒪᛁﾚㄥꓡꓲ]/giu.source,
				"m": /[m⒨♍₥๓ｍⅿⓜⓂⓂℳₘᴍɱ🇲ꭑʍμϻⲙмጠꮇᗰᘻᛖﾶꓟ爪𝐌]/giu.source,
				"n": /[n⒩♑₦ｎⓝ🇳ℕⁿₙɴᴎɲɳŋηνⲛђипղոռሸꮑᑎᘉꓠ刀𝐍]/giu.source,
				"o": /[o⒪*#°⊘⍥🇴🅾○⭕¤၀๐໐߀〇০୦0०੦૦௦౦೦൦０⓪⓿⁰₀٥۵ｏℴⓞºₒᴏᴑꬽθοσⲟофჿօסⵔዐዕଠഠဝꓳ-]/giu
					.source,
				"p": /[p⒫⍴🇵ｐⓟℙₚᴘρϱ🅿ⲣрየꮲᑭꓑ𝐏]/giu.source,
				"q": /[q⒬۹9🇶ｑⓠℚϙϱԛфգզⵕᑫ𝐐]/giu.source,
				"r": /[r⒭ｒⓡℝℛℜ🇷ʀɾꭇꭈᴦⲅгհዪꭱꮁꮢꮧᖇꓣ乃几卂尺𝐑]/giu.source,
				"s": /[s⒮🇸§$₴ｓⓢₛꜱʂƽςѕꙅտֆꭶꮥꮪᔆᔕꓢ丂𝐒]/giu.source,
				"t": /[t⒯⊤⟙✝ℑ🇹ｔⓣₜᴛŧƫƭτⲧтፕꭲꮏｷꓔ千]/giu.source,
				"u": /[u⒰*#∪🇺⋃ｕⓤꞟᴜꭎꭒɥʋυսሀሁᑌꓴ𝐔-]/giu.source,
				"v": /[v⒱℣√∨⋁☑🇻✅✔۷٧ｖⅴⓥⱽᴠνѵⴸꮙꮩᐯᐺꓦ𝐕]/giu.source,
				"w": /[w⒲ɯ🇼ｗⓦᴡʍѡԝաሠꮃꮤꓪ]/giu.source,
				"x": /[x᙮⒳᙭×⌧🇽╳⤫⤬⨯ｘⅹⓧₓꭓχⲭжхӽӿҳאⵝᕁᕽᚷﾒꓫ乂𝐗]/giu.source,
				"y": /[y⒴५ɣᶌｙⓨ🇾ʏỿꭚγℽυϒⲩуүყሃꭹꮍꓬ𝐘*#-]/giu.source,
				"z": /[z⒵ｚⓩℤ🇿ℨᶻᴢƶȥʐʑⱬƹƨζչꮓᙆえꓜ乙𝐙]/giu.source,
			})[letter] || letter,
	);
}

export default function tryCensor(
	text: string,
	strikeShift = 0,
): false | { censored: string; strikes: number; words: string[][] } {
	const words: string[][] = [];
	const censored = badWordRegexps.reduce((string, regexp, index) => {
		words[index] ??= [];

		return string.replaceAll(regexp, (word) => {
			if (
				(word.match(/[\d!#*@|-]/gi)?.length ?? 0) > word.length * 0.5 + 1 ||
				"-#*".includes(word[0] ?? word) ||
				"-#*".includes(word.at(-1) ?? word)
			)
				return word;

			words[index]?.push(word);
			return word.length < 4 ?
					"#".repeat(word.length)
				:	word[0] + "#".repeat(word.length - 1);
		});
	}, normalize(text));

	return (
		!!words.flat().length && {
			censored,

			strikes: words.reduce(
				(accumulator, current, index) =>
					current.length * Math.max(index - strikeShift, PARTIAL_STRIKE_COUNT) +
					accumulator,
				0,
			),

			words,
		}
	);
}

export function censor(text: string): string {
	const censored = tryCensor(text);
	return censored ? censored.censored : text;
}

export function badWordsAllowed(channel?: TextBasedChannel | null): boolean {
	const baseChannel = getBaseChannel(channel);

	return (
		baseChannel?.type === ChannelType.DM ||
		baseChannel?.guild.id !== config.guild.id ||
		baseChannel.id === config.channels.devs?.id ||
		baseChannel.parent?.id === config.channels.mod.parent?.id ||
		(channel?.type === ChannelType.PrivateThread &&
			baseChannel.id === config.channels.tickets?.id)
	);
}

export function isPingable(name: string): boolean {
	const normalized = name.normalize("NFD").replaceAll(/\p{Dia}/gu, "");
	return /^[\w`~!@#$%^&*()=+[\]\\{}|;':",./<>?-]$|(?:[\w`~!@#$%^&*()=+[\]\\{}|;':",./<>?-].?){2,}/u.test(
		normalized,
	);
}
