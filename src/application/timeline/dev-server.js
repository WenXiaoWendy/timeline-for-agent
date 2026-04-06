const fs = require("fs");
const http = require("http");
const path = require("path");

const { getTimelineDemoFactsPath, loadTimelineSourceData } = require("../../infra/timeline/timeline-source-data");
const { buildTimelineSite } = require("./build-dashboard");
const { createTimelineStore } = require("./shared");

async function runTimelineDevServer(config, options = {}) {
  const port = Number.isFinite(options.port) && options.port > 0
    ? options.port
    : config.timelinePort;
  const watchRoots = [
    path.join(__dirname, "..", "..", "timeline"),
    path.join(__dirname, "..", "..", "infra", "timeline"),
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

  await rebuildTimelineDevSite(state, config);

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

    serveTimelineDevAsset(config.timelineSiteDir, requestPath, response, state.version);
  });

  await new Promise((resolve) => server.listen(port, "127.0.0.1", resolve));
  const resolvedPort = Number(server.address()?.port || port);

  const watchers = watchRoots
    .filter(Boolean)
    .map((targetPath) => {
      try {
        return fs.watch(targetPath, { recursive: fs.statSync(targetPath).isDirectory() }, () => {
          scheduleTimelineDevRebuild(state, config);
        });
      } catch {
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

  return {
    port: resolvedPort,
    url: `http://127.0.0.1:${resolvedPort}`,
  };
}

function scheduleTimelineDevRebuild(state, config) {
  if (state.timer) {
    clearTimeout(state.timer);
  }
  state.timer = setTimeout(() => {
    state.timer = null;
    rebuildTimelineDevSite(state, config).catch((error) => {
      console.error("timeline dev rebuild failed:", error.message);
    });
  }, 120);
}

async function rebuildTimelineDevSite(state, config) {
  if (state.building) {
    state.pending = true;
    return;
  }

  state.building = true;
  try {
    await buildTimelineSite(config);
    state.version = Date.now();
    for (const client of state.clients) {
      client.write(`data: ${JSON.stringify({ version: state.version })}\n\n`);
    }
    console.log(`timeline dev rebuilt: ${new Date(state.version).toLocaleTimeString("zh-CN", { hour12: false })}`);
  } finally {
    state.building = false;
    if (state.pending) {
      state.pending = false;
      await rebuildTimelineDevSite(state, config);
    }
  }
}

function serveTimelineDevAsset(siteDir, requestPath, response, version) {
  const siteRoot = path.resolve(siteDir);
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
    response.end(injectHotReload(html, version));
    return;
  }

  response.writeHead(200, {
    "content-type": detectMimeType(resolvedPath),
    "cache-control": "no-store, no-cache, must-revalidate, proxy-revalidate",
    pragma: "no-cache",
    expires: "0",
  });
  fs.createReadStream(resolvedPath).pipe(response);
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

module.exports = {
  runTimelineDevServer,
};
