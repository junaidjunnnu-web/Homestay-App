/**
 * Production static server for the Expo web export (dist/).
 * Serves the React Native Web app at the root URL with SPA fallbacks.
 */

const http = require("http");
const fs = require("fs");
const path = require("path");

const STATIC_ROOT = path.resolve(__dirname, "..", "dist");
const basePath = (process.env.BASE_PATH || "/").replace(/\/+$/, "");

const MIME_TYPES = {
  ".html": "text/html; charset=utf-8",
  ".js": "application/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".gif": "image/gif",
  ".svg": "image/svg+xml",
  ".ico": "image/x-icon",
  ".woff": "font/woff",
  ".woff2": "font/woff2",
  ".ttf": "font/ttf",
  ".otf": "font/otf",
  ".map": "application/json",
  ".webmanifest": "application/manifest+json",
};

function sendJson(res, status, body) {
  res.writeHead(status, { "content-type": "application/json" });
  res.end(JSON.stringify(body));
}

function getContentType(filePath) {
  const ext = path.extname(filePath).toLowerCase();
  if (ext === ".json" && path.basename(filePath) === "manifest.json") {
    return "application/manifest+json; charset=utf-8";
  }
  return MIME_TYPES[ext] || "application/octet-stream";
}

function resolveRequestPath(pathname) {
  const urlPath = pathname.replace(/\\/g, "/").replace(/^\/+/, "");
  const segments = urlPath.split("/").filter(Boolean);

  if (segments.some((segment) => segment === "..")) {
    return null;
  }

  const candidates = [
    urlPath,
    `${urlPath}.html`,
    path.posix.join(urlPath, "index.html"),
    "index.html",
  ].filter(Boolean);

  for (const candidate of candidates) {
    const filePath = path.join(STATIC_ROOT, ...candidate.split("/"));
    if (!filePath.startsWith(STATIC_ROOT)) {
      continue;
    }
    if (fs.existsSync(filePath) && fs.statSync(filePath).isFile()) {
      return filePath;
    }
  }

  return null;
}

function serveFile(filePath, res) {
  const contentType = getContentType(filePath);
  const headers = { "content-type": contentType };

  if (path.basename(filePath) === "sw.js") {
    headers["service-worker-allowed"] = "/";
    headers["cache-control"] = "no-cache";
  }

  res.writeHead(200, headers);
  res.end(fs.readFileSync(filePath));
}

const server = http.createServer((req, res) => {
  const url = new URL(req.url || "/", `http://${req.headers.host}`);
  let pathname = url.pathname;

  if (basePath && pathname.startsWith(basePath)) {
    pathname = pathname.slice(basePath.length) || "/";
  }

  if (pathname === "/status" || pathname === "/healthz") {
    sendJson(res, 200, { status: "ok" });
    return;
  }

  if (!fs.existsSync(STATIC_ROOT)) {
    sendJson(res, 503, {
      error: "not_ready",
      message: "Web build not found. Run pnpm run build first.",
    });
    return;
  }

  const filePath = resolveRequestPath(pathname);
  if (!filePath) {
    res.writeHead(404, { "content-type": "text/plain; charset=utf-8" });
    res.end("Not Found");
    return;
  }

  serveFile(filePath, res);
});

const port = parseInt(process.env.PORT || "3000", 10);
server.listen(port, "0.0.0.0", () => {
  console.log(`Serving Homestay web app from ${STATIC_ROOT} on port ${port}`);
});
