const fs = require("fs");
const http = require("http");
const path = require("path");

const { TimelineStore } = require("../infra/timeline/timeline-store");
const { buildTimelineDashboard } = require("../infra/timeline/timeline-dashboard-builder");
const { getTimelineDemoFactsPath, loadTimelineSourceData } = require("../infra/timeline/timeline-source-data");

async function runTimelineDevCommand(config) {
  const port = parsePort(process.argv.slice(3), config.timelinePort);
  const watchRoots = [
    path.join(__dirname, "..", "timeline"),
    path.join(__dirname, "..", "infra", "timeline"),
    config.timelineTaxonomyFile,
    config.timelineFactsFile,
    getTimelineDemoFactsPath(),
  ];

  const state = {
    building: false,
    pending: false,
    version: Date.now(),
    clients: new Set(),
  };

  await rebuild(state, config);

  const server = http.createServer((request, response) => {
    const requestPath = normalizeRequestPath(request.url || "/");
    if (requestPath === "__timeline_source_data") {
      const store = createTimelineStore(config);
      const payload = loadTimelineSourceData({ store });
      response.writeHead(200, {
        "content-type": "application/json; charset=utf-8",
        "cache-control": "no-store, no-cache, must-revalidate, proxy-revalidate",
        pragma: "no-cache",
        expires: "0",
      });
      response.end(JSON.stringify(payload));
      return;
    }
    if (requestPath === "__timeline_dev_events") {
      response.writeHead(200, {
        "content-type": "text/event-stream; charset=utf-8",
        "cache-control": "no-store, no-cache, must-revalidate, proxy-revalidate",
        pragma: "no-cache",
        expires: "0",
        connection: "keep-alive",
      });
      response.write(`data: ${JSON.stringify({ version: state.version })}\n\n`);
      state.clients.add(response);
      request.on("close", () => {
        state.clients.delete(response);
      });
      return;
    }

    const siteRoot = path.resolve(config.timelineSiteDir);
    const filePath = path.resolve(siteRoot, requestPath);
    const safePath = filePath.startsWith(siteRoot) ? filePath : path.join(siteRoot, "index.html");
    const resolvedPath = fs.existsSync(safePath) && fs.statSync(safePath).isFile()
      ? safePath
      : path.join(siteRoot, "index.html");
    if (!fs.existsSync(resolvedPath)) {
      response.writeHead(404, { "content-type": "text/plain; charset=utf-8" });
      response.end("timeline site not built");
      return;
    }

    if (resolvedPath.endsWith(".html")) {
      const html = fs.readFileSync(resolvedPath, "utf8");
      response.writeHead(200, {
        "content-type": "text/html; charset=utf-8",
        "cache-control": "no-store, no-cache, must-revalidate, proxy-revalidate",
        pragma: "no-cache",
        expires: "0",
      });
      response.end(injectHotReload(html, state.version));
      return;
    }

    response.writeHead(200, {
      "content-type": detectMimeType(resolvedPath),
      "cache-control": "no-store, no-cache, must-revalidate, proxy-revalidate",
      pragma: "no-cache",
      expires: "0",
    });
    fs.createReadStream(resolvedPath).pipe(response);
  });

  await new Promise((resolve) => server.listen(port, "127.0.0.1", resolve));
  console.log(`timeline dev: http://127.0.0.1:${port}`);

  const watchers = watchRoots
    .filter(Boolean)
    .map((targetPath) => {
      try {
        return fs.watch(targetPath, { recursive: fs.statSync(targetPath).isDirectory() }, () => {
          scheduleRebuild(state, config);
        });
      } catch (error) {
        console.warn(`timeline dev watch skipped: ${targetPath}`);
        return null;
      }
    })
    .filter(Boolean);

  const cleanup = () => {
    for (const watcher of watchers) {
      watcher.close();
    }
    for (const client of state.clients) {
      client.end();
    }
    server.close(() => process.exit(0));
  };

  process.on("SIGINT", cleanup);
  process.on("SIGTERM", cleanup);
}

function scheduleRebuild(state, config) {
  if (state.timer) {
    clearTimeout(state.timer);
  }
  state.timer = setTimeout(() => {
    state.timer = null;
    rebuild(state, config).catch((error) => {
      console.error("timeline dev rebuild failed:", error.message);
    });
  }, 120);
}

async function rebuild(state, config) {
  if (state.building) {
    state.pending = true;
    return;
  }
  state.building = true;
  try {
    const store = createTimelineStore(config);
    await buildTimelineDashboard({
      store,
      siteDir: config.timelineSiteDir,
      entryFile: path.join(__dirname, "..", "timeline", "dashboard-app.jsx"),
      cssFile: path.join(__dirname, "..", "timeline", "css", "dashboard.css"),
    });
    state.version = Date.now();
    for (const client of state.clients) {
      client.write(`data: ${JSON.stringify({ version: state.version })}\n\n`);
    }
    console.log(`timeline dev rebuilt: ${new Date(state.version).toLocaleTimeString("zh-CN", { hour12: false })}`);
  } finally {
    state.building = false;
    if (state.pending) {
      state.pending = false;
      await rebuild(state, config);
    }
  }
}

function createTimelineStore(config) {
  return new TimelineStore({
    taxonomyFilePath: config.timelineTaxonomyFile,
    factsFilePath: config.timelineFactsFile,
    legacyFilePath: config.timelineDbFile,
  });
}

function injectHotReload(html, version) {
  const safeVersion = Number(version) || Date.now();
  const withAssetBusters = html
    .replace("./assets/dashboard.css", `./assets/dashboard.css?v=${safeVersion}`)
    .replace("./assets/dashboard.js", `./assets/dashboard.js?v=${safeVersion}`);
  const snippet = [
    "<script>",
    "(() => {",
    `  window.__TIMELINE_DEV_VERSION__ = ${safeVersion};`,
    "  const source = new EventSource('/__timeline_dev_events');",
    "  let first = true;",
    "  source.onmessage = () => {",
    "    if (first) { first = false; return; }",
    "    window.location.reload();",
    "  };",
    "})();",
    "</script>",
  ].join("");
  return withAssetBusters.includes("</body>") ? withAssetBusters.replace("</body>", `${snippet}</body>`) : `${withAssetBusters}${snippet}`;
}

function parsePort(args, fallback) {
  for (let index = 0; index < args.length; index += 1) {
    if (args[index] !== "--port") {
      continue;
    }
    const value = Number.parseInt(String(args[index + 1] || ""), 10);
    return Number.isFinite(value) && value > 0 ? value : fallback;
  }
  return fallback;
}

function normalizeRequestPath(url) {
  const pathname = String(url || "/").split("?")[0];
  if (!pathname || pathname === "/") {
    return "index.html";
  }
  return pathname.replace(/^\/+/, "");
}

function detectMimeType(filePath) {
  if (filePath.endsWith(".css")) {
    return "text/css; charset=utf-8";
  }
  if (filePath.endsWith(".js")) {
    return "application/javascript; charset=utf-8";
  }
  if (filePath.endsWith(".json")) {
    return "application/json; charset=utf-8";
  }
  return "text/html; charset=utf-8";
}

module.exports = { runTimelineDevCommand };
