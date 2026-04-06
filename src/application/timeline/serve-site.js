const { createTimelineSiteServer, listenTimelineSiteServer } = require("../../infra/timeline/timeline-site-server");

async function startTimelineSiteServer(config, options = {}) {
  const port = Number.isFinite(options.port) && options.port >= 0
    ? options.port
    : config.timelinePort;
  const server = createTimelineSiteServer({ siteDir: config.timelineSiteDir });
  const info = await listenTimelineSiteServer(server, { port });
  return { server, info };
}

module.exports = { startTimelineSiteServer };
