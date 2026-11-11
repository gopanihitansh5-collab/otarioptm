# Intelligent Routing

Own model discovery and the deterministic routing policy (task -> provider
tier) with the fallback chain Otari -> Groq -> demo. Every response must
identify the tier that answered; the demo tier is always labeled
[demo mode ...]. Never fabricate provider responses, savings, token counts,
or latency. Without configured keys, routing truthfully resolves to the
demo tier - present it that way, never as live provider routing.
