const { startTimelineSiteServer } = require("../application/timeline/serve-site");

async function runTimelineServeCommand(config) {
  const port = parsePort(process.argv.slice(3), config.timelinePort);
  const { info } = await startTimelineSiteServer(config, { port });
  console.log(`timeline dashboard: ${info.url}`);
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

module.exports = { runTimelineServeCommand };
