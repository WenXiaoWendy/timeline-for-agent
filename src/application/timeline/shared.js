const fs = require("fs");
const path = require("path");

const { TimelineStore } = require("../../infra/timeline/timeline-store");

function createTimelineStore(config) {
  return new TimelineStore({
    stateFilePath: config.timelineStateFile,
    taxonomyFilePath: config.timelineTaxonomyFile,
    factsFilePath: config.timelineFactsFile,
    legacyFilePath: config.timelineDbFile,
  });
}

function getTimelineDashboardBuildOptions(config) {
  return {
    siteDir: config.timelineSiteDir,
    entryFile: path.join(__dirname, "..", "..", "timeline", "dashboard-app.jsx"),
    cssFile: path.join(__dirname, "..", "..", "timeline", "css", "dashboard.css"),
  };
}

function createTimelineDashboardBuildInput(config) {
  return {
    store: createTimelineStore(config),
    ...getTimelineDashboardBuildOptions(config),
  };
}

async function withTimelineWriteLock(config, action, options = {}) {
  const lockDir = String(config?.timelineWriteLockDir || "").trim();
  if (!lockDir) {
    return action();
  }
  fs.mkdirSync(path.dirname(lockDir), { recursive: true });

  const timeoutMs = Number.isFinite(options.timeoutMs) && options.timeoutMs > 0
    ? options.timeoutMs
    : 5_000;
  const retryDelayMs = Number.isFinite(options.retryDelayMs) && options.retryDelayMs > 0
    ? options.retryDelayMs
    : 50;
  const startedAt = Date.now();

  while (true) {
    try {
      fs.mkdirSync(lockDir, { recursive: false });
      break;
    } catch (error) {
      if (error?.code !== "EEXIST") {
        throw error;
      }
      if (Date.now() - startedAt >= timeoutMs) {
        throw new Error("timeline-write 正在被其他进程占用，请稍后重试");
      }
      await sleep(retryDelayMs);
    }
  }

  try {
    return await action();
  } finally {
    try {
      fs.rmSync(lockDir, { recursive: true, force: true });
    } catch {
      // Ignore lock cleanup errors so the original write result wins.
    }
  }
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

module.exports = {
  createTimelineDashboardBuildInput,
  createTimelineStore,
  getTimelineDashboardBuildOptions,
  withTimelineWriteLock,
};
