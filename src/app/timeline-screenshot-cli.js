const fs = require("fs");
const os = require("os");
const path = require("path");

const { chromium } = require("playwright-core");

const { runTimelineBuildCommand } = require("./timeline-build-cli");
const { createTimelineSiteServer, listenTimelineSiteServer, closeTimelineSiteServer } = require("../infra/timeline/timeline-site-server");

async function runTimelineScreenshotCommand(config) {
  const options = parseArgs(process.argv.slice(3), config);
  fs.mkdirSync(path.dirname(options.outputFile), { recursive: true });

  await runTimelineBuildCommand(config);

  const server = createTimelineSiteServer({ siteDir: config.timelineSiteDir });
  let serverInfo = null;
  let browser = null;
  try {
    serverInfo = await listenTimelineSiteServer(server, { port: 0 });
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
      viewport: { width: options.width, height: options.height },
      deviceScaleFactor: 2,
    });
    await page.goto(serverInfo.url, { waitUntil: "networkidle" });
    await page.emulateMedia({ colorScheme: "light" });
    await page.addStyleTag({
      content: [
        ".page {",
        "  width: min(1440px, calc(100vw - 56px)) !important;",
        "  padding-left: 28px !important;",
        "  padding-right: 28px !important;",
        "  padding-top: 28px !important;",
        "  padding-bottom: 28px !important;",
        "}",
      ].join("\n"),
    });
    await waitForDashboardReady(page);
    await page.locator(options.selector).screenshot({
      path: options.outputFile,
      type: "png",
      animations: "disabled",
    });

    console.log(`timeline screenshot saved: ${options.outputFile}`);
  } finally {
    if (browser) {
      await browser.close().catch(() => {});
    }
    if (serverInfo) {
      await closeTimelineSiteServer(server);
    }
  }
}

function parseArgs(args, config) {
  const options = {
    outputFile: defaultOutputFile(config),
    selector: ".page",
    width: 1680,
    height: 1400,
    sidePadding: 32,
  };

  for (let index = 0; index < args.length; index += 1) {
    const token = String(args[index] || "").trim();
    if (!token) {
      continue;
    }
    if (token === "--output") {
      options.outputFile = path.resolve(String(args[index + 1] || ""));
      index += 1;
      continue;
    }
    if (token === "--selector") {
      options.selector = String(args[index + 1] || "").trim() || ".page";
      index += 1;
      continue;
    }
    if (token === "--width") {
      options.width = parsePositiveInt(args[index + 1], options.width);
      index += 1;
      continue;
    }
    if (token === "--height") {
      options.height = parsePositiveInt(args[index + 1], options.height);
      index += 1;
      continue;
    }
    if (token === "--side-padding") {
      options.sidePadding = parseNonNegativeInt(args[index + 1], options.sidePadding);
      index += 1;
      continue;
    }
    throw new Error(`未知参数: ${token}`);
  }

  return options;
}

function parsePositiveInt(value, fallback) {
  const parsed = Number.parseInt(String(value || ""), 10);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
}

function parseNonNegativeInt(value, fallback) {
  const parsed = Number.parseInt(String(value || ""), 10);
  return Number.isFinite(parsed) && parsed >= 0 ? parsed : fallback;
}

function defaultOutputFile(config) {
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

module.exports = { runTimelineScreenshotCommand };
