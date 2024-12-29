import type { Snowflake } from "discord.js";

import { client, mentionChatCommand } from "strife.js";

import config from "../../common/config.ts";
import constants from "../../common/constants.ts";

const say = constants.env === "testing" ? "/say" : await mentionChatCommand("say", config.guild);

export const MAX_NAME_LENGTH = 50,
	MIN_DISCORD_AGE = 13;

export const HAPPY_WORDS = [
	"feel like a room without a roof",
	"feel like happiness is the truth",
	"know what happiness is to you",
	// eslint-disable-next-line unicorn/string-content
	"feel like that's what I wanna do",
] as const;
export const WHOPPER_WORDS = (
	"Whopper Whopper Whopper Whopper Junior Double Triple Whopper " +
	"Flame-grilled taste with perfect toppers " +
	"I rule this day " +
	"Lettuce mayo pickle ketchup " +
	"It’s okay if I don’t want that " +
	"Impossible or bacon Whopper " +
	"Any Whopper my way " +
	"You rule " +
	"you’re seizin’ the day " +
	"At BK " +
	"have it your way " +
	"You rule"
).split(" ");

export const greetings = [
	"Ayy",
	"Greetings",
	"Hello",
	"Hey",
	"Hi",
	"Hiya",
	"Howdy",
	"Salutations",
	"Whattup",
	"Yo",
	"’Ello",
] as const;
export const customResponses: Record<string, string> = {
	// eslint-disable-next-line unicorn/string-content
	"0": "It shouldn't really be zero because infinity is weird to think about. Here's why infinity - infinity is not zero. Let's imagine you have infinite apples.  Now subtracting infinity things is like me taking away infinite apples from you. So, I start taking infinite apples away from you. `Infinity - Infinity = 0` implies that at some point you will be left with 0 apples and at that point I stop taking away apples. This is a paradox because I should never stop taking away apples (I can take *infinite* away from you, right? Why stop at 0?). That's why mathamatical expressions like `Infinity - Infinity` don't make any sense so they equal NaN.",
	"8bit": "<a:emoji:843583629955563550>",
	"Advertise": "No, you were licked",
	"Aidan": "> f||       ||",
	"Ajr": "when TMM",
	"Alan": `${constants.domains.scradd}/images/dad-alan.mp4`,
	"Amnesia": "memory loss is common in people with amnesia",
	"Anvils": "Ok",
	"Apple": ">>> OH WAIT\nI REPRODUCED <@242414226990301184>",
	"Argentine": "Who’s Tina",
	"Argentinian": "Who’s Tina",
	"Bad": ">>> And the whole world has to answer right now\nJust to tell you once again\nWho’s bad?",
	"Bagels":
		// eslint-disable-next-line unicorn/string-content
		"I love bagels\nbagels are round\nthe sun is round\nthe sun is yellow\nbananas are yellow\nsome people say I'm bananas\nthey should lock me in a box of bagels\nbagels?!",
	"Barack": `${constants.domains.scradd}/images/dad-barack.gif`,
	"Bddj": `|| ${constants.domains.scradd}/images/dad-bddj.mp4 ||`,
	"Believer":
		">>> Pain! You made me a, you made me a\nBeliever, believer\nPain! You break me down, you build me up\nBeliever, believer\nPain! Oh, let the bullets fly, oh, let them rain\nMy life, my love, my drive, it came from…\nPain! You made me a, you made me a\nBeliever, believer",
	"Biker": "No, he’s biking",
	"Blue": "da ba de da ba di",
	"Blueguy": `${constants.domains.scradd}/images/dad-blueguy.mp4`,
	"Bob": "OMG HACKER @ADMIN BAN",
	"Bored": "https://tenor.com/view/loud-house-loud-house-gifs-nickelodeon-plank-ouch-gif-8600173",
	"Bot": "`Hello, world, I’m Scradd!`",
	"Bruno": "We don’t talk about Bddj j j j 🎶",
	"Bug": "Are you sure, cause spiders are actually arachnids, not bugs",
	"Callum": "gn",
	"Cars": `${constants.domains.scradd}/images/dad-cars.mp4`,
	"Christell": "chipi chipi chapa chapa dubi dubi daba daba magico mi dubi dubi bum bum bum bum",
	"Clancy":
		">>> I am trapped. Stuck in a cycle I have never been able to break. I want to believe this is the last time, but I don’t know for sure.\n" +
		"\n I am a citizen. I am an escapee. I am an exception.\nI am returning to Trench.\nI am Clancy.",
	"Colaber": `${constants.domains.scradd}/images/dad-colaber.mp3`,
	"Colander": "colander allows spam",
	"Constructor": "¿Podrán hacerlo? ¡Sí podemos!",
	"Cook": "https://tenor.com/view/walter-white-meth-gif-26319392",
	"Cookie":
		"when i see cookie7 walk by i shiver and pee my pants because hes so scary and all the other students drop and hit their head on the locker doors and everybody starts running and screaming when cookie7 walks into the cafeteria like were scared that hes gonna burn down the school im peeing my pants rn",
	"Crazy":
		"Crazy? I was crazy once. They locked me in a room. A rubber room. A rubber room with rats. And rats make me crazy.",
	"Cst": "> CST 12:29",
	"Cubester": "> 😭😭 I still am not added",
	"Dango": `${constants.domains.scradd}/images/dad-dango.png`,
	"Dasani":
		// eslint-disable-next-line unicorn/string-content
		"That's because you drank Dasani. It's common to make that mistake where you drink the wrong water",
	"Ded": "But you’re sending messages?",
	"Disboard": "</bump:947088344167366698>",
	"Dog": "PEAAACHESSSS",
	"Early": "uhhhhhhhhhhhhhhhhhhhhhhhh- oh oops sorry",
	"Father": "https://tenor.com/view/no-scream-luke-skywalker-star-wars-gif-12810458",
	"Fire": "Water. Earth. Fire. Air. Long ago, the four nations lived together in harmony. Then, everything changed when the Fire Nation attacked. Only the Avatar, master of all four elements, could stop them, but when the world needed him most, he vanished. A hundred years passed and my brother and I discovered the new Avatar, an airbender named Aang. And although his airbending skills are great, he has a lot to learn before he’s ready to save anyone. But I believe Aang can save the world.",
	// eslint-disable-next-line unicorn/string-content
	"Fraction": ">>> You're calling me something that I eat?\nIt's fine",
	"Garbomuffin":
		// eslint-disable-next-line unicorn/string-content
		'In the whimsical world of Garboism, followers known as "Garbos" embrace a lighthearted belief in "The Great Muffin," a symbol of warmth, support, and humor. Garbos believe that life\'s unpredictability is best navigated with a sprinkle of silliness, embodied by Garbo the Muffin. At the heart of Garboism is "Garbomuffin," a legendary helper who solves life\'s challenges with a touch of wisdom and laughter. Garbos express their gratitude through muffin-themed humor and hold that without The Great Muffin, life would lack its delightful, unexpected moments. Garboism reminds us that amidst life\'s chaos, a little humor and wonder, represented by a metaphorical muffin, can make the journey sweeter.',
	"Gboard":
		"Welcome to Gboard clipboard, any text that you copy will be saved here.Tap on a clip to paste it in the text box.Touch and hold a clip to pin it. Unpinned clips will be deleted after 1 hour.Use the edit icon to pin, add or delete clips.",
	"Giveaway":
		"> This is your friendly reminder that **FREE NITROS ARE SCAM** and you should **NEVER EXECUTE RANDOM PROGRAM** especially ones recommended by a random person from Discord DM. Also, colander deleted this message for some reason.",
	// eslint-disable-next-line unicorn/string-content
	"Goldfish": `goldfish jr story 1:\nok so theres this one goldfish named "timmy jr" and he went to a quest to find amongus\nso he went to the amogus temple and had to solve questions\nbut he didnt want to do that\ninstead he voted out funny impostor\nand he won\nand then died\nR.I.P\nmoral of story: dont go to amogus temple\nyes, its that random\nits more funny if i told you in vc but i cant`,
	"Griffpatch": "f4f?",
	"Guthib": "https://guthib.com/",
	"Him": "he thinks he’s him 😭😭",
	"Https": "> man my scradd feature would be really useful rn",
	"Isonline": `${constants.domains.scradd}/images/dad-isonline.png`,
	"Itta": "Opacity Slider",
	"Java": "Java is to JS as car is to carpet",
	"Jazza": "> ||Use an external image editor||",
	"Jeffalo": "> my gender is toaster im pretty sure",
	"Jeffdaboi": `${constants.domains.scradd}/images/dad-jeffdaboi.png`,
	"Jxvi": `${constants.domains.scradd}/images/dad-jxvi.webm`,
	"Kc": "> a",
	"Ken": ">>> Anywhere else, I’d be a ten\nIs it my destiny to live and die a life of blond fragility?\nI’m just Ken\nWhere I see love, she sees a friend\nWhat will it take for her to see the man behind the tan and fight for me?",
	"Kid": ">>> and all life is a nightmare\nI’m just a kid, I know that it’s not fair\nNobody cares, ’cause I’m alone and the world is\nHaving more fun than me, tonight",
	"Late": "omg is that a __** <@312042645453144064>**__ REFERENCE?⁉!",
	"Leaving": "Byesexual",
	"Lerc": ">>> r!suggest\nr!suggest\nr!suggest",
	"Linux":
		// eslint-disable-next-line unicorn/string-content
		"I'd just like to interject for a moment. What you're refering to as Linux, is in fact, GNU/Linux, or as I've recently taken to calling it, GNU plus Linux. Linux is not an operating system unto itself, but rather another free component of a fully functioning GNU system made useful by the GNU corelibs, shell utilities and vital system components comprising a full OS as defined by POSIX.\nMany computer users run a modified version of the GNU system every day, without realizing it. Through a peculiar turn of events, the version of GNU which is widely used today is often called \"Linux\", and many of its users are not aware that it is basically the GNU system, developed by the GNU Project.\nThere really is a Linux, and these people are using it, but it is just a part of the system they use. Linux is the kernel: the program in the system that allocates the machine's resources to the other programs that you run. The kernel is an essential part of an operating system, but useless by itself; it can only function in the context of a complete operating system. Linux is normally used in combination with the GNU operating system: the whole system is basically GNU with Linux added, or GNU/Linux. All the so-called \"Linux\" distributions are really distributions of GNU/Linux.",
	"Lol": "oof I just got loled",
	"Loss": "# ~~:.|:;~~",
	"Luke": "i3henj jnjbsdhnzojihbdfnm ,dsaknJzx",
	"Mallow":
		"# A Historical Overview of the Marshmallow People\nThe marshmallow or Mallow people according to legend were created around 2,550 bc.\nLegend says that Sneferu, who was the pharaoh at the time, summoned his favorite couple: توماس (Thomas) and إميلي (Emily) who still had not had children at that time. Sneferu then sacrificed over 100 bulls and over 1000 sheep to summon Heka (the Egyptian god of magic). Heka, impressed by the gifts, appeared in a flash of brilliant white light then gave توماس  and إميلي, as far as we can tell, 2 marshmallows and told them to consume them. When they did, their skin went white as milk and became soft and squishy. The Mallow people began to grow in population. Approximately 200 years later, Meryre (the current pharaoh) fearing that the mellow people would take over his kingdom, chased them out of Egypt killing many of the mellow people as they fled. Eventually, the Mellow people made their way to The Great Vasyugan Mire where they lived in peace for many years. How they got to the Vasyugan Swamp is lost to history.\nFor around 4000 years 95% of the mellow population stayed in the Vasyugan Swamp up until the 1800’s when the mellow people began to spread throughout the world; although 50% of the population remain in the Vasyugan Swamp to this day.\nHistorically, the Mallow people lived in Giant Marshroom houses; the species of Giant Marshrooms has long died out.\nMarshmallow people are renowned for their ability to fall from great heights, they are able to fall from over 15.5 meters (50.8 feet) with virtually no injuries. (the world record is 77.25 meters or 253.44 feet)\nMallow people can eat most of the same food has humans, although according to a survey taken in 2005, most love mushrooms\nThe Mallow population, as of a study done in 2019, is approximately 27.3 million",
	"Mark": "*mharcc",
	"Mater":
		"https://tenor.com/view/cars-tow-mater-yeah-like-tuh-mater-but-without-the-tuh-mater-gif-22272080",
	"Mee6": "screw you how’d you get here",
	// eslint-disable-next-line unicorn/string-content
	"Meth": "meth's actually really interesting, it's a substituted amphetamine, so one of the hydrogens in the NH₂ is substituted with a CH₃ - amphetamine itself is also a similar drug\nMDMA is also a substitued amphetamine, with the H substituted with a C₂H₃O₂ iirc, which is acetate which makes up fats\nso yeah it seems like the more stuff you add on to the molecule, the more potent it becomes\nthat message was meant to reply to yande's message but discord broke\ncocaine's even more interesting\nbut I do wonder why ethamphetamine (and butamphetamine, prop-, pent- etc) isn't a thing, where you'd substitute the H with the relevant alkane (minus 1 H)",
	"Mfw": "mfw i gaslight people into thinking mfw means mfs when 🤣",
	"Mistyeyed":
		">>> therefore I’m (I’m)\n" +
		"\n Can you save, can you save my\nCan you save my heavydirtysoul?\nFor me, for me (Uh)\nCan you save my heavydirtysoul?",
	"Mother":
		"https://tenor.com/view/your-mother-great-argument-however-megamind-your-mom-yo-mama-gif-22994712",
	"Mov": `${constants.domains.scradd}/images/dad-mov.jpg`,
	"Mrduck": "> bi",
	"Mxmou": "mxmou king",
	"Nate": "Rest In Piece",
	"New": "<:emoji:1091409541079507104>",
	// eslint-disable-next-line unicorn/string-content
	"Nora": "> they're*",
	"Normal": `${constants.domains.scradd}/images/dad-normal.png`,
	"Not": "Who *are* you then?",
	"Nutella": `${constants.domains.scradd}/images/dad-nutella.jpg`,
	"Nuts": "Nuts? I went nuts once. They trapped me inside a tree. A giant tree. A giant tree full of squirrels. And squirrels drive me nuts.",
	// eslint-disable-next-line unicorn/string-content
	"Pancake": "> Let's play a game",
	"Pesto": "mmjmmmjnmjn mjn mkjnm,mnbnmjnmjnjnjnmjmjh",
	"Place": `${constants.domains.scradd}/images/dad-place.mp4`,
	"Plate": "https://www.youtube.com/watch?v=T_lC2O1oIew",
	"Plert": "> Make scratch addons available for internet explorer",
	"Pooping": "https://tenor.com/view/hes-pooping-despicable-me-agnes-poop-busy-gif-4068329",
	"Potato":
		// eslint-disable-next-line unicorn/string-content
		"I generally don't want this message to be on the potatoboard. What is the point? This message serves 0 value of interest and has no point being on the potatoboard. Why is it even called potatobard? Like what's the interesting about a root vegetable. There are so many messages that you can react with a potato emoji and this message is not one of them. I can see you thinking that this is an opportunity to add another message to the potatoboard. Why? Just why? What's the point? There is no point wasting your seconds reacting to a message with a potato as every second is important. Every second, every minute, every hour, and so on. Just post a message that has some value. Like comedy where you say something funny. That will be deserved on the potatoboard, although that wastes more time. Just forget it. You already unintentionally wasted time reading this message anyway. I'll just stop typing more because I'll waste your time otherwise.\nYou know what, 🥔",
	"Potatoboard":
		"> react with 🥔 to this message\n" +
		"\n> when we get 6 potatoes it gets onto the potatoboard\n" +
		"\n> react with potato emoji if you like potato",
	"Problem":
		">>> it’s me\nAt teatime, everybody agrees\nI’ll stare directly at the sun, but never in the mirror\nIt must be exhausting always rooting for the anti-hero",
	"Queer": `${constants.domains.scradd}/images/dad-queer.mov`,
	// eslint-disable-next-line unicorn/string-content
	"Rab": 'RAB? WHAT A COMICAL MISSPELLING OF THE COMMON WORD "TAB", I THERBY PLEAD EVERYONE READING THIS INTERNET MESSAGE TO DIGITALLY LAUGH AT THIS USER FOR SUCH A HUMOURUS MISTAKE! 🤣🤣',
	"Rachel": `${constants.domains.scradd}/images/dad-rachel.png`,
	"Racist": "https://tenor.com/view/race-car-peugeot-meme-racist-mode-gif-23410462",
	"Radioactive":
		">>> I’m waking up to ash and dust\nI wipe my brow and I sweat my rust\nI’m breathing in the chemicals\n" +
		"\nI’m breaking in, shaping up\nThen checking out on the prison bus\nThis is it, the apocalypse\nWoah",
	"Ready":
		">>> My lady, I know what you’re thinking\nWhen the bass starts ringing\nCan you tell me when you’re stoked to start?\nAre you ready for tonight, setting it on fire\nAnd we’ll dance until we’re dumb in the dark",
	"Retron": `${constants.domains.scradd}/images/dad-retron.png`,
	"Rg": `> ${constants.emojis.misc.loading} **Several people** is typing…`,
	"Richard":
		// eslint-disable-next-line unicorn/string-content
		"No, Richard, it's 'Linux', not 'GNU/Linux'. The most important contributions that the FSF made to Linux were the creation of the GPL and the GCC compiler. Those are fine and inspired products. GCC is a monumental achievement and has earned you, RMS, and the Free Software Foundation countless kudos and much appreciation.\nFollowing are some reasons for you to mull over, including some already answered in your FAQ.\nOne guy, Linus Torvalds, used GCC to make his operating system (yes, Linux is an OS -- more on this later). He named it 'Linux' with a little help from his friends. Why doesn't he call it GNU/Linux? Because he wrote it, with more help from his friends, not you. You named your stuff, I named my stuff -- including the software I wrote using GCC -- and Linus named his stuff. The proper name is Linux because Linus Torvalds says so. Linus has spoken. Accept his authority. To do otherwise is to become a nag. You don't want to be known as a nag, do you?",
	"Rick": "https://www.youtube.com/watch?v=kXhjgnBh0m0",
	"Rimopa": "> r!pl",
	"Robotop": "Hey who invited you back?? 😡 I was supposed to replace you!",
	"Robtop": "when 2.2",
	"Sa": `${constants.domains.scradd}/images/dad-sa.gif`,
	"Say": `What’s ${say}`,
	"Scatt":
		"I hear y’all ask ’bout the meaning of Scatt\nWell, I’m the professor and all I can tell you is\nWhile you’re still sleeping, the saints are still weeping ’cause\nThings you called dead haven’t yet had the chance to be born\nI’m the Scraddman",
	"Scradd": "## T͞H̰̥͡E̞̝̕R҉͇̩̻E̵̥̞ ̻C̺̜͎A̠̤̗Ṇ̙͕ ̘̖̜Ò̲N͎̥͡L̲͔̜Y̹͞ͅ ̜̝̱B͍̤ͅE̶̞̱ ̵O̼͖N͓E҉̱͕̳",
	"Scraddonium": "😶",
	"Scratch":
		// eslint-disable-next-line unicorn/string-content
		'SCRATCH MADE ME GO CRAZY, I SWEAR, SO I WALKED UP TO SCHOOL, AND SAW A POSTER SAYING "We Build this House from Scratch" IN THE STREETS AS AN ADVERTISEMENT, I WAS LIKE "NO WAY??? SCRATCH REFERENCE???" BUT IT DIDNT END HERE!!! SO THEN I WENT TO SCHOOL, AND ONE OF THE KID SCRATCHED HIS HEAD, AND THEN AGAIN, I WAS LIKE "NO WAY SCRATCH REFERENCE???"I WAS BECOMING INSANE, BUT THE LAST STRAW WAS WHEN IT WAS TIME FOR SCIENCE LESSONS, THE TEACHER EXPLAINED TO US WHY HUMANS TENDS TO SCRATCH OURSELVES, AND THATS IT, I WAS BECOMING CRAZY, AND DELETED THIS SPRITE CALLED "Teacher"!!! NOW IM STUCK IN A PROJECT CALLED "Prison" AND ALL I CAN DO IN THIS PROJECT IS WAIT AND DO NOTHING, WHAT DO I DO????',
	"Semiautomatic":
		">>> My prayer’s schizophrenic\nBut I’ll live on, yeah I’ll live on, yeah I’ll live on",
	"Shampoo":
		"Swallowed shampoo, probably gonna die. It smelled like fruit; that was a lie. Called the number on the bottle, spoke to a guy. He said “Vomit”, I said “Why?” He said “Poison”, I said “Goodbye”. I look at my finger, I look at my life. It wasn’t that much, I’ll probably be fine!\nI swallowed shampoo, probably gonna die! It smelled like fruit; that was a lie! **I swallowed shampoo, probably gonna die! It smelled like fruit; that was a lie!** (I swallowed shampoo, probably gonna die. It smelled like fruit; that was a lie.)\n“Here lies the [idiot] who drank shampoo, even though the bottle had a warning not to!”\nI SWALLOWED SHAMPOO, PROBABLY GONNA DIE! IT SMELLED LIKE FRUIT; THAT WAS A LIE! **I SWALLOWED SHAMPOO, PROBABLY GONNA DIE! IT SMELLED LIKE FRUIT; THAT-** That was, uh, not what it tasted like.",
	"Showcase": "> Rest in peace showcase. You were a terrible channel, but we loved you ❤️",
	"Showering": "If I was <@761276793666797589>, I’d join you",
	"Slimaq": "discord.gg/3SrmPmQe7b",
	"Spongebob":
		">>> Who lives in a pineapple under the sea?\nAbsorbent and yellow and porous is he\nIf nautical nonsense be something you wish\nThen drop on the deck and flop like a fish\n" +
		"\nReady?",
	"Standing":
		">>> better than I ever did?\nLookin’ like a true survivor, feelin’ like a little kid\nAnd I’m still standin’ after all this time\nPickin’ up the pieces of my life without you on my mind",
	"Sunshine":
		"https://tenor.com/view/lebron-sunshine-lebron-james-sunshine-sunshine-lebron-you-are-my-sunshine-you-are-my-sunshine-gif-509896211431970290",
	"Sup": "> but I like the sound of Scrad",
	"Taco": "https://tenor.com/view/twerking-taco-twerking-taco-gif-12438251",
	"Teapot": "I won’t ask you to brew me coffee then",
	"Toe": "<@916740508368384010>",
	"Tom":
		"Do you want your hide your sexuality from your college administrators? Do you want to download huge amounts of pirated content with an extremely low, but not zero, risk of being found out? Are you planning an assassination and want to hide your tracks? Then you need [SPONSOR] VPN, the best choice for gay people, pirates, assassins, and gay pirate assassins.\n" +
		"\n[SPONSOR] VPN is a tool that can be used both for good and evil, and it’s extremely unlikely to be a front for the FBI. But you should know: unless you are being personally targeted by well-funded hackers using exploits that the world doesn’t know about yet, it doesn’t make your passwords and financial data any more safe. They’re already pretty safe. And if you are being targeted by hackers like that, you have bigger problems. But if you want to hide your identity, pretend you’re in another country, or make sure your connection is secure as you work out the lethal doses of particular chemicals, then go to [SPONSOR].com/honest for [SPONSOR]\n" +
		"\n(That was a lot of money left on the table. Lot of money.)",
	"Ucrash": "> robotop is also a good bot",
	"Water":
		// eslint-disable-next-line unicorn/string-content
		"water is a simple covalent molecule made up of two atoms of hydrogen and 1 atom of oxygen. It has the molecular formula H2O (but with a subscript '2', as is common in chemical literature but currently unavailable on my keyboard). Water is often seen as an essential part of life, with many lifeforms needing to consume water in order to survive. The net movement of water from an area of high concentration to an area of low concentration through a partially permeable membrane is known as osmosis - the reason for which it is not aimply knowm as 'diffusion of water' is unknown to the author of this essay. Water may also be a misspelling of 'Walter', perhaps in referemce to Walter White, a character from the popular television series 'Breaking Bad', who creating pharmaceutical products such as methamphetamine, a substituted amphetamine which is not particularly easy to produce without specialist equipment - however thr author assumes that water would be required at some point in the process. 'Water' generally refers to liquid H2O - thr gaseous form is known as steam or water vapour - which is a relatively non-potent grernhouse gase which absorbs and reemits infrared radiation due to a lack of symmetry in the way that energy is absorbed and released by bonds - and the solid form is known as ice. Peculiarly, ice is less dense than liquid water, which is the opposite behaviour to most substances. Pure water freezes at 0 degrees celcius and boils at 100 degrees celcius - disdolving solid solutes in water decreases its melting point and increases its boiling point, hence why salt is added to roads during the winter season, and added to cooking pots when cooking potatoes (it decreases the time needed to cook the potatoes since the water can be hotter before boiling off and adds that little bit of extra flavour to detract from the otherwise bland nature of the potatoes).",
	"Weak": ">>> and what’s wrong with that?\nBoy, oh boy I love it when I fall for that",
	"Weirdo": "WE GOTTA GET REDGUY BACK!",
	"Who": "asked",
	"Wierd":
		"I before E, except after C\n…or when your feisty foreign neighbor, Keith Einstein, leisurely receives eight counterfeit beige sleighs from your caffeinated atheist heir\n…or when you heinously seize freight in a heist with your deceived (but agreeing) weightlifting reindeer\n…or when a protein-veined being feints, neighs, and reigns like a deity.\n" +
		"\n**Weird.**",
	"Wifi": "Greetings Wi-Fi, you are a wireless networking technology that allows devices to communicate over radio waves, which are a type of electromagnetic radiation that can travel through space and air. You are also a trademarked term that stands for Wireless Fidelity, but this name was not originally intended to mean anything, but was created by a marketing firm as a catchy alternative to the technical standard IEEE 802.11. You are a protocol for wireless local area network communication using spread spectrum modulation techniques in the 2.4 GHz and 5 GHz frequency bands, which are part of the microwave spectrum. You use radio waves to transmit data by dividing the signal into smaller pieces and transmitting them over multiple frequencies within a channel, which reduces interference and increases security. Will you stop disconnecting me from Roblox games? I will deny your service if you don’t.",
	"William": "> i can give myself admin?",
	"X": `${constants.domains.scradd}/images/dad-x.png`,
	"Xan": "( ^∘^)つ `Hello! I want to tell you about a really cool server!`",
	"You": "I doubt that.",
	"Yours": "😚",
	"Yoyitsm3m8":
		"> Is there a discord server?\n" +
		"\n> **edit:** also could i be added to the organization?",
	"Yuse": "> Nidhogg",
	"Zenith": "> 🐢 My custom dad response indicates Turtle",
	"Zero": "> Hello, hello\nLet me tell you what it’s like to be a zero, zero\nLet me show you what it’s like to always feel, feel\nLike I’m empty and there’s nothing really real, real\nI’m looking for a way out",
	"Zoo":
		"Rated E for ehh, it’s pretty good.\nFrom the creator of the second-best fox in the Geometry Dash community, as well as that one site with the vine booms, and also rip-off 2.2, comes a Discord idle game, unlike anything you’ve ever seen before.\n" +
		"\nIt’s frickin’ zoo.\nRescue some animals, wait a couple hours, then do it again, collect as many as you can, and subject yourself to the most unfunny and repetitive quotes you’ve ever seen. Trade with other server members, so you can hoard up your favorite animals, and maybe even exchange them for rarer ones … Break the entire game, or just exploit it, or get increasingly meta with it. This bot is the purest example of what happens when you give full creative freedom to a 19-year-old programmer with ADHD.\nSo what do you say? Is this something you want to waste your time on? All it takes is </rescue:1071113056123367450> and you can see where it goes from there. Soo yeah that’s what I’ve been wasting my life on.\n" +
		"\ni started this project two years ago what the hell am i doing with my life",
	// eslint-disable-next-line unicorn/string-content
	"🕷️": "Honestly, I hate the 🕷️  emoji so much, and I'm going to rant so if you don't want to read three paragraphs worth of me ranting about a default discord emoji, then click off this channel. First of all, I swear, you need a microscope, a magnifying glass, and possibly the Hubble Space Telescope just to catch a glimpse of it. Not to mention the additional 302304920983408e+ client modifications and web editors just to see the emoji. Sure, for light mode users, it's cool... (let me remind you that roughly 90% of discord users prefer to use dark mode.) [(cont)](https://discord.com/channels/1141222489582735360/1228005639934967868/1261144694101114921)",
	"🥔":
		"The 🥔 is a starchy tuber of the plant Solanum tuberosum and is a root vegetable native to the Americas. The plant is a perennial in the nightshade family Solanaceae.\n" +
		"\nWild 🥔 species can be found throughout the Americas, from Canada to southern Chile. The 🥔 was originally believed to have been domesticated by Native Americans independently in multiple locations, but later genetic studies traced a single origin, in the area of present-day southern Peru and extreme northwestern Bolivia. 🥔es were domesticated there approximately 7,000–10,000 years ago, from a species in the Solanum brevicaule complex. In the Andes region of South America, where the species is indigenous, some close relatives of the 🥔 are cultivated.\n" +
		// eslint-disable-next-line unicorn/string-content
		"\n🥔es were introduced to Europe from the Americas in the second half of the 16th century by the Spanish. Today they are a staple food in many parts of the world and an integral part of much of the world's food supply. As of 2014, 🥔es were the world's fourth-largest food crop after maize (corn), wheat, and rice. Following millennia of selective breeding, there are now over 5,000 different types of 🥔es. Over 99% of 🥔es presently cultivated worldwide descended from varieties that originated in the lowlands of south-central Chile. The importance of the 🥔 as a food source and culinary ingredient varies by region and is still changing. It remains an essential crop in Europe, especially Northern and Eastern Europe, where per capita production is still the highest in the world, while the most rapid expansion in production over the past few decades has occurred in southern and eastern Asia, with China and India leading the world in overall production as of 2018.",
};
export const customNames: Record<string, string> = {
	"@": "XXnumbers",
	"9gr": "that guy with too many names",
	"Aae5a4": "Yande",
	"Addons": "Altering Dumb Decisions On Naughty Scratch",
	"America": "Asfutmsifwffutsh",
	"Anagram": "Nag A Ram",
	"Barbie": "Oppenheimer",
	"Barelysmooth": Math.PI ** 2 + "",
	"Bill": "Bill Nye the Science Guy",
	"Buffalo": "Jeffalo",
	"Callumjt": "Cauliflower",
	"Canadian": "Kitten",
	"Chris": "Quality",
	"Clobr": "Mharcc",
	"Cob": "corn on the cobalt",
	"Cobalt": "Dad",
	"Context": "Mater’s gf",
	"Cr": "Furry",
	"Cs": "Moheet Goray",
	"Dash": "Unsightreadable",
	"Doggo": "Wisconsinite",
	"Everyone": constants.env === "testing" ? "@@everyone" : `<@&${config.guild.id}>`,
	"Garbo": "GarboCupcake",
	"Gnu": "Richard Stallman",
	"Graham": "Cracker",
	"Greeny": "Jazza",
	"Hans": String.raw`default color gang \😎`,
	"Hexagon": "Bestagon",
	"Hexagonal": "Mexagonal",
	"Lisa": String.raw`UI and Humor King \👑`,
	"Marshmallow": "Csbees",
	"Materarc": "MayoArc",
	"Mozzy": "Not Righty",
	"Mph": "Mister Potatoes Per Hour",
	"Oppenheimer": "Barbie",
	"Paul": "Paul Reidguy",
	"Pl": "sus fever",
	"Puffy": "porcupine-fish101007",
	"Qualitical": "The Non-Political",
	"Quality": "The Follower of Policy",
	// eslint-disable-next-line unicorn/string-content
	"Red": "re°.'☆,•",
	"Redgurt": "Cubester",
	"Redguy": "Redgay",
	"Ronan": "Rg",
	"Sans": "Ness",
	"Scout": String.raw`Pro \_\_\_\_\_\_\_\_`,
	"Scraddette": "Honey",
	"Scraddotte": "Son",
	"Shock": "Sock",
	"Spencer": "Cs",
	"Svg": "Super Very Gay",
	"Therapist": "Louis",
	"Train": "Valor",
	"Wl": "Kurzgesagt",
	"Xxnumbers": "Paddler",
	"Yande": "Hampter",
	"Yanderedev": "Ripoff Yande",
};
export const customComments: Record<string, string> = {
	Admin: "gib mod? 🥺 👉 👈",
	Beggin: "beggin me\nSo, put your loving hand out, baby",
	Bi: "so am I!",
	Bill: "is inertia a property of matter?",
	Bubbles: "may I pop you?",
	Dad: "you already got the milk?!",
	Explosion: "you are our 5th!",
	Gay: "[why shouldn’t you be happy?](<https://www.youtube.com/watch?v=RHg4D4RkXMc>)",
	Internet: "welcome to Game Theory!",
	John: "what the John?!",
	Louis: "I’m thinking Miku, Miku, ooo eee ooo",
	Obama: "what’s your last name?",
	Polaris: "I’m the superior XP bot!\n…maybe",
	Proto: "my security is your Motto",
	Streamer: "I’m chat!",
	There: "General Kenobi.",
	Vector: "that’s you, because you commit crimes with both direction and magnitude.",
	Vsauce: "or are you?",
};
export const customTriggers: readonly string[] = Object.keys({
	Aussie: "",
	Australian: "",
	Automodmute: "",
	Ayy: "",
	British: "",
	Captain: "",
	Ddarcs: "",
	Dead: "",
	Dinnerbone: "",
	Grumm: "",
	Happy: "",
	Hey: "",
	Hiya: "",
	Howdy: "",
	Jeb_: "",
	Lucky: "",
	Miku: "",
	Mod: "",
	Nameless: "",
	Touhou: "",
	Underage: "",
	Uwu: "",
	Whattup: "",
	Whopper: "",
	Yo: "",
});
export const dadEasterEggCount =
	Object.keys(customResponses).length +
	Object.keys(customNames).length +
	Object.keys(customComments).length +
	customTriggers.length +
	+1 + // <long name>
	+1 + // <number>
	+1 + // <username>
	+1 + // "In"
	+2 + // Extra "Miku" responses
	+1 + // Extra "Mod" response
	-1 + // Duplicate "Argentine" response
	-1 + // Duplicate "Aussie" response
	-1 + // Duplicate "Barbie" response
	-1 + // Duplicate "Bill" response
	-1; // Duplicate "Dinnerbone" response

