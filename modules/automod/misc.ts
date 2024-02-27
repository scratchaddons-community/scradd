import { ChannelType, type TextBasedChannel } from "discord.js";
import badWords from "./badWords.js";
import { getBaseChannel } from "../../util/discord.js";
import { caesar, normalize } from "../../util/text.js";
import { PARTIAL_STRIKE_COUNT } from "../punishments/misc.js";
import config from "../../common/config.js";

function decodeRegexps(regexps: RegExp[]): string {
	return regexps
		.map(({ source }) =>
			caesar(source).replaceAll(
				/(?<!\\)[ a-z]/gi,
				(letter) =>
					({
						" ": /[ ^w]/giu.source,
						"a": /[a⒜@*#⍺₳4aａⓐAＡᵃₐᴬåǟÃąẚᴀɐɑɒαΑΔΛаАคภᎪᗅᗩꓮ-]/giu.source,
						"b": /[b⒝฿8bｂⓑℬʙɓꞵƅβвьҍⴆცꮟᏸᏼᑲᖯᗷꓐ]/giu.source,
						"c": /[c⒞¢₵cｃⅽⓒℂℭᶜᴄƈϲⲥсꮯᐸᑕᑢᑦꓚ匚]/giu.source,
						"d": /[d⒟ɒdｄⅾⅆⓓⅅđðᴅɖԁԃժꭰꮷᑯᗞᗪꓒꓓ𝐃]/giu.source,
						"e": /[e⒠*#℮⋿£3ɐeｅⅇℯⓔℰₑᴇꬲɛεеєҽⴹꭼꮛꓰ𝐄-]/giu.source,
						"f": /[f⒡⸁₣fｆⓕℱᶠꜰꬵꞙƒʄſẝϝғքᖴꓝ𝐅]/giu.source,
						"g": /[g⒢₲gｇℊⓖɡɢᶃɠƍԍցꮆꮐᏻꓖ𝐆]/giu.source,
						"h": /[h⒣#hｈℎⓗℍℌℋₕħʜɦⱨɧℜηⲏнԋһհክዘዪꮋꮒᕼんꓧ卄𝐇]/giu.source,
						"i": /[i!¡⑴⒤*#׀⇂|∣⍳❕❗⥜1１❶①⓵¹₁iｉⅰⅈℹⓘℐℑⁱıɪᶦᴉɩjlｌⅼℓǀιⲓіꙇӏוןاﺎﺍߊⵏꭵᛁꓲ-]/giu
							.source,
						"j": /[j⒥ℑjｊⅉⓙⱼᴊʝɟʄϳјյꭻᒍᒚꓙ𝐉]/giu.source,
						"k": /[k⒦₭kｋⓚₖᴋƙʞκⲕкӄҟҝꮶᛕꓗ𝐊]/giu.source,
						"l": /[l⒧׀|∣1iｉⅰℐℑɩlｌⅼℓⓛℒₗʟⱡɭɮꞁǀιⲓⳑіӏוןاﺎﺍߊⵏꮭꮮᒪᛁﾚㄥꓡꓲ]/giu.source,
						"m": /[m⒨♍₥๓mｍⅿⓜℳₘᴍɱꭑʍμϻⲙмጠꮇᗰᘻᛖﾶꓟ爪𝐌]/giu.source,
						"n": /[n⒩♑₦nｎⓝℕⁿₙɴᴎɲɳŋηνⲛђипղոռሸꮑᑎᘉꓠ刀𝐍]/giu.source,
						"o": /[o⒪*#°⊘⍥○⭕¤၀๐໐߀〇০୦0०੦૦௦౦೦൦０⓪⓿⁰₀٥۵oｏℴⓞºₒᴏᴑꬽθοσⲟофჿօסⵔዐዕଠഠဝꓳ-]/giu
							.source,
						"p": /[p⒫⍴pｐⓟℙₚᴘρϱⲣрየꮲᑭꓑ𝐏]/giu.source,
						"q": /[q⒬۹9oqｑⓠℚϙϱԛфգզⵕᑫ𝐐]/giu.source,
						"r": /[r⒭rｒⓡℝℛℜʀɾꭇꭈᴦⲅгհዪꭱꮁꮢꮧᖇꓣ乃几卂尺𝐑]/giu.source,
						"s": /[s⒮§$₴sｓⓢₛꜱʂƽςѕꙅտֆꭶꮥꮪᔆᔕꓢ丂𝐒]/giu.source,
						"t": /[t⒯⊤⟙ℑtｔⓣₜᴛŧƫƭτⲧтፕꭲꮏｷꓔ千]/giu.source,
						"u": /[u⒰*#∪⋃uｕⓤꞟᴜꭎꭒɥvʋυսሀሁᑌꓴ𝐔-]/giu.source,
						"v": /[v⒱℣√∨⋁☑✅✔۷٧uvｖⅴⓥⱽᴠνѵⴸꮙꮩᐯᐺꓦ𝐕]/giu.source,
						"w": /[w⒲ɯwｗⓦᴡʍѡԝաሠꮃꮤꓪ]/giu.source,
						"x": /[x᙮⒳᙭×⌧╳⤫⤬⨯xｘⅹⓧₓꭓχⲭжхӽӿҳאⵝᕁᕽᚷﾒꓫ乂𝐗]/giu.source,
						"y": /[y⒴५ɣvᶌyｙⓨʏỿꭚγℽυϒⲩуүყሃꭹꮍꓬ𝐘*#-]/giu.source,
						"z": /[z⒵zｚⓩℤℨᶻᴢƶȥʐʑⱬƹƨζչꮓᙆえꓜ乙𝐙]/giu.source,
					}[letter] || letter),
			),
		)
		.join("|");
}

export const badWordRegexps = badWords.map(
	([strings = [], words = [], prefixes = []]) =>
		new RegExp(
			(strings.length ? `${decodeRegexps(strings)}|` : "(?!x)x") +
				`\\b(?:${words.length ? `(?:${decodeRegexps(words)})\\b` : "(?!x)x"}${
					prefixes.length ? `|${decodeRegexps(prefixes)}` : "(?!x)x"
				})`,
			"giu",
		),
);

export default function tryCensor(
	text: string,
	strikeShift = 0,
): false | { censored: string; strikes: number; words: string[][] } {
	const words: string[][] = [];
	const censored = badWordRegexps.reduce((string, regexp, index) => {
		words[index] ??= [];

		return string.replaceAll(regexp, (word) => {
			if (
				(/[\d!#*@|-]/gi.exec(word)?.length ?? 0) > word.length * 0.5 + 1 ||
				word.startsWith("-") ||
				word.endsWith("-")
			)
				return word;

			words[index]?.push(word);
			return word.length < 4
				? "#".repeat(word.length)
				: word[0] + "#".repeat(word.length - 1);
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
		baseChannel.parent?.id === config.channels.mod?.parent?.id ||
		(baseChannel.id === config.channels.tickets?.id &&
			channel?.type === ChannelType.PrivateThread)
	);
}

export function isPingable(name: string): boolean {
	const normalized = name.normalize("NFD").replaceAll(/\p{Dia}/gu, "");
	return /^[\w`~!@#$%^&*()=+[\]\\{}|;':",./<>?-]$|(?:[\w`~!@#$%^&*()=+[\]\\{}|;':",./<>?-].?){2,}/u.test(
		normalized,
	);
}
