# SeatFlow AI Feature Proposals

## Context

SeatFlow is a flash-sale ticket booking platform with a mature backend (FastAPI, PostgreSQL, Redis, RabbitMQ, Celery, Stripe) and frontend (Next.js 15, TypeScript, Tailwind). The platform handles concurrent reservations with distributed locking, payment processing, event management, and admin analytics.

Below are three AI-powered features ranked by business impact and feasibility. Each feature integrates naturally into the existing architecture without requiring a rewrite.

---

## Feature 1: AI-Powered Dynamic Pricing Engine

### Why This Matters

Flash sales live and die by pricing. Currently, SeatFlow uses static prices set at event creation time. This leaves money on the table when demand spikes, and leaves seats empty when demand is low. Airlines and hotels solved this decades ago — a ticketing platform should too.

### What It Does

An ML-driven pricing engine that adjusts ticket prices in real-time based on demand signals, historical patterns, and market conditions. Prices go up as inventory shrinks and time-to-event decreases; prices soften when sales are slow.

### Pricing Signals (Inputs)

| Signal | Source | Weight |
|--------|--------|--------|
| Current inventory velocity (% sold per hour) | `BookingDAO` + `EventDAO` queries | High |
| Time remaining to event | `Event.datetime` | High |
| Historical demand for similar events (category, venue, day-of-week) | Past `Booking` records | Medium |
| Current reservation count vs. available tickets | `TicketDAO.status` aggregation | High |
| Day-of-week and time-of-day patterns | Booking timestamps | Medium |
| Price elasticity from past events | Historical `Payment.amount` vs. `Booking` volume | Medium |

### Architecture

```
┌─────────────────────────────────────────────────────────┐
│                    Frontend                              │
│  Event detail page shows: "Price may change · 12 left"  │
│  Live price badge with demand indicator                 │
└────────────────────────┬────────────────────────────────┘
                         │ REST API
┌────────────────────────▼────────────────────────────────┐
│                    Backend API                           │
│                                                          │
│  seatflow/web/api/pricing/views.py                      │
│    GET  /v1/pricing/events/{id} → current dynamic price │
│    GET  /v1/pricing/events/{id}/history  → price trend  │
│                                                          │
│  seatflow/services/pricing/pricing_service.py           │
│    ├── PricingService.get_dynamic_price(event_id)       │
│    ├── PricingService.update_prices_batch()             │
│    └── PricingService.get_demand_forecast(event_id)     │
│                                                          │
│  seatflow/services/pricing/strategy_engine.py           │
│    ├── DemandBasedStrategy  (inventory velocity)        │
│    ├── TimeDecayStrategy     (time-to-event curve)      │
│    ├── HistoricalStrategy    (similar event patterns)   │
│    └── CompositeStrategy     (weighted blend)           │
│                                                          │
│  seatflow/db/dao/pricing_dao.py                         │
│    └── CRUD for PriceHistory model                      │
│                                                          │
│  seatflow/db/models/pricing.py                          │
│    └── PriceHistory(event_id, old_price, new_price,     │
│         strategy, reason, demand_score, created_at)     │
└────────────────────────┬────────────────────────────────┘
                         │
┌────────────────────────▼────────────────────────────────┐
│              Celery Background Task                      │
│                                                          │
│  seatflow/tasks/pricing_tasks.py                        │
│    ├── recalculate_prices()     — runs every 5 min      │
│    ├── train_demand_model()     — nightly retraining     │
│    └── publish_price_updates()  → Redis pub/sub         │
└─────────────────────────────────────────────────────────┘
```

### Pricing Model Options

**Phase 1 — Rule-Based with Heuristics (Ship Fast)**
- Weighted scoring formula combining demand velocity, time decay, and inventory ratio
- Configurable bounds: `min_price` and `max_price` per event (admin sets floor/ceiling)
- No ML model needed — pure math based on observable signals
- Example: `adjusted_price = base_price × demand_multiplier × time_multiplier × inventory_multiplier`

