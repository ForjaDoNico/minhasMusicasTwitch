// Built-in bot messages (not editable templates): errors, usage, ambiguity.
export type BotLang = "en" | "pt";

const messages = {
  en: {
    usage_sr: "Usage: !{cmd} <song or artist>",
    not_found: '"{query}" is not in the songlist. Suggest it for the learning list: {learning_link}',
    ambiguous: "Which one? {options}",
    queue_closed: "The queue is closed right now.",
    already_in_queue: "{song} is already in the queue.",
    song_on_cooldown: "{song} was played recently, try again later.",
    user_limit: "You already have {limit} requests in the queue.",
    subscribers_only: "Only subscribers can request right now.",
    vips_only: "Only VIPs can request right now.",
    premium_only: "{song} is premium: subscribers only.",
    no_request: "You have no requests in the queue.",
    nothing_playing: "Nothing is playing right now.",
    generic_error: "Sorry, something went wrong.",
  },
  pt: {
    usage_sr: "Uso: !{cmd} <música ou artista>",
    not_found: '"{query}" não está no repertório. Sugira na lista de aprendizado: {learning_link}',
    ambiguous: "Qual delas? {options}",
    queue_closed: "A fila está fechada agora.",
    already_in_queue: "{song} já está na fila.",
    song_on_cooldown: "{song} tocou há pouco, tente mais tarde.",
    user_limit: "Você já tem {limit} pedidos na fila.",
    subscribers_only: "Somente inscritos podem pedir agora.",
    vips_only: "Somente VIPs podem pedir agora.",
    premium_only: "{song} é premium: só para inscritos.",
    no_request: "Você não tem pedidos na fila.",
    nothing_playing: "Nada tocando agora.",
    generic_error: "Ops, algo deu errado.",
  },
} as const;

export type BotMessageKey = keyof (typeof messages)["en"];

export function botMessage(lang: BotLang, key: BotMessageKey, vars: Record<string, string | number> = {}) {
  let s: string = (messages[lang] ?? messages.en)[key] ?? messages.en[key];
  for (const [k, v] of Object.entries(vars)) s = s.replaceAll(`{${k}}`, String(v));
  return s;
}

export function isBotMessageKey(k: string): k is BotMessageKey {
  return k in messages.en;
}
