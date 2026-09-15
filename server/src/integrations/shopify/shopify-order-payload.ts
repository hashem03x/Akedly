// Only the fields Akedly actually needs from a Shopify orders/create (or
// orders/updated) webhook payload — not an exhaustive Shopify order type.
export interface ShopifyOrderPayload {
  id: number | string;
  order_number: number | string;
  currency: string;
  subtotal_price: string;
  total_discounts: string;
  total_price: string;
  phone?: string | null;
  email?: string | null;
  customer?: {
    first_name?: string | null;
    last_name?: string | null;
    phone?: string | null;
    email?: string | null;
  } | null;
  shipping_address?: { phone?: string | null } | null;
  shipping_lines?: { price: string }[] | null;
  line_items: {
    product_id?: number | string | null;
    variant_id?: number | string | null;
    title: string;
    quantity: number;
    price: string;
  }[];
}

export interface MappedShopifyOrder {
  shopifyOrderId: string;
  shopifyOrderNumber: string;
  customerName: string;
  customerPhone: string | undefined;
  customerEmail: string | undefined;
  items: { productId?: string; variantId?: string; title: string; quantity: number; price: number }[];
  subtotal: number;
  shipping: number;
  discount: number;
  total: number;
  currency: string;
}

export function mapShopifyOrderPayload(payload: ShopifyOrderPayload): MappedShopifyOrder {
  const firstName = payload.customer?.first_name?.trim() ?? "";
  const lastName = payload.customer?.last_name?.trim() ?? "";
  const customerName = [firstName, lastName].filter(Boolean).join(" ") || "Customer";

  const customerPhone =
    payload.customer?.phone ?? payload.phone ?? payload.shipping_address?.phone ?? undefined;
  const customerEmail = payload.customer?.email ?? payload.email ?? undefined;

  const shipping = (payload.shipping_lines ?? []).reduce((sum, line) => sum + Number(line.price), 0);

  return {
    shopifyOrderId: String(payload.id),
    shopifyOrderNumber: String(payload.order_number),
    customerName,
    customerPhone: customerPhone ?? undefined,
    customerEmail: customerEmail ?? undefined,
    items: payload.line_items.map((item) => ({
      productId: item.product_id ? String(item.product_id) : undefined,
      variantId: item.variant_id ? String(item.variant_id) : undefined,
      title: item.title,
      quantity: item.quantity,
      price: Number(item.price),
    })),
    subtotal: Number(payload.subtotal_price),
    shipping,
    discount: Number(payload.total_discounts),
    total: Number(payload.total_price),
    currency: payload.currency,
  };
}
