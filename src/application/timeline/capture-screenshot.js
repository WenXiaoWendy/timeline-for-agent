const fs = require("fs");
const os = require("os");
const path = require("path");

const { chromium } = require("playwright-core");

const { closeTimelineSiteServer } = require("../../infra/timeline/timeline-site-server");
const { buildTimelineSite } = require("./build-dashboard");
const { startTimelineSiteServer } = require("./serve-site");

const SCREENSHOT_SELECTOR_MAP = {
  timeline: ".screenshot-target-timeline",
  analytics: ".screenshot-target-analytics",
  events: ".screenshot-target-events",
};

async function captureTimelineScreenshot(config, options = {}) {
  const screenshotOptions = resolveTimelineScreenshotOptions(config, options);
  fs.mkdirSync(path.dirname(screenshotOptions.outputFile), { recursive: true });

  await buildTimelineSite(config);

  let server = null;
  let serverInfo = null;
  let browser = null;
  try {
    const started = await startTimelineSiteServer(config, { port: 0 });
    server = started.server;
    serverInfo = started.info;

    browser = await chromium.launch({
      executablePath: resolveChromeExecutablePath(config),
      headless: true,
      args: [
        "--disable-dev-shm-usage",
        "--hide-scrollbars",
        "--force-color-profile=srgb",
      ],
    });
    const page = await browser.newPage({
      viewport: { width: screenshotOptions.width, height: screenshotOptions.height },
      deviceScaleFactor: 2,
    });
    await page.goto(serverInfo.url, { waitUntil: "networkidle" });
    await page.emulateMedia({ colorScheme: "light" });
    await page.addStyleTag({
      content: buildPageScreenshotStyles(screenshotOptions.sidePadding),
    });
    await waitForDashboardReady(page);
    await page.locator(screenshotOptions.selector).screenshot({
      path: screenshotOptions.outputFile,
      type: "png",
      animations: "disabled",
    });

    return {
      outputFile: screenshotOptions.outputFile,
      selector: screenshotOptions.selector,
      url: serverInfo.url,
      width: screenshotOptions.width,
      height: screenshotOptions.height,
    };
  } finally {
    if (browser) {
      await browser.close().catch(() => {});
    }
    if (server && serverInfo) {
      await closeTimelineSiteServer(server);
    }
  }
}

function resolveTimelineScreenshotOptions(config, options = {}) {
  return {
    outputFile: resolveOutputFile(config, options.outputFile),
    selector: resolveScreenshotSelector(options.selector),
    width: parsePositiveInt(options.width, 1680),
    height: parsePositiveInt(options.height, 1400),
    sidePadding: parseNonNegativeInt(options.sidePadding, 32),
  };
}

function resolveScreenshotSelector(selector) {
  const normalized = String(selector || "").trim();
  if (!normalized) {
    return ".page";
  }
  return SCREENSHOT_SELECTOR_MAP[normalized] || normalized;
}

function resolveOutputFile(config, outputFile) {
  const normalized = String(outputFile || "").trim();
  if (normalized) {
    return path.resolve(normalized);
  }
  const shotsDir = path.join(config.timelineDir, "shots");
  const now = new Date();
  const stamp = [
    now.getFullYear(),
    String(now.getMonth() + 1).padStart(2, "0"),
    String(now.getDate()).padStart(2, "0"),
    "-",
    String(now.getHours()).padStart(2, "0"),
    String(now.getMinutes()).padStart(2, "0"),
    String(now.getSeconds()).padStart(2, "0"),
  ].join("");
  return path.join(shotsDir, `timeline-${stamp}.png`);
}

function parsePositiveInt(value, fallback) {
  const parsed = Number.parseInt(String(value || ""), 10);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
}

function parseNonNegativeInt(value, fallback) {
  const parsed = Number.parseInt(String(value || ""), 10);
  return Number.isFinite(parsed) && parsed >= 0 ? parsed : fallback;
}

function resolveChromeExecutablePath(config = {}) {
  const configuredPath = String(config.chromeExecutablePath || "").trim();
  const playwrightManagedPath = resolvePlaywrightExecutablePath();
  const candidates = dedupePaths([
    configuredPath,
    playwrightManagedPath,
    ...resolveSystemBrowserCandidates(),
  ]);

  for (const candidate of candidates) {
    if (fs.existsSync(candidate)) {
      return candidate;
    }
  }
  throw new Error(
    "找不到可用的 Chromium/Chrome，可设置 TIMELINE_FOR_AGENT_CHROME_PATH 或先安装 Playwright 浏览器"
  );
}

function resolvePlaywrightExecutablePath() {
  try {
    if (typeof chromium.executablePath !== "function") {
      return "";
    }
    return String(chromium.executablePath() || "").trim();
  } catch {
    return "";
  }
}

