const { execFile, spawn } = require("node:child_process");
const express = require("express");

const app = express();
app.set("trust proxy", true);

const PORT = process.env.PORT || 8080;

const FORMATS = {
  Lite: "worstaudio",
  Good: "bestaudio[ext=m4a]/bestaudio/best",
  Best: "bestaudio/best",
};

const SEARCH_TTL_MS = 10 * 60 * 1000;
const searchCache = new Map(); // key: `${q}\n${limit}` -> { expires, data }

// JSON request logging: { method, path, status, ms }
app.use((req, res, next) => {
  const start = Date.now();
  res.on("finish", () => {
    console.log(
      JSON.stringify({
        method: req.method,
        path: req.originalUrl,
        status: res.statusCode,
        ms: Date.now() - start,
      })
    );
  });
  next();
});

function execFileAsync(file, args, opts) {
  return new Promise((resolve, reject) => {
    execFile(file, args, opts, (err, stdout, stderr) => {
      if (err) {
        err.stdout = stdout;
        err.stderr = stderr;
        reject(err);
        return;
      }
      resolve({ stdout, stderr });
    });
  });
}

app.get("/health", async (req, res) => {
  try {
    const { stdout } = await execFileAsync("yt-dlp", ["--version"], {
      timeout: 15000,
    });
    res.json({ ok: true, yt: String(stdout).trim() });
  } catch (e) {
    res
      .status(502)
      .json({ ok: false, error: "yt-dlp-missing", detail: String(e.stderr || e.message || e).slice(-200) });
  }
});

app.get("/search", async (req, res) => {
  const q = String(req.query.q || "").trim();
  const limit = Math.min(Math.max(parseInt(req.query.limit, 10) || 15, 1), 50);

  if (!q) {
    return res.status(400).json({ error: "missing-q" });
  }

  const key = `${q}\n${limit}`;
  const cached = searchCache.get(key);
  if (cached && cached.expires > Date.now()) {
    return res.json(cached.data);
  }

  try {
    const { stdout } = await execFileAsync(
      "yt-dlp",
      [
        `ytsearch${limit}:${q}`,
        "--flat-playlist",
        "--dump-single-json",
        "--no-playlist",
        "--quiet",
        "--no-warnings",
      ],
      { timeout: 25000, maxBuffer: 10 * 1024 * 1024 }
    );

    const parsed = JSON.parse(stdout);
    const entries = Array.isArray(parsed.entries) ? parsed.entries : [];

    const results = entries.filter(Boolean).map((e) => {
      const id = String(e.id || "");
      const thumbs = Array.isArray(e.thumbnails) ? e.thumbnails : [];
      const artwork =
        (thumbs.length ? thumbs[thumbs.length - 1].url : null) ||
        `https://i.ytimg.com/vi/${id}/hqdefault.jpg`;
      return {
        videoId: id,
        title: e.title || "",
        artist: e.uploader || e.channel || "",
        durationSec: e.duration || 0,
        artwork,
      };
    });

    const payload = { results };
    searchCache.set(key, { expires: Date.now() + SEARCH_TTL_MS, data: payload });
    res.json(payload);
  } catch (e) {
    const stderr = String(e.stderr || e.message || e);
    res.status(502).json({ error: "search-failed", detail: stderr.slice(-200) });
  }
});

app.get("/audio", async (req, res) => {
  const id = String(req.query.id || "");
  const quality = String(req.query.quality || "Good");
  const fmt = FORMATS[quality] || FORMATS.Good;

  if (!/^[A-Za-z0-9_-]{11}$/.test(id)) {
    return res.status(400).json({ error: "bad-id" });
  }

  const url = `https://www.youtube.com/watch?v=${id}`;

  // Redirect mode: resolve direct media URL via `yt-dlp -g`, 302 to it.
  if (req.query.redirect === "1") {
    try {
      const { stdout } = await execFileAsync(
        "yt-dlp",
        ["-g", "-f", fmt, "--no-playlist", url],
        { timeout: 25000, maxBuffer: 10 * 1024 * 1024 }
      );
      const direct = String(stdout).split("\n").map((s) => s.trim()).filter(Boolean)[0];
      if (!direct) {
        return res.status(502).json({ error: "resolve-failed", detail: "empty url" });
      }
      return res.redirect(302, direct);
    } catch (e) {
      const stderr = String(e.stderr || e.message || e);
      return res.status(502).json({ error: "resolve-failed", detail: stderr.slice(-200) });
    }
    return;
  }

  // Stream mode: pipe yt-dlp stdout to the response.
  const child = spawn(
    "yt-dlp",
    ["-f", fmt, "-o", "-", "--no-playlist", "--quiet", "--no-warnings", "--no-part", url],
    { stdio: ["ignore", "pipe", "pipe"] }
  );

  let bytesSent = false;
  let headersSent = false;
  const sendHeaders = () => {
    if (!headersSent) {
      headersSent = true;
      res.setHeader("Content-Type", "audio/mp4");
      res.setHeader("Content-Disposition", `attachment; filename="${id}.m4a"`);
    }
  };

  req.on("close", () => {
    if (!res.writableEnded) {
      child.kill("SIGKILL");
    }
  });

  child.stdout.on("data", (chunk) => {
    bytesSent = true;
    sendHeaders();
  });
  child.stdout.pipe(res);

  let stderrTail = "";
  child.stderr.on("data", (d) => {
    stderrTail += d.toString();
    if (stderrTail.length > 2000) stderrTail = stderrTail.slice(-2000);
  });

  child.on("error", (err) => {
    if (!bytesSent && !res.headersSent) {
      res.status(502).json({ error: "stream-failed", detail: String(err.message || err).slice(-200) });
    } else if (!res.writableEnded) {
      res.end();
    }
  });

  child.on("close", (code) => {
    if (code !== 0 && !bytesSent && !res.headersSent) {
      res.status(502).json({ error: "stream-failed", detail: stderrTail.slice(-200) });
    } else if (!res.writableEnded) {
      res.end();
    }
  });
});

app.listen(PORT, () => {
  console.log(JSON.stringify({ msg: "puff-yt-worker listening", port: PORT }));
});
