const fs = require("fs");
const os = require("os");
const path = require("path");
const dotenv = require("dotenv");

const { readConfig } = require("./infra/config/config");
const { runTimelineCategoriesCommand } = require("./app/timeline-categories-cli");
const { runTimelineProposalsCommand } = require("./app/timeline-proposals-cli");
const { runTimelineReadCommand } = require("./app/timeline-read-cli");
const { runTimelineWriteCommand } = require("./app/timeline-write-cli");
const { runTimelineBuildCommand } = require("./app/timeline-build-cli");
const { runTimelineServeCommand } = require("./app/timeline-serve-cli");
const { runTimelineDevCommand } = require("./app/timeline-dev-cli");
const { runTimelineScreenshotCommand } = require("./app/timeline-screenshot-cli");

function ensureDefaultConfigDirectory() {
  const defaultConfigDir = path.join(os.homedir(), ".timeline-for-agent");
  fs.mkdirSync(defaultConfigDir, { recursive: true });
}

function loadEnv() {
  ensureDefaultConfigDirectory();

  const envCandidates = [
    path.join(process.cwd(), ".env"),
    path.join(os.homedir(), ".timeline-for-agent", ".env"),
  ];

  for (const envPath of envCandidates) {
    if (!fs.existsSync(envPath)) {
      continue;
    }
    dotenv.config({ path: envPath });
    return;
  }

  dotenv.config();
}

function printHelp() {
  console.log(`
Usage: timeline-for-agent <command>

Commands:
  categories   Show the available category / subcategory / eventNode summary
  proposals    Show newly proposed event nodes
  read         Read the controlled timeline event JSON for a given day
  write        Write or incrementally update the timeline JSON for a given day
  build        Build the local static dashboard
  serve        Start the local static dashboard server
  dev          Watch source and data files, then rebuild and hot reload
  screenshot   Capture the timeline dashboard
  help         Show this help
`);
}

async function main() {
  loadEnv();
  const config = readConfig();
  const command = config.mode || "";

  if (!command || command === "help" || command === "--help" || command === "-h") {
    printHelp();
    return;
  }

  if (command === "write") {
    await runTimelineWriteCommand(config);
    return;
  }

  if (command === "read") {
    await runTimelineReadCommand(config);
    return;
  }

  if (command === "categories") {
    await runTimelineCategoriesCommand(config);
    return;
  }

  if (command === "proposals") {
    await runTimelineProposalsCommand(config);
    return;
  }

  if (command === "build") {
    await runTimelineBuildCommand(config);
    return;
  }

  if (command === "serve") {
    await runTimelineServeCommand(config);
    return;
  }

  if (command === "dev") {
    await runTimelineDevCommand(config);
    return;
  }

  if (command === "screenshot") {
    await runTimelineScreenshotCommand(config);
    return;
  }

  throw new Error(`Unknown command: ${command}`);
}

module.exports = { main };
