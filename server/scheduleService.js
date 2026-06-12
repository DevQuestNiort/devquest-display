import he from "he";

const EXPORT_URL = "https://www.devquest.fr/export-2026";
const DAY_SOURCES = [
  { path: "/schedule/day-1", date: "2026-06-11", dayLabel: "Jour 1" },
  { path: "/schedule/day-2", date: "2026-06-12", dayLabel: "Jour 2" }
];
const SITE_BASE = "https://www.devquest.fr";

let cache = {
  expiresAt: 0,
  payload: null
};

function shortId(fullId) {
  return String(fullId).slice(0, 8);
}

function parseTimeRows(html) {
  const rows = new Map();
  const re = /grid-row:(\d+)\s*\/\s*span\s*1[^>]*><h3>(\d{2}:\d{2})<\/h3>/g;

  let match;
  while ((match = re.exec(html)) !== null) {
    rows.set(Number(match[1]), match[2]);
  }

  return rows;
}

function addMinutes(hhmm, minutes) {
  const [h, m] = hhmm.split(":").map(Number);
  const stamp = new Date(Date.UTC(2026, 0, 1, h, m + minutes, 0));
  const outH = String(stamp.getUTCHours()).padStart(2, "0");
  const outM = String(stamp.getUTCMinutes()).padStart(2, "0");
  return `${outH}:${outM}`;
}

function buildIso(date, hhmm) {
  return `${date}T${hhmm}:00+02:00`;
}

function formatPseudoUtcTime(isoValue) {
  const stamp = new Date(isoValue);
  if (Number.isNaN(stamp.getTime())) {
    return null;
  }

  const hh = String(stamp.getUTCHours()).padStart(2, "0");
  const mm = String(stamp.getUTCMinutes()).padStart(2, "0");
  return `${hh}:${mm}`;
}

function parseDayHtmlFromEmbeddedData(html, dayMeta, sessionIdByShort, exportedData) {
  const dayId = dayMeta.path.split("/").pop();
  const normalizedHtml = html.replace(/\\"/g, '"').replace(/\\\//g, "/");
  const sessionRe =
    /"id":"([a-z0-9]+)"[\s\S]*?"title":"([^"]+)"[\s\S]*?"room":"([^"]+)"[\s\S]*?"day":"([^"]+)"[\s\S]*?"slot":\{"key":"([^"]+)"[\s\S]*?"start":"(\d{2}:\d{2})"[\s\S]*?"endISO":"([^"]+)"/g;

  const slots = [];
  const seen = new Set();

  let match;
  while ((match = sessionRe.exec(normalizedHtml)) !== null) {
    const fullId = match[1];
    const embeddedTitle = he.decode(match[2]).trim();
    const room = he.decode(match[3]).trim();
    const eventDayId = match[4];
    const eventId = match[5];
    const startTime = match[6];
    const endTime = formatPseudoUtcTime(match[7]) || addMinutes(startTime, 50);

    if (dayId && eventDayId !== dayId) {
      continue;
    }

    if (!room || !startTime || !endTime || seen.has(eventId)) {
      continue;
    }

    seen.add(eventId);

    const sidShort = shortId(fullId);
    const sessionId = sessionIdByShort.get(sidShort) || fullId;
    const session = exportedData.sessions[sessionId] || {};
    const speakerNames = (session.speakers || []).map(
      (speakerId) => exportedData.speakers[speakerId]?.name || "Intervenant"
    );

    slots.push({
      eventId,
      dayLabel: dayMeta.dayLabel,
      date: dayMeta.date,
      sessionId,
      title: he.decode(session.title || embeddedTitle || "Session"),
      room,
      trackTitle: he.decode(session.trackTitle || room),
      startTime,
      endTime,
      startIso: buildIso(dayMeta.date, startTime),
      endIso: buildIso(dayMeta.date, endTime),
      tags: session.tags || [],
      speakerNames
    });
  }

  return slots;
}

function parseDayHtmlLegacy(html, dayMeta, sessionIdByShort, exportedData) {
  const rowTimes = parseTimeRows(html);
  const slots = [];
  const slotRe =
    /grid-column:(\d+)\s*\/\s*\d+;grid-row:(\d+)\s*\/\s*span\s*(\d+);[^"]*">[\s\S]*?href="\/sessions\/[^"\s]+-(cmm[a-z0-9]{5})[^"]*"[\s\S]*?<span class="sr-only">Salle <!-- -->([^<]+)<\/span>/g;

  let match;
  while ((match = slotRe.exec(html)) !== null) {
    const column = Number(match[1]);
    const startRow = Number(match[2]);
    const span = Number(match[3]);
    const sidShort = match[4];
    const room = he.decode(match[5]).trim();

    const sessionId = sessionIdByShort.get(sidShort);
    if (!sessionId) {
      continue;
    }

    const session = exportedData.sessions[sessionId];
    const startTime = rowTimes.get(startRow);
    if (!session || !startTime) {
      continue;
    }

    const endTime = rowTimes.get(startRow + span) || addMinutes(startTime, 50);
    const speakerNames = (session.speakers || []).map(
      (speakerId) => exportedData.speakers[speakerId]?.name || "Intervenant"
    );

    slots.push({
      eventId: `${dayMeta.path}-${column}-${startRow}-${sidShort}`,
      dayLabel: dayMeta.dayLabel,
      date: dayMeta.date,
      sessionId,
      title: he.decode(session.title || "Session"),
      room,
      trackTitle: he.decode(session.trackTitle || room),
      startTime,
      endTime,
      startIso: buildIso(dayMeta.date, startTime),
      endIso: buildIso(dayMeta.date, endTime),
      tags: session.tags || [],
      speakerNames
    });
  }

  return slots;
}

export function parseDayHtml(html, dayMeta, sessionIdByShort, exportedData) {
  const parsedFromEmbedded = parseDayHtmlFromEmbeddedData(
    html,
    dayMeta,
    sessionIdByShort,
    exportedData
  );

  if (parsedFromEmbedded.length > 0) {
    return parsedFromEmbedded;
  }

  return parseDayHtmlLegacy(html, dayMeta, sessionIdByShort, exportedData);
}

async function fetchJson(url) {
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`Echec requete JSON ${url} (${response.status})`);
  }
  return response.json();
}

async function fetchText(url) {
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`Echec requete HTML ${url} (${response.status})`);
  }
  return response.text();
}

export async function getSchedulePayload({ force = false } = {}) {
  if (!force && cache.payload && cache.expiresAt > Date.now()) {
    return cache.payload;
  }

  const exportedData = await fetchJson(EXPORT_URL);
  const sessionIdByShort = new Map(
    Object.keys(exportedData.sessions).map((sessionId) => [shortId(sessionId), sessionId])
  );

  const dayHtml = await Promise.all(
    DAY_SOURCES.map((source) => fetchText(`${SITE_BASE}${source.path}`))
  );

  const events = dayHtml
    .flatMap((html, index) =>
      parseDayHtml(html, DAY_SOURCES[index], sessionIdByShort, exportedData)
    )
    .sort((a, b) => new Date(a.startIso) - new Date(b.startIso));

  const payload = {
    updatedAt: new Date().toISOString(),
    count: events.length,
    events
  };

  cache = {
    payload,
    expiresAt: Date.now() + 60 * 1000
  };

  return payload;
}


