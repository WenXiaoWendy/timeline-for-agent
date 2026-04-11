const test = require("node:test");
const assert = require("node:assert/strict");

const buildCli = require("../src/app/timeline-build-cli");
const serveCli = require("../src/app/timeline-serve-cli");
const devCli = require("../src/app/timeline-dev-cli");

test("build cli detects --help", () => {
  assert.deepEqual(buildCli.parseArgs(["--help"]), { help: true });
});

test("serve cli parses --help and --port", () => {
  assert.deepEqual(serveCli.parseArgs(["--help"], 4317), { help: true, port: 4317 });
  assert.deepEqual(serveCli.parseArgs(["--port", "4321"], 4317), { help: false, port: 4321 });
});

test("dev cli parses --help and --port", () => {
  assert.deepEqual(devCli.parseArgs(["-h"], 4317), { help: true, port: 4317 });
  assert.deepEqual(devCli.parseArgs(["--port", "4322"], 4317), { help: false, port: 4322 });
});
