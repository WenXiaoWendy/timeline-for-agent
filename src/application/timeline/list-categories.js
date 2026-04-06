const { createTimelineStore } = require("./shared");

async function listTimelineCategories(config) {
  const store = createTimelineStore(config);
  const state = store.getState();
  const eventNodesByParentId = new Map();

  for (const node of Array.isArray(state?.taxonomy?.eventNodes) ? state.taxonomy.eventNodes : []) {
    const parentId = String(node?.parentId || "").trim();
    if (!parentId) {
      continue;
    }
    const group = eventNodesByParentId.get(parentId) || [];
    group.push({
      id: String(node.id || "").trim(),
      label: String(node.label || "").trim(),
      aliases: Array.isArray(node.aliases) ? [...node.aliases] : [],
      status: String(node.status || "official").trim() || "official",
    });
    eventNodesByParentId.set(parentId, group);
  }

  const categories = Array.isArray(state?.taxonomy?.categories)
    ? state.taxonomy.categories.map((category) => ({
      id: String(category.id || "").trim(),
      label: String(category.label || "").trim(),
      children: Array.isArray(category.children)
        ? category.children.map((child) => ({
          id: String(child.id || "").trim(),
          label: String(child.label || "").trim(),
          eventNodes: (eventNodesByParentId.get(String(child.id || "").trim()) || [])
            .slice()
            .sort((left, right) => left.id.localeCompare(right.id)),
        }))
        : [],
    }))
    : [];

  return {
    categoryCount: categories.length,
    categories,
  };
}

module.exports = { listTimelineCategories };
