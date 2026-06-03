import test from "node:test";
import assert from "node:assert/strict";
import { parseDayHtml } from "./scheduleService.js";

test("parseDayHtml extrait les sessions et calcule les horaires", () => {
  const html = `
  <div class="LargeSchedule_slot__abc LargeSchedule_slotHour__x" style="grid-column:1 / 1;grid-row:3 / span 1"><h3>09:00</h3></div>
  <div class="LargeSchedule_slot__abc LargeSchedule_slotHour__x" style="grid-column:1 / 1;grid-row:4 / span 1"><h3>09:50</h3></div>
  <div class="LargeSchedule_slot__abc LargeSchedule_slotSession__x" style="grid-column:2 / 2;grid-row:3 / span 1;z-index:1">
    <a href="/sessions/talk-demo-cmmchm62">
      <span class="sr-only">Salle <!-- -->Forge</span>
    </a>
  </div>`;

  const dayMeta = { path: "/schedule/day-1", date: "2026-06-11", dayLabel: "Jour 1" };
  const byShort = new Map([["cmmchm62", "cmmchm620025401nslo5uqdw1"]]);
  const exported = {
    sessions: {
      cmmchm620025401nslo5uqdw1: {
        title: "OpenRewrite: Refactor as code",
        trackTitle: "Forge",
        speakers: ["sp1"],
        tags: ["backend"]
      }
    },
    speakers: {
      sp1: { name: "Alice" }
    }
  };

  const out = parseDayHtml(html, dayMeta, byShort, exported);
  assert.equal(out.length, 1);
  assert.equal(out[0].title, "OpenRewrite: Refactor as code");
  assert.equal(out[0].startTime, "09:00");
  assert.equal(out[0].endTime, "09:50");
  assert.equal(out[0].room, "Forge");
  assert.deepEqual(out[0].speakerNames, ["Alice"]);
});

