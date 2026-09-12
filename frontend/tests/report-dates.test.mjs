import test from "node:test";
import assert from "node:assert/strict";
import { presetRange, detectPreset } from "../src/features/reports/date-range-presets.ts";

for (const zone of ["Europe/Vilnius", "America/Los_Angeles", "UTC"]) {
  test(`report dates follow the local calendar in ${zone}`, () => {
    const previous = process.env.TZ;
    process.env.TZ = zone;
    try {
      const today = new Date(2026, 8, 6, 0, 15);
      assert.deepEqual(presetRange("thisMonth", today), {
        dateFrom: "2026-09-01",
        dateTo: "2026-09-06",
      });
      assert.deepEqual(presetRange("lastMonth", today), {
        dateFrom: "2026-08-01",
        dateTo: "2026-08-31",
      });
      assert.deepEqual(presetRange("lastMonth", new Date(2024, 2, 1)), {
        dateFrom: "2024-02-01",
        dateTo: "2024-02-29",
      });
      assert.deepEqual(presetRange("lastMonth", new Date(2026, 0, 1)), {
        dateFrom: "2025-12-01",
        dateTo: "2025-12-31",
      });
      assert.equal(detectPreset("2026-09-01", "2026-09-06", today), "thisMonth");
    } finally {
      if (previous === undefined) delete process.env.TZ;
      else process.env.TZ = previous;
    }
  });
}
