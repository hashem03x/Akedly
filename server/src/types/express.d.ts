export {};

declare global {
  namespace Express {
    interface Request {
      /**
       * Set by `authGuard` from the verified JWT's `sub` claim. Every service
       * that scopes data to a merchant must read this — never a client-supplied
       * merchantId from the body/query/params.
       */
      merchantId?: string;

      /**
       * Raw request body bytes, captured by express.json()'s `verify` hook
       * in app.ts. Webhook signature verification (Shopify HMAC, WhatsApp
       * X-Hub-Signature-256) must be computed over these exact bytes, not
       * a re-serialization of the parsed JSON — those are not guaranteed
       * to match byte-for-byte.
       */
      rawBody?: Buffer;
    }
  }
}
