import { ChannelType, PermissionFlagsBits } from "discord.js";

import { getBaseChannel } from "../util/discord.js";
import { caesar, normalize } from "../util/text.js";
import { PARTIAL_STRIKE_COUNT } from "./punishments.js";

/**
 * The index of each array determines how many strikes the word gives.
 *
 * The second sub-array is for words that must be surrounded by a word boundary.
 *
 * All words are ROT13-encoded.
 *
 * @type {[RegExp[], RegExp[]][]}
 */
const badWords = [
	[
		[/cbea/, /grfgvpyr/, /fpuzhpx/, /erpghz/, /ihyin/, /🖕/, /卐/, /卍/, /lvss/, /ahg ?fnpx/],
		[
			/intva(?:f|l|n|r|y)+/,
			/(?:urzv ?)?crav(?:f?rf|yr)?/,
			/nahf(?:rf)?/,
			/frzra/,
			/(?:c(?:bfg|er) ?)?phz/,
			/pyvg/,
			/gvg(?:(?:gvr)?f)?/,
			/chff(?:l|vrf)/,
			/fpebghz/,
			/ynovn/,
			/xlf/,
			/preivk/,
			/ubeal/,
			/obaref?/,
			/fcrez/,
		],
	],
	[
		[
			/fuv+r*g(?!nx(?:r|v))/,
			/rwnphyngr/,
			/fcyb+tr/,
			/oybj ?wbo/,
			/shpx/,
			/znfg(?:h|r)eong/,
			/ohgg ?cvengr/,
			/qvyqb/,
			/xhxfhtre/,
			/dhrrs/,
			/wnpx ?bss/,
			/wrex ?bss/,
			/ovg?pu/,
			/ubeal/,
		],
		[
			/wvm+z?/,
			/(?:ovt ?)?qvp?xr?(?: ?(?:q|l|evat|ef?|urnqf?|vre?|vat|f|jnqf?))?/,
			/(?:8|o)=+Q/,
			/fzhg+(?:e|fg?|l|vr)?/,
			/pbpx(?: ?svtug|fhpx|(?:fhpx|svtug)(?:re|vat)|znafuvc|hc)?f?/,
			/onfgneq(?:vfz|(?:e|y)?l|evrf|f)?/,
			/phagf?/,
			/shx/,
			/ovg?fu/,
			/jnax(?:v?ref?|v(?:at|rfg)|yr|f|l)?/,
		],
	],
	[
		[
			/puvat ?(?:punat ?)?puba/,
			/xvxr/,
			/pnecrg ?zhapure/,
			/fyhg/,
			/fur ?znyr/,
			/shqtr ?cnpxr/,
			/ergneq/,
		],
		[
			/tbbx(?:f|l)?/,
			/yrfobf?/,
			/fcvpf?/,
			/j?uber/,
			/av+t{2,}(?:(?:h|r)?e|n)(?: ?rq|l|qbz|urnq|vat|vf(?:u|z)|yvat)?f?/,
			/snv?t+(?:rq|vr(?:e|fg)|va|vg|bgf?|bge?l|l)?f?/,
			/wnc(?:rq?|r?f|vatf?|crq|cvat|cn)?/,
		],
	],
];

if (process.env.NODE_ENV !== "production") badWords[1]?.[0].push(/nhgbzbqzhgr/);

/**
 * Decodes RegExes to not be rot13’d & to add unicode letter fonts.
 *
 * @param {RegExp[]} regexes - RegExes to decode.
 *
 * @returns {string} Decoded RegExes.
 */
