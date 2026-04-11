const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("fs");
const os = require("os");
const path = require("path");

const devServer = require("../src/application/timeline/dev-server");

function createTempDir() {
  return fs.mkdtempSync(path.join(os.tmpdir(), "timeline-dev-server-test-"));
}

test("watch limit errors are recognized", () => {
  assert.equal(devServer.isWatchLimitError({ code: "EMFILE" }), true);
  assert.equal(devServer.isWatchLimitError({ code: "ENOSPC" }), true);
  assert.equal(devServer.isWatchLimitError({ code: "EACCES" }), false);
});

test("timeline dev watcher falls back to polling when fs.watch hits EMFILE", async () => {
  const tempDir = createTempDir();
  const filePath = path.join(tempDir, "facts.json");
  fs.writeFileSync(filePath, "one", "utf8");

  const originalWatch = fs.watch;
  fs.watch = () => {
    const error = new Error("too many open files");
    error.code = "EMFILE";
    throw error;
  };

  let changeCount = 0;
  const watcher = devServer.createTimelineDevWatcher(filePath, () => {
    changeCount += 1;
  });

  fs.watch = originalWatch;

  assert.ok(watcher);
  fs.writeFileSync(filePath, "two", "utf8");
  await new Promise((resolve) => setTimeout(resolve, 1100));
  watcher.close();

  assert.equal(changeCount > 0, true);
});
