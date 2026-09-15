export const ORDER_STATUSES = ["PENDING_CONFIRMATION", "CONFIRMED", "CANCELLED", "EXPIRED"] as const;
export type OrderStatus = (typeof ORDER_STATUSES)[number];

export const CONFIRMATION_METHODS = ["WHATSAPP", "VOICE", "MANUAL"] as const;
export type ConfirmationMethod = (typeof CONFIRMATION_METHODS)[number];

export const CHANNELS = ["WHATSAPP", "VOICE"] as const;
export type Channel = (typeof CHANNELS)[number];

export const DIRECTIONS = ["OUTBOUND", "INBOUND"] as const;
export type Direction = (typeof DIRECTIONS)[number];

export const COMMUNICATION_STATUSES = ["PENDING", "SENT", "DELIVERED", "READ", "FAILED"] as const;
export type CommunicationStatus = (typeof COMMUNICATION_STATUSES)[number];

export const CONFIRMATION_ATTEMPT_STATUSES = ["PENDING", "COMPLETED", "FAILED"] as const;
export type ConfirmationAttemptStatus = (typeof CONFIRMATION_ATTEMPT_STATUSES)[number];

export const CONFIRMATION_RESULTS = ["CONFIRMED", "CANCELLED", "NO_RESPONSE", "FAILED", "UNKNOWN"] as const;
export type ConfirmationResult = (typeof CONFIRMATION_RESULTS)[number];

export const CALL_RESULTS = CONFIRMATION_RESULTS;
export type CallResult = ConfirmationResult;

export const WEBHOOK_PROVIDERS = ["SHOPIFY", "WHATSAPP", "VOICE"] as const;
export type WebhookProvider = (typeof WEBHOOK_PROVIDERS)[number];

export const WEBHOOK_EVENT_STATUSES = ["RECEIVED", "PROCESSED", "FAILED"] as const;
export type WebhookEventStatus = (typeof WEBHOOK_EVENT_STATUSES)[number];