**Phase 2 — ML-Based (Iterate)**
- Train a regression model (XGBoost or LightGBM) on historical booking data
- Features: event category, venue, day-of-week, price point, time-to-event, inventory ratio
- Target: optimal price that maximizes revenue (derived from historical sell-through rates)
- Retrain nightly via Celery Beat task
- Store model artifact in `seatflow/ml/models/`

### Integration Points with Existing Code

1. **`BookingService.create_reservation()`** — After successful reservation, publish a `PriceRecalculationRequested` event via RabbitMQ
2. **`EventService`** — Add `current_price` computed field, cache in Redis with 5-min TTL
3. **`TicketDAO`** — Add `get_inventory_velocity(event_id, window_minutes=60)` method
4. **Admin API** — New endpoints for pricing config: set min/max bounds, enable/disable dynamic pricing per event, view price history chart
5. **Frontend** — `EventCard` and event detail page fetch live price from `/v1/pricing/events/{id}`

### Business Rules & Safety Rails

- Admin sets `min_price` and `max_price` per event — the engine never exceeds these bounds
- Price changes are capped at ±15% per recalculation cycle to avoid shocking users
- Users see the price at reservation time — once reserved, the price is locked for 5 minutes
- All price changes are logged in `PriceHistory` for audit
- Dynamic pricing can be disabled per-event (defaults to static price)

### New Models / Migrations

```python
# seatflow/db/models/pricing.py
class PriceHistory(Base):
    event_id: FK → events
    old_price: Decimal
    new_price: Decimal
    strategy: str           # "demand", "time_decay", "composite", "ml"
    reason: str             # "high_demand_12_left", "slow_sales_3hr_to_event"
    demand_score: float     # 0.0 - 1.0
    inventory_ratio: float  # available / total
    created_at: datetime

class PricingConfig(Base):
    event_id: FK → events   # one-to-one
    dynamic_pricing_enabled: bool = True
    min_price: Decimal
    max_price: Decimal
    max_change_percent: float = 15.0
    strategy: str = "composite"
```

### Files to Create / Modify

| Action | Path |
|--------|------|
| Create | `seatflow/services/pricing/` (service package) |
| Create | `seatflow/db/models/pricing.py` |
| Create | `seatflow/db/dao/pricing_dao.py` |
| Create | `seatflow/web/api/pricing/` (endpoints + schemas) |
| Create | `seatflow/tasks/pricing_tasks.py` |
| Create | `frontend/src/hooks/useDynamicPrice.ts` |
| Modify | `seatflow/services/booking/` — publish pricing event on reservation |
| Modify | `seatflow/services/event/` — add current_price to event response |
| Modify | `frontend/src/components/EventCard.tsx` — live price badge |
| Modify | `frontend/src/app/events/[id]/page.tsx` — dynamic price display |
| Modify | Admin dashboard — pricing configuration panel |

---

## Feature 2: AI-Powered Fraud Detection & Bot Prevention

### Why This Matters

Flash sales are prime targets for scalpers and bots. A single bot can scoop up tickets in milliseconds, reselling them at 3-5x markup. Current SeatFlow has rate limiting and Redis locks, but no behavioral analysis. Without fraud detection, the platform fails its core promise: fair access to limited inventory.

### What It Does

A real-time scoring system that evaluates every reservation request for fraud signals. Suspicious requests get blocked, challenged (CAPTCHA), or flagged for admin review. The system learns from confirmed fraud cases over time.

### Fraud Signals (Inputs)

| Signal | Detection Method |
|--------|-----------------|
| Request velocity (same user/IP in short window) | Redis counter with sliding window |
| Booking pattern anomaly (always max tickets, always new events) | Statistical deviation from user baseline |
| Account age vs. activity (brand new account, immediate high-value booking) | User model metadata |
| IP geolocation mismatch (account in NY, booking from VPN endpoint) | IP → geolocation lookup |
| Device fingerprint consistency | Browser fingerprint hash |
| Payment method reuse across many accounts | Stripe metadata correlation |
| Sequential booking timing (bot-like precision) | Inter-request time analysis |

