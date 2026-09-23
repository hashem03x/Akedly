/**
 * One-time repair for a production incident (2026-09-23): the `dev-akedly.myshopify.com`
 * Shopify store was connected under a merchant account that was later deleted
 * directly in the database (outside any app-level "delete merchant" flow, which
 * doesn't exist yet) without cascading the deletion to its Store record. The
 * merchant then reconnected the same shop under a new account. From that point
 * on, every `orders/create` webhook resolved via
 * `StoreModel.findOne({ platform, domain })` (shopify.webhook.ts) — a query with
 * no merchant scope — and could match either the live store or the orphaned
 * one. In practice it consistently matched the orphaned one: 4 real orders were
 * ingested and 3 of them had a WhatsApp confirmation successfully sent (real
 * Meta `wamid.` provider ids persisted), but all of it was attributed to a
 * merchantId with no corresponding Merchant document — invisible on any
 * dashboard, because every merchant-scoped query (listOrdersForMerchant,
 * listCommunicationsForOrder's merchant checks, etc.) filters by the logged-in
 * merchant's id.
 *
 * This is a one-time data repair, not a repeatable migration: it moves records
 * that belong, in every practical sense, to the one live merchant account back
 * under it, and marks the orphaned store record disconnected (kept, not
 * deleted, for audit history). The application-level fix that stops this class
 * of bug from recurring is in store.service.ts's upsertShopifyStoreFromOAuth
 * (reassignOtherStoresForDomain) — this script only cleans up data created
 * before that fix existed.
 *
 * Usage: npx tsx scripts/repair-orphaned-store-2026-09-23.ts [--apply]
 * Without --apply, runs read-only and prints exactly what it would change.
 */
import mongoose from "mongoose";
import { env } from "../src/config/env";
import { MerchantModel } from "../src/modules/merchants/merchant.model";
import { StoreModel } from "../src/modules/stores/store.model";
import { OrderModel } from "../src/modules/orders/order.model";
import { CommunicationModel } from "../src/modules/communications/communication.model";

const DOMAIN = "dev-akedly.myshopify.com";
const PLATFORM = "shopify";

async function main(): Promise<void> {
  const apply = process.argv.includes("--apply");

  console.log(`Connecting to MongoDB (mode: ${apply ? "APPLY" : "DRY RUN"})...`);
  await mongoose.connect(env.mongodbUri);
  console.log(`Connected. Database: ${mongoose.connection.name}`);

  const stores = await StoreModel.find({ platform: PLATFORM, domain: DOMAIN }).sort({ createdAt: 1 });
  if (stores.length < 2) {
    console.log(`Found ${stores.length} store(s) for ${DOMAIN}. Nothing to repair.`);
    await mongoose.disconnect();
    return;
  }

  const withMerchant: typeof stores = [];
  const orphaned: typeof stores = [];
  for (const store of stores) {
    const merchant = await MerchantModel.findById(store.merchantId);
    (merchant ? withMerchant : orphaned).push(store);
  }

  if (withMerchant.length !== 1 || orphaned.length === 0) {
    console.error(
      `Refusing to proceed: expected exactly 1 store with a live merchant and >=1 orphaned, ` +
        `found ${withMerchant.length} live / ${orphaned.length} orphaned. This script only handles ` +
        `the specific 2026-09-23 shape and would need a human to look at anything else.`
    );
    process.exitCode = 1;
    await mongoose.disconnect();
    return;
  }

  const liveStore = withMerchant[0];
  console.log(`Live store: ${liveStore.id} (merchantId=${liveStore.merchantId})`);

  for (const orphan of orphaned) {
    const orders = await OrderModel.find({ storeId: orphan._id });
    console.log(
      `Orphaned store: ${orphan.id} (merchantId=${orphan.merchantId}, no Merchant doc) — ${orders.length} order(s) to reassign`
    );
    for (const order of orders) {
      const comms = await CommunicationModel.countDocuments({ orderId: order._id });
      console.log(
        `  order ${order.id} (externalOrderId=${order.externalOrderId}, orderNumber=${order.orderNumber}) — ${comms} communication(s)`
      );
    }

    if (!apply) continue;

    for (const order of orders) {
      await OrderModel.updateOne(
        { _id: order._id },
        { $set: { storeId: liveStore._id, merchantId: liveStore.merchantId } }
      );
      await CommunicationModel.updateMany(
        { orderId: order._id },
        { $set: { merchantId: liveStore.merchantId } }
      );
    }

    orphan.status = "disconnected";
    orphan.lastConnectionError = `Repaired ${new Date().toISOString()}: orphaned after merchant account deletion, orders reassigned to ${liveStore.id}.`;
    await orphan.save();
    console.log(`  -> reassigned ${orders.length} order(s) and disconnected orphaned store ${orphan.id}`);
  }

  if (!apply) {
    console.log("\nDry run only — re-run with --apply to make these changes.");
  } else {
    console.log("\nDone.");
  }

  await mongoose.disconnect();
}

main().catch((err) => {
  console.error("Repair failed:", err instanceof Error ? err.message : err);
  process.exitCode = 1;
});
