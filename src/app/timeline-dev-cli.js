const { runTimelineDevServer } = require("../application/timeline/dev-server");

async function runTimelineDevCommand(config) {
  const options = parseArgs(process.argv.slice(3), config.timelinePort);
  if (options.help) {
    printHelp();
    return;
  }
  const info = await runTimelineDevServer(config, { port: options.port });
  console.log(`timeline dev: ${info.url}`);
}

function parseArgs(args, fallback) {
  const options = {
    help: false,
    port: fallback,
  };
  for (let index = 0; index < args.length; index += 1) {
    const token = String(args[index] || "").trim();
    if (!token) {
      continue;
    }
    if (token === "--help" || token === "-h") {
      options.help = true;
      continue;
    }
    if (token !== "--port") {
      throw new Error(`Unknown argument: ${token}`);
    }
    const value = Number.parseInt(String(args[index + 1] || ""), 10);
    options.port = Number.isFinite(value) && value > 0 ? value : fallback;
    index += 1;
  }
  return options;
}

function printHelp() {
  console.log(`
Usage: timeline-for-agent dev [--port 4317]

Start the timeline development server with rebuilds and hot reload.

Relevant environment:
  TIMELINE_FOR_AGENT_LOCALE=en|zh-CN
  TIMELINE_FOR_AGENT_PORT=4317
  TIMELINE_FOR_AGENT_STATE_DIR=/absolute/path
`);
}

module.exports = {
  parseArgs,
  runTimelineDevCommand,
};
