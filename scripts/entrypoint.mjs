import { spawn } from "node:child_process";
import { prepareDatabase } from "./migrate-node.mjs";

const bootstrapInvite = prepareDatabase();
if (bootstrapInvite) {
  console.log("");
  console.log("========================================================");
  console.log("  小脚印首次启动 · 引导邀请码");
  console.log(`  ${bootstrapInvite}`);
  console.log("  打开网站 /login 用它创建第一个家庭账号");
  console.log("========================================================");
  console.log("");
}

const child = spawn(process.execPath, ["server.js"], {
  stdio: "inherit",
  env: {
    ...process.env,
    PORT: process.env.PORT || "3100",
    HOSTNAME: "0.0.0.0",
    NODE_OPTIONS: `${process.env.NODE_OPTIONS ?? ""} --disable-warning=ExperimentalWarning`.trim(),
  },
});

for (const signal of ["SIGTERM", "SIGINT"]) {
  process.on(signal, () => child.kill(signal));
}
child.on("exit", (code) => process.exit(code ?? 0));
