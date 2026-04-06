const fs = require("fs");
const os = require("os");
const path = require("path");

const { chromium } = require("playwright-core");

const { closeTimelineSiteServer } = require("../../infra/timeline/timeline-site-server");
const { buildTimelineSite } = require("./build-dashboard");
const { startTimelineSiteServer } = require("./serve-site");

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
      executablePath: resolveChromeExecutablePath(),
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
    selector: String(options.selector || ".page").trim() || ".page",
    width: parsePositiveInt(options.width, 1680),
    height: parsePositiveInt(options.height, 1400),
    sidePadding: parseNonNegativeInt(options.sidePadding, 32),
  };
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

function resolveChromeExecutablePath() {
  const candidates = [
    process.env.TIMELINE_FOR_AGENT_CHROME_PATH || "",
    "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
    path.join(os.homedir(), "Applications/Google Chrome.app/Contents/MacOS/Google Chrome"),
  ].filter(Boolean);

  for (const candidate of candidates) {
    if (fs.existsSync(candidate)) {
      return candidate;
    }
  }
  throw new Error("找不到可用的 Chrome，可设置 TIMELINE_FOR_AGENT_CHROME_PATH");
}

async function waitForDashboardReady(page) {
  await page.locator(".page").waitFor({ state: "visible", timeout: 15_000 });
  const hasTimeline = await page.locator(".timeline-canvas .vis-timeline").isVisible().catch(() => false);
  if (!hasTimeline) {
    await page.waitForFunction(() => {
      const emptyState = document.querySelector(".empty-state");
      const heroStats = document.querySelectorAll(".hero-stat-card").length;
      return !!emptyState || heroStats > 0;
    }, { timeout: 15_000 });
    await page.waitForTimeout(1200);
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
  await page.waitForTimeout(6500);
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
  resolveTimelineScreenshotOptions,
};
