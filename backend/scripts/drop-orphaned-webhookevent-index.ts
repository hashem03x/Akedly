/**
 * One-time repair, same bug class as drop-orphaned-order-index.ts: the live
 * `webhookevents` collection carries a unique, non-sparse index,
 * `provider_1_externalEventId_1`, on fields that do not exist anywhere in the
 * current schema (webhook-event.model.ts only ever writes `source` and
 * `idempotencyKey`). Because every document this app creates is missing both
 * `provider` and `externalEventId`, they all collide on the same indexed key
 * `{provider: null, externalEventId: null}` — so every `WebhookEventModel.create()`
 * after the very first one in the whole collection throws E11000.
 *
 * claimWebhookEvent() (webhook-event.model.ts) happens to catch that E11000 and,
 * finding no document under the real {source, idempotencyKey} it was trying to
 * claim, falls back to treating the delivery as newly claimable — so this has
 * NOT been blocking webhook processing. What it silently breaks is true
 * duplicate-delivery detection: the dedup record is never actually persisted,
 * so a genuine Shopify/WhatsApp retry is reprocessed as if it were new instead
 * of being recognized and skipped. Confirmed against the live database on
 * 2026-09-23: only 1 webhookevents document existed despite several orders
 * having already been ingested through separate webhook deliveries.
 *
 * This script only drops that one specific, precisely-named orphaned index.
 * It never touches data and never touches `source_1_idempotencyKey_1` (the
 * real idempotency guard, defined in webhook-event.model.ts). Safe to run more
 * than once (no-op if already gone).
 *
 * Usage: npx tsx scripts/drop-orphaned-webhookevent-index.ts
 */
import mongoose from "mongoose";
import { env } from "../src/config/env";

const ORPHANED_INDEX_NAME = "provider_1_externalEventId_1";
const EXPECTED_OWN_INDEX_NAME = "source_1_idempotencyKey_1";

async function main(): Promise<void> {
  console.log("Connecting to MongoDB...");
  await mongoose.connect(env.mongodbUri);
  console.log(`Connected. Database: ${mongoose.connection.name}`);

  const collection = mongoose.connection.collection("webhookevents");
  const indexes = await collection.indexes();

  console.log("Current indexes on `webhookevents`:");
  for (const idx of indexes) {
    console.log(`  - ${idx.name}  key=${JSON.stringify(idx.key)}  unique=${Boolean(idx.unique)}  sparse=${Boolean(idx.sparse)}`);
  }

  const ownIndex = indexes.find((idx) => idx.name === EXPECTED_OWN_INDEX_NAME);
  if (!ownIndex) {
    console.error(
      `Expected index "${EXPECTED_OWN_INDEX_NAME}" (the real idempotency guard) was not found. ` +
        "Refusing to proceed — schema/database appear out of sync in an unexpected way."
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
  if (orphaned.sparse) {
    console.log(`Index "${ORPHANED_INDEX_NAME}" is sparse — harmless, but dropping anyway for hygiene.`);
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
