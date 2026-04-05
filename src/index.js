const fs = require("fs");
const os = require("os");
const path = require("path");
const dotenv = require("dotenv");

const { readConfig } = require("./infra/config/config");
const { runTimelineWriteCommand } = require("./app/timeline-write-cli");
const { runTimelineBuildCommand } = require("./app/timeline-build-cli");
const { runTimelineServeCommand } = require("./app/timeline-serve-cli");
const { runTimelineDevCommand } = require("./app/timeline-dev-cli");
const { runTimelineScreenshotCommand } = require("./app/timeline-screenshot-cli");

function ensureDefaultConfigDirectory() {
  const defaultConfigDir = path.join(os.homedir(), ".timeline-for-agent");
  fs.mkdirSync(defaultConfigDir, { recursive: true });
}

function loadEnv() {
  ensureDefaultConfigDirectory();

  const envCandidates = [
    path.join(process.cwd(), ".env"),
    path.join(os.homedir(), ".timeline-for-agent", ".env"),
  ];

  for (const envPath of envCandidates) {
    if (!fs.existsSync(envPath)) {
      continue;
    }
    dotenv.config({ path: envPath });
    return;
  }

  dotenv.config();
}

function printHelp() {
  console.log(`
用法: timeline-for-agent <命令>

命令:
  write        写入或增量更新某天的时间轴 JSON
  build        构建本地时间轴静态页面
  serve        本地启动时间轴静态页面服务
  dev          监听源码和数据，自动重建并热刷新时间轴页面
  screenshot   截图时间轴页面
  help         显示帮助
`);
}

async function main() {
  loadEnv();
  const config = readConfig();
  const command = config.mode || "";

  if (!command || command === "help" || command === "--help" || command === "-h") {
    printHelp();
    return;
  }

  if (command === "write") {
    await runTimelineWriteCommand(config);
    return;
  }

  if (command === "build") {
    await runTimelineBuildCommand(config);
    return;
  }

  if (command === "serve") {
    await runTimelineServeCommand(config);
    return;
  }

  if (command === "dev") {
    await runTimelineDevCommand(config);
    return;
  }

  if (command === "screenshot") {
    await runTimelineScreenshotCommand(config);
    return;
  }

  throw new Error(`未知命令: ${command}`);
}

module.exports = { main };
