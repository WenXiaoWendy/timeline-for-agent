const { buildTimelineSite } = require("../application/timeline/build-dashboard");

async function runTimelineBuildCommand(config) {
  const result = await buildTimelineSite(config);
  console.log(`timeline dashboard built: ${result.siteDir}`);
}

module.exports = { runTimelineBuildCommand };