function decodeRegexes(regexes) {
	return regexes
		.map(({ source }) =>
			caesar(source).replaceAll(
				// eslint-disable-next-line @redguy12/no-character-class -- It’s OK to use a character class here.
				/[ a-z]/gi,
				(letter) =>
					`[${
						{
							" ": "^w",
							"a": "⒜@*⍺₳4aａⓐAＡᵃₐᴬåǟÃąẚᴀɐɑɒαΑΔΛаАคภᎪᗅᗩꓮ",
							"b": "⒝฿8bｂⓑℬʙɓꞵƅβвьҍⴆცꮟᏸᏼᑲᖯᗷꓐ",
							"c": "⒞¢₵cｃⅽⓒℂℭᶜᴄƈϲⲥсꮯᐸᑕᑢᑦꓚ匚",
							"d": "⒟ɒdｄⅾⅆⓓⅅđðᴅɖԁԃժꭰꮷᑯᗞᗪꓒꓓ𝐃",
							"e": "⒠*℮⋿£3aɐeｅⅇℯⓔℰₑᴇꬲɛεеєҽⴹꭼꮛꓰ𝐄",
							"f": "⒡⸁₣fｆⓕℱᶠꜰꬵꞙƒʄſẝϝғքᖴꓝ𝐅",
							"g": "⒢₲gｇℊⓖɡɢᶃɠƍԍցꮆꮐᏻꓖ𝐆",
							"h": "⒣#hｈℎⓗℍℌℋₕħʜɦⱨɧℜηⲏнԋһհክዘዪꮋꮒᕼんꓧ卄𝐇",
							"i": "!¡⑴⒤*׀⇂|∣⍳❕❗⥜1１❶①⓵¹₁iｉⅰⅈℹⓘℐℑⁱıɪᶦᴉɩjlｌⅼℓǀιⲓіꙇӏוןاﺎﺍߊⵏꭵᛁꓲ",
							"j": "⒥ℑjｊⅉⓙⱼᴊʝɟʄϳјյꭻᒍᒚꓙ𝐉",
							"k": "⒦₭kｋⓚₖᴋƙʞκⲕкӄҟҝꮶᛕꓗ𝐊",
							"l": "⒧׀|∣1iｉⅰℐℑɩlｌⅼℓⓛℒₗʟⱡɭɮꞁǀιⲓⳑіӏוןاﺎﺍߊⵏꮭꮮᒪᛁﾚㄥꓡꓲ",
							"m": "⒨♍₥๓mｍⅿⓜℳₘᴍɱnꭑʍμϻⲙмጠꮇᗰᘻᛖﾶꓟ爪𝐌",
							"n": "⒩♑₦nｎⓝℕⁿₙɴᴎɲɳŋηνⲛђипղոռሸꮑᑎᘉꓠ刀𝐍",
							"o": "⒪*°⊘⍥○⭕¤၀๐໐߀〇০୦0०੦૦௦౦೦൦０⓪⓿⁰₀٥۵oｏℴⓞºₒᴏᴑꬽθοσⲟофჿօסⵔዐዕଠഠဝꓳ",
							"p": "⒫⍴pｐⓟℙₚᴘρϱⲣрየꮲᑭꓑ𝐏",
							"q": "⒬۹9oqｑⓠℚϙϱԛфգզⵕᑫ𝐐",
							"r": "⒭rｒⓡℝℛℜʀɾꭇꭈᴦⲅгհዪꭱꮁꮢꮧᖇꓣ乃几卂尺𝐑",
							"s": "⒮§$₴5sｓⓢₛꜱʂƽςѕꙅտֆꭶꮥꮪᔆᔕꓢ丂𝐒",
							"t": "⒯⊤⟙ℑtｔⓣₜᴛŧƫƭτⲧтፕꭲꮏｷꓔ千",
							"u": "⒰*∪⋃uｕⓤꞟᴜꭎꭒɥvʋυսሀሁᑌꓴ𝐔",
							"v": "⒱℣√∨⋁☑✅✔✔️۷٧uvｖⅴⓥⱽᴠνѵⴸꮙꮩᐯᐺꓦ𝐕",
							"w": "⒲ɯwｗⓦᴡʍѡԝաሠꮃꮤꓪ",
							"x": "᙮⒳᙭×⌧╳⤫⤬⨯xｘⅹⓧₓꭓχⲭжхӽӿҳאⵝᕁᕽᚷﾒꓫ乂𝐗",
							"y": "⒴५ɣvᶌyｙⓨʏỿꭚγℽυϒⲩуүყሃꭹꮍꓬ𝐘",
							"z": "⒵zｚⓩℤℨᶻᴢƶȥʐʑⱬƹƨζչꮓᙆえꓜ乙𝐙",
							// "'": "՝'＇‘’‛′‵՚׳ꞌיᑊᛌ",
							// "7": "7７ᖭ",
							// ".": ".．․܁܂ꓸ",
							// "!": "!！ǃⵑ",
							// "$": "$＄",
							// "%": "%％",
							// "&": "&＆ꝸ",
							// "(": "(（［❨❲〔﴾",
							// ")": ")）］❩❳〕﴿",
							// "*": "*＊⁎٭∗𐌟",
							// "+": "᛭+＋➕𐊛",
							// ",": ",，؍٫‚ꓹ",
							// "-": "-‐‑‒–﹘۔⁃−➖ーⲻ",
							// "/": "/⁁∕⁄〳ⳇノ丿⼃",
							// "0": "0߀०০੦૦୦௦౦೦൦๐໐၀〇０٥۵oｏℴᴏᴑꬽοσⲟоჿօסⵔዐଠഠဝꓳ",
							// "1": "׀|∣⍳￨1１iｉⅰⅈℐℑıɪɩlｌⅼℓǀιⲓіꙇӏוןاﺎﺍߊⵏꭵᛁꓲ",
							// "2": "2２ꝛƨϩꙅᒿ",
							// "3": "3３ɜȝʒꝫⳍзӡ",
							// "4": "4４ꮞ",
							// "5": "5５ƽ",
							// "6": "6６ⳓбꮾ",
							// "8": "৪੪8８ȣ",
							// "9": "੧୨৭൭9９ꝯⳋ",
							// ":": ":：։܃܄᛬︰⁚׃∶ꓽ",
							// ";": ";；",
							// "<": "‹❮<＜ᐸᚲ𝈶",
							// "=": "᐀⹀゠꓿=＝",
							// ">": "›❯>＞ᐳ",
							// "?": "?？ʔɂॽꭾ",
							// "@": "@＠",
							// "{": "{｛❴𝄔",
							// "}": "}｝❵",
							// "~": "⁓~∼",
						}[letter] || ""
					}${letter}]`,
			),
		)
		.join("|");
}

