import { describe, expect, it } from "vitest";
import { focusSyncSchema } from "@/domain/focus/focus-sync";
import { setup } from "../../test/fakes/setup";

const laptop = crypto.randomUUID();
const phone = crypto.randomUUID();
const day = "2026-03-10"; // setup()'s clock: 2026-03-10T12:00Z

describe("FocusService", () => {
  it("keeps the larger total per device, so retries and late replies can't lower or double it", async () => {
    const t = setup();
    await t.focus.sync({ day, deviceId: laptop, minutes: 28 });
    await t.focus.sync({ day, deviceId: laptop, minutes: 28 }); // retry
    await t.focus.sync({ day, deviceId: laptop, minutes: 20 }); // stale request arriving late
    const r = await t.focus.sync({ day, deviceId: phone, minutes: 10 });
    expect(r.ok && r.value).toEqual({ otherMinutes: 28, target: 25 });
  });

  it("returns only other devices' minutes for the same day", async () => {
    const t = setup();
    await t.focus.sync({ day: "2026-03-09", deviceId: phone, minutes: 40 });
    const r = await t.focus.sync({ day, deviceId: laptop, minutes: 5 });
    expect(r.ok && r.value.otherMinutes).toBe(0);
  });

  it("saves a sent target and returns it to the other devices", async () => {
    const t = setup();
    await t.focus.sync({ day, deviceId: laptop, minutes: 0, target: 50 });
    const r = await t.focus.sync({ day, deviceId: phone, minutes: 0 });
    expect(r.ok && r.value.target).toBe(50);
  });

  it("accepts a local day one day either side of today and rejects anything further", async () => {
    const t = setup();
    for (const d of ["2026-03-09", "2026-03-11"]) {
      expect((await t.focus.sync({ day: d, deviceId: laptop, minutes: 1 })).ok).toBe(true);
    }
    const far = await t.focus.sync({ day: "2026-03-13", deviceId: laptop, minutes: 1 });
    expect(!far.ok && far.error.code).toBe("VALIDATION");
  });
});

describe("focusSyncSchema", () => {
  const base = { day, deviceId: laptop, minutes: 12 };

  it("accepts a valid report, with or without a target", () => {
    expect(focusSyncSchema.safeParse(base).success).toBe(true);
    expect(focusSyncSchema.safeParse({ ...base, target: 75 }).success).toBe(true);
  });

  it("rejects bad days, devices, minutes and targets", () => {
    for (const bad of [
      { day: "28/10/2026" },
      { deviceId: "laptop" },
      { minutes: -1 },
      { minutes: 1441 },
      { minutes: 2.5 },
      { target: 30 },
    ]) {
      expect(focusSyncSchema.safeParse({ ...base, ...bad }).success).toBe(false);
    }
  });
});
