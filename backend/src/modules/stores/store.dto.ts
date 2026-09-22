import type { StoreDocument } from "./store.model";

export function toStoreDto(store: StoreDocument) {
  return {
    id: store.id,
    platform: store.platform,
    name: store.name,
    domain: store.domain,
    status: store.status,
    lastConnectionTestAt: store.lastConnectionTestAt,
    lastConnectionError: store.lastConnectionError,
    settings: store.settings,
    createdAt: store.createdAt,
  };
}
