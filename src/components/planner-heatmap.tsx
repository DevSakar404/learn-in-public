import { cn } from "@/lib/utils";

interface HeatmapDay {
  date: string;
  published: boolean;
  isToday: boolean;
  isFuture: boolean;
  isYoutubeDay: boolean;
}

const ROW_LABELS = ["Mon", "", "Wed", "", "Fri", "", "Sun"];

/** 13 weeks × 7 days, GitHub-style. Columns are weeks (Monday first). */
export function PlannerHeatmap({ days }: { days: HeatmapDay[] }) {
  const published = days.filter((d) => d.published).length;
  return (
    <figure className="space-y-2">
      <div className="flex gap-2 overflow-x-auto pb-1">
        <div
          aria-hidden
          className="grid grid-rows-7 gap-1 text-[10px] leading-3 text-muted-foreground"
        >
          {ROW_LABELS.map((l, i) => (
            <span key={i} className="h-3">
              {l}
            </span>
          ))}
        </div>
        <ol
          className="grid grid-flow-col grid-rows-7 gap-1"
          aria-label="Publishing history, last 13 weeks"
        >
          {days.map((d) => (
            <li
              key={d.date}
              title={`${d.date}${d.published ? ": published" : d.isFuture ? "" : ": no note"}${d.isYoutubeDay ? " · YouTube day" : ""}`}
              aria-label={`${d.date}: ${d.published ? "published" : d.isFuture ? "upcoming" : "no note"}${d.isYoutubeDay ? ", YouTube day" : ""}`}
              className={cn(
                "size-3 rounded-[3px]",
                d.published ? "bg-emerald-500" : d.isFuture ? "bg-muted/40" : "bg-muted",
                d.isYoutubeDay && !d.published && "ring-1 ring-red-400/60 ring-inset",
                d.isToday && "outline-2 outline-offset-1 outline-foreground",
              )}
            />
          ))}
        </ol>
      </div>
      <figcaption className="flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
        <span>{published} days published in 13 weeks</span>
        <span className="flex items-center gap-1">
          <span aria-hidden className="size-3 rounded-[3px] bg-emerald-500" /> published
        </span>
        <span className="flex items-center gap-1">
          <span
            aria-hidden
            className="size-3 rounded-[3px] bg-muted ring-1 ring-red-400/60 ring-inset"
          />{" "}
          YouTube day
        </span>
        <span className="flex items-center gap-1">
          <span
            aria-hidden
            className="size-3 rounded-[3px] bg-muted outline-2 outline-offset-1 outline-foreground"
          />{" "}
          today
        </span>
      </figcaption>
    </figure>
  );
}
