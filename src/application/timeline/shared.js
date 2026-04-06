const path = require("path");

const { TimelineStore } = require("../../infra/timeline/timeline-store");

function createTimelineStore(config) {
  return new TimelineStore({
    taxonomyFilePath: config.timelineTaxonomyFile,
    factsFilePath: config.timelineFactsFile,
    legacyFilePath: config.timelineDbFile,
  });
}

function getTimelineDashboardBuildOptions(config) {
  return {
    siteDir: config.timelineSiteDir,
    entryFile: path.join(__dirname, "..", "..", "timeline", "dashboard-app.jsx"),
    cssFile: path.join(__dirname, "..", "..", "timeline", "css", "dashboard.css"),
  };
}

function createTimelineDashboardBuildInput(config) {
  return {
    store: createTimelineStore(config),
    ...getTimelineDashboardBuildOptions(config),
  };
}

module.exports = {
  createTimelineDashboardBuildInput,
  createTimelineStore,
  getTimelineDashboardBuildOptions,
};
