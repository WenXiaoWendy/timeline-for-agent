const fs = require("fs");
const path = require("path");

const { createDefaultTaxonomy } = require("./default-taxonomy");

const CATEGORY_THEME_COLORS = {
  life: "var(--cat-life)",
  work: "var(--cat-work)",
  study: "var(--cat-study)",
  exercise: "var(--cat-exercise)",
  entertainment: "var(--cat-entertainment)",
  health: "var(--cat-health)",
  social: "var(--cat-social)",
  care: "var(--cat-care)",
  travel: "var(--cat-travel)",
  rest: "var(--cat-rest)",
};

class TimelineStore {
  constructor({ stateFilePath = "", taxonomyFilePath, factsFilePath, legacyFilePath = "" }) {
    this.stateFilePath = stateFilePath;
    this.taxonomyFilePath = taxonomyFilePath;
    this.factsFilePath = factsFilePath;
    this.legacyFilePath = legacyFilePath;
    this.state = createEmptyTimelineState();
    this.ensureParentDirectory();
    this.load();
  }

  ensureParentDirectory() {
    if (this.stateFilePath) {
      fs.mkdirSync(path.dirname(this.stateFilePath), { recursive: true });
    }
    fs.mkdirSync(path.dirname(this.taxonomyFilePath), { recursive: true });
    fs.mkdirSync(path.dirname(this.factsFilePath), { recursive: true });
  }

  load() {
    const stateSnapshot = this.stateFilePath ? readJsonFile(this.stateFilePath) : null;
    if (stateSnapshot) {
      this.state = normalizeTimelineState(stateSnapshot);
      return;
    }

    const taxonomy = readJsonFile(this.taxonomyFilePath);
    const facts = readJsonFile(this.factsFilePath);
    if (taxonomy || facts) {
      this.state = normalizeSeparatedTimelineState({ taxonomy, facts });
      this.save();
      return;
    }

    const legacy = this.legacyFilePath ? readJsonFile(this.legacyFilePath) : null;
    if (legacy) {
      this.state = normalizeTimelineState(legacy);
      this.save();
      return;
    }

    this.state = createEmptyTimelineState();
  }

  save() {
    if (this.stateFilePath) {
      writeJsonFileAtomic(this.stateFilePath, {
        version: this.state.version,
        timezone: this.state.timezone,
        taxonomy: this.state.taxonomy,
        facts: this.state.facts,
        proposals: this.state.proposals,
      });
    }
    writeJsonFileAtomic(this.taxonomyFilePath, {
      version: this.state.version,
      timezone: this.state.timezone,
      taxonomy: this.state.taxonomy,
    });
    writeJsonFileAtomic(this.factsFilePath, {
      version: this.state.version,
      timezone: this.state.timezone,
      facts: this.state.facts,
      proposals: this.state.proposals,
    });
  }

  getState() {
    return JSON.parse(JSON.stringify(this.state));
  }

  getDay(date) {
    return this.state.facts[String(date || "").trim()] || null;
  }

  upsertEventNodes(nodes, { date = "", sourceMessageIds = [] } = {}) {
    const existingIds = new Set(this.state.taxonomy.eventNodes.map((node) => node.id));
    for (const candidate of Array.isArray(nodes) ? nodes : []) {
      const normalized = normalizeEventNode(candidate);
      if (!normalized) {
        continue;
      }
      if (existingIds.has(normalized.id)) {
        continue;
      }
      existingIds.add(normalized.id);
      this.state.taxonomy.eventNodes.push(normalized);
      this.state.proposals.push({
        id: `proposal:${normalized.id}`,
        date: date || "",
        proposedNodeId: normalized.id,
        label: normalized.label,
        parentId: normalized.parentId,
        sourceMessageIds: Array.isArray(sourceMessageIds) ? [...sourceMessageIds] : [],
        createdAt: new Date().toISOString(),
      });
    }
  }

  replaceDay({ date, status = "draft", source = null, events = [], newEventNodes = [] }) {
    const normalizedDate = String(date || "").trim();
    if (!normalizedDate) {
      throw new Error("timeline day requires a date");
    }
    this.upsertEventNodes(newEventNodes, {
      date: normalizedDate,
      sourceMessageIds: collectSourceMessageIds(events),
    });

    const normalizedEvents = normalizeDayEvents(events, this.state.taxonomy, { strict: true });
    validateDayEvents(normalizedDate, normalizedEvents, this.state.timezone);
    if (!normalizedEvents.length) {
      delete this.state.facts[normalizedDate];
      this.save();
      return null;
    }

    this.state.facts[normalizedDate] = {
      status: status === "final" ? "final" : "draft",
      updatedAt: new Date().toISOString(),
      source: normalizeSource(source),
      events: normalizedEvents,
    };
    this.save();
    return this.state.facts[normalizedDate];
  }