### Architecture

```
┌─────────────────────────────────────────────────────────┐
│                    Frontend                              │
│  Transparent to legitimate users                         │
│  Suspicious users see: CAPTCHA challenge / queue page    │
└────────────────────────┬────────────────────────────────┘
                         │
┌────────────────────────▼────────────────────────────────┐
│                 Middleware Layer                         │
│                                                          │
│  seatflow/web/middleware/fraud_detection.py              │
│    ├── FraudDetectionMiddleware                          │
│    │   └── Intercepts POST /v1/reservations             │
│    │   └── Calls FraudDetectionService.score_request()  │
│    │   └── if score > THRESHOLD → block/challenge/flag  │
│    └── DeviceFingerprintMiddleware                       │
│        └── Captures fingerprint hash from request header │
└────────────────────────┬────────────────────────────────┘
                         │
┌────────────────────────▼────────────────────────────────┐
│              Fraud Detection Service                     │
│                                                          │
│  seatflow/services/fraud/fraud_service.py               │
│    ├── FraudDetectionService                             │
│    │   ├── score_request(request_context) → RiskScore   │
│    │   ├── record_outcome(reservation_id, is_fraud)     │
│    │   └── get_user_risk_profile(user_id)               │
│    │                                                     │
│    │   Scoring Pipeline:                                │
│    │   1. VelocityCheck      → Redis (fast, <5ms)      │
│    │   2. BehaviorAnalysis   → DB query (moderate)     │
│    │   3. IPReputationCheck  → External API             │
│    │   4. MLModelScoring     → Local model (if trained) │
│    │   5. CompositeScore     → Weighted final score     │
│    │                                                     │
│  seatflow/services/fraud/rule_engine.py                 │
│    ├── VelocityRule          (request rate limits)      │
│    ├── AccountAgeRule        (new account behavior)     │
│    ├── PatternRule           (sequential timing)        │
│    └── GeoAnomalyRule        (location mismatch)       │
│                                                          │
│  seatflow/services/fraud/ml_scorer.py                   │
│    └── Trained on historical fraud labels               │
│        (Phase 2 — after accumulating labels)            │
└────────────────────────┬────────────────────────────────┘
                         │
┌────────────────────────▼────────────────────────────────┐
│              Data & Storage                              │
│                                                          │
│  seatflow/db/models/fraud.py                            │
│    ├── FraudScoreLog                                    │
│    │   (reservation_id, user_id, score, signals,        │
│    │    action_taken, created_at)                        │
│    ├── UserRiskProfile                                  │
│    │   (user_id, risk_level, total_bookings,            │
│    │    fraud_flags, trusted_since)                      │
│    └── BlockedEntity                                    │
│        (ip_hash, fingerprint_hash, reason, blocked_at)  │
│                                                          │
│  Redis Keys:                                            │
│    fraud:velocity:{user_id}     → request counter       │
│    fraud:velocity:{ip_hash}     → IP counter            │
│    fraud:blocked:{ip_hash}      → blocked IPs           │
└─────────────────────────────────────────────────────────┘
```

### Scoring Model

**Phase 1 — Rule-Based Scoring (Ship Fast)**

Each rule returns a score from 0.0 (safe) to 1.0 (fraudulent):

```python
def score_request(self, context: RequestContext) -> RiskScore:
    scores = {}

    # Velocity: >5 reservation attempts in 10 min → high risk
    scores["velocity"] = self.velocity_rule.evaluate(context)

    # Account age: <1 hour old + attempting booking → moderate risk
    scores["account_age"] = self.account_age_rule.evaluate(context)

    # Pattern: inter-request time <200ms (bot speed) → high risk
    scores["pattern"] = self.pattern_rule.evaluate(context)

    # Geo: IP country ≠ account country → low-moderate risk
    scores["geo"] = self.geo_rule.evaluate(context)

    # Weighted composite
    final_score = weighted_average(scores, weights=self.rule_weights)

    return RiskScore(
        score=final_score,
        action=self._determine_action(final_score),
        signals=scores,
    )
```

