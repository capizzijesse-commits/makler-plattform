import { defineConfig } from "prisma/config";

export default defineConfig({
  engine: "classic",
  schema: "./prisma/schema.prisma",
  datasource: {
    url: "file:./prisma/dev.db",
  },
});