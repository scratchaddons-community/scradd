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
							"a": "ᴬа𝐴a𝑎₳αΛａ𝔞𝖆ꙅ𝕒𝓪𝒶𝐚𝗮𝘢𝙖𝒂𝚊ⓐAᵃₐ🄰🅰̲åǟÃą̾e̶̷̵̴̳͎͓̽̃̊ᴀɒɐ҉4*Δ@⒜คภᗩ",
							"b": "฿bᴮ8ᵦႦცҍв҉ｂ𝔟𝖇𝕓𝓫𝒷𝐛𝗯𝘣𝙗𝒃𝚋ⓑBⒷᵇ🄱🅱̶̷̴̲̳͎͓̾̽̉̆ʙɓ⒝Ᏸᗷ",
							"c": "¢𝘾₵c🄲🅲҉с𝙲ｃCＣℂᶜ̲ç̶̷̴̳͎͓̾̽̓͋ᴄƈ匚ᑦℭⓒ⒞ᐸᑕᑢ",
							"d": "ɒdᴰｄďⓓ⒟ժ҉DＤᵈԃ̸̶̷̲̳͎͓̒̏̾̽Đ̴Ðᴅɖᗪ",
							"e": "£ɐa𝙀eᴇ❸③є３₃³⑶ꮛᵉɛჳ⓷еₑ*ｅⓔℨ3⒠ᗱ",
							"f": "⸁fᶠｆⓕ⒡₣ғ҉ϝFＦ̶̷̴̲̳͎͓̾̽̀̊ꜰƒʄᖴ",
							"g": "₲gց𝓰҉ｇGᵍ̲Ğ̸̶̷̴̳͎͓͛͋̾̽ɢɠⓖ⒢Ꮆ",
							"h": "hհ҉ｈнԋΉʰₕ̲卄Ĥ̶̷̳͎͓̾̽͊͠Ħ̴ʜɦⱧɧክ#ዪዘℜℍⓗℌ⒣Ꮒᕼん",
							"i": "1i𝓲ᵢӀ𝙄ɪƖⁱ*ᴉjᶦｉіⓘℹ❶|①１₁¹⑴⇂⥜⓵ⅰ❗❕!¡lℑ⒤",
							"j": "j҉ｊJ𝙅𝙹ʲⱼ̲Ĵ̶̷̵̴̳͎͓̾̽͂͝ᴊʝɟʄյⓙℑ⒥ᒍᒚ",
							"k": "₭k𝚔кӄҟҜ҉ｋKＫᵏₖ̶̷̴̲̳͎͓̦̾̽͑ᴋƙʞⓚ⒦Ꮶᛕ",
							"l": "ₗiｌⓛl|⒧҉ℓˡ̲Ļ̶̷̵̴̳͎͓̾̽̒̀ʟⱠɭɮꞁןᏝᒪﾚㄥ",
							"m": "♍𝙈𝑚ₘｍʍﾶጠⓜmⓂ️⒨๓₥҉м𝔪𝖒𝓶𝓂𝕞𝐦𝗺𝘮𝙢𝒎𝚖爪MＭᵐ̶̷̴̲̳͎͓̾̽̀̒ᴍɱᎷᗰᘻ",
							"n": "𝓷♑ⁿₙn𝑛ሸℕиｎⓝ⒩₦ռηղП҉ђ̲ñ̶̷̴̳͎͓̾̽̀̉ɴᴎɳŋ刀Ꮑᑎᘉ",
							"o": "🙰ф𝑜𝙊°🄾🅾𝚘⊘ዐоοoₒዕ*ｏⓞ⓪⓿０₀⁰θ○⭕0⒪¤ºᵒǫᴏɔ",
							"p": "pᴘ𝙋የₚℙｐⓟᵖ⒫",
							"q": "qϙфϱ۹ℚoｑⓠ⒬ᑫ",
							"r": "r𝙍𝚛ℝｒዪ尺ʳⓡ⒭ᵣՀʀɾ卂几乃Ꮧ",
							"s": "§ˢs𝙎ᔆₛｓⓢ$⒮₴5ѕꙅ҉ֆςS̲ŜŞßꜱʂᎦᏕᔕ丂",
							"t": "тʅᴛ𝙏千ŦtｔƬፕᵗⓣℑₜ⒯ｷ",
							"u": "uᵤ𝚞ᴜɥɯvሁυᵘ*ሀｕⓤ⒰",
							"v": "√vⱽｖ℣✅u☑✔ⓥ⒱۷ѵ҉νΛVᵛᵥᴠʋʌᏉᐯᐺ",
							"w": "𝓌🆆🅆Wʷᴡʍwｗሠⓦ⒲",
							"x": "⌧᙭×xᕽₓｘⓧﾒ⒳҉χXЖˣӼӾҳא乂",
							"y": "५vyγሃｙⓨ⒴ʸʏᵧ",
							"z": "z𝑧҉չｚZえᶻᴢƵȥʐʑⱫƹ乙Ƨᙆℤⓩ⒵",
							"'": "‘’",
							"7": "ᖭ",
							"-": "ー",
							"!": "！",
						}[letter] || ""
					}${letter}]`,
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
export default function censor(text) {
	/** @type {string[][]} */
	const words = [];
	const censored = badWordRegexps.reduce((string, regexp, index) => {
		words[index] ??= [];

		return string.replaceAll(regexp, (word) => {
			words[index]?.push(word);

			return word.length === 1 ? "#" : word[0] + "#".repeat(word.length - 1);
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
