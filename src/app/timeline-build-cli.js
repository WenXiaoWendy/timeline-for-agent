const path = require("path");

const { TimelineStore } = require("../infra/timeline/timeline-store");
const { buildTimelineDashboard } = require("../infra/timeline/timeline-dashboard-builder");

async function runTimelineBuildCommand(config) {
  const store = new TimelineStore({
    taxonomyFilePath: config.timelineTaxonomyFile,
    factsFilePath: config.timelineFactsFile,
    legacyFilePath: config.timelineDbFile,
  });
  await buildTimelineDashboard({
    store,
    siteDir: config.timelineSiteDir,
    entryFile: path.join(__dirname, "..", "timeline", "dashboard-app.jsx"),
    cssFile: path.join(__dirname, "..", "timeline", "css", "dashboard.css"),
  });
  console.log(`timeline dashboard built: ${config.timelineSiteDir}`);
}

module.exports = { runTimelineBuildCommand };
