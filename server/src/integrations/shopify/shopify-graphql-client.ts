import { env } from "../../config/env";
import { AppError } from "../../utils/app-error";

interface GraphQLResponse<T> {
  data?: T;
  errors?: { message: string }[];
}

export async function shopifyGraphQL<T>(
  shop: string,
  accessToken: string,
  query: string,
  variables?: Record<string, unknown>,
): Promise<T> {
  const response = await fetch(`https://${shop}/admin/api/${env.shopifyApiVersion}/graphql.json`, {
    method: "POST",
    headers: {
      "X-Shopify-Access-Token": accessToken,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ query, variables }),
  });

  const payload = (await response.json()) as GraphQLResponse<T>;

  if (!response.ok || payload.errors?.length) {
    throw new AppError(
      502,
      "SHOPIFY_GRAPHQL_ERROR",
      payload.errors?.[0]?.message ?? `Shopify GraphQL request failed with status ${response.status}`,
    );
  }

  if (!payload.data) {
    throw new AppError(502, "SHOPIFY_GRAPHQL_ERROR", "Shopify GraphQL response had no data");
  }

  return payload.data;
}