| Score Range | Action |
|-------------|--------|
| 0.0 – 0.3 | Allow (legitimate) |
| 0.3 – 0.6 | Challenge (show CAPTCHA / verification) |
| 0.6 – 0.8 | Flag (allow but log for admin review) |
| 0.8 – 1.0 | Block (reject request, add to watchlist) |

**Phase 2 — ML Enhancement (Iterate)**
- After accumulating labeled data (admin confirms/rejects fraud flags), train a classifier
- Use XGBoost or a simple neural network on the rule scores + raw features
- Online learning: model updates with each admin decision
- A/B test ML scores vs. rule scores before full rollout

### Integration Points with Existing Code

1. **`BookingService.create_reservation()`** — Call `FraudDetectionService.score_request()` before acquiring the Redis lock. If blocked, raise `FraudDetectedError`.
2. **`web/middleware/`** — Add `FraudDetectionMiddleware` that enriches `request.state` with risk context
3. **Admin API** — New endpoints: `/v1/admin/fraud/scores`, `/v1/admin/fraud/blocked`, `/v1/admin/fraud/review-queue`
4. **Admin Dashboard** — Fraud review queue, risk score distribution chart, blocked entities management
5. **Celery Task** — Periodic cleanup of expired velocity counters and old fraud logs

### Safety & Fairness Considerations

- Never block based on a single signal — require composite score above threshold
- All blocked users can appeal via admin review
- False positive rate target: <2% for legitimate users
- Score logging is auditable — admin can see exactly why a request was flagged
- IP blocking uses hashed IPs, not raw IPs (privacy)

### Files to Create / Modify

| Action | Path |
|--------|------|
| Create | `seatflow/services/fraud/` (service package) |
| Create | `seatflow/db/models/fraud.py` |
| Create | `seatflow/db/dao/fraud_dao.py` |
| Create | `seatflow/web/middleware/fraud_detection.py` |
| Create | `seatflow/web/api/admin/fraud_views.py` |
| Create | `seatflow/tasks/fraud_tasks.py` |
| Create | `frontend/src/app/admin/fraud/` (review queue page) |
| Create | `frontend/src/components/FraudScoreBadge.tsx` |
| Modify | `seatflow/services/booking/` — add fraud check before reservation |
| Modify | `seatflow/web/application.py` — register fraud middleware |
| Modify | `seatflow/web/api/admin/views.py` — add fraud admin endpoints |

---

## Feature 3: AI Booking Assistant (RAG-Powered)

### Why This Matters

Users browsing events often have questions: "Is there parking at the venue?", "Can I get a refund?", "What sections are available?" Currently, they must navigate FAQ pages or contact support. An AI assistant that answers questions grounded in actual event data, booking policies, and venue information directly on the event page would dramatically reduce friction and increase conversion.

### What It Does

A conversational AI assistant embedded in the event detail page and checkout flow. It uses Retrieval-Augmented Generation (RAG) to answer user questions based on real event data, venue information, booking policies, and FAQs — not generic AI hallucinations.

### Architecture

