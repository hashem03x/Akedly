/**
 * Follow-up to repair-orphaned-store-2026-09-23.ts: that script reassigned the
 * orphaned store's orders/communications to the live merchant and marked the
 * orphaned Store record `disconnected`, but left the row in place. It is still
 * matched by shopify.webhook.ts's `StoreModel.find({platform, domain})` lookup
 * (disconnected stores aren't excluded from the *query*, only from being
 * *selected* as the active store), which is why `shopify_webhook_multiple_stores_for_domain`
 * keeps firing on every webhook even though it no longer affects which store
 * orders are attributed to.
 *
 * This script deletes that specific row outright. It refuses to run unless,
 * at the moment it runs, the target store: is disconnected, has zero orders
 * referencing it, and its merchantId has no corresponding Merchant document —
 * i.e. it re-verifies the exact conditions that made it safe, rather than
 * trusting that nothing changed since the last script ran.
 *
 * Usage: npx tsx scripts/remove-orphaned-store-2026-09-23.ts [--apply]
 */
import mongoose from "mongoose";
import { env } from "../src/config/env";
import { MerchantModel } from "../src/modules/merchants/merchant.model";
import { StoreModel } from "../src/modules/stores/store.model";
import { OrderModel } from "../src/modules/orders/order.model";

const TARGET_STORE_ID = "6ab2dd13147ebb35ebde5897";

async function main(): Promise<void> {
  const apply = process.argv.includes("--apply");
  console.log(`Connecting to MongoDB (mode: ${apply ? "APPLY" : "DRY RUN"})...`);
  await mongoose.connect(env.mongodbUri);
  console.log(`Connected. Database: ${mongoose.connection.name}`);

  const store = await StoreModel.findById(TARGET_STORE_ID);
  if (!store) {
    console.log(`Store ${TARGET_STORE_ID} does not exist. Nothing to do.`);
    await mongoose.disconnect();
    return;
  }

  const merchant = await MerchantModel.findById(store.merchantId);
  const orderCount = await OrderModel.countDocuments({ storeId: store._id });

  console.log(`Store ${store.id}: status=${store.status} merchantId=${store.merchantId} ` +
    `merchantExists=${Boolean(merchant)} orderCount=${orderCount}`);

  if (store.status !== "disconnected" || orderCount > 0 || merchant) {
    console.error(
      "Refusing to delete: this store no longer matches the expected orphan profile " +
        "(disconnected, zero orders, no live merchant). Re-investigate before deleting."
    );
    process.exitCode = 1;
    await mongoose.disconnect();
    return;
  }

  if (!apply) {
    console.log("\nDry run only — would delete this store. Re-run with --apply to actually delete it.");
    await mongoose.disconnect();
    return;
  }

  await StoreModel.deleteOne({ _id: store._id });
  console.log(`Deleted store ${store.id}.`);

  const remaining = await StoreModel.find({ platform: store.platform, domain: store.domain });
  console.log(
    `Remaining stores for ${store.domain}: ${remaining.map((s) => `${s.id} (${s.status})`).join(", ") || "none"}`
  );

  await mongoose.disconnect();
}

main().catch((err) => {
  console.error("Cleanup failed:", err instanceof Error ? err.message : err);
  process.exitCode = 1;
});