  mergeDay({
    date,
    status = "",
    source = null,
    events = [],
    newEventNodes = [],
    dropEventIds = [],
  }) {
    const normalizedDate = String(date || "").trim();
    if (!normalizedDate) {
      throw new Error("timeline day requires a date");
    }
    this.upsertEventNodes(newEventNodes, {
      date: normalizedDate,
      sourceMessageIds: collectSourceMessageIds(events),
    });

    const currentDay = this.state.facts[normalizedDate] || {
      status: "draft",
      updatedAt: "",
      source: null,
      events: [],
    };
    const mergedEvents = new Map();
    for (const currentEvent of Array.isArray(currentDay.events) ? currentDay.events : []) {
      mergedEvents.set(currentEvent.id, currentEvent);
    }

    const normalizedIncomingEvents = normalizeDayEvents(events, this.state.taxonomy, { strict: true });
    validateDayEvents(normalizedDate, normalizedIncomingEvents, this.state.timezone);
    for (const event of normalizedIncomingEvents) {
      mergedEvents.set(event.id, event);
    }

    for (const eventId of Array.isArray(dropEventIds) ? dropEventIds : []) {
      mergedEvents.delete(String(eventId || "").trim());
    }

    const nextEvents = [...mergedEvents.values()].sort((left, right) => {
      const delta = Date.parse(left.startAt) - Date.parse(right.startAt);
      return delta !== 0 ? delta : left.id.localeCompare(right.id);
    });

    if (!nextEvents.length) {
      delete this.state.facts[normalizedDate];
      this.save();
      return null;
    }

    this.state.facts[normalizedDate] = {
      status: status === "final" ? "final" : (status === "draft" ? "draft" : currentDay.status || "draft"),
      updatedAt: new Date().toISOString(),
      source: normalizeSource(source) || currentDay.source || null,
      events: nextEvents,
    };
    this.save();
    return this.state.facts[normalizedDate];
  }

  finalizeDay(date) {
    const normalizedDate = String(date || "").trim();
    if (!normalizedDate || !this.state.facts[normalizedDate]) {
      return null;
    }
    this.state.facts[normalizedDate].status = "final";
    this.state.facts[normalizedDate].updatedAt = new Date().toISOString();
    this.save();
    return this.state.facts[normalizedDate];
  }

}

function createEmptyTimelineState() {
  return {
    version: 1,
    timezone: "Asia/Shanghai",
    taxonomy: createDefaultTaxonomy(),
    facts: {},
    proposals: [],
  };
}

function normalizeTimelineState(raw) {
  const empty = createEmptyTimelineState();
  const taxonomy = raw?.taxonomy && typeof raw.taxonomy === "object"
    ? raw.taxonomy
    : empty.taxonomy;
  return {
    version: 1,
    timezone: typeof raw?.timezone === "string" && raw.timezone.trim() ? raw.timezone.trim() : "Asia/Shanghai",
    taxonomy: {
      categories: Array.isArray(taxonomy.categories) ? taxonomy.categories.map(normalizeCategory).filter(Boolean) : empty.taxonomy.categories,
      eventNodes: Array.isArray(taxonomy.eventNodes) ? taxonomy.eventNodes.map(normalizeEventNode).filter(Boolean) : empty.taxonomy.eventNodes,
    },
    facts: normalizeFacts(raw?.facts),
    proposals: Array.isArray(raw?.proposals) ? raw.proposals.map(normalizeProposal).filter(Boolean) : [],
  };
}

function normalizeSeparatedTimelineState({ taxonomy, facts }) {
  return normalizeTimelineState({
    version: 1,
    timezone: String(taxonomy?.timezone || facts?.timezone || "Asia/Shanghai"),
    taxonomy: taxonomy?.taxonomy || {},
    facts: facts?.facts || {},
    proposals: facts?.proposals || [],
  });
}

function normalizeFacts(rawFacts) {
  const output = {};
  if (!rawFacts || typeof rawFacts !== "object") {
    return output;
  }
  for (const [date, value] of Object.entries(rawFacts)) {
    const normalizedDate = String(date || "").trim();
    if (!normalizedDate || !value || typeof value !== "object") {
      continue;
    }
    output[normalizedDate] = {
      status: value.status === "final" ? "final" : "draft",
      updatedAt: typeof value.updatedAt === "string" ? value.updatedAt : "",
      source: normalizeSource(value.source),
      events: normalizeDayEvents(value.events, null),
    };
  }
  return output;
}

