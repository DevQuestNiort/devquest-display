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

test("parseDayHtml extrait les sessions depuis le JSON embarque", () => {
  const html = `<script>self.__next_f.push([1,"{\"sessions\":[{\"id\":\"cmmchm620025401nslo5uqdw1\",\"title\":\"OpenRewrite: Refactor as code\",\"room\":\"Forge\",\"speakers\":[{\"name\":\"Alice\"}],\"day\":\"day-1\",\"slot\":{\"key\":\"day-1-session-2\",\"start\":\"09:00\"},\"startISO\":\"2026-06-11T09:00:00.000Z\",\"endISO\":\"2026-06-11T09:50:00.000Z\"}]}" ])</script>`;

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
  assert.equal(out[0].eventId, "day-1-session-2");
  assert.equal(out[0].startTime, "09:00");
  assert.equal(out[0].endTime, "09:50");
  assert.equal(out[0].room, "Forge");
  assert.deepEqual(out[0].speakerNames, ["Alice"]);
});

test("parseDayHtml garde les sessions JSON avec id non cmm", () => {
  const html = `<script>self.__next_f.push([1,"{\"sessions\":[{\"id\":\"generatedbyvgo0001\",\"title\":\"Fatigues de la POO ? Passez a la DOP !\",\"room\":\"Observatoire\",\"day\":\"day-2\",\"slot\":{\"key\":\"day-2-session-4\",\"start\":\"10:00\"},\"startISO\":\"2026-06-12T10:00:00.000Z\",\"endISO\":\"2026-06-12T10:50:00.000Z\"}]}" ])</script>`;

  const dayMeta = { path: "/schedule/day-2", date: "2026-06-12", dayLabel: "Jour 2" };
  const byShort = new Map();
  const exported = { sessions: {}, speakers: {} };

  const out = parseDayHtml(html, dayMeta, byShort, exported);
  assert.equal(out.length, 1);
  assert.equal(out[0].sessionId, "generatedbyvgo0001");
  assert.equal(out[0].eventId, "day-2-session-4");
  assert.equal(out[0].title, "Fatigues de la POO ? Passez a la DOP !");
  assert.equal(out[0].room, "Observatoire");
});