```
┌─────────────────────────────────────────────────────────┐
│                    Frontend                              │
│                                                          │
│  ChatWidget component (bottom-right floating)           │
│  ├── Event page: pre-loaded with event context          │
│  ├── Checkout page: pre-loaded with booking context     │
│  └── General: homepage-level assistance                 │
│                                                          │
│  Messages:                                               │
│    User → "Are there VIP seats left?"                    │
│    Bot  → "Yes! There are 8 VIP seats available in      │
│            Section A, Rows 1-3, priced at $150 each.    │
│            Want me to help you reserve one?"             │
└────────────────────────┬────────────────────────────────┘
                         │ WebSocket / REST
┌────────────────────────▼────────────────────────────────┐
│                 Chat API                                 │
│                                                          │
│  seatflow/web/api/chat/views.py                         │
│    POST /v1/chat/message                                │
│      → { message, event_id?, booking_id?, context }     │
│    GET  /v1/chat/history/{session_id}                   │
│    POST /v1/chat/session  → create new session          │
│                                                          │
│  seatflow/web/api/chat/schemas.py                       │
│    ChatMessage, ChatResponse, ChatSession               │
└────────────────────────┬────────────────────────────────┘
                         │
┌────────────────────────▼────────────────────────────────┐
│              Chat Service (RAG Pipeline)                 │
│                                                          │
│  seatflow/services/chat/chat_service.py                 │
│    ├── ChatService                                      │
│    │   ├── process_message(session_id, message)         │
│    │   ├── retrieve_context(message, event_id)          │
│    │   ├── build_prompt(message, context)               │
│    │   └── stream_response(prompt) → AsyncGenerator     │
│    │                                                     │
│  seatflow/services/chat/context_retriever.py            │
│    │   ├── Retrieves relevant data:                     │
│    │   │   1. Event details (title, venue, datetime)    │
│    │   │   2. Ticket availability (sections, prices)    │
│    │   │   3. Booking policies (refund, cancellation)   │
│    │   │   4. FAQ entries (from knowledge base)         │
│    │   │   5. Venue information (parking, accessibility)│
│    │   └── Uses semantic search (embeddings) over docs  │
│    │                                                     │
│  seatflow/services/chat/prompt_builder.py               │
│    │   └── Constructs prompt with:                      │
│    │       - System role (SeatFlow assistant persona)   │
│    │       - Retrieved context (event data, policies)   │
│    │       - Conversation history (last 10 messages)    │
│    │       - User message                               │
│    │                                                     │
│  seatflow/services/chat/llm_provider.py                 │
│    └── Abstraction over LLM provider:                   │
│        ├── OpenAIProvider (GPT-4o / GPT-4o-mini)       │
│        ├── AnthropicProvider (Claude Sonnet)            │
│        └── LocalProvider (Ollama / llama.cpp for dev)   │
│                                                          │
│  seatflow/services/chat/knowledge_base.py               │
│    ├── FAQ entries stored in DB                          │
│    ├── Booking policies (from config)                    │
│    ├── Venue information (linked to events)              │
│    └── Vector embeddings for semantic search             │
└────────────────────────┬────────────────────────────────┘
                         │
┌────────────────────────▼────────────────────────────────┐
│              Data & Storage                              │
│                                                          │
│  seatflow/db/models/chat.py                             │
│    ├── ChatSession(user_id, event_id, created_at)       │
│    ├── ChatMessage(session_id, role, content, tokens)   │
│    └── KnowledgeEntry(category, question, answer,       │
│         embedding_vector, tags)                          │
│                                                          │
│  Redis:                                                 │
│    chat:session:{id}  → conversation history cache      │
│    chat:rate:{user_id} → rate limit counter             │
│                                                          │
│  Vector Store (for semantic search):                    │
│    Option A: pgvector extension on PostgreSQL            │
│    Option B: Separate Qdrant / ChromaDB instance        │
└─────────────────────────────────────────────────────────┘
```

### RAG Pipeline Flow

```
User message: "Can I still get 2 seats together for the concert tonight?"

    ┌──────────────────────────────┐
    │ 1. Intent Classification     │
    │    → ticket_availability     │
    └──────────────┬───────────────┘
                   │
    ┌──────────────▼───────────────┐
    │ 2. Context Retrieval         │
    │    → EventDAO.get_by_id()    │
    │    → TicketDAO.get_available │
    │    → FAQ: "group seating"    │
    │    → Policy: "same-day book" │
    └──────────────┬───────────────┘
                   │
    ┌──────────────▼───────────────┐
    │ 3. Prompt Construction       │
    │    System: You are SeatFlow  │
    │    Context: {retrieved data} │
    │    History: {last 5 msgs}    │
    │    User: {current message}   │
    └──────────────┬───────────────┘
                   │
    ┌──────────────▼───────────────┐
    │ 4. LLM Generation            │
    │    → Streamed response       │
    │    → Grounded in real data   │
    └──────────────┬───────────────┘
                   │
    ┌──────────────▼───────────────┐
    │ 5. Response + Actions        │
    │    Text: "Yes! There are 12  │
    │    seats left in Section B.  │
    │    Rows 5-8 have adjacent    │
    │    pairs available."         │
    │    Action: [Reserve Now]     │
    └──────────────────────────────┘
```

