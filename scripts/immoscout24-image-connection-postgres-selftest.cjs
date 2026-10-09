const assert = require("node:assert/strict");
const fs = require("node:fs");
const vm = require("node:vm");
const ts = require("typescript");
const { randomUUID } = require("node:crypto");
const { PrismaClient } = require("@prisma/client");

const prisma = new PrismaClient({
  datasources: {
    db: {
      url: process.env.DATABASE_URL_UNPOOLED,
    },
  },
});

const marker = randomUUID().replace(/-/g, "");
let userId = null;
const connectionId = "guard_connection_" + marker;

const source =
  "lib/portal-integrations/immoscout24-de-image-connection-guard.server.ts";

const compiled = ts.transpileModule(
  fs.readFileSync(source, "utf8"),
  {
    compilerOptions: {
      module: ts.ModuleKind.CommonJS,
      target: ts.ScriptTarget.ES2022,
    },
  }
).outputText;

const exportsObject = {};

vm.runInNewContext(
  compiled,
  {
    exports: exportsObject,
    require(name) {
      if (name === "server-only") return {};
      throw new Error("Unexpected import: " + name);
    },
  },
  { filename: source, timeout: 3000 }
);

const check =
  exportsObject.checkImmoScout24DeImageConnectionV1;

function input(changes = {}) {
  return {
    prisma,
    userId,
    connectionId,
    ...changes,
  };
}

async function setConnection(data) {
  await prisma.portalConnection.update({
    where: { id: connectionId },
    data,
  });
}

async function expectBlocked(label, changes = {}) {
  const result = await check(input(changes));

  assert.equal(result.allowed, false);
  assert.equal(result.reason, "CONNECTION_NOT_VERIFIED");

  console.log("PASS: " + label);
}

async function main() {
  let createdUser = false;

  try {
    const tables = await prisma.$queryRaw`
      SELECT
        to_regclass('public."User"')
          IS NOT NULL AS user_exists,
        to_regclass('public."PortalConnection"')
          IS NOT NULL AS connection_exists
    `;

    assert.equal(tables[0].user_exists, true);
    assert.equal(tables[0].connection_exists, true);

    // Vorhandenen kuenstlichen Testbenutzer wiederverwenden.
    // Keine User-Erstellung und keine User-Loeschung.
    const testUsers = await prisma.user.findMany({
      where: {
        id: { startsWith: "guard_user_" },
        email: { endsWith: "@example.invalid" },
      },
      select: { id: true },
    });

    if (testUsers.length !== 1) {
      throw new Error("EXPECTED_EXACTLY_ONE_TEST_USER");
    }

    userId = testUsers[0].id;

    const existingConnections =
      await prisma.portalConnection.count({
        where: { userId },
      });

    if (existingConnections !== 0) {
      throw new Error("TEST_USER_HAS_CONNECTIONS");
    }

    // Aktiviert ausschliesslich die Bereinigung
    // unserer eigenen PortalConnection.
    createdUser = true;

    await prisma.portalConnection.create({
      data: {
        id: connectionId,
        userId,
        provider: "immoscout24",
        portal: "immoscout24_de",
        environment: "test",
        status: "verified",
      },
    });

    const allowed = await check(input());

    assert.equal(allowed.allowed, true);
    console.log("PASS 1: Verifizierte Sandbox-Verbindung");

    await expectBlocked(
      "2: Falscher Benutzer",
      { userId: "other_" + marker }
    );

    await expectBlocked(
      "3: Falsche Verbindungs-ID",
      { connectionId: "other_" + marker }
    );

    await setConnection({ status: "configured" });
    await expectBlocked("4: Nicht verifiziert");

    await setConnection({
      status: "verified",
      environment: "production",
    });
    await expectBlocked("5: Produktionsumgebung");

    await setConnection({
      environment: "test",
      portal: "homegate_ch",
    });
    await expectBlocked("6: Falsches Portal");

    await setConnection({
      portal: "immoscout24_de",
      status: "error",
    });
    await expectBlocked("7: Fehlerstatus");

    await prisma.portalConnection.delete({
      where: { id: connectionId },
    });

    await expectBlocked("8: Fehlende Verbindung");

    console.log(
      "\nALLE 8 POSTGRESQL-GUARD-TESTS ERFOLGREICH"
    );
  } finally {
    try {
      if (createdUser) {
        await prisma.portalConnection.deleteMany({
          where: {
            id: connectionId,
            userId,
          },
        });

        const usersLeft = await prisma.user.count({
          where: { id: userId },
        });

        const connectionsLeft =
          await prisma.portalConnection.count({
            where: { id: connectionId },
          });

        // Geschuetzter Testbenutzer bleibt bestehen.
        assert.equal(usersLeft, 1);
        assert.equal(connectionsLeft, 0);

        console.log(
          "Testverbindung entfernt; Testbenutzer unveraendert"
        );
      }
    } finally {
      await prisma.$disconnect();
    }
  }
}

main().catch(error => {
  console.error(
    "STOP: PostgreSQL-Guard-Test fehlgeschlagen.",
    error.code || error.message
  );
  process.exitCode = 1;
});