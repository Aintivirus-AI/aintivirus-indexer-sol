import { describe, expect, it } from "vitest";
import crypto from "node:crypto";
import { eventDiscriminator } from "../src/idl/discriminator.js";

describe("eventDiscriminator", () => {
  it("matches sha256(event:Name)[0..8]", () => {
    const name = "DepositStateEvent";
    const expected = [...crypto.createHash("sha256").update(`event:${name}`).digest().subarray(0, 8)];
    expect(eventDiscriminator(name)).toEqual(expected);
  });
});
