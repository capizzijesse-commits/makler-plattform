const fs = require("node:fs");
const vm = require("node:vm");
const ts = require("typescript");
const assert = require("node:assert/strict");

const records = new Map();
let nextId = 0;

class KnownRequestError extends Error {
  constructor(code) {
    super(code);
    this.code = code;
  }
}

const prisma = {
  portalConnection: {
    async findFirst({ where }) {
      return where.id === "connection-1" &&
        where.userId === "user-1" &&
        where.portal === "immoscout24_de" &&
        where.environment === "test"
        ? { id: where.id }
        : null;
    },
  },
  listing: {
    async findFirst({ where }) {
      return where.id === "listing-1" &&
        where.userId === "user-1" &&
        where.archivedAt === null
        ? { id: where.id }
        : null;
    },
  },
  immoScout24DeObjectLink: {
    async create({ data }) {
      for (const existing of records.values()) {
        if (
          existing.connectionId === data.connectionId &&
          (
            existing.listingId === data.listingId ||
            existing.externalId === data.externalId
          )
        ) {
          throw new KnownRequestError("P2002");
        }
      }

      const record = {
        id: `link-${++nextId}`,
        ...data,
        externalObjectId: null,
      };

      records.set(record.id, record);
      return { ...record };
    },
    async updateMany({ where, data }) {
      let count = 0;

      for (const record of records.values()) {
        if (
          Object.entries(where).every(
            ([key, value]) => record[key] === value
          )
        ) {
          Object.assign(record, data);
          count++;
        }
      }

      return { count };
    },
  },
};

const filename =
  "lib/portal-integrations/immoscout24-de-object-link.server.ts";

const source = fs.readFileSync(filename, "utf8");

const compiled = ts.transpileModule(source, {
  compilerOptions: {
    module: ts.ModuleKind.CommonJS,
    target: ts.ScriptTarget.ES2022,
  },
}).outputText;

const output = {};

vm.runInNewContext(compiled, {
  exports: output,
  require(name) {
    if (name === "server-only") return {};
    if (name === "@prisma/client") {
      return {
        Prisma: {
          PrismaClientKnownRequestError: KnownRequestError,
        },
      };
    }
    if (name === "@/lib/prisma") return { prisma };
    throw new Error(`Unexpected import: ${name}`);
  },
  Error,
  Object,
  Date,
}, {
  filename,
  timeout: 3000,
});

const base = {
  userId: "user-1",
  listingId: "listing-1",
  connectionId: "connection-1",
};

async function rejectCode(action, code) {
  await assert.rejects(action, error => error.code === code);
}

async function main() {
  const link = await output.reserveImmoScout24DeObjectV1({
    ...base,
    externalId: "TEST_001",
  });
  assert.equal(link.status, "reserved");
  console.log("PASS: Reservierung");

  await rejectCode(
    () => output.reserveImmoScout24DeObjectV1({
      ...base,
      externalId: "TEST_001",
    }),
    "IMMOSCOUT24_DE_OBJECT_ALREADY_RESERVED"
  );
  console.log("PASS: Doppelreservierung blockiert");

  const target = {
    linkId: link.id,
    userId: base.userId,
    connectionId: base.connectionId,
  };

  await output.beginImmoScout24DeCreateV1(target);

  await rejectCode(
    () => output.beginImmoScout24DeCreateV1(target),
    "IMMOSCOUT24_DE_CREATE_NOT_RESERVED"
  );
  console.log("PASS: Paralleler Start blockiert");

  await output.completeImmoScout24DeCreateV1({
    ...target,
    externalObjectId: "123456",
  });

  assert.equal(records.get(link.id).status, "created");
  console.log("PASS: Objekt-ID dauerhaft zugeordnet (Simulation)");

  await rejectCode(
    () => output.completeImmoScout24DeCreateV1({
      ...target,
      externalObjectId: "123456",
    }),
    "IMMOSCOUT24_DE_CREATE_COMPLETION_CONFLICT"
  );
  console.log("PASS: Doppelter Abschluss blockiert");

  const other = await output.reserveImmoScout24DeObjectV1({
    ...base,
    listingId: "listing-1",
    externalId: "TEST_002",
  }).then(
    () => "unexpected",
    error => error.code
  );

  assert.equal(
    other,
    "IMMOSCOUT24_DE_OBJECT_ALREADY_RESERVED"
  );

  const uncertainLink = await prisma.immoScout24DeObjectLink.create({
    data: {
      ...base,
      listingId: "listing-2",
      externalId: "TEST_002",
      status: "reserved",
    },
  });

  const uncertainTarget = {
    ...target,
    linkId: uncertainLink.id,
  };

  await output.beginImmoScout24DeCreateV1(uncertainTarget);

  await output.markImmoScout24DeCreateUncertainV1({
    ...uncertainTarget,
    errorCode: "NETWORK_TIMEOUT",
  });

  assert.equal(records.get(uncertainLink.id).status, "uncertain");

  await rejectCode(
    () => output.beginImmoScout24DeCreateV1(uncertainTarget),
    "IMMOSCOUT24_DE_CREATE_NOT_RESERVED"
  );

  console.log("PASS: Unsicherer Zustand blockiert Neustart");
  console.log("\nALLE STATUS-SELBSTTESTS ERFOLGREICH");
}

main().catch(error => {
  console.error(error);
  process.exitCode = 1;
});
