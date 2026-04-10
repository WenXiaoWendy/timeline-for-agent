const { createTimelineStore } = require("./shared");

async function readTimelineDay(config, input) {
  const payload = input && typeof input === "object" ? input : {};
  const date = String(payload.date || "").trim();
  if (!date) {
    throw new Error("timeline-read requires a date. Pass --date YYYY-MM-DD");
  }

  const store = createTimelineStore(config);
  const day = store.getDay(date);
  if (!day) {
    return {
      date,
      exists: false,
      status: "missing",
      updatedAt: "",
      eventCount: 0,
      events: [],
    };
  }

  return {
    date,
    exists: true,
    status: day.status || "draft",
    updatedAt: day.updatedAt || "",
    eventCount: Array.isArray(day.events) ? day.events.length : 0,
    events: Array.isArray(day.events)
      ? day.events.map((event) => ({
        id: event.id,
        startAt: event.startAt,
        endAt: event.endAt,
        title: event.title,
        note: event.note || "",
        categoryId: event.categoryId,
        subcategoryId: event.subcategoryId,
        eventNodeId: event.eventNodeId || "",
        tags: Array.isArray(event.tags) ? [...event.tags] : [],
      }))
      : [],
  };
}

module.exports = { readTimelineDay };
