import React, { useEffect, useMemo, useState } from "react";
import {
  formatClock,
  formatDateTime,
  getRotationView,
  getDisplayNow,
  GLOBAL_VIEW_MS,
  groupSessionsByRoom,
  parseMockNowParam,
  ROOM_ORDER,
  ROOM_VIEW_MS,
  SPONSOR_VIEW_MS
} from "./displayUtils";
import forgeImage from "./img/forge.png";
import observatoireImage from "./img/observatoire.png";
import laboratoireImage from "./img/laboratoire.png";
import beffroiImage from "./img/beffroi.png";

const REFRESH_MS = 2 * 60 * 1000;
const TICK_MS = 1000;
const ROOM_BACKGROUNDS = {
  Forge: forgeImage,
  Observatoire: observatoireImage,
  Laboratoire: laboratoireImage,
  Beffroi: beffroiImage
};
const MOCK_SPONSORS = [
  { name: "Maif", tier: "Legendaire" },
  { name: "Clever Cloud", tier: "Epique" },
  { name: "SFEIR", tier: "Rare" },
  { name: "Zenika", tier: "Commun" },
  { name: "NeoSoft", tier: "Epique" },
  { name: "Macif", tier: "Commun" }
];

function getMockConfigFromUrl() {
  if (typeof window === "undefined") {
    return null;
  }

  const query = new URLSearchParams(window.location.search);
  return parseMockNowParam(query.get("mockNow"));
}

async function loadSchedule(setState) {
  setState((prev) => ({ ...prev, loading: true, error: "" }));

  try {
    const response = await fetch("/api/schedule");
    if (!response.ok) {
      throw new Error(`Erreur API: ${response.status}`);
    }

    const payload = await response.json();
    setState({
      loading: false,
      error: "",
      events: payload.events || [],
      updatedAt: payload.updatedAt || ""
    });
  } catch (error) {
    setState((prev) => ({
      ...prev,
      loading: false,
      error: "Impossible de charger le programme en direct."
    }));
  }
}

function TalkCard({ talk, compact = false }) {
  return (
    <article className={`talk-card ${compact ? "talk-card-compact" : ""}`}>
      <p className="talk-meta">
        <span>{talk.startTime}</span>
        <span>{talk.endTime}</span>
        <span>{talk.room}</span>
      </p>
      <h3>{talk.title}</h3>
      <p className="talk-speakers">{talk.speakerNames.join(" - ") || "Annonce DevQuest"}</p>
      <p className="talk-track">{talk.trackTitle || "Session"}</p>
    </article>
  );
}

function getRoomBackgroundStyle(room) {
  const imageUrl = ROOM_BACKGROUNDS[room];
  return imageUrl ? { "--room-background": `url(${imageUrl})` } : undefined;
}

function RoomColumn({ column, className = "" }) {
  return (
    <section className={`column ${className}`.trim()} style={getRoomBackgroundStyle(column.room)}>
      <h2>{column.room}</h2>

      <div className="slot-group">
        <p className="slot-title">Session actuelle</p>
        {column.current ? <TalkCard talk={column.current} /> : <p className="empty">Aucune session en cours.</p>}
      </div>

      <div className="slot-group">
        <p className="slot-title">Session juste après</p>
        {column.next ? <TalkCard talk={column.next} compact /> : <p className="empty">Pas de prochaine session.</p>}
      </div>
    </section>
  );
}

export function App() {
  const mockConfig = useMemo(() => getMockConfigFromUrl(), []);
  const carouselStartMs = useMemo(() => Date.now(), []);
  const [state, setState] = useState({
    loading: true,
    error: "",
    events: [],
    updatedAt: ""
  });
  const [now, setNow] = useState(() => getDisplayNow(mockConfig));

  useEffect(() => {
    loadSchedule(setState);

    const refresh = setInterval(() => loadSchedule(setState), REFRESH_MS);
    const tick = setInterval(() => setNow(getDisplayNow(mockConfig)), TICK_MS);

    return () => {
      clearInterval(refresh);
      clearInterval(tick);
    };
  }, [mockConfig]);

  const roomColumns = useMemo(() => groupSessionsByRoom(state.events, now), [state.events, now]);
  const orderedRoomNames = useMemo(() => {
    const existing = roomColumns.map((column) => column.room);
    const extra = ROOM_ORDER.filter((room) => !existing.includes(room));
    return [...existing, ...extra];
  }, [roomColumns]);
  const rotationView = useMemo(
    () => getRotationView(Date.now() - carouselStartMs, orderedRoomNames),
    [carouselStartMs, now, orderedRoomNames]
  );
  const focusedColumn = useMemo(
    () => roomColumns.find((column) => column.room === rotationView.room) || { room: rotationView.room, current: null, next: null },
    [roomColumns, rotationView.room]
  );

  return (
    <div className="app-shell">
      <header className="hero">
        <div className="clock-panel">
          <p>{formatDateTime(now)}</p>
          <strong>{formatClock(now)}</strong>
        </div>

        <div className="hero-copy">
          <p className="logo">DevQuest Live Display</p>
          <h1>Tableau des quetes</h1>
          <p className="subtitle">Ici, pas de dragon a debugger : juste des talks epiques a enchainer.</p>
          <p className="rotation-hint">
            Rotation auto: {GLOBAL_VIEW_MS / 1000}s global, {ROOM_VIEW_MS / 1000}s par salle, {SPONSOR_VIEW_MS / 1000}s sponsors
          </p>
          {mockConfig ? (
            <p className="simulation-badge">
              Mode simulation actif ({mockConfig.type === "offset" ? "mockNow" : "date fixe"})
            </p>
          ) : null}
        </div>
      </header>

      {state.error && <div className="error-banner">{state.error}</div>}

      {state.loading && state.events.length === 0 ? (
        <main className="schedule-grid">
          {roomColumns.map((column) => (
            <RoomColumn key={column.room} column={column} />
          ))}
        </main>
      ) : null}

      {!state.loading || state.events.length > 0 ? (
        <>
          {rotationView.type === "global" ? (
            <main className="schedule-grid">
              {roomColumns.map((column) => (
                <RoomColumn key={column.room} column={column} />
              ))}
            </main>
          ) : null}

          {rotationView.type === "room" ? (
            <main className="room-focus-grid">
              <RoomColumn column={focusedColumn} className="column-focus" />
            </main>
          ) : null}

          {rotationView.type === "sponsors" ? (
            <main className="sponsor-view">
              <section className="sponsor-board">
                <h2>Les sponsors de la quete</h2>
                <p>Merci aux guildes qui soutiennent l'aventure DevQuest.</p>
                <div className="sponsor-grid">
                  {MOCK_SPONSORS.map((sponsor) => (
                    <article key={sponsor.name} className="sponsor-card">
                      <h3>{sponsor.name}</h3>
                      <p>{sponsor.tier}</p>
                    </article>
                  ))}
                </div>
              </section>
            </main>
          ) : null}
        </>
      ) : null}

      <footer className="footer">
        <span>Source donnees: devquest.fr/export-2026 + schedule/day-1, day-2</span>
        <span>
          Derniere synchro: {state.updatedAt ? new Date(state.updatedAt).toLocaleTimeString("fr-FR") : "-"}
        </span>
      </footer>
    </div>
  );
}

