import { env } from "../../config/env";
import { logger } from "../../utils/logger";
import { shopifyGraphQL } from "./shopify-graphql-client";

const WEBHOOK_SUBSCRIPTION_MUTATION = `
  mutation webhookSubscriptionCreate($topic: WebhookSubscriptionTopic!, $webhookSubscription: WebhookSubscriptionInput!) {
    webhookSubscriptionCreate(topic: $topic, webhookSubscription: $webhookSubscription) {
      webhookSubscription { id }
      userErrors { field message }
    }
  }
`;

interface WebhookSubscriptionCreateResponse {
  webhookSubscriptionCreate: {
    webhookSubscription: { id: string } | null;
    userErrors: { field: string[]; message: string }[];
  };
}

const TOPIC_PATHS: Record<string, string> = {
  ORDERS_CREATE: "/api/v1/webhooks/shopify/orders/create",
  ORDERS_UPDATED: "/api/v1/webhooks/shopify/orders/updated",
};

export async function registerOrderWebhooks(shop: string, accessToken: string): Promise<void> {
  if (!env.shopifyAppUrl) {
    throw new Error("SHOPIFY_APP_URL is not set — cannot register webhooks");
  }

  for (const [topic, path] of Object.entries(TOPIC_PATHS)) {
    const result = await shopifyGraphQL<WebhookSubscriptionCreateResponse>(
      shop,
      accessToken,
      WEBHOOK_SUBSCRIPTION_MUTATION,
      { topic, webhookSubscription: { callbackUrl: `${env.shopifyAppUrl}${path}`, format: "JSON" } },
    );

    const errors = result.webhookSubscriptionCreate.userErrors;
    if (errors.length > 0) {
      logger.error("SHOPIFY", `Failed to register ${topic} webhook`, {
        errors: errors.map((e) => e.message).join("; "),
      });
    } else {
      logger.info("SHOPIFY", `Registered ${topic} webhook for ${shop}`);
    }
  }
}
