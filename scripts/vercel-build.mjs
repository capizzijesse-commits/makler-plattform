import {
  spawnSync,
} from "node:child_process";
import path from "node:path";

function localBin(name) {
  const executable =
    process.platform === "win32"
      ? `${name}.cmd`
      : name;

  return path.join(
    process.cwd(),
    "node_modules",
    ".bin",
    executable
  );
}

function run(name, args) {
  console.log(
    `\n[build] ${name} ${args.join(" ")}`
  );

  const result =
    spawnSync(
      localBin(name),
      args,
      {
        stdio: "inherit",
        env: process.env,
      }
    );

  if (
    result.error ||
    result.status !== 0
  ) {
    if (result.error) {
      console.error(
        `[build] ${name} konnte nicht gestartet werden:`,
        result.error
      );
    }

    process.exit(
      typeof result.status === "number"
        ? result.status
        : 1
    );
  }
}

const vercelEnvironment =
  process.env.VERCEL_ENV?.trim();

console.log(
  `[build] VERCEL_ENV=${vercelEnvironment || "local"}`
);

if (vercelEnvironment === "production") {
  console.log(
    "\n[build] Production erkannt: Prisma Migrationen werden deployed."
  );

  run(
    "prisma",
    [
      "migrate",
      "deploy",
    ]
  );
}
else {
  console.log(
    "\n[build] Keine Production-Umgebung: Prisma migrate deploy wird übersprungen."
  );
}

run(
  "prisma",
  [
    "generate",
  ]
);

run(
  "next",
  [
    "build",
  ]
);