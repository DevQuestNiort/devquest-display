import express from "express";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { getSchedulePayload } from "./scheduleService.js";

const PORT = Number(process.env.PORT || 3001);
const app = express();
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const distDir = path.resolve(__dirname, "../dist");

app.get("/api/health", (_req, res) => {
  res.json({ status: "ok" });
});

app.get("/api/schedule", async (req, res) => {
  try {
    const payload = await getSchedulePayload({ force: req.query.force === "1" });
    res.json(payload);
  } catch (error) {
    console.error("[schedule]", error);
    res.status(500).json({ message: "Impossible de charger le programme." });
  }
});

app.use(express.static(distDir));

app.get("*", (req, res, next) => {
  if (req.path.startsWith("/api/")) {
    return next();
  }

  return res.sendFile(path.join(distDir, "index.html"), (err) => {
    if (err) {
      res.status(404).send("Build frontend introuvable. Lancez npm run build.");
    }
  });
});

app.listen(PORT, () => {
  console.log(`DevQuest display server on http://localhost:${PORT}`);
});

