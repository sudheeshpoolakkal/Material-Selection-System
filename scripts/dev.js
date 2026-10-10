const { spawn } = require("child_process");
const path = require("path");
const root = path.resolve(__dirname, "..");
const children = [
  spawn(process.execPath, ["server/server.js"], {
    cwd: root,
    stdio: "inherit",
    env: { ...process.env, PORT: "5000" },
  }),
  spawn("npm", ["start", "--prefix", "client"], {
    cwd: root,
    stdio: "inherit",
    env: { ...process.env, BROWSER: "none" },
  }),
];
function stop() {
  children.forEach((child) => child.kill("SIGTERM"));
}
process.on("SIGINT", stop);
process.on("SIGTERM", stop);
children.forEach((child) =>
  child.on("exit", (code) => {
    stop();
    process.exitCode = code || 0;
  }),
);
