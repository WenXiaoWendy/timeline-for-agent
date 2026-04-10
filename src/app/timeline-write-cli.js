const { writeTimelineDay } = require("../application/timeline/write-day");

async function runTimelineWriteCommand(config) {
  const options = parseArgs(process.argv.slice(3));
  if (options.help) {
    printHelp();
    return;
  }

  const body = await resolveBody(options);
  if (!body) {
    throw new Error("timeline-write requires JSON input. Pass --json or provide it through stdin");
  }

  const payload = parsePayload(body);
  const result = await writeTimelineDay(config, {
    ...payload,
    date: options.date || payload.date || "",
    mode: options.mode || payload.mode || "merge",
    finalize: options.finalize,
  });

  console.log(`timeline written: ${result.date}`);
  console.log(`mode: ${result.mode}`);
  console.log(`events: ${result.eventCount}`);
  console.log(`status: ${result.status}`);
}

function parseArgs(args) {
  const options = {
    help: false,
    date: "",
    json: "",
    mode: "",
    finalize: false,
    useStdin: false,
  };

  for (let index = 0; index < args.length; index += 1) {
    const arg = String(args[index] || "").trim();
    if (!arg) {
      continue;
    }
    if (arg === "--help" || arg === "-h") {
      options.help = true;
      continue;
    }
    if (arg === "--finalize") {
      options.finalize = true;
      continue;
    }
    if (arg === "--stdin") {
      options.useStdin = true;
      continue;
    }
    const value = String(args[index + 1] || "");
    if (!value || value.startsWith("--")) {
      throw new Error(`Missing value for argument: ${arg}`);
    }
    if (arg === "--date") {
      options.date = value.trim();
    } else if (arg === "--json") {
      options.json = value.trim();
    } else if (arg === "--mode") {
      options.mode = value.trim();
    } else {
      throw new Error(`Unknown argument: ${arg}`);
    }
    index += 1;
  }

  return options;
}

async function resolveBody(options) {
  if (String(options.json || "").trim()) {
    return options.json.trim();
  }
  if (!options.useStdin && process.stdin.isTTY) {
    return "";
  }
  return readStdin();
}

function parsePayload(body) {
  const normalized = String(body || "")
    .trim()
    .replace(/^```(?:json)?\s*/i, "")
    .replace(/\s*```$/i, "");
  const parsed = JSON.parse(normalized);
  if (!parsed || typeof parsed !== "object") {
    throw new Error("timeline-write JSON payload must be an object");
  }
  return parsed;
}

function readStdin() {
  return new Promise((resolve, reject) => {
    let buffer = "";
    process.stdin.setEncoding("utf8");
    process.stdin.on("data", (chunk) => {
      buffer += chunk;
    });
    process.stdin.on("end", () => resolve(buffer));
    process.stdin.on("error", reject);
  });
}

function printHelp() {
  console.log(`
Usage: timeline-for-agent write --date YYYY-MM-DD [--mode merge|replace] [--json '{"events":[...]}']
   or: cat payload.json | timeline-for-agent write --date YYYY-MM-DD --stdin

Event guidance:
  - title: short label shown directly on timeline blocks
  - note: optional detail for context, background, and extra explanation

Required fields:
  - every event must include startAt and endAt
  - every event must also provide one of:
    1. eventNodeId
    2. subcategoryId (and categoryId is strongly recommended)
  - if eventNodeId is missing and subcategoryId cannot resolve categoryId, the write fails
  - title should normally be explicit; missing titles are only allowed when eventNodeId can backfill the label

Recommended workflow:
  - before adding events, run timeline-for-agent categories if category or eventNode choice is unclear
  - before editing existing events, run timeline-for-agent read --date YYYY-MM-DD

Time constraints:
  - all events must stay within the given date and must not cross midnight
  - if sleep crosses 00:00, split it into two events:
    the early-morning segment belongs to that day, and the late-night segment belongs to the same day's closing hours
  - do not create one event that continues from late night directly into the next morning

Example JSON:
  {
    "date": "2026-04-05",
    "events": [
      {
        "id": "evt_demo_1",
        "startAt": "2026-04-05T09:00:00+08:00",
        "endAt": "2026-04-05T09:45:00+08:00",
        "title": "Breakfast and getting ready",
        "note": "Had breakfast, washed up, and packed everything before heading out.",
        "categoryId": "life",
        "subcategoryId": "life.meal",
        "tags": ["breakfast", "morning"]
      }
    ]
  }
`);
}

module.exports = { runTimelineWriteCommand };
