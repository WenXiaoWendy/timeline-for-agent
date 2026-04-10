const fs = require("fs");
const path = require("path");
const { resolveTimelineLocale } = require("../i18n/timeline-locale");

const DEMO_FACTS_PATH = path.join(__dirname, "..", "..", "..", "examples", "demo-facts.json");
const DEMO_FACTS_ZH_PATH = path.join(__dirname, "..", "..", "..", "examples", "demo-facts.zh-CN.json");

function loadTimelineSourceData({ store, locale = "en" }) {
  const baseState = store.getState();
  const taxonomyUpdatedAt = readFileUpdatedAt(store.taxonomyFilePath);
  const factsUpdatedAt = readFileUpdatedAt(store.factsFilePath);
  const resolvedLocale = resolveTimelineLocale(locale);
  const facts = baseState?.facts && typeof baseState.facts === "object" ? baseState.facts : {};

  if (Object.keys(facts).length > 0) {
    return {
      state: baseState,
      meta: {
        updatedAt: factsUpdatedAt || taxonomyUpdatedAt || "",
        factsUpdatedAt,
        taxonomyUpdatedAt,
        isDemoData: false,
        locale: resolvedLocale,
      },
    };
  }

  const demoFactsPath = getTimelineDemoFactsPath(resolvedLocale);
  const demoFacts = readDemoFacts(demoFactsPath);
  const demoFactsUpdatedAt = readFileUpdatedAt(demoFactsPath);
  if (!demoFacts || !Object.keys(demoFacts).length) {
    return {
      state: baseState,
      meta: {
        updatedAt: factsUpdatedAt || taxonomyUpdatedAt || "",
        factsUpdatedAt,
        taxonomyUpdatedAt,
        isDemoData: false,
        locale: resolvedLocale,
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
      locale: resolvedLocale,
    },
  };
}

function getTimelineDemoFactsPath(locale = "en") {
  const resolvedLocale = resolveTimelineLocale(locale);
  if (resolvedLocale === "zh-CN" && fs.existsSync(DEMO_FACTS_ZH_PATH)) {
    return DEMO_FACTS_ZH_PATH;
  }
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