/**
 * - `word`
 * - `plural` (`true`)
 * - `partial` (`content.includes`)
 * - `raw` (`messsge.content`)
 * - `full` (`content ===`)
 * - `negative` - overrides all (`&& !content.includes`)
 * - `ping` - only direct pings (`message.mentions.has`)
 */
const autoreactions: [
	string[] | string,
	...(
		| RegExp
		| string
		| [RegExp | string, "full" | "negative" | "partial" | "plural" | "raw"]
		| [Snowflake, "ping"]
	)[],
][] = [
	// Server jokes
	["<:emoji:1119305606323523624>", /carl(?![ -]bot)/],
	["<:emoji:1189997331358171276>", "cs", /cool.?scratcher/, "goray", /mo[ -]?h(?:i|ee+)t/],
	["🐹", [/hamps?ter/, "plural"]],
	["<:emoji:1222924220887990402>", "q"],
	["🫡", "nora", "nate", "equalis"],
	["<:emoji:1073805840584282224>", ["agreed", "full"], ["hey guys", "full"]],
	["<:emoji:1202785668703723604>", "bob"],
	["<a:emoji:1128101942183329793>", "alan"],
	["<:emoji:829518237384966155>", "doost", ["dooster", "plural"]],
	["<:emoji:962798819572056164>", [/\( \^∘\^\)つ/, "raw"]],
	["🇫🇷", [/^fr+\b/, "partial"]],
	["<:emoji:847428533432090665>", [/([,.\\aeæ])\1*|ae|iei/, "full"]],
	["📻", ["radio", "full"]],
	[
		[
			"<:emoji:872161476180320327>",
			"<:emoji:872161476234862712>",
			"<:emoji:872161476230676560>",
		],
		["snake", "plural"],
		["snek", "plural"],
	],
	["🦆", ["quack", "partial"]],
	["<:emoji:898310317833076847>", [/👉\s*👈/, "raw"], [/te[rw]+a+/, "plural"]],

	// SA jokes
	["<:emoji:922950154460463154>", "wl", "w_l", [/world.?language/, "plural"], "kurzgesagt"],
	["<:emoji:1202785575355162675>", "mxmou", "maximouse"],
	["<a:emoji:1083423116547596359>", /taco(?:d(?:ude|iva))?/],
	["👑", "lisa", "wolfgang"],
	["🍡", [/dango+/, "plural"]],
	["🐟", [/had+ock?/, "plural"]],
	["🥑", [/av[ao]cado/, "plural"]],
	[
		[
			"<:emoji:872158826261012521>",
			"<:emoji:893916748720513114>",
			"<:emoji:872158826223267841>",
		],
		["sat on addon", "plural"],
	],

	// Discord jokes
	["🪦", "robotop"],
	["<:emoji:1104935019232899183>", [/😮(\u200D[^💨]|$|[^\u200D])/u.source, "raw"]],
	["🤮", "mee6", "dyno", [/carl[ -]?bot/, "plural"]],
	["<a:emoji:1085973738962550794>", [constants.env === "testing" ? "0" : client.user.id, "ping"]],
	["<a:emoji:936781069020168192>", ["557632229719670794", "ping"]],

	// Scratch jokes
	["<:emoji:877206403067048026>", /j[eo]f+[ao]l+o/, /buf+[ao]l+o/],
	["<:emoji:1044651861682176080>", /wasteof\.(?!money)/],
	["<:emoji:943235419330465832>", /griff(?:patch)?y?/],
	["<:emoji:829738334803984384>", ["appel", "plural"]],
	[
		"<:emoji:915238944822681621>",
		["garbo", "partial"],
		/garbage? ?(?:muffin|man)/,
		["turbo", "negative"],
		["tw", "negative"],
	],

	// Internet jokes
	["<:emoji:924788779338829845>", "sus"],
	["💀", "forgor"],
	[
		"<a:emoji:962421165295554601>",
		"astley",
		/gives? you up/i,
		[/rick[ -]?rol+/, "partial"],
		["dQw4w9WgXcQ", "raw"],
	],
];
export default autoreactions;