### LLM Provider Strategy

| Environment | Provider | Model | Cost |
|-------------|----------|-------|------|
| Development | Local (Ollama) | llama3.2 / mistral | Free |
| Staging | OpenAI | GPT-4o-mini | ~$0.15/1M tokens |
| Production | OpenAI or Anthropic | GPT-4o / Claude Sonnet | ~$2.50/1M tokens |

The `LLMProvider` abstraction in `llm_provider.py` means you can swap providers without touching the service logic.

### Key Design Decisions

1. **Streaming responses** — Use Server-Sent Events (SSE) so the user sees the response building in real-time (better UX, perceived latency is lower)
2. **Context window management** — Only include last 10 messages + relevant retrieved context to stay within token limits
3. **Rate limiting** — 20 messages per session, max 5 sessions per user per day (prevent abuse)
4. **No PII in prompts** — Strip email, phone, payment info before sending to LLM
5. **Grounded responses only** — System prompt explicitly instructs: "Only answer based on the provided context. If you don't know, say so."
6. **Actionable responses** — Chat can return structured actions (e.g., "Reserve Now" button that triggers the reservation flow)

### Integration Points with Existing Code

1. **`EventService`** — Chat service calls `EventDAO` and `TicketDAO` to retrieve real-time event data
2. **`BookingService`** — Chat can initiate reservation flow by returning a reservation intent
3. **`AuthService`** — Chat sessions are tied to authenticated users (optional: anonymous with rate limits)
4. **Frontend** — `ChatWidget` component floats on event detail and checkout pages
5. **Admin** — FAQ management in admin panel (`/admin/chat/faq`), chat analytics

### Knowledge Base Content

Pre-populate with:
- Booking policies (cancellation, refund, transfer)
- Payment methods and processing
- Flash sale mechanics (reservation hold, expiration)
- Venue-specific information (per event)
- Common troubleshooting (payment failed, reservation expired)

Admin can add/edit FAQ entries via admin panel. Each entry gets auto-embedded for semantic search.

### Files to Create / Modify

| Action | Path |
|--------|------|
| Create | `seatflow/services/chat/` (service package) |
| Create | `seatflow/db/models/chat.py` |
| Create | `seatflow/db/dao/chat_dao.py` |
| Create | `seatflow/web/api/chat/` (endpoints + schemas) |
| Create | `seatflow/tasks/chat_tasks.py` (session cleanup, embedding updates) |
| Create | `frontend/src/components/chat/ChatWidget.tsx` |
| Create | `frontend/src/components/chat/ChatMessage.tsx` |
| Create | `frontend/src/hooks/useChat.ts` |
| Create | `frontend/src/app/admin/chat/` (FAQ management) |
| Modify | `seatflow/config.py` — add LLM provider config |
| Modify | `seatflow/web/application.py` — register chat routes |
| Modify | `frontend/src/app/events/[id]/page.tsx` — embed ChatWidget |
| Modify | `frontend/src/app/checkout/` — embed ChatWidget |

---

## Implementation Priority Recommendation

| Priority | Feature | Impact | Effort | Dependencies |
|----------|---------|--------|--------|-------------|
| 1st | Dynamic Pricing | Direct revenue impact | Medium (2-3 weeks) | None — purely internal |
| 2nd | Fraud Detection | Platform integrity | Medium (2-3 weeks) | None — purely internal |
| 3rd | AI Booking Assistant | User experience | High (3-4 weeks) | External LLM provider |

Dynamic pricing and fraud detection are independent — they can be built in parallel. The AI assistant requires an external LLM provider and more frontend work, so it's best as the third feature.

All three features follow the same pattern: start with rules/heuristics (Phase 1), then iterate with ML (Phase 2). This lets you ship value fast and improve with data over time.
