import { CheckCircle2Icon, CircleIcon } from "lucide-react";
import Link from "next/link";
import { CalendarLink } from "@/components/calendar-link";
import { PlannerHeatmap } from "@/components/planner-heatmap";
import { PlannerSettingsForm } from "@/components/planner-settings-form";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { PLATFORM_LABELS } from "@/domain/post/post";
import { container } from "@/lib/container";
import { requireAdminPage } from "../../_lib/auth";

export const metadata = { title: "Planner" };

const niceDate = (key: string) =>
  new Intl.DateTimeFormat("en-GB", {
    weekday: "short",
    day: "numeric",
    month: "short",
    timeZone: "UTC",
  }).format(new Date(`${key}T00:00:00Z`));

function Check({ done, children }: { done: boolean; children: React.ReactNode }) {
  return (
    <li className="flex items-center gap-2">
      {done ? (
        <CheckCircle2Icon className="size-4 text-emerald-500" aria-label="done" />
      ) : (
        <CircleIcon className="size-4 text-muted-foreground" aria-label="to do" />
      )}
      <span className={done ? "text-muted-foreground line-through" : undefined}>{children}</span>
    </li>
  );
}

export default async function PlannerPage() {
  await requireAdminPage();
  const o = await (await container.admin.planner()).overview();
  const { siteUrl, timeZone } = container.config();
  const calendarUrl = new URL(`/calendar/${o.settings.calendarToken}.ics`, siteUrl).toString();
  const dayLabel =
    o.dayNumber < 1
      ? `Starts in ${1 - o.dayNumber} day(s)`
      : o.dayNumber > o.journeyDays
        ? `Day ${o.dayNumber}`
        : `Day ${o.dayNumber} of ${o.journeyDays}`;

  return (
    <div className="space-y-8">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <h1 className="text-2xl font-bold">Planner</h1>
        <p className="text-muted-foreground">{dayLabel}</p>
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        <Card>
          <CardHeader>
            <CardDescription>Current streak</CardDescription>
            <CardTitle className="text-3xl tabular-nums">{o.streak}</CardTitle>
          </CardHeader>
          <CardContent className="text-sm text-muted-foreground">
            {o.todo.noteDone
              ? "Today's note is published."
              : `Publish today by ${o.settings.dailyTime} to keep it going.`}
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardDescription>Longest streak</CardDescription>
            <CardTitle className="text-3xl tabular-nums">{o.longestStreak}</CardTitle>
          </CardHeader>
          <CardContent className="text-sm text-muted-foreground">days in a row</CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardDescription>Weekly YouTube recap</CardDescription>
            <CardTitle className="text-xl">
              {o.youtube.isToday ? "Today" : niceDate(o.youtube.date)}
            </CardTitle>
          </CardHeader>
          <CardContent className="text-sm text-muted-foreground">
            {o.youtube.done
              ? "This week's recap is posted."
              : `Due ${o.youtube.weekday} at ${o.settings.dailyTime}.`}
          </CardContent>
        </Card>
      </div>

      <section aria-labelledby="history" className="space-y-3">
        <h2 id="history" className="text-lg font-semibold">
          Streak history
        </h2>
        <PlannerHeatmap days={o.heatmap} />
      </section>

      <div className="grid gap-6 lg:grid-cols-2">
        <section aria-labelledby="today" className="space-y-3 rounded-xl border p-4">
          <h2 id="today" className="font-semibold">
            Today · {o.settings.dailyTime}
          </h2>
          <ul className="space-y-2 text-sm">
            <Check done={o.todo.noteDone}>
              Publish today&apos;s note{" "}
              {!o.todo.noteDone && (
                <Link href="/admin/notes/new" className="underline underline-offset-4">
                  (write it)
                </Link>
              )}
            </Check>
            {(["x", "linkedin", "instagram"] as const).map((p) => (
              <Check key={p} done={o.todo.posted[p]}>
                Post on {PLATFORM_LABELS[p]} (mark the draft as posted)
              </Check>
            ))}
            {o.youtube.isToday && (
              <Check done={o.youtube.done}>Publish the weekly YouTube recap</Check>
            )}
          </ul>
        </section>

        <section aria-labelledby="upcoming" className="space-y-3 rounded-xl border p-4">
          <h2 id="upcoming" className="font-semibold">
            Next 7 days
          </h2>
          <ol className="space-y-2 text-sm">
            {o.upcoming.map((d) => (
              <li key={d.date} className="flex gap-3">
                <span className="w-24 shrink-0 font-medium">
                  {d.date === o.today ? "Today" : niceDate(d.date)}
                </span>
                <span className="text-muted-foreground">{d.items.join(" · ")}</span>
              </li>
            ))}
          </ol>
        </section>
      </div>

      <section aria-labelledby="schedule" className="space-y-4 rounded-xl border p-4">
        <h2 id="schedule" className="font-semibold">
          Schedule
        </h2>
        <PlannerSettingsForm schedule={o.settings} timeZone={timeZone} />
      </section>

      <section aria-labelledby="reminders" className="space-y-4 rounded-xl border p-4">
        <div>
          <h2 id="reminders" className="font-semibold">
            Reminders in your calendar
          </h2>
          <p className="text-sm text-muted-foreground">
            Subscribe once: a daily slot, the weekly YouTube recap and the Day 30/60/90 milestones,
            each with an alert.
          </p>
        </div>
        <CalendarLink url={calendarUrl} />
      </section>
    </div>
  );
}
