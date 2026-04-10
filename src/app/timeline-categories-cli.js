const { listTimelineCategories } = require("../application/timeline/list-categories");

async function runTimelineCategoriesCommand(config) {
  const args = process.argv.slice(3);
  if (args.includes("--help") || args.includes("-h")) {
    printHelp();
    return;
  }

  const result = await listTimelineCategories(config);
  console.log(JSON.stringify(result, null, 2));
}

function printHelp() {
  console.log(`
Usage: timeline-for-agent categories

Purpose:
  - Show the available category / subcategory / eventNode summary
  - Use it before writing if you are not sure which category or event node should be reused

Notes:
  - This only returns the controlled taxonomy summary, not the entire raw state
  - If you are not sure whether a new event node is needed, inspect categories first
`);
}

module.exports = { runTimelineCategoriesCommand };
