const { buildTimelineSite } = require("../application/timeline/build-dashboard");

async function runTimelineBuildCommand(config) {
  const options = parseArgs(process.argv.slice(3));
  if (options.help) {
    printHelp();
    return;
  }
  const result = await buildTimelineSite(config);
  console.log(`timeline dashboard built: ${result.siteDir}`);
}

function parseArgs(args) {
  const help = Array.isArray(args) && args.some((arg) => {
    const normalized = String(arg || "").trim();
    return normalized === "--help" || normalized === "-h";
  });
  return { help };
}

function printHelp() {
  console.log(`
Usage: timeline-for-agent build

Build the static timeline dashboard into the configured site directory.

Relevant environment:
  TIMELINE_FOR_AGENT_LOCALE=en|zh-CN
  TIMELINE_FOR_AGENT_STATE_DIR=/absolute/path
  TIMELINE_FOR_AGENT_SITE_DIR=/absolute/path
`);
}

module.exports = {
  parseArgs,
  runTimelineBuildCommand,
};
