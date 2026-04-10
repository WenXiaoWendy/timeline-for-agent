const { listTimelineProposals } = require("../application/timeline/list-proposals");

async function runTimelineProposalsCommand(config) {
  const options = parseArgs(process.argv.slice(3));
  if (options.help) {
    printHelp();
    return;
  }

  const result = await listTimelineProposals(config, { date: options.date });
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
Usage: timeline-for-agent proposals [--date YYYY-MM-DD]

Purpose:
  - Show eventNode proposals created during writes
  - Useful when investigating why a new node appeared or what candidate nodes were introduced on a given day

Notes:
  - Without --date it returns all proposals
  - With --date it returns proposals for the selected date only
`);
}

module.exports = { runTimelineProposalsCommand };
