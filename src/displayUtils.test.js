import test from "node:test";
import assert from "node:assert/strict";
import { getDisplayNow, groupSessionsByRoom, parseMockNowParam } from "./displayUtils.js";

test("parseMockNowParam supporte un offset comme +7j2h", () => {
  const parsed = parseMockNowParam("+7j2h");
  assert.equal(parsed.type, "offset");
  assert.equal(parsed.offsetMs, (7 * 24 + 2) * 60 * 60 * 1000);
});

test("getDisplayNow applique l'offset sur une date de base", () => {
  const base = new Date("2026-06-03T10:00:00+02:00");
  const parsed = parseMockNowParam("+2h30m");
  const result = getDisplayNow(parsed, base);
  assert.equal(result.toISOString(), new Date("2026-06-03T12:30:00+02:00").toISOString());
});

test("groupSessionsByRoom renvoie la session en cours et la suivante par salle", () => {
  const now = new Date("2026-06-11T10:15:00+02:00");
  const rooms = groupSessionsByRoom(
    [
      { room: "Forge", startIso: "2026-06-11T09:00:00+02:00", endIso: "2026-06-11T09:50:00+02:00", title: "A" },
      { room: "Forge", startIso: "2026-06-11T10:00:00+02:00", endIso: "2026-06-11T10:50:00+02:00", title: "B" },
      { room: "Forge", startIso: "2026-06-11T11:10:00+02:00", endIso: "2026-06-11T12:00:00+02:00", title: "C" },
      { room: "Beffroi", startIso: "2026-06-11T10:00:00+02:00", endIso: "2026-06-11T10:50:00+02:00", title: "D" }
    ],
    now,
    ["Forge", "Beffroi"]
  );

  const forge = rooms.find((room) => room.room === "Forge");
  assert.equal(forge.current.title, "B");
  assert.equal(forge.next.title, "C");
});

