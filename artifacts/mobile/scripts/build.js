const fs = require("fs");
const path = require("path");
const { spawnSync } = require("child_process");

const projectRoot = path.resolve(__dirname, "..");

function stripProtocol(domain) {
  let urlString = domain.trim();
  if (!/^https?:\/\//i.test(urlString)) {
    urlString = `https://${urlString}`;
  }
  return new URL(urlString).host;
}

function getDeploymentDomain() {
  if (process.env.REPLIT_INTERNAL_APP_DOMAIN) {
    return stripProtocol(process.env.REPLIT_INTERNAL_APP_DOMAIN);
  }
  if (process.env.REPLIT_DEV_DOMAIN) {
    return stripProtocol(process.env.REPLIT_DEV_DOMAIN);
  }
  if (process.env.EXPO_PUBLIC_DOMAIN) {
    return stripProtocol(process.env.EXPO_PUBLIC_DOMAIN);
  }

  console.warn(
    "No deployment domain env var found; using localhost for export metadata.",
  );
  return "localhost";
}

function preparePublicAssets() {
  const publicDir = path.join(projectRoot, "public");
  fs.mkdirSync(publicDir, { recursive: true });

  const iconSrc = path.join(projectRoot, "assets", "images", "icon.png");
  const iconDest = path.join(publicDir, "icon.png");
  if (fs.existsSync(iconSrc)) {
    fs.copyFileSync(iconSrc, iconDest);
  } else {
    console.warn("Warning: assets/images/icon.png not found — PWA icon may be missing");
  }
}

function readAppConfig() {
  const appJsonPath = path.join(projectRoot, "app.json");
  const appJson = JSON.parse(fs.readFileSync(appJsonPath, "utf-8"));
  return appJson.expo || {};
}

function writePwaAssets(distDir) {
  const expo = readAppConfig();
  const web = expo.web || {};
  const iconSrc = path.join(projectRoot, "assets", "images", "icon.png");
  const iconDest = path.join(distDir, "icon.png");

  if (fs.existsSync(iconSrc)) {
    fs.copyFileSync(iconSrc, iconDest);
  }

  const manifest = {
    name: web.name || expo.name || "Homestay App",
    short_name: web.shortName || expo.name || "Homestay",
    description:
      web.description || "Manage and book beautiful Indian homestays",
    start_url: "/",
    scope: "/",
    display: "standalone",
    orientation: expo.orientation || "portrait",
    theme_color: web.themeColor || "#E8824A",
    background_color: web.backgroundColor || "#FAF6F1",
    icons: [
      {
        src: "/icon.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "any maskable",
      },
    ],
  };

  fs.writeFileSync(
    path.join(distDir, "manifest.json"),
    JSON.stringify(manifest, null, 2),
  );

  const serviceWorker = `self.addEventListener("install", (event) => {
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(self.clients.claim());
});

self.addEventListener("fetch", (event) => {
  event.respondWith(fetch(event.request));
});
`;

  fs.writeFileSync(path.join(distDir, "sw.js"), serviceWorker);

  const registrationScript =
    '<script>if("serviceWorker"in navigator){window.addEventListener("load",function(){navigator.serviceWorker.register("/sw.js").catch(function(){});});}</script>';

  const htmlFiles = [];
  function collectHtmlFiles(dir) {
    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
      const fullPath = path.join(dir, entry.name);
      if (entry.isDirectory()) {
        collectHtmlFiles(fullPath);
      } else if (entry.name.endsWith(".html")) {
        htmlFiles.push(fullPath);
      }
    }
  }

  collectHtmlFiles(distDir);

  for (const htmlPath of htmlFiles) {
    let html = fs.readFileSync(htmlPath, "utf-8");
    if (html.includes('navigator.serviceWorker.register("/sw.js")')) {
      continue;
    }
    html = html.replace("</body>", `${registrationScript}</body>`);
    fs.writeFileSync(htmlPath, html);
  }

  console.log("PWA assets written: manifest.json, sw.js, icon.png");
}

function cleanOutputDirs() {
  for (const dirName of ["dist", "static-build", "web-build"]) {
    const dirPath = path.join(projectRoot, dirName);
    if (fs.existsSync(dirPath)) {
      fs.rmSync(dirPath, { recursive: true, force: true });
    }
  }
}

function main() {
  console.log("Building production web export...");

  const domain = getDeploymentDomain();
  const baseUrl = `https://${domain}`;

  preparePublicAssets();
  cleanOutputDirs();

  const distDir = path.join(projectRoot, "dist");

  const env = {
    ...process.env,
    NODE_ENV: "production",
    CI: "true",
    EXPO_PUBLIC_DOMAIN: domain,
    EXPO_PUBLIC_API_URL: `${baseUrl}/api`,
  };

  console.log(`EXPO_PUBLIC_DOMAIN=${domain}`);
  console.log(`EXPO_PUBLIC_API_URL=${env.EXPO_PUBLIC_API_URL}`);

  const result = spawnSync(
    "pnpm",
    ["exec", "expo", "export", "--platform", "web"],
    {
      cwd: projectRoot,
      env,
      stdio: "inherit",
      shell: true,
    },
  );

  if (result.status !== 0) {
    console.error("Web export failed");
    process.exit(result.status || 1);
  }

  if (!fs.existsSync(path.join(distDir, "index.html"))) {
    console.error("ERROR: dist/index.html not found after export");
    process.exit(1);
  }

  writePwaAssets(distDir);

  console.log("Web export complete. Deploy to:", baseUrl);
}

main();