function normalizeCategory(category) {
  if (!category || typeof category !== "object") {
    return null;
  }
  const id = String(category.id || "").trim();
  const label = String(category.label || "").trim();
  if (!id || !label) {
    return null;
  }
  return {
    id,
    label,
    color: buildCategoryThemeColor(id),
    children: Array.isArray(category.children)
      ? category.children.map((child) => {
        const childId = String(child?.id || "").trim();
        const childLabel = String(child?.label || "").trim();
        return childId && childLabel ? { id: childId, label: childLabel } : null;
      }).filter(Boolean)
      : [],
  };
}

function normalizeEventNode(node) {
  if (!node || typeof node !== "object") {
    return null;
  }
  const id = String(node.id || "").trim();
  const label = String(node.label || "").trim();
  const parentId = String(node.parentId || "").trim();
  if (!id || !label || !parentId) {
    return null;
  }
  return {
    id,
    label,
    aliases: Array.isArray(node.aliases)
      ? node.aliases.map((alias) => String(alias || "").trim()).filter(Boolean)
      : [],
    parentId,
    status: node.status === "provisional" ? "provisional" : "official",
  };
}

function normalizeProposal(proposal) {
  if (!proposal || typeof proposal !== "object") {
    return null;
  }
  const id = String(proposal.id || "").trim();
  const proposedNodeId = String(proposal.proposedNodeId || "").trim();
  const label = String(proposal.label || "").trim();
  const parentId = String(proposal.parentId || "").trim();
  if (!id || !proposedNodeId || !label || !parentId) {
    return null;
  }
  return {
    id,
    date: String(proposal.date || "").trim(),
    proposedNodeId,
    label,
    parentId,
    sourceMessageIds: Array.isArray(proposal.sourceMessageIds)
      ? proposal.sourceMessageIds.map((value) => String(value || "").trim()).filter(Boolean)
      : [],
    createdAt: typeof proposal.createdAt === "string" ? proposal.createdAt : "",
  };
}

function normalizeDayEvents(events, taxonomy, options = {}) {
  const categoryMap = buildCategoryMap(taxonomy);
  const nodeMap = buildEventNodeMap(taxonomy);
  const strict = !!options.strict;
  if (!Array.isArray(events)) {
    return [];
  }
  return events.flatMap((event, index) => {
    const result = normalizeEvent(event, index, categoryMap, nodeMap);
    if (result.value) {
      return [result.value];
    }
    if (strict) {
      throw new Error(`Invalid timeline event at index ${index + 1}: ${result.error}`);
    }
    return [];
  });
}

function normalizeEvent(event, index, categoryMap, nodeMap) {
  if (!event || typeof event !== "object") {
    return { value: null, error: "event must be an object" };
  }
  const startAt = normalizeIso(event.startAt);
  const endAt = normalizeIso(event.endAt);
  if (!startAt || !endAt || Date.parse(endAt) <= Date.parse(startAt)) {
    return { value: null, error: "startAt/endAt is missing or the time range is invalid" };
  }
  const eventNodeId = String(event.eventNodeId || "").trim();
  const eventNode = nodeMap && eventNodeId ? nodeMap.get(eventNodeId) : null;
  const subcategoryId = String(event.subcategoryId || eventNode?.parentId || "").trim();
  const categoryId = String(event.categoryId || deriveCategoryId(subcategoryId, categoryMap) || "").trim();
  if (!subcategoryId || !categoryId) {
    return {
      value: null,
      error: "eventNodeId is required unless subcategoryId/categoryId can resolve the category",
    };
  }
  const title = String(event.title || eventNode?.label || "").trim();
  if (!title) {
    return { value: null, error: "title is missing and eventNodeId cannot backfill it" };
  }
  return {
    value: {
      id: normalizeEventId(event, index, title, eventNodeId, startAt),
      startAt,
      endAt,
      title,
      note: String(event.note || event.remark || "").trim(),
      categoryId,
      subcategoryId,
      eventNodeId,
      tags: Array.isArray(event.tags)
        ? event.tags.map((tag) => String(tag || "").trim()).filter(Boolean)
        : [],
      confidence: normalizeConfidence(event.confidence),
      sourceMessageIds: Array.isArray(event.sourceMessageIds)
        ? event.sourceMessageIds.map((value) => String(value || "").trim()).filter(Boolean)
        : [],
    },
    error: "",
  };
}

