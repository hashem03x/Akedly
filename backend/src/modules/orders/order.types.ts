export interface NormalizedOrderItem {
  name: string;
  quantity: number;
  price: number;
}

export interface NormalizedOrderInput {
  externalOrderId: string;
  orderNumber: string;
  customer: {
    name: string;
    phone: string;
    email?: string;
  };
  items: NormalizedOrderItem[];
  subtotal: number;
  shipping: number;
  total: number;
  currency: string;
}
