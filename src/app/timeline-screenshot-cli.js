const path = require("path");

const {
  captureTimelineScreenshot,
  SCREENSHOT_SELECTOR_MAP,
  resolveTimelineScreenshotOptions,
} = require("../application/timeline/capture-screenshot");

async function runTimelineScreenshotCommand(config) {
  const options = parseArgs(process.argv.slice(3), config);
  if (options.help) {
    printHelp();
    return;
  }
  const result = await captureTimelineScreenshot(config, options);
  console.log(`timeline screenshot saved: ${result.outputFile}`);
}

function parseArgs(args, config) {
  const options = { help: false };

  for (let index = 0; index < args.length; index += 1) {
    const token = String(args[index] || "").trim();
    if (!token) {
      continue;
    }
    if (token === "--help" || token === "-h") {
      options.help = true;
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
    if (token === "--range") {
      options.range = requireValue(token, args[index + 1]).trim();
      index += 1;
      continue;
    }
    if (token === "--date") {
      options.date = requireValue(token, args[index + 1]).trim();
      index += 1;
      continue;
    }
    if (token === "--week") {
      options.week = requireValue(token, args[index + 1]).trim();
      index += 1;
      continue;
    }
    if (token === "--month") {
      options.month = requireValue(token, args[index + 1]).trim();
      index += 1;
      continue;
    }
    if (token === "--category") {
      options.category = requireValue(token, args[index + 1]).trim();
      index += 1;
      continue;
    }
    if (token === "--subcategory" || token === "--detail") {
      options.subcategory = requireValue(token, args[index + 1]).trim();
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
    throw new Error(`Unknown argument: ${token}`);
  }

  if (options.help) {
    return options;
  }

  return {
    ...resolveTimelineScreenshotOptions(config, options),
    help: false,
  };
}

function requireValue(token, value) {
  const normalized = String(value || "").trim();
  if (!normalized || normalized.startsWith("--")) {
    throw new Error(`Missing value for argument: ${token}`);
  }
  return normalized;
}

function printHelp() {
  console.log(`
Usage: timeline-for-agent screenshot [--output ./timeline-shot.png] [--selector timeline|analytics|events|CSS]

View controls before the screenshot:
  --range day|week|month
  --date YYYY-MM-DD
  --week WEEK_KEY
  --month YYYY-MM
  --category category id or label
  --subcategory subcategory id or label
  --detail subcategory id or label (same as --subcategory)

Built-in selectors:
  - main       full dashboard view
  - timeline   timeline area including range switcher and timeline panel
  - analytics  distribution, breakdown, and trend panels
  - events     event detail panel

Prompting suggestions:
  - "capture the main dashboard"             -> --selector main
  - "capture the timeline area"              -> --selector timeline
  - "capture the analytics section"          -> --selector analytics
  - "capture the event list"                 -> --selector events
  - "capture the day view for YYYY-MM-DD"    -> --range day --date YYYY-MM-DD
  - "capture the month view for YYYY-MM"     -> --range month --month YYYY-MM
  - "capture Work > Coding analytics"        -> --category Work --detail Coding --selector analytics
  - "capture Work > Coding events"           -> --category Work --detail Coding --selector events

Selection advice:
  - if the user wants time distribution for a category or detail, prefer --selector analytics
  - only use --selector events when the user explicitly wants event cards

You can also pass a custom CSS selector, for example:
  timeline-for-agent screenshot --selector ".pie-chart-shell"

Current selector map:
${Object.entries(SCREENSHOT_SELECTOR_MAP)
    .map(([key, value]) => `  - ${key} => ${value}`)
    .join("\n")}
`);
}

module.exports = { runTimelineScreenshotCommand };
