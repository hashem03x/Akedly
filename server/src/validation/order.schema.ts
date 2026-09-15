import { z } from "zod";
import { CONFIRMATION_METHODS, ORDER_STATUSES } from "../types/enums";

export const listOrdersQuerySchema = z.object({
  status: z.enum(ORDER_STATUSES).optional(),
  confirmationMethod: z.enum(CONFIRMATION_METHODS).optional(),
  from: z.coerce.date().optional(),
  to: z.coerce.date().optional(),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
});

export type ListOrdersQuery = z.infer<typeof listOrdersQuerySchema>;
