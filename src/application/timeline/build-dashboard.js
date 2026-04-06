const { buildTimelineDashboard } = require("../../infra/timeline/timeline-dashboard-builder");
const { createTimelineDashboardBuildInput } = require("./shared");

async function buildTimelineSite(config) {
  const buildInput = createTimelineDashboardBuildInput(config);
  await buildTimelineDashboard(buildInput);
  return {
    siteDir: buildInput.siteDir,
  };
}

module.exports = { buildTimelineSite };
