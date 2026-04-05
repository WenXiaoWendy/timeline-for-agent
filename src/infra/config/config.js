const os = require("os");
const path = require("path");

function readConfig() {
  const mode = process.argv[2] || "";
  const defaultStateDir = path.join(os.homedir(), ".timeline-for-agent");
  const stateDir = process.env.TIMELINE_FOR_AGENT_STATE_DIR || defaultStateDir;

  return {
    mode,
    stateDir,
    timelineDir: process.env.TIMELINE_FOR_AGENT_DIR
      || path.join(stateDir, "timeline"),
    timelineDbFile: process.env.TIMELINE_FOR_AGENT_DB_FILE
      || path.join(stateDir, "timeline", "timeline-db.json"),
    timelineTaxonomyFile: process.env.TIMELINE_FOR_AGENT_TAXONOMY_FILE
      || path.join(stateDir, "timeline", "timeline-taxonomy.json"),
    timelineFactsFile: process.env.TIMELINE_FOR_AGENT_FACTS_FILE
      || path.join(stateDir, "timeline", "timeline-facts.json"),
    timelineSiteDir: process.env.TIMELINE_FOR_AGENT_SITE_DIR
      || path.join(stateDir, "timeline", "site"),
    timelinePort: readNumberEnv("TIMELINE_FOR_AGENT_PORT", 4317),
    chromeExecutablePath: process.env.TIMELINE_FOR_AGENT_CHROME_PATH || "",
  };
}

function readNumberEnv(name, fallback) {
  const rawValue = String(process.env[name] || "").trim();
  if (!rawValue) {
    return fallback;
  }
  const parsed = Number.parseInt(rawValue, 10);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
}

module.exports = { readConfig };
