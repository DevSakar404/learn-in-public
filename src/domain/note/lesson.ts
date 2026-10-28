/** A lesson post marks its playground with a fenced block: ```playground\n<id>\n```. */
const PLAYGROUND_FENCE = /^```playground[ \t]*\r?\n[ \t]*([\w-]+)[ \t]*\r?\n```[ \t]*$/m;

/** Pulls the playground id out of a note's markdown and returns the body without the fence. */
export function splitPlayground(contentMd: string): { body: string; playground: string | null } {
  const match = PLAYGROUND_FENCE.exec(contentMd);
  if (!match) return { body: contentMd, playground: null };
  return { body: contentMd.replace(match[0], "").trim(), playground: match[1] ?? null };
}
