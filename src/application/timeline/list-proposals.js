const { createTimelineStore } = require("./shared");

async function listTimelineProposals(config, input = {}) {
  const date = String(input.date || "").trim();
  const store = createTimelineStore(config);
  const state = store.getState();
  const proposals = Array.isArray(state?.proposals) ? state.proposals : [];
  const filtered = date
    ? proposals.filter((proposal) => String(proposal?.date || "").trim() === date)
    : proposals;

  const items = filtered
    .map((proposal) => ({
      id: String(proposal.id || "").trim(),
      date: String(proposal.date || "").trim(),
      proposedNodeId: String(proposal.proposedNodeId || "").trim(),
      label: String(proposal.label || "").trim(),
      parentId: String(proposal.parentId || "").trim(),
      sourceMessageIds: Array.isArray(proposal.sourceMessageIds) ? [...proposal.sourceMessageIds] : [],
      createdAt: String(proposal.createdAt || "").trim(),
    }))
    .sort((left, right) => {
      const timeDelta = Date.parse(right.createdAt || "") - Date.parse(left.createdAt || "");
      if (Number.isFinite(timeDelta) && timeDelta !== 0) {
        return timeDelta;
      }
      return left.id.localeCompare(right.id);
    });

  return {
    date: date || "",
    proposalCount: items.length,
    proposals: items,
  };
}

module.exports = { listTimelineProposals };
