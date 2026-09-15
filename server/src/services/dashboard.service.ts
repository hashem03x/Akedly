import { Types } from "mongoose";
import { Order } from "../models/order.model";

export interface OverviewStats {
  totalOrders: number;
  pendingConfirmation: number;
  confirmed: number;
  cancelled: number;
  expired: number;
  /** Percentage of resolved orders (confirmed/cancelled/expired) that were confirmed. 0 if none resolved yet. */
  confirmationRate: number;
}

async function getOverview(merchantId: string): Promise<OverviewStats> {
  const results = await Order.aggregate<{ _id: string; count: number }>([
    { $match: { merchantId: new Types.ObjectId(merchantId) } },
    { $group: { _id: "$status", count: { $sum: 1 } } },
  ]);

  const counts: Record<string, number> = {};
  for (const row of results) counts[row._id] = row.count;

  const pendingConfirmation = counts.PENDING_CONFIRMATION ?? 0;
  const confirmed = counts.CONFIRMED ?? 0;
  const cancelled = counts.CANCELLED ?? 0;
  const expired = counts.EXPIRED ?? 0;
  const resolved = confirmed + cancelled + expired;

  return {
    totalOrders: pendingConfirmation + resolved,
    pendingConfirmation,
    confirmed,
    cancelled,
    expired,
    confirmationRate: resolved > 0 ? Number(((confirmed / resolved) * 100).toFixed(1)) : 0,
  };
}

export const DashboardService = { getOverview };