function buildCategoryMap(taxonomy) {
  const map = new Map();
  if (!taxonomy || !Array.isArray(taxonomy.categories)) {
    return map;
  }
  for (const category of taxonomy.categories) {
    map.set(category.id, { categoryId: category.id, label: category.label, color: category.color });
    for (const child of Array.isArray(category.children) ? category.children : []) {
      map.set(child.id, { categoryId: category.id, label: child.label, color: category.color });
    }
  }
  return map;
}

function buildEventNodeMap(taxonomy) {
  const map = new Map();
  if (!taxonomy || !Array.isArray(taxonomy.eventNodes)) {
    return map;
  }
  for (const node of taxonomy.eventNodes) {
    map.set(node.id, node);
  }
  return map;
}

function deriveCategoryId(subcategoryId, categoryMap) {
  if (!subcategoryId || !categoryMap || !categoryMap.size) {
    return "";
  }
  return categoryMap.get(subcategoryId)?.categoryId || "";
}

function normalizeSource(source) {
  if (!source || typeof source !== "object") {
    return null;
  }
  return {
    threadId: String(source.threadId || "").trim(),
    workspaceRoot: String(source.workspaceRoot || "").trim(),
    transcriptMessageCount: Number.isFinite(Number(source.transcriptMessageCount))
      ? Number(source.transcriptMessageCount)
      : 0,
  };
}

function buildCategoryThemeColor(categoryId) {
  return CATEGORY_THEME_COLORS[String(categoryId || "").trim()] || "var(--cat-life)";
}

function normalizeIso(value) {
  const raw = String(value || "").trim();
  if (!raw) {
    return "";
  }
  const parsed = Date.parse(raw);
  return Number.isFinite(parsed) ? new Date(parsed).toISOString() : "";
}

function normalizeConfidence(value) {
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) {
    return 0.5;
  }
  return Math.max(0, Math.min(1, parsed));
}

function validateDayEvents(date, events, timezone) {
  const normalizedDate = String(date || "").trim();
  const resolvedTimezone = String(timezone || "").trim() || "Asia/Shanghai";
  for (const event of Array.isArray(events) ? events : []) {
    const startDate = formatDateInTimezone(event.startAt, resolvedTimezone);
    const endDate = formatDateInTimezone(event.endAt, resolvedTimezone);
    if (startDate !== normalizedDate || endDate !== normalizedDate) {
      throw new Error(
        `timeline events must stay within ${normalizedDate}: ${event.title} (${event.startAt} ~ ${event.endAt})`
      );
    }
  }
}

function formatDateInTimezone(value, timezone) {
  try {
    return new Intl.DateTimeFormat("en-CA", {
      timeZone: timezone,
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    }).format(Date.parse(value));
  } catch {
    return "";
  }
}

function collectSourceMessageIds(events) {
  const ids = new Set();
  for (const event of Array.isArray(events) ? events : []) {
    for (const messageId of Array.isArray(event?.sourceMessageIds) ? event.sourceMessageIds : []) {
      const normalized = String(messageId || "").trim();
      if (normalized) {
        ids.add(normalized);
      }
    }
  }
  return [...ids];
}

function readJsonFile(filePath) {
  try {
    return JSON.parse(fs.readFileSync(filePath, "utf8"));
  } catch {
    return null;
  }
}

function writeJsonFileAtomic(filePath, value) {
  const directory = path.dirname(filePath);
  const tempFilePath = path.join(
    directory,
    `.${path.basename(filePath)}.${process.pid}.${Date.now()}.tmp`
  );

  try {
    fs.writeFileSync(tempFilePath, JSON.stringify(value, null, 2));
    fs.renameSync(tempFilePath, filePath);
  } catch (error) {
    try {
      fs.unlinkSync(tempFilePath);
    } catch {
      // Ignore cleanup failures for missing or already-moved temp files.
    }
    throw error;
  }
}

function normalizeEventId(event, index, title, eventNodeId, startAt) {
  const explicit = String(event?.id || "").trim();
  if (explicit) {
    return explicit;
  }
  const key = slugify(eventNodeId || title || `fact_${index + 1}`);
  const timeKey = startAt.replace(/[:.]/g, "-");
  return `fact:${key}:${timeKey}`;
}

function slugify(value) {
  const raw = String(value || "").trim().toLowerCase();
  if (!raw) {
    return "event";
  }
  return raw
    .replace(/[^a-z0-9\u4e00-\u9fa5]+/gi, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80) || "event";
}

module.exports = {
  TimelineStore,
};
