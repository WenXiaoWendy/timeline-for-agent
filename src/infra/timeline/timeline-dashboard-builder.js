const fs = require("fs");
const path = require("path");
const esbuild = require("esbuild");

const { buildTimelineViews } = require("./timeline-analytics");

async function buildTimelineDashboard({ store, siteDir, entryFile, cssFile }) {
  const state = store.getState();
  const factsUpdatedAt = readFileUpdatedAt(store.factsFilePath);
  const taxonomyUpdatedAt = readFileUpdatedAt(store.taxonomyFilePath);
  const views = buildTimelineViews(state, {
    updatedAt: factsUpdatedAt || taxonomyUpdatedAt || "",
    factsUpdatedAt,
    taxonomyUpdatedAt,
  });

  fs.mkdirSync(siteDir, { recursive: true });
  const assetsDir = path.join(siteDir, "assets");
  fs.mkdirSync(assetsDir, { recursive: true });

  await esbuild.build({
    entryPoints: [entryFile],
    bundle: true,
    outfile: path.join(assetsDir, "dashboard.js"),
    format: "iife",
    platform: "browser",
    jsx: "automatic",
    loader: {
      ".jsx": "jsx",
      ".css": "css",
    },
    external: [],
    logLevel: "silent",
    target: ["chrome120", "safari17"],
  });

  const bundledCssPath = path.join(assetsDir, "dashboard.css");
  if (!fs.existsSync(bundledCssPath)) {
    fs.copyFileSync(cssFile, bundledCssPath);
  }

  fs.writeFileSync(
    path.join(siteDir, "dashboard-data.json"),
    JSON.stringify(views, null, 2),
    "utf8"
  );
  fs.writeFileSync(path.join(siteDir, "index.html"), buildIndexHtml(), "utf8");
}

function buildIndexHtml() {
  return [
    "<!doctype html>",
    "<html lang=\"zh-CN\">",
    "<head>",
    "  <meta charset=\"utf-8\" />",
    "  <meta name=\"viewport\" content=\"width=device-width, initial-scale=1\" />",
    "  <title>Timeline for Agent</title>",
    "  <link rel=\"stylesheet\" href=\"./assets/dashboard.css\" />",
    "</head>",
    "<body>",
    "  <div id=\"root\"></div>",
    "  <script src=\"./assets/dashboard.js\"></script>",
    "</body>",
    "</html>",
  ].join("\n");
}

function readFileUpdatedAt(filePath) {
  try {
    if (!filePath || !fs.existsSync(filePath)) {
      return "";
    }
    return fs.statSync(filePath).mtime.toISOString();
  } catch {
    return "";
  }
}

module.exports = {
  buildTimelineDashboard,
};
