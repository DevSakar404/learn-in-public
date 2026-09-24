"use client";

import { PlayIcon } from "lucide-react";
import { useState } from "react";

/** Click-to-load: shows the thumbnail and only loads YouTube's player after a click. */
export function YouTubeEmbed({ videoId, title }: { videoId: string; title: string }) {
  const [playing, setPlaying] = useState(false);

  return (
    <div className="relative aspect-video overflow-hidden rounded-xl border bg-muted">
      {playing ? (
        <iframe
          className="absolute inset-0 size-full"
          src={`https://www.youtube-nocookie.com/embed/${videoId}?autoplay=1`}
          title={title}
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
          allowFullScreen
        />
      ) : (
        <button
          type="button"
          onClick={() => setPlaying(true)}
          className="group absolute inset-0 flex items-center justify-center focus-visible:ring-3 focus-visible:ring-ring focus-visible:outline-none"
          aria-label={`Play video: ${title}`}
        >
          {/* eslint-disable-next-line @next/next/no-img-element -- external thumbnail, no optimisation needed */}
          <img
            src={`https://i.ytimg.com/vi/${videoId}/hqdefault.jpg`}
            alt=""
            className="absolute inset-0 size-full object-cover"
            loading="lazy"
          />
          <span className="relative flex size-16 items-center justify-center rounded-full bg-black/70 text-white transition group-hover:scale-110">
            <PlayIcon className="size-7 fill-current" aria-hidden />
          </span>
        </button>
      )}
    </div>
  );
}
