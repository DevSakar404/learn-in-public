import { describe, expect, it } from "vitest";
import { setup } from "../../test/fakes/setup";
import { subscribeSchema } from "./subscriber-service";

describe("SubscriberService", () => {
  it("subscribes, then treats a duplicate as a friendly success", async () => {
    const t = setup();
    const first = await t.subscribers.subscribe({ email: "a@b.co", website: "" });
    const second = await t.subscribers.subscribe({ email: "a@b.co", website: "" });
    expect(first.ok && first.value).toBe("subscribed");
    expect(second.ok && second.value).toBe("already_subscribed");
    expect(await t.subscribers.list()).toHaveLength(1);
  });

  it("silently ignores bots that fill the honeypot", async () => {
    const t = setup();
    const r = await t.subscribers.subscribe({ email: "bot@spam.co", website: "http://spam" });
    expect(r.ok && r.value).toBe("ignored");
    expect(await t.subscribers.list()).toHaveLength(0);
  });

  it("exports CSV with a header row", async () => {
    const t = setup();
    await t.subscribers.subscribe({ email: "a@b.co", website: "" });
    const csv = await t.subscribers.exportCsv();
    expect(csv.split("\r\n")[0]).toBe("email,status,subscribed_at");
    expect(csv).toContain("a@b.co,active,");
  });
});

describe("subscribeSchema", () => {
  it("trims and lower-cases the email", () => {
    expect(subscribeSchema.parse({ email: "  Me@Example.COM " }).email).toBe("me@example.com");
  });

  it("rejects invalid emails", () => {
    expect(subscribeSchema.safeParse({ email: "nope" }).success).toBe(false);
  });
});
