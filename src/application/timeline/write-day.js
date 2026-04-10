const { createTimelineStore, withTimelineWriteLock } = require("./shared");

async function writeTimelineDay(config, input) {
  const payload = input && typeof input === "object" ? input : {};
  const date = String(payload.date || "").trim();
  if (!date) {
    throw new Error("timeline-write requires a date. Pass --date YYYY-MM-DD or include date in the JSON payload.");
  }

  return withTimelineWriteLock(config, async () => {
    const store = createTimelineStore(config);
    const mode = String(payload.mode || "merge").trim().toLowerCase() || "merge";
    const common = {
      date,
      status: payload.finalize ? "final" : payload.status || "",
      source: payload.source || null,
      events: Array.isArray(payload.events) ? payload.events : [],
      newEventNodes: Array.isArray(payload.newEventNodes) ? payload.newEventNodes : [],
    };

    const saved = mode === "replace"
      ? store.replaceDay(common)
      : store.mergeDay({
        ...common,
        dropEventIds: Array.isArray(payload.dropEventIds) ? payload.dropEventIds : [],
      });

    if (payload.finalize) {
      store.finalizeDay(date);
    }

    return {
      date,
      mode,
      eventCount: Array.isArray(saved?.events) ? saved.events.length : 0,
      status: payload.finalize ? "final" : (saved?.status || "missing"),
    };
  });
}

module.exports = { writeTimelineDay };