const badWordRegexps = badWords.map(
	([strings, words]) =>
		new RegExp(`${decodeRegexes(strings)}|\\b(?:${decodeRegexes(words)})\\b`, "g"),
);

/**
 * @typedef CensoredText
 *
 * @property {string} censored - The text with bad words censored out.
 * @property {number} strikes - The number of strikes this gives. Verbal warns are included as 0.25.
 * @property {string[][]} words - The caught words. The index of the subarray is how many strikes it gave. (Verbal warns are index 0).
 */

/**
 * Censors text.
 *
 * @param {string} text - The text to censor.
 *
 * @returns {false | CensoredText} - False if there was nothing to censor, a CensoredText object if there was.
 */
export default function censor(text) {
	/** @type {string[][]} */
	const words = [];
	const censored = badWordRegexps.reduce((string, regexp, index) => {
		words[index] ??= [];

		return string.replaceAll(regexp, (word) => {
			words[index]?.push(word);

			return word.length < 3
				? "#".repeat(word.length)
				: word[0] + "#".repeat(word.length - 1);
		});
	}, normalize(text));

	return words.flat().length > 0
		? {
				censored,

				strikes: words.reduce(
					(accumulator, current, index) =>
						current.length * Math.max(index, PARTIAL_STRIKE_COUNT) + accumulator,
					0,
				),

				words,
		  }
		: false;
}

/**
 * Check if bad words are allowed in a channel.
 *
 * @param {import("discord.js").TextBasedChannel | null} channel - The channel to check.
 *
 * @returns {boolean} - Whether bad words are allowed.
 */
export function badWordsAllowed(channel) {
	const baseChannel = getBaseChannel(channel);

	return (
		baseChannel?.type === ChannelType.DM ||
		!baseChannel?.permissionsFor(baseChannel.guild.id)?.has(PermissionFlagsBits.ViewChannel)
	);
}
