const { runTimelineDevServer } = require("../application/timeline/dev-server");

async function runTimelineDevCommand(config) {
  const port = parsePort(process.argv.slice(3), config.timelinePort);
  const info = await runTimelineDevServer(config, { port });
  console.log(`timeline dev: ${info.url}`);
}

function parsePort(args, fallback) {
  for (let index = 0; index < args.length; index += 1) {
    if (args[index] !== "--port") {
      continue;
    }
    const value = Number.parseInt(String(args[index + 1] || ""), 10);
    return Number.isFinite(value) && value > 0 ? value : fallback;
  }
  return fallback;
}

module.exports = { runTimelineDevCommand };
