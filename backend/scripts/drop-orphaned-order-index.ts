/**
 * One-time repair for a production incident: the live `orders` collection carries
 * a unique index, `merchantId_1_shopifyOrderId_1`, that does not correspond to any
 * field in the current Order schema (order.model.ts only ever defines
 * `externalOrderId`, never `shopifyOrderId` — confirmed via full-repo search and
 * git history, this field name has never existed in this codebase). Because every
 * document this app creates has `shopifyOrderId` entirely absent, a non-sparse
 * unique index treats all of them as sharing the same key, `{merchantId, shopifyOrderId:
 * null}` — so the SECOND order ever ingested for any merchant collides with
 * E11000, regardless of its real Shopify order id.
 *
 * This script only removes that one specific, precisely-named orphaned index. It
 * never touches data, never touches any other index (in particular, the real
 * duplicate-order guard — the unique index on {storeId, externalOrderId} defined
 * in order.model.ts — is left completely untouched), and is safe to run more than
 * once (a no-op if the index is already gone).
 *
 * Usage (run against the target environment's MONGODB_URI):
 *   npx tsx scripts/drop-orphaned-order-index.ts
 */
import mongoose from "mongoose";
import { env } from "../src/config/env";

const ORPHANED_INDEX_NAME = "merchantId_1_shopifyOrderId_1";
const EXPECTED_OWN_INDEX_NAME = "storeId_1_externalOrderId_1";

async function main(): Promise<void> {
  console.log("Connecting to MongoDB...");
  await mongoose.connect(env.mongodbUri);
  console.log(`Connected. Database: ${mongoose.connection.name}`);

  const collection = mongoose.connection.collection("orders");
  const indexes = await collection.indexes();

  console.log("Current indexes on `orders`:");
  for (const idx of indexes) {
    console.log(`  - ${idx.name}  key=${JSON.stringify(idx.key)}  unique=${Boolean(idx.unique)}`);
  }

  const ownIndex = indexes.find((idx) => idx.name === EXPECTED_OWN_INDEX_NAME);
  if (!ownIndex) {
    console.error(
      `Expected index "${EXPECTED_OWN_INDEX_NAME}" (the real duplicate-order guard) was not found. ` +
        "Refusing to proceed — this would indicate the schema/database are out of sync in an " +
        "unexpected way, and dropping anything else first would be unsafe."
    );
    process.exitCode = 1;
    await mongoose.disconnect();
    return;
  }

  const orphaned = indexes.find((idx) => idx.name === ORPHANED_INDEX_NAME);
  if (!orphaned) {
    console.log(`Index "${ORPHANED_INDEX_NAME}" does not exist. Nothing to do.`);
    await mongoose.disconnect();
    return;
  }

  console.log(`Dropping orphaned index "${ORPHANED_INDEX_NAME}"...`);
  await collection.dropIndex(ORPHANED_INDEX_NAME);
  console.log("Done. Remaining indexes:");
  for (const idx of await collection.indexes()) {
    console.log(`  - ${idx.name}`);
  }

  await mongoose.disconnect();
}

main().catch((err) => {
  console.error("Migration failed:", err instanceof Error ? err.message : err);
  process.exitCode = 1;
});
