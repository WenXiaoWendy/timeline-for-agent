const fs = require("fs");
const path = require("path");

const DEMO_FACTS_PATH = path.join(__dirname, "..", "..", "..", "examples", "demo-facts.json");

function loadTimelineSourceData({ store }) {
  const baseState = store.getState();
  const taxonomyUpdatedAt = readFileUpdatedAt(store.taxonomyFilePath);
  const factsUpdatedAt = readFileUpdatedAt(store.factsFilePath);
  const facts = baseState?.facts && typeof baseState.facts === "object" ? baseState.facts : {};

  if (Object.keys(facts).length > 0) {
    return {
      state: baseState,
      meta: {
        updatedAt: factsUpdatedAt || taxonomyUpdatedAt || "",
        factsUpdatedAt,
        taxonomyUpdatedAt,
        isDemoData: false,
      },
    };
  }

  const demoFacts = readDemoFacts(DEMO_FACTS_PATH);
  const demoFactsUpdatedAt = readFileUpdatedAt(DEMO_FACTS_PATH);
  if (!demoFacts || !Object.keys(demoFacts).length) {
    return {
      state: baseState,
      meta: {
        updatedAt: factsUpdatedAt || taxonomyUpdatedAt || "",
        factsUpdatedAt,
        taxonomyUpdatedAt,
        isDemoData: false,
      },
    };
  }

  return {
    state: {
      ...baseState,
      __demoData: true,
      facts: demoFacts,
    },
    meta: {
      updatedAt: demoFactsUpdatedAt || taxonomyUpdatedAt || "",
      factsUpdatedAt: demoFactsUpdatedAt,
      taxonomyUpdatedAt,
      isDemoData: true,
    },
  };
}

function getTimelineDemoFactsPath() {
  return DEMO_FACTS_PATH;
}

function readFileUpdatedAt(filePath) {
  try {
    if (!filePath || !fs.existsSync(filePath)) {
      return "";
    }
    return fs.statSync(filePath).mtime.toISOString();
  } catch {
    return "";
  }
}

function readDemoFacts(filePath) {
  try {
    const parsed = JSON.parse(fs.readFileSync(filePath, "utf8"));
    return parsed?.facts && typeof parsed.facts === "object" ? parsed.facts : {};
  } catch {
    return null;
  }
}

module.exports = {
  getTimelineDemoFactsPath,
  loadTimelineSourceData,
};
