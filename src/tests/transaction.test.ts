import assert from "node:assert/strict";
import fs from "node:fs/promises";
import path from "node:path";
import test from "node:test";
import { applyTransaction } from "../core/transaction.js";
import { tempDir } from "./helpers.js";

test("transaction restores earlier writes after a later write fails", async () => {
  const target = await tempDir("forge-transaction-");
  await fs.writeFile(path.join(target, "first.txt"), "before");
  await fs.mkdir(path.join(target, "blocked"));

  await assert.rejects(
    applyTransaction(target, {
      writes: [
        { path: "first.txt", content: Buffer.from("after"), component: "test" },
        { path: "blocked", content: Buffer.from("cannot replace directory"), component: "test" },
      ],
      deletes: [],
      unchanged: [],
      conflicts: [],
    }),
  );
  assert.equal(await fs.readFile(path.join(target, "first.txt"), "utf8"), "before");
});
