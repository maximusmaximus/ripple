/** Slack-style shortcodes for preset names. */
export type EmojiHit = { code: string; glyph: string };

const PAIRS: [string, string][] = [
  ["fire", "🔥"],
  ["flame", "🔥"],
  ["sparkles", "✨"],
  ["sparkle", "✨"],
  ["star", "⭐"],
  ["star2", "🌟"],
  ["glow", "🌟"],
  ["boom", "💥"],
  ["collision", "💥"],
  ["zap", "⚡"],
  ["lightning", "⚡"],
  ["thunder", "🌩️"],
  ["wave", "🌊"],
  ["ocean", "🌊"],
  ["water", "💧"],
  ["droplet", "💧"],
  ["sweat_drops", "💦"],
  ["dash", "💨"],
  ["cyclone", "🌀"],
  ["rainbow", "🌈"],
  ["sunny", "☀️"],
  ["sun", "☀️"],
  ["sunset", "🌇"],
  ["sunrise", "🌅"],
  ["night", "🌃"],
  ["milky_way", "🌌"],
  ["new_moon", "🌑"],
  ["full_moon", "🌕"],
  ["crescent", "🌙"],
  ["moon", "🌙"],
  ["comet", "☄️"],
  ["snowflake", "❄️"],
  ["snowman", "☃️"],
  ["cloud", "☁️"],
  ["fog", "🌫️"],
  ["heart", "❤️"],
  ["hearts", "💕"],
  ["orange_heart", "🧡"],
  ["yellow_heart", "💛"],
  ["green_heart", "💚"],
  ["blue_heart", "💙"],
  ["purple_heart", "💜"],
  ["black_heart", "🖤"],
  ["white_heart", "🤍"],
  ["broken_heart", "💔"],
  ["100", "💯"],
  ["ok", "👌"],
  ["ok_hand", "👌"],
  ["+1", "👍"],
  ["thumbsup", "👍"],
  ["thumbs_up", "👍"],
  ["-1", "👎"],
  ["thumbsdown", "👎"],
  ["clap", "👏"],
  ["raised_hands", "🙌"],
  ["pray", "🙏"],
  ["muscle", "💪"],
  ["eyes", "👀"],
  ["eye", "👁️"],
  ["tongue", "👅"],
  ["lips", "👄"],
  ["kiss", "💋"],
  ["smile", "😄"],
  ["grinning", "😀"],
  ["grin", "😁"],
  ["joy", "😂"],
  ["rofl", "🤣"],
  ["wink", "😉"],
  ["blush", "😊"],
  ["heart_eyes", "😍"],
  ["star_struck", "🤩"],
  ["smirk", "😏"],
  ["thinking", "🤔"],
  ["shush", "🤫"],
  ["sunglasses", "😎"],
  ["hot", "🥵"],
  ["cold", "🥶"],
  ["scream", "😱"],
  ["mindblown", "🤯"],
  ["skull", "💀"],
  ["skull_crossbones", "☠️"],
  ["ghost", "👻"],
  ["alien", "👽"],
  ["robot", "🤖"],
  ["poop", "💩"],
  ["hankey", "💩"],
  ["ogre", "👹"],
  ["goblin", "👺"],
  ["clown", "🤡"],
  ["art", "🎨"],
  ["palette", "🎨"],
  ["performing_arts", "🎭"],
  ["thread", "🧵"],
  ["yarn", "🧶"],
  ["crystal_ball", "🔮"],
  ["magic", "🪄"],
  ["wand", "🪄"],
  ["sparkler", "🎇"],
  ["fireworks", "🎆"],
  ["dizzy", "💫"],
  ["gem", "💎"],
  ["diamond", "💎"],
  ["crown", "👑"],
  ["ring", "💍"],
  ["microphone", "🎤"],
  ["mic", "🎤"],
  ["studio_microphone", "🎙️"],
  ["headphones", "🎧"],
  ["musical_note", "🎵"],
  ["notes", "🎶"],
  ["music", "🎶"],
  ["control_knobs", "🎛️"],
  ["level_slider", "🎚️"],
  ["guitar", "🎸"],
  ["drum", "🥁"],
  ["violin", "🎻"],
  ["saxophone", "🎷"],
  ["trumpet", "🎺"],
  ["radio", "📻"],
  ["movie_camera", "🎥"],
  ["camera", "📷"],
  ["movie", "🎬"],
  ["clapper", "🎬"],
  ["rocket", "🚀"],
  ["ufo", "🛸"],
  ["satellite", "🛰️"],
  ["ringed_planet", "🪐"],
  ["boombox", "📻"],
  ["vhs", "📼"],
  ["cd", "💿"],
  ["dvd", "📀"],
  ["hourglass", "⌛"],
  ["watch", "⌚"],
  ["stopwatch", "⏱️"],
  ["hourglass_flowing", "⏳"],
  ["bomb", "💣"],
  ["gun", "🔫"],
  ["knife", "🔪"],
  ["dagger", "🗡️"],
  ["shield", "🛡️"],
  ["crystal", "🔮"],
  ["mirror", "🪞"],
  ["candle", "🕯️"],
  ["lantern", "🏮"],
  ["bulb", "💡"],
  ["flashlight", "🔦"],
  ["paintbrush", "🖌️"],
  ["crayon", "🖍️"],
  ["pencil", "✏️"],
  ["pen", "🖊️"],
  ["ink", "🖋️"],
  ["book", "📖"],
  ["scroll", "📜"],
  ["love_letter", "💌"],
  ["rose", "🌹"],
  ["wilted", "🥀"],
  ["blossom", "🌸"],
  ["hibiscus", "🌺"],
  ["sunflower", "🌻"],
  ["tulip", "🌷"],
  ["cherry_blossom", "🌸"],
  ["cactus", "🌵"],
  ["mushroom", "🍄"],
  ["palm", "🌴"],
  ["herb", "🌿"],
  ["four_leaf_clover", "🍀"],
  ["shamrock", "☘️"],
  ["peach", "🍑"],
  ["cherries", "🍒"],
  ["strawberry", "🍓"],
  ["grapes", "🍇"],
  ["watermelon", "🍉"],
  ["lemon", "🍋"],
  ["hot_pepper", "🌶️"],
  ["chili", "🌶️"],
  ["avocado", "🥑"],
  ["honey", "🍯"],
  ["coffee", "☕"],
  ["tea", "🍵"],
  ["sake", "🍶"],
  ["wine", "🍷"],
  ["cocktail", "🍸"],
  ["tropical_drink", "🍹"],
  ["beer", "🍺"],
  ["cheers", "🥂"],
  ["bottle", "🍾"],
  ["butterfly", "🦋"],
  ["bug", "🐛"],
  ["bee", "🐝"],
  ["snake", "🐍"],
  ["dragon", "🐉"],
  ["dragon_face", "🐲"],
  ["wolf", "🐺"],
  ["fox", "🦊"],
  ["cat", "🐱"],
  ["lion", "🦁"],
  ["tiger", "🐯"],
  ["unicorn", "🦄"],
  ["octopus", "🐙"],
  ["squid", "🦑"],
  ["jellyfish", "🪼"],
  ["shark", "🦈"],
  ["whale", "🐋"],
  ["dolphin", "🐬"],
  ["fish", "🐟"],
  ["tropical_fish", "🐠"],
  ["spider", "🕷️"],
  ["web", "🕸️"],
  ["scorpion", "🦂"],
  ["bat", "🦇"],
  ["crow", "🐦‍⬛"],
  ["eagle", "🦅"],
  ["dove", "🕊️"],
  ["phoenix", "🐦‍🔥"],
  ["lizard", "🦎"],
  ["t_rex", "🦖"],
  ["sauropod", "🦕"],
  ["space", "🪐"],
  ["void", "🌑"],
  ["black_circle", "⚫"],
  ["white_circle", "⚪"],
  ["red_circle", "🔴"],
  ["blue_circle", "🔵"],
  ["purple_circle", "🟣"],
  ["black_square", "⬛"],
  ["red_square", "🟥"],
  ["infinity", "♾️"],
  ["recycle", "♻️"],
  ["warning", "⚠️"],
  ["radioactive", "☢️"],
  ["biohazard", "☣️"],
  ["peace", "☮️"],
  ["yin_yang", "☯️"],
  ["aries", "♈"],
  ["scorpius", "♏"],
  ["ophiuchus", "⛎"],
  ["eight_pointed_star", "✴️"],
  ["sparkle_star", "❇️"],
  ["secret", "㊙️"],
  ["vs", "🆚"],
  ["sos", "🆘"],
  ["new", "🆕"],
  ["free", "🆓"],
  ["cool", "🆒"],
  ["signal", "📶"],
  ["vibration", "📳"],
  ["cinema", "🎦"],
  ["atm", "🏧"],
];

const GLYPH = new Map<string, string>();
const INDEX: EmojiHit[] = [];

for (const [code, glyph] of PAIRS) {
  const key = norm(code);
  if (!GLYPH.has(key)) {
    GLYPH.set(key, glyph);
    INDEX.push({ code, glyph });
  }
}

function norm(s: string): string {
  return s.toLowerCase().replace(/[^a-z0-9+]/g, "");
}

export function expandShortcodes(text: string): string {
  return text.replace(/:([a-zA-Z0-9_+-]+):/g, (all, raw: string) => GLYPH.get(norm(raw)) ?? all);
}

export type ShortcodeToken = {
  start: number;
  end: number;
  query: string;
  closed: boolean;
};

/** Open `:token` at the caret, if any. */
export function tokenAt(text: string, caret: number): ShortcodeToken | null {
  const left = text.slice(0, caret);
  const m = left.match(/:([a-zA-Z0-9_+-]{0,24})$/);
  if (!m || m.index == null) return null;
  const start = m.index;
  const after = text.slice(caret);
  const closed = after.startsWith(":");
  const end = closed ? caret + 1 : caret;
  if (start > 0 && /[a-zA-Z0-9]/.test(text[start - 1] ?? "")) return null;
  return { start, end, query: m[1] ?? "", closed };
}

export function lookupEmoji(code: string): string | null {
  return GLYPH.get(norm(code)) ?? null;
}

export function suggestEmoji(query: string, limit = 8): EmojiHit[] {
  const q = norm(query);
  if (!q) {
    return INDEX.filter((e) =>
      ["fire", "sparkles", "star", "heart", "wave", "music", "boom", "skull", "ghost", "rocket", "art", "mic"].includes(
        e.code,
      ),
    ).slice(0, limit);
  }
  const starts: EmojiHit[] = [];
  const contains: EmojiHit[] = [];
  for (const hit of INDEX) {
    const n = norm(hit.code);
    if (n === q) starts.unshift(hit);
    else if (n.startsWith(q)) starts.push(hit);
    else if (n.includes(q)) contains.push(hit);
    if (starts.length >= limit) break;
  }
  return [...starts, ...contains].slice(0, limit);
}

export function applyEmoji(text: string, token: ShortcodeToken, glyph: string): { next: string; caret: number } {
  const next = `${text.slice(0, token.start)}${glyph}${text.slice(token.end)}`;
  return { next, caret: token.start + glyph.length };
}
