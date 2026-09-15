function escapeXml(input: string): string {
  return input
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

export function buildGreetingTwiml(input: { storeName: string; amountText: string; gatherActionUrl: string }): string {
  const greeting = `Hello, this is Akedly calling regarding your order from ${escapeXml(input.storeName)}. Your order total is ${escapeXml(input.amountText)}. Press 1 to confirm your order. Press 2 to cancel your order.`;
  return `<?xml version="1.0" encoding="UTF-8"?>
<Response>
  <Gather input="dtmf" numDigits="1" timeout="8" action="${escapeXml(input.gatherActionUrl)}" method="POST">
    <Say>${greeting}</Say>
  </Gather>
  <Say>We did not receive any input. Goodbye.</Say>
</Response>`;
}

export function buildRetryTwiml(input: { gatherActionUrl: string }): string {
  return `<?xml version="1.0" encoding="UTF-8"?>
<Response>
  <Gather input="dtmf" numDigits="1" timeout="8" action="${escapeXml(input.gatherActionUrl)}" method="POST">
    <Say>Sorry, that was not a valid option. Press 1 to confirm your order. Press 2 to cancel your order.</Say>
  </Gather>
  <Say>We did not receive any input. Goodbye.</Say>
</Response>`;
}

export function buildOutcomeTwiml(message: string): string {
  return `<?xml version="1.0" encoding="UTF-8"?>
<Response>
  <Say>${escapeXml(message)}</Say>
</Response>`;
}
