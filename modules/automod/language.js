import { ChannelType, PermissionFlagsBits } from "discord.js";
import badWords from "../../badWords.js";

import { getBaseChannel } from "../../util/discord.js";
import { caesar, normalize } from "../../util/text.js";
import { PARTIAL_STRIKE_COUNT } from "../punishments/punishments.js";

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
				/[ a-z]/gi,
				(letter) =>
					`[${letter}${
						{
							" ": "^w",
							"a": "⒜@*⍺₳4aａⓐAＡᵃₐᴬåǟÃąẚᴀɐɑɒαΑΔΛаАคภᎪᗅᗩꓮ",
							"b": "⒝฿8bｂⓑℬʙɓꞵƅβвьҍⴆცꮟᏸᏼᑲᖯᗷꓐ",
							"c": "⒞¢₵cｃⅽⓒℂℭᶜᴄƈϲⲥсꮯᐸᑕᑢᑦꓚ匚",
							"d": "⒟ɒdｄⅾⅆⓓⅅđðᴅɖԁԃժꭰꮷᑯᗞᗪꓒꓓ𝐃",
							"e": "⒠*℮⋿£3ɐeｅⅇℯⓔℰₑᴇꬲɛεеєҽⴹꭼꮛꓰ𝐄",
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
					}]`,
			),
		)
		.join("|");
}

const badWordRegexps = badWords.map(
	([strings, words]) =>
		new RegExp(`${decodeRegexes(strings)}|\\b(?:${decodeRegexes(words)})\\b`, "gi"),
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
export default function censor(text, remove = 0) {
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
						current.length * Math.max(index - remove, PARTIAL_STRIKE_COUNT) +
						accumulator,
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
		channel?.type === ChannelType.PrivateThread ||
		!baseChannel?.permissionsFor(baseChannel.guild.id)?.has(PermissionFlagsBits.ViewChannel)
	);
}

TODO;
