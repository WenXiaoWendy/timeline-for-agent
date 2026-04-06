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
用法: timeline-for-agent categories

用途:
  - 读取当前可用的 category / subcategory / eventNode 摘要
  - 供写入前确认应该复用哪个分类或 eventNode

说明:
  - 这里只返回受控 taxonomy 摘要，不返回整库原始 state
  - 如果不确定是否需要新增 eventNode，先看 categories
`);
}

module.exports = { runTimelineCategoriesCommand };
