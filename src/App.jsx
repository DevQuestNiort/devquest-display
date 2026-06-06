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

// Images de fond — désactivées en mode lite
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
const SPONSORS = [
  { name: "Maif", image: "https://www.devquest.fr/partenaires/maif.webp", level: "LEGENDAIRE" },
  { name: "Altapyx", image: "https://www.devquest.fr/partenaires/altapyx.webp", level: "EPIQUE" },
  { name: "Clever Cloud SAS", image: "https://www.devquest.fr/partenaires/clever-cloud.png", level: "EPIQUE" },
  { name: "Catamania", image: "https://www.devquest.fr/partenaires/catamania.png", level: "EPIQUE" },
  { name: "NeoSoft", image: "https://www.devquest.fr/partenaires/neosoft.webp", level: "EPIQUE" },
  { name: "Alltech Consulting", image: "https://www.devquest.fr/partenaires/alltech.webp", level: "EPIQUE" },
  { name: "IMA", image: "https://www.devquest.fr/partenaires/ima.webp", level: "EPIQUE" },
  { name: "Wekey", image: "https://www.devquest.fr/partenaires/wekey.webp", level: "RARE" },
  { name: "SFEIR", image: "https://www.devquest.fr/partenaires/SFEIR.webp", level: "RARE" },
  { name: "Serli", image: "https://www.devquest.fr/partenaires/serli.webp", level: "RARE" },
  { name: "SII", image: "https://www.devquest.fr/partenaires/sii.webp", level: "RARE" },
  { name: "Darva", image: "https://www.devquest.fr/partenaires/darva.webp", level: "COMMUN" },
  { name: "Zenika", image: "https://www.devquest.fr/partenaires/zenika.webp", level: "COMMUN" },
  { name: "Macif", image: "https://www.devquest.fr/partenaires/macif.webp", level: "COMMUN" },
  { name: "Socram Banque", image: "https://www.devquest.fr/partenaires/socram.webp", level: "COMMUN" },
  { name: "SPI Informatique", image: "https://www.devquest.fr/partenaires/spi-informatique.jpg", level: "COMMUN" }
];

function getMockConfigFromUrl() {
  if (typeof window === "undefined") return null;
  const query = new URLSearchParams(window.location.search);
  return parseMockNowParam(query.get("mockNow"));
}

function isLiteMode() {
  if (typeof window === "undefined") return false;
  return new URLSearchParams(window.location.search).get("lite") === "true";
}

async function loadSchedule(setState) {
  setState((prev) => ({ ...prev, loading: true, error: "" }));
  try {
    const response = await fetch("/api/schedule");
    if (!response.ok) throw new Error(`Erreur API: ${response.status}`);
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

function getRoomBackgroundStyle(room, lite) {
  // LITE: pas d'image de fond — économise GPU et mémoire
  if (lite) return undefined;
  const imageUrl = ROOM_BACKGROUNDS[room];
  return imageUrl ? { "--room-background": `url(${imageUrl})` } : undefined;
}

function RoomColumn({ column, className = "", lite = false }) {
  return (
    <section className={`column ${className}`.trim()} style={getRoomBackgroundStyle(column.room, lite)}>
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
  const lite = useMemo(() => isLiteMode(), []);
  const carouselStartMs = useMemo(() => Date.now(), []);
  const [state, setState] = useState({
    loading: true,
    error: "",
    events: [],
    updatedAt: ""
  });
  const [now, setNow] = useState(() => getDisplayNow(mockConfig));
  const [manualView, setManualView] = useState(null);

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
  const activeType = manualView ?? rotationView.type;

  return (
    <div className="app-shell">
      {state.error && <div className="error-banner">{state.error}</div>}

      {state.loading && state.events.length === 0 ? (
        <main className="schedule-grid">
          {roomColumns.map((column) => (
            <RoomColumn key={column.room} column={column} lite={lite} />
          ))}
        </main>
      ) : null}

      {!state.loading || state.events.length > 0 ? (
        <main className="schedule-grid">
          {ROOM_ORDER.map((room) => {
            const col = roomColumns.find((c) => c.room === room) || { room, current: null, next: null };
            const isZoomed = activeType === "room" && rotationView.room === room;
            return (
              <RoomColumn key={room} column={col} className={isZoomed ? "column--zoomed" : ""} lite={lite} />
            );
          })}
        </main>
      ) : null}

      <div className={`sponsor-panel${activeType === "sponsors" ? " sponsor-panel--expanded" : ""}`}>
        <div className="sponsor-panel__board">
          <h2>Les sponsors de la quete</h2>
          <p>Merci aux guildes qui soutiennent l'aventure DevQuest.</p>
          <div className="sponsor-grid">
            {["LEGENDAIRE", "EPIQUE", "RARE", "COMMUN"].map((level) => {
              const group = SPONSORS.filter((s) => s.level === level);
              if (!group.length) return null;
              return (
                <div key={level} className={`sponsor-row sponsor-row--${level.toLowerCase()}`}>
                  <span className={`sponsor-level-label sponsor-level-label--${level.toLowerCase()}`}>{level}</span>
                  <div className="sponsor-row-logos">
                    {group.map((sponsor) => (
                      <article key={sponsor.name} className={`sponsor-card sponsor-card--${level.toLowerCase()}`}>
                        <img src={sponsor.image} alt={sponsor.name} />
                      </article>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
        <div className="sponsor-panel__strip">
          <div className="sponsor-strip-clock">
            <span className="sponsor-strip-clock__time">{formatClock(now)}</span>
            <span className="sponsor-strip-clock__date">{formatDateTime(now)}</span>
          </div>
          <div className="sponsor-strip-logos">
            {SPONSORS.map((sponsor) => (
              <img key={sponsor.name} src={sponsor.image} alt={sponsor.name} />
            ))}
          </div>
          <select
            className="view-select"
            value={manualView ?? "auto"}
            onChange={(e) => setManualView(e.target.value === "auto" ? null : e.target.value)}
          >
            <option value="auto">Auto</option>
            <option value="global">Globale</option>
            <option value="room">Par salle</option>
            <option value="sponsors">Sponsors</option>
          </select>
        </div>
      </div>
    </div>
  );
}
