const PATTERNS = [
  /^https?:\/\/(?:www\.|m\.)?youtube\.com\/watch\?(?:.*&)?v=([\w-]{11})(?:[&#].*)?$/,
  /^https?:\/\/youtu\.be\/([\w-]{11})(?:[?#].*)?$/,
  /^https?:\/\/(?:www\.)?youtube\.com\/(?:embed|shorts|live)\/([\w-]{11})(?:[?#].*)?$/,
];

/** Video ID from a YouTube URL, or null if it isn't one. */
export function youtubeVideoId(url: string): string | null {
  for (const pattern of PATTERNS) {
    const id = pattern.exec(url.trim())?.[1];
    if (id) return id;
  }
  return null;
}
