import { describe, expect, it } from "vitest";

/** Mirrors rebuild.parseEventType logic */
function parseEventType(eventType: string): { program: string; name: string } | null {
  const i = eventType.indexOf(".");
  if (i <= 0) return null;
  const ns = eventType.slice(0, i);
  const name = eventType.slice(i + 1);
  if (ns === "mixer" || ns === "factory" || ns === "staking" || ns === "payment") {
    return { program: ns, name };
  }
  return null;
}

describe("parseEventType", () => {
  it("handles names with dots in event struct", () => {
    const p = parseEventType("mixer.DepositStateEvent");
    expect(p).toEqual({ program: "mixer", name: "DepositStateEvent" });
  });
});
