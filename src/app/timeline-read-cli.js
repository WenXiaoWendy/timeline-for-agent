const { readTimelineDay } = require("../application/timeline/read-day");

async function runTimelineReadCommand(config) {
  const options = parseArgs(process.argv.slice(3));
  if (options.help) {
    printHelp();
    return;
  }

  const result = await readTimelineDay(config, { date: options.date });
  console.log(JSON.stringify(result, null, 2));
}

function parseArgs(args) {
  const options = {
    help: false,
    date: "",
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
    const value = String(args[index + 1] || "");
    if (!value || value.startsWith("--")) {
      throw new Error(`Missing value for argument: ${arg}`);
    }
    if (arg === "--date") {
      options.date = value.trim();
    } else {
      throw new Error(`Unknown argument: ${arg}`);
    }
    index += 1;
  }

  return options;
}

function printHelp() {
  console.log(`
Usage: timeline-for-agent read --date YYYY-MM-DD

Purpose:
  - Read the current timeline events for a given day
  - Let an agent or user inspect the target date before editing instead of reading the raw JSON directly

Returned fields:
  - date
  - exists
  - status
  - updatedAt
  - eventCount
  - events

Notes:
  - This returns controlled day-level data only, not the full facts or taxonomy
  - Before editing a day, it is recommended to run read first and write after that
`);
}

module.exports = { runTimelineReadCommand };
