export const ROOM_ORDER = ["Forge", "Observatoire", "Laboratoire", "Beffroi"];

function normalizeValue(value) {
  return String(value || "")
    .trim()
    .replace(/\s+/g, "");
}

export function parseMockNowParam(rawValue) {
  const value = normalizeValue(rawValue);
  if (!value) {
    return null;
  }

  const absolute = new Date(value);
  if (!Number.isNaN(absolute.getTime())) {
    return { type: "absolute", date: absolute };
  }

  const matches = [...value.matchAll(/([+-]?\d+)([jdhm])/gi)];
  if (matches.length === 0) {
    return null;
  }

  let sign = 1;
  if (value.startsWith("-")) {
    sign = -1;
  }

  let offsetMs = 0;
  for (const [, amountRaw, unitRaw] of matches) {
    const amount = Math.abs(Number(amountRaw));
    const unit = unitRaw.toLowerCase();
    const factor = unit === "j" || unit === "d"
      ? 24 * 60 * 60 * 1000
      : unit === "h"
        ? 60 * 60 * 1000
        : 60 * 1000;

    offsetMs += amount * factor;
  }

  return { type: "offset", offsetMs: offsetMs * sign };
}

export function getDisplayNow(mockConfig, baseNow = new Date()) {
  if (!mockConfig) {
    return baseNow;
  }

  if (mockConfig.type === "absolute") {
    return mockConfig.date;
  }

  if (mockConfig.type === "offset") {
    return new Date(baseNow.getTime() + mockConfig.offsetMs);
  }

  return baseNow;
}

export function formatDateTime(date) {
  return new Intl.DateTimeFormat("fr-FR", {
    weekday: "long",
    day: "2-digit",
    month: "long",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    timeZone: "Europe/Paris"
  }).format(date);
}

export function formatClock(date) {
  return new Intl.DateTimeFormat("fr-FR", {
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    timeZone: "Europe/Paris"
  }).format(date);
}

function byStart(a, b) {
  return new Date(a.startIso) - new Date(b.startIso);
}

export function groupSessionsByRoom(events, now, roomOrder = ROOM_ORDER) {
  const rooms = new Map();

  for (const event of events) {
    const room = event.room || "Salle";
    if (!rooms.has(room)) {
      rooms.set(room, []);
    }
    rooms.get(room).push(event);
  }

  const orderedRooms = [...roomOrder, ...[...rooms.keys()].filter((room) => !roomOrder.includes(room)).sort((a, b) => a.localeCompare(b, "fr-FR"))];
  const seen = new Set();

  return orderedRooms
    .filter((room) => {
      if (seen.has(room)) {
        return false;
      }
      seen.add(room);
      return true;
    })
    .map((room) => {
      const sessions = (rooms.get(room) || []).slice().sort(byStart);
      const current = sessions.find((event) => now >= new Date(event.startIso) && now < new Date(event.endIso)) || null;
      const nextCursor = current ? new Date(current.endIso) : now;
      const next = sessions.find((event) => new Date(event.startIso) >= nextCursor) || null;

      return { room, current, next };
    });
}

