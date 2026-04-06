const path = require("path");

const { captureTimelineScreenshot, resolveTimelineScreenshotOptions } = require("../application/timeline/capture-screenshot");

async function runTimelineScreenshotCommand(config) {
  const options = parseArgs(process.argv.slice(3), config);
  const result = await captureTimelineScreenshot(config, options);
  console.log(`timeline screenshot saved: ${result.outputFile}`);
}

function parseArgs(args, config) {
  const options = {};

  for (let index = 0; index < args.length; index += 1) {
    const token = String(args[index] || "").trim();
    if (!token) {
      continue;
    }
    if (token === "--output") {
      options.outputFile = path.resolve(requireValue(token, args[index + 1]));
      index += 1;
      continue;
    }
    if (token === "--selector") {
      options.selector = requireValue(token, args[index + 1]).trim();
      index += 1;
      continue;
    }
    if (token === "--width") {
      options.width = requireValue(token, args[index + 1]);
      index += 1;
      continue;
    }
    if (token === "--height") {
      options.height = requireValue(token, args[index + 1]);
      index += 1;
      continue;
    }
    if (token === "--side-padding") {
      options.sidePadding = requireValue(token, args[index + 1]);
      index += 1;
      continue;
    }
    throw new Error(`未知参数: ${token}`);
  }

  return resolveTimelineScreenshotOptions(config, options);
}

function requireValue(token, value) {
  const normalized = String(value || "").trim();
  if (!normalized || normalized.startsWith("--")) {
    throw new Error(`参数缺少值: ${token}`);
  }
  return normalized;
}

module.exports = { runTimelineScreenshotCommand };
