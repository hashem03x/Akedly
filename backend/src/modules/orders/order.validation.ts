import { z } from "zod";
import { CONFIRMATION_STATUSES } from "./order.model";

export const listOrdersQuerySchema = z.object({
  status: z.enum(CONFIRMATION_STATUSES).optional(),
  search: z.string().trim().max(200).optional(),
  page: z.coerce.number().int().min(1).optional(),
  pageSize: z.coerce.number().int().min(1).max(100).optional(),
});