function resolveSystemBrowserCandidates() {
  if (process.platform === "darwin") {
    return [
      "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
      path.join(os.homedir(), "Applications/Google Chrome.app/Contents/MacOS/Google Chrome"),
      "/Applications/Chromium.app/Contents/MacOS/Chromium",
      path.join(os.homedir(), "Applications/Chromium.app/Contents/MacOS/Chromium"),
      "/Applications/Microsoft Edge.app/Contents/MacOS/Microsoft Edge",
      path.join(os.homedir(), "Applications/Microsoft Edge.app/Contents/MacOS/Microsoft Edge"),
    ];
  }

  if (process.platform === "win32") {
    const localAppData = String(process.env.LOCALAPPDATA || "").trim();
    const programFiles = String(process.env.PROGRAMFILES || "").trim();
    const programFilesX86 = String(process.env["PROGRAMFILES(X86)"] || "").trim();
    return [
      path.join(localAppData, "Google", "Chrome", "Application", "chrome.exe"),
      path.join(programFiles, "Google", "Chrome", "Application", "chrome.exe"),
      path.join(programFilesX86, "Google", "Chrome", "Application", "chrome.exe"),
      path.join(localAppData, "Chromium", "Application", "chrome.exe"),
      path.join(programFiles, "Chromium", "Application", "chrome.exe"),
      path.join(programFilesX86, "Chromium", "Application", "chrome.exe"),
      path.join(localAppData, "Microsoft", "Edge", "Application", "msedge.exe"),
      path.join(programFiles, "Microsoft", "Edge", "Application", "msedge.exe"),
      path.join(programFilesX86, "Microsoft", "Edge", "Application", "msedge.exe"),
    ];
  }

  return [
    "/usr/bin/google-chrome-stable",
    "/usr/bin/google-chrome",
    "/usr/bin/chromium-browser",
    "/usr/bin/chromium",
    "/snap/bin/chromium",
    "/opt/google/chrome/chrome",
    "/opt/microsoft/msedge/msedge",
  ];
}

function dedupePaths(paths) {
  const seen = new Set();
  const output = [];
  for (const candidate of Array.isArray(paths) ? paths : []) {
    const normalized = String(candidate || "").trim();
    if (!normalized || seen.has(normalized)) {
      continue;
    }
    seen.add(normalized);
    output.push(normalized);
  }
  return output;
}

async function waitForDashboardReady(page) {
  await page.locator(".page").waitFor({ state: "visible", timeout: 15_000 });
  await page.waitForFunction(async () => {
    if (!("fonts" in document) || !document.fonts || typeof document.fonts.ready?.then !== "function") {
      return true;
    }
    await document.fonts.ready;
    return true;
  }, { timeout: 15_000 });
  const hasTimeline = await page.locator(".timeline-canvas .vis-timeline").isVisible().catch(() => false);
  if (!hasTimeline) {
    await page.waitForFunction(() => {
      const emptyState = document.querySelector(".empty-state");
      const heroStats = document.querySelectorAll(".hero-stat-card").length;
      return !!emptyState || heroStats > 0;
    }, { timeout: 15_000 });
    await page.waitForTimeout(2400);
    return;
  }

  await page.waitForFunction(() => {
    const timeline = document.querySelector(".timeline-canvas .vis-timeline");
    if (!(timeline instanceof HTMLElement)) {
      return false;
    }
    const chartSvgs = Array.from(document.querySelectorAll(".recharts-responsive-container svg"));
    if (chartSvgs.length < 3) {
      return false;
    }
    return chartSvgs.every((svg) => {
      const rect = svg.getBoundingClientRect();
      return rect.width > 40 && rect.height > 40;
    });
  }, { timeout: 15_000 });
  await page.waitForFunction(() => {
    const pieSectors = Array.from(document.querySelectorAll(".recharts-pie .recharts-sector"));
    if (pieSectors.length < 2) {
      return false;
    }
    return pieSectors.every((sector) => {
      const rect = sector.getBoundingClientRect();
      return rect.width > 8 && rect.height > 8;
    });
  }, { timeout: 15_000 });
  await page.waitForFunction(() => {
    const pieLabels = Array.from(document.querySelectorAll(".pie-chart-shell svg text"));
    if (pieLabels.length < 4) {
      return false;
    }
    return pieLabels.every((label) => {
      const text = String(label.textContent || "").trim();
      const rect = label.getBoundingClientRect();
      return text.length > 0 && rect.width > 8 && rect.height > 8;
    });
  }, { timeout: 15_000 });
  await page.waitForFunction(() => {
    const trendLabels = Array.from(document.querySelectorAll(".trend-chart-shell .recharts-label-list text"));
    if (!trendLabels.length) {
      return false;
    }
    return trendLabels.every((label) => {
      const text = String(label.textContent || "").trim();
      const rect = label.getBoundingClientRect();
      return text.length > 0 && rect.width > 6 && rect.height > 6;
    });
  }, { timeout: 15_000 });
  await page.waitForTimeout(9000);
}

function buildPageScreenshotStyles(sidePadding) {
  const horizontalPadding = `${sidePadding}px`;
  return [
    ".page {",
    `  width: min(1440px, calc(100vw - ${sidePadding * 2}px)) !important;`,
    `  padding-left: ${horizontalPadding} !important;`,
    `  padding-right: ${horizontalPadding} !important;`,
    `  padding-top: ${horizontalPadding} !important;`,
    `  padding-bottom: ${horizontalPadding} !important;`,
    "}",
  ].join("\n");
}

module.exports = {
  captureTimelineScreenshot,
  SCREENSHOT_SELECTOR_MAP,
  resolveTimelineScreenshotOptions,
};
