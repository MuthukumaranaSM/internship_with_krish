# ✈️ Travel Planner 360: API Migration Strategy

This document outlines the formal plan for migrating consumer traffic from the legacy V1 search endpoint to the resilient V2 search endpoint. We are combining the **Strangler Pattern** for code coexistence with a **Canary Deployment** model for safe, risk-managed traffic shifting.

---

## Rollout Plan - API Version Migration (V1 → V2)

| Strategy | Goal | Status in Deployment |
| :--- | :--- | :--- |
| **Strangler Pattern** | Run V1 and V2 logic side-by-side to maintain zero downtime. | **Completed** (Endpoints `/v1/trips/search` and `/v2/trips/search` are active). |
| **Canary Deployment** | Gradually shift small amounts of real-world traffic to the new V2 code path. | **Monitored** (Tracking occurs via the `/metrics` endpoint). |

### 🌟 Version Overview

| Version | Services Included | Contract Change | Sample Response (Output) |
| :--- | :--- | :--- | :--- |
| **✔ Version 1** | Flight, Hotel | Baseline | `{ flights: [...], hotels: [...], "degraded": false }` |
| **✔ Version 2** | Flight, Hotel, **Weather** | **Additive** (Backward compatible) | `{ flights: [...], hotels: [...], **weather**: {...} }` |

### 💡 Phase 1: Parallel Deployment (Code Coexistence)

* **Action:** Both V1 and V2 codebases are running concurrently in the Aggregator.
* **Result:** The V2 endpoint is exposed to testing and specific consumers. No immediate impact or disruption occurs for existing V1 consumers.

### 💡 Phase 2: Traffic Monitoring and Canary Start

This phase begins testing V2 in a live production environment with real traffic.

* **Canary Start:** Begin routing a small percentage of traffic (e.g., **5-10%**) to V2. This is often done by targeting specific internal groups or premium users.
* **Safety Net:** The **Circuit Breaker** (Part C) is active. If V2's call to the Weather Service causes instability, the breaker trips, protecting the majority of traffic and returning a fast, safe fallback.
* **Key Monitoring:**
    * Error Rate and Latency of V2.
    * **Weather Service Failure:** Observing how often the Breaker trips/recovers.
    * Response Consistency (ensuring data integrity).
* **Rollback:** Any major instability triggers an immediate rollback to 100% V1 traffic routing.

### 💡 Phase 3: Gradual Traffic Shift

Traffic is increased in controlled steps only if the previous phase showed stability and performance consistency.

| Rollout Step | % to V2 Traffic | % to V1 Traffic | Metric Monitored |
| :--- | :--- | :--- | :--- |
| **Start** | 5–10% | 90–95% | V2 Error Rate |
| **Step 2** | 25% | 75% | Latency/Performance |
| **Step 3** | 50% | 50% | Resource Usage |
| **Step 4** | 75% | 25% | Final Stability |

### 💡 Phase 4: Make V2 Default (95% Traffic)

* **Status:** V2 is now the default and handles almost all live requests.
* **Goal:** The Deprecation Warning period begins. New integrations are strictly instructed to use V2 only.
* **Deprecation Header Example:** Legacy clients may receive warning headers like:
    ```
    Deprecation: true
    Sunset: 2026-06-01
    Use: /v2/trips/search
    ```

### 💡 Phase 5: Sunset & Retirement of V1 (Contract Phase)

* **Triggered When:** V2 reaches $\mathbf{95\%}$ adoption and the monitoring confirms no critical errors.
* **V1 Shutdown Date:** 2026-06-01 (Target).
* **Action for Removal:**
    1.  The **V1 endpoint definition** (`@Get('v1/trips/search')`) is physically removed from the Aggregator's Controller.
    2.  The V1 logic (`scatterGatherSearchV1`) is deleted.
* **Final Client Response:** After retirement, V1 URLs will return an official error status: **410 Gone** or **404 Not Found**.
```eof