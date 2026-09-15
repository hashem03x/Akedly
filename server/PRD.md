# Akedly — Backend MVP PRD

**Product:** Akedly — أكّدلي
**Domain:** akedly.com
**Product Type:** SaaS — Automated E-commerce Order Confirmation
**Document Version:** 1.0
**Status:** MVP Development

---

# 1. Product Overview

Akedly is a SaaS platform that helps e-commerce merchants automatically confirm new customer orders before fulfillment.

The initial MVP focuses on Shopify stores.

When a customer places an order:

1. Shopify sends the order to Akedly through a webhook.
2. Akedly stores the order and customer information.
3. Akedly starts an automated confirmation workflow.
4. Akedly sends the customer a WhatsApp confirmation message.
5. The customer can confirm or cancel the order.
6. If the customer does not respond within a configurable period, Akedly can initiate an automated phone call.
7. The call can use DTMF:

   * Press `1` → Confirm
   * Press `2` → Cancel
8. The order status is updated automatically.
9. The merchant sees the result in the Akedly dashboard.

The architecture must be designed so AI-powered voice conversations can be added without rebuilding the core system.

---

# 2. MVP Goal

The MVP must prove this complete workflow:

```text
Shopify
   ↓
New Order
   ↓
Akedly
   ↓
WhatsApp Confirmation
   ↓
Customer Response
   ↓
Confirmed / Cancelled
   ↓
Merchant Dashboard
```

Optional fallback:

```text
No WhatsApp Response
        ↓
Automated Voice Call
        ↓
Press 1 / Press 2
        ↓
Confirmed / Cancelled
```

The MVP should be usable by a real merchant.

---

# 3. Target Users

## Primary User

E-commerce merchants who receive orders through Shopify and want to reduce:

* Fake orders
* Unconfirmed COD orders
* Customer no-shows
* Manual confirmation calls
* Customer service workload

## Secondary User

Operations/customer-support teams managing large volumes of orders.

---

# 4. MVP Integrations

## Required

### Shopify

Purpose:

* Store connection
* Orders
* Customers
* Products/order items
* Order webhooks

Integration method:

* Shopify OAuth
* Shopify Admin API
* Shopify Webhooks

Required capabilities:

* Connect store
* Receive new orders
* Retrieve order details
* Store Shopify shop information
* Handle webhook verification
* Handle webhook retries/idempotency

---

## WhatsApp

Use:

**Meta WhatsApp Cloud API**

Purpose:

* Send order confirmation messages
* Receive customer responses
* Send interactive confirmation buttons
* Receive webhook events

Initial interaction:

```text
Hello Ahmed,

We received your order from {{store_name}}.

Order total: {{amount}} EGP

Would you like to confirm your order?

[ Confirm Order ]

[ Cancel Order ]
```

The exact wording must be configurable later.

---

## Voice

The architecture must support an external voice provider.

Initial MVP behavior:

```text
Call customer

"Hello Ahmed, this is an automated call from {{store}}.

Your order total is 1,250 Egyptian Pounds.

Press 1 to confirm your order.
Press 2 to cancel your order."
```

DTMF:

```text
1 → CONFIRMED
2 → CANCELLED
```

The voice provider must be abstracted behind an internal service interface.

Do not tightly couple business logic to one provider.

Example:

```typescript
interface VoiceProvider {
  createCall(input: CreateCallInput): Promise<CreateCallResult>;
  getCall(callId: string): Promise<CallResult>;
}
```

The first provider can be implemented later using a provider such as Twilio or another suitable voice platform.

---

# 5. Authentication

The backend must support merchant authentication.

Initial requirements:

* Register
* Login
* Logout
* Authenticated API requests
* Password hashing
* Session/JWT authentication
* Protected routes

The implementation must be secure and production-oriented.

Never store plaintext passwords.

---

# 6. Merchant Model

A merchant represents an Akedly customer.

Example:

```typescript
Merchant {
  id
  name
  email
  passwordHash

  shopify {
    shopDomain
    accessToken
    connectedAt
  }

  whatsapp {
    phoneNumberId
    businessAccountId
    connectedAt
  }

  settings {
    confirmationEnabled
    whatsappEnabled
    voiceFallbackEnabled

    voiceFallbackDelayMinutes

    maxConfirmationAttempts
  }

  createdAt
  updatedAt
}
```

Sensitive credentials must never be returned through normal API responses.

---

# 7. Customer Model

```typescript
Customer {
  id

  merchantId

  name
  phone
  email

  statistics {
    totalOrders
    confirmedOrders
    cancelledOrders
  }

  createdAt
  updatedAt
}
```

Customer uniqueness should be scoped by merchant.

A customer belonging to Merchant A must not be accessible by Merchant B.

---

# 8. Order Model

```typescript
Order {
  id

  merchantId
  customerId

  shopifyOrderId
  shopifyOrderNumber

  customer {
    name
    phone
    email
  }

  items: [
    {
      productId
      variantId
      title
      quantity
      price
    }
  ]

  subtotal
  shipping
  discount
  total
  currency

  status

  confirmation {
    status
    method
    attempts

    lastAttemptAt
    confirmedAt
    cancelledAt
  }

  createdAt
  updatedAt
}
```

Order statuses:

```text
PENDING_CONFIRMATION
CONFIRMED
CANCELLED
EXPIRED
```

Confirmation methods:

```text
WHATSAPP
VOICE
MANUAL
```

---

# 9. Communication Model

All customer communication should be trackable.

```typescript
Communication {
  id

  merchantId
  customerId
  orderId

  channel

  direction

  provider

  externalMessageId

  content

  status

  metadata

  createdAt
}
```

Channels:

```text
WHATSAPP
VOICE
```

Directions:

```text
OUTBOUND
INBOUND
```

Statuses:

```text
PENDING
SENT
DELIVERED
READ
FAILED
```

---

# 10. Conversation Model

The system should maintain conversation history.

```typescript
Conversation {
  id

  merchantId
  customerId
  orderId

  channel

  messages: [
    {
      direction
      content
      type
      externalId
      createdAt
    }
  ]

  createdAt
  updatedAt
}
```

The architecture must support future AI conversation capabilities.

---

# 11. Voice Call Model

```typescript
Call {
  id

  merchantId
  customerId
  orderId

  provider
  externalCallId

  status

  result

  duration

  transcript

  metadata

  startedAt
  completedAt

  createdAt
}
```

Call result:

```text
CONFIRMED
CANCELLED
NO_RESPONSE
FAILED
UNKNOWN
```

---

# 12. Shopify Workflow

When Shopify creates an order:

```text
Shopify
   ↓
POST /webhooks/shopify/orders/create
   ↓
Verify Shopify webhook
   ↓
Check idempotency
   ↓
Find merchant
   ↓
Find/create customer
   ↓
Create order
   ↓
Start confirmation workflow
```

The webhook must be idempotent.

If Shopify sends the same webhook multiple times, Akedly must not create duplicate orders.

---

# 13. WhatsApp Workflow

When confirmation starts:

```text
Order
 ↓
WhatsApp Service
 ↓
Send Template / Interactive Message
 ↓
Store communication
 ↓
Wait for customer response
```

Customer confirms:

```text
WhatsApp Webhook
 ↓
Identify merchant
 ↓
Identify order
 ↓
Validate response
 ↓
Update order
 ↓
CONFIRMED
```

Customer cancels:

```text
WhatsApp Webhook
 ↓
Identify order
 ↓
Update order
 ↓
CANCELLED
```

---

# 14. Voice Fallback

If:

```text
confirmation.status = PENDING
```

and:

```text
currentTime - lastAttemptAt >= voiceFallbackDelay
```

then:

```text
Start Voice Call
```

Example:

```text
WhatsApp sent
        ↓
15 minutes
        ↓
No response
        ↓
Voice call
```

The delay must be configurable.

Do not hard-code `15`.

---

# 15. Voice Call Flow

Initial MVP:

```text
Call customer
      ↓
Greeting
      ↓
Order information
      ↓
"Press 1 to confirm"
"Press 2 to cancel"
      ↓
DTMF
```

If:

```text
1
```

then:

```text
CONFIRMED
```

If:

```text
2
```

then:

```text
CANCELLED
```

If no response:

```text
NO_RESPONSE
```

If invalid input:

The call should ask the customer again.

Maximum retries must be configurable.

---

# 16. Dashboard Requirements

The existing frontend already contains the marketing website.

The backend must expose APIs for the dashboard.

Dashboard should eventually display:

### Overview

```text
Total Orders
Pending Confirmation
Confirmed
Cancelled
Confirmation Rate
```

### Orders

Columns:

```text
Order
Customer
Amount
Status
Confirmation Method
Created
```

Filters:

```text
Status
Date
Confirmation Method
```

### Order Details

Display:

* Customer information
* Order items
* Total
* Confirmation status
* Communication history
* WhatsApp messages
* Voice calls
* Timeline

---

# 17. API Structure

Use versioned APIs:

```text
/api/v1
```

Authentication:

```text
POST /auth/register
POST /auth/login
POST /auth/logout
GET  /auth/me
```

Shopify:

```text
GET  /integrations/shopify/install
GET  /integrations/shopify/callback
GET  /integrations/shopify/status
POST /integrations/shopify/disconnect
```

Orders:

```text
GET /orders
GET /orders/:id
POST /orders/:id/confirm
POST /orders/:id/cancel
POST /orders/:id/retry-confirmation
```

Communications:

```text
GET /orders/:id/communications
```

WhatsApp:

```text
GET  /webhooks/whatsapp
POST /webhooks/whatsapp
```

Voice:

```text
POST /webhooks/voice
POST /calls/:orderId
```

Shopify:

```text
POST /webhooks/shopify/orders/create
POST /webhooks/shopify/orders/updated
```

Dashboard:

```text
GET /dashboard/overview
```

---

# 18. Security Requirements

Mandatory:

* Password hashing
* JWT/session security
* Environment variables
* Shopify webhook HMAC verification
* WhatsApp webhook verification
* Request validation
* Rate limiting
* CORS configuration
* Secure error handling
* No sensitive tokens in logs
* No access to another merchant's data
* Input validation on every public endpoint

Never return:

```text
shopify.accessToken
```

or other provider credentials in API responses.

---

# 19. Idempotency

This is mandatory.

Shopify may retry webhooks.

WhatsApp may retry webhook events.

Voice providers may retry callbacks.

The system must safely handle duplicate events.

Use external IDs / event IDs where appropriate.

Example:

```text
Shopify Order ID
+
Merchant ID
```

must uniquely identify a Shopify order.

---

# 20. Background Jobs

The architecture should support asynchronous jobs.

Examples:

```text
sendWhatsAppConfirmation
startVoiceFallback
processWebhook
updateOrderStatus
```

For the first local MVP, jobs may be implemented simply.

The code should be structured so Redis/BullMQ can be introduced later without rewriting business logic.

---

# 21. Environment Variables

Example:

```env
NODE_ENV=development

PORT=5000

MONGODB_URI=

JWT_SECRET=

SHOPIFY_API_KEY=
SHOPIFY_API_SECRET=
SHOPIFY_SCOPES=

SHOPIFY_APP_URL=

WHATSAPP_ACCESS_TOKEN=
WHATSAPP_PHONE_NUMBER_ID=
WHATSAPP_BUSINESS_ACCOUNT_ID=
WHATSAPP_VERIFY_TOKEN=

VOICE_PROVIDER=
VOICE_API_KEY=
VOICE_PHONE_NUMBER=

FRONTEND_URL=
```

Never commit `.env`.

Provide:

```text
.env.example
```

---

# 22. Error Handling

Use centralized error handling.

Return consistent responses:

```json
{
  "success": false,
  "error": {
    "code": "ORDER_NOT_FOUND",
    "message": "Order not found"
  }
}
```

Success:

```json
{
  "success": true,
  "data": {}
}
```

---

# 23. Logging

Development logs should make workflows easy to debug.

Example:

```text
[SHOPIFY] Webhook received
[SHOPIFY] Order #1042
[ORDER] Created
[WHATSAPP] Sending confirmation
[WHATSAPP] Message sent
[CONFIRMATION] Waiting for response
[VOICE] Fallback triggered
[VOICE] Call started
[VOICE] Customer pressed 1
[ORDER] Confirmed
```

Never log:

* Passwords
* Access tokens
* API keys
* Full sensitive customer data

---

# 24. Project Structure

Recommended:

```text
akedly-backend/

src/
  config/
  controllers/
  routes/
  middleware/
  models/
  services/
  integrations/
    shopify/
    whatsapp/
    voice/
  webhooks/
  jobs/
  utils/
  types/
  app.ts
  server.ts

tests/

.env.example
.gitignore
package.json
README.md
```

Business logic must not be placed directly inside routes.

Use:

```text
Routes
  ↓
Controllers
  ↓
Services
  ↓
Integrations
```

---

# 25. Architecture Principles

The project must follow:

### Separation of concerns

Shopify integration must not contain order business logic.

WhatsApp integration must not directly manipulate MongoDB.

Voice provider code must not contain merchant business rules.

Use services.

Example:

```text
ShopifyWebhookController
        ↓
OrderService
        ↓
ConfirmationService
        ↓
WhatsAppService
```

---

# 26. AI Architecture — Future Ready

AI is not mandatory for the first MVP.

However, the architecture must support:

```text
AI Agent
   ↓
Intent
   ↓
Tool
   ↓
Akedly Service
```

Future tools:

```text
confirm_order()
cancel_order()
get_order()
get_delivery_status()
reschedule_delivery()
```

The AI layer must never directly modify MongoDB.

It must call controlled application services.

---

# 27. MVP Definition of Done

The MVP is complete when a developer can:

1. Start Akedly backend locally.
2. Create an account.
3. Connect a Shopify store.
4. Create a Shopify test order.
5. Shopify sends the webhook.
6. Akedly receives it.
7. Akedly creates the order.
8. Akedly creates/links the customer.
9. Akedly sends a WhatsApp confirmation.
10. Customer confirms.
11. WhatsApp webhook reaches Akedly.
12. Akedly changes the order to `CONFIRMED`.
13. Dashboard can retrieve the order.
14. Communication history is visible.
15. If configured and no response occurs, voice fallback starts.
16. Customer presses `1`.
17. Akedly changes order to `CONFIRMED`.

Cancellation must work through both:

```text
WhatsApp
Voice
```

---

# 28. Out of Scope for MVP

Do NOT build initially:

* WooCommerce
* Bosta integration
* Multiple courier integrations
* AI customer support
* AI analytics
* Advanced billing
* Subscription management
* Team permissions
* Advanced CRM
* Complex automation builder
* Multi-language AI voice
* Predictive analytics
* Advanced reporting

These come after the core confirmation workflow is stable.

---

# 29. Development Priority

Build in this exact order:

```text
1. Backend foundation
2. MongoDB
3. Authentication
4. Merchant model
5. Shopify OAuth
6. Shopify webhook
7. Customer + Order models
8. Confirmation service
9. WhatsApp integration
10. WhatsApp webhook
11. Dashboard APIs
12. Voice provider abstraction
13. Voice implementation
14. Voice webhook
15. Confirmation fallback
16. Testing
17. Production deployment
```

Do not jump ahead.

---

# 30. Product Principle

Akedly is not primarily a messaging application.

The core product is:

> **Automatically turning uncertain e-commerce orders into confirmed orders.**

Every feature should support that goal.
