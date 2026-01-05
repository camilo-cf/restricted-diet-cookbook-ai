# Product Requirements Document: Restricted Diet Cookbook AI

> **Role**: PM + Tech Lead Execution Guide
> **Context**: "Bogotá First" - Solving daily nutrition challenges in a city where specialized ingredients can be hard to find or verify.

---

## 1. Problem Statement

Living with dietary restrictions (celiac, vegan, allergies) in **Bogotá** involves constant cognitive load and risk.
*   **The Pain**: "What can I cook with these random ingredients I found at Carulla/D1?"
*   **The Risk**: Misinterpreting labels or cross-contamination fears lead to repetitive, safe, but boring meals.
*   **The Gap**: Generic recipe apps ignore strict safety constraints or local availability context.
*   **The Opportunity**: An AI partner that visually identifies ingredients and "hallucinates" safe, delicious recipes strictly adhering to user constraints.

## 2. Personas & Jobs-to-be-Done (JTBD)

| Persona | Role | Core Motivation | JTBD |
| :--- | :--- | :--- | :--- |
| **Ana (The Celiac Student)** | Strict Gluten-Free | Safety & Budget | "When I have random leftovers, I want to know exactly what safe meal I can make, so I don't get sick or waste money." |
| **Carlos (The New Vegan)** | Lifestyle Change | Variety & Taste | "When I buy a weird vegetable at Paloquemao, I want a recipe that makes it taste good without dairy/meat, so I stick to my diet." |
| **Peer Reviewer (The Grader)** | Evaluator | Completeness | "When I test this app, I want to see every rubric point (1-12) proven instantly, so I can give a perfect score." |

## 3. RoadMap & Scope

| Phase | Focus | Key Features | Tech Alignment |
| :--- | :--- | :--- | :--- |
| **MVP (Now)** | **"Trust & Utility"** | - Cookie Auth<br>- Wizard (Restrictions -> Photo -> Recipe)<br>- Presigned Uploads<br>- AI Streaming | FastAPI, Next.js, MinIO, OpenAI |
| **Mid-Term** | **"Community"** | - Save Favorites<br>- User Profiles<br>- R2 Migration (Prod)<br>- Share to WhatsApp | Postgres Relational, Social Meta Tags |
| **Long-Term** | **"Discovery"** | - "What's in my fridge" AR<br>- Vector Search for similar recipes<br>- Local ingredient sourcing (Rappi integration) | Vector DB, Mobile Native |

### MVP Scope Boundaries (Strict)
*   **IN**: Mobile web, English UI (codebase standard), standard diets (Vegan, GF, etc.), ingredient photo recognition.
*   **OUT**: Multi-language (localized content only via prompt), social login, native app, nutritional analysis API, shopping lists.

## 4. User Experience (UX)

**Design Philosophy**: Mobile-First, Accessible, "One-Thumb" navigation.

### Sitemap
1.  **Landing (`/`)**: Value prop + "Start Cooking" CTA (Authentication entry).
2.  **Wizard (`/wizard/*`)**:
    *   Step 1: **Restrictions** (Checkbox grid).
    *   Step 2: **Upload** (Camera capture/File picker).
    *   Step 3: **Result** (Recipe card with AI stream).

### Textual Wireframes

**1. Restrictions Step** (`/wizard/restrictions`)
```text
[Header: "What can you eat today?"]
[ ] Vegan     [ ] Gluten-Free
[ ] Keto      [ ] Nut-Free
...
[Floating Action Button: "Next >"]
```
*Accessibility*: Focus management on grid.

**2. Photo Upload** (`/wizard/upload`)
```text
[Header: "Show us what you have"]
[  Upload Area (Dropzone)  ]
[  "Take Photo" Button     ]
[  Progress Bar (0-100%)   ]
(Hidden: Presigned URL fetch -> PUT to Storage)
```

**3. Recipe Stream** (`/wizard/recipe`)
```text
[Thinking... (Skeleton Loader)]
[Title: "Spicy Lentil Arepas"]
[Badge: Vegan] [Badge: GF]
[Image: Your Upload]
--
Ingredients:
- 1 cup Lentils
...
Instructions:
1. Soak lentils...
(Text streams in via SSE)
```

## 5. Functional Requirements & User Stories

### Epics
1.  **E1: Secure Foundation** (Auth, Security)
2.  **E2: Ingestion Pipeline** (Uploads, Validation)
3.  **E3: Core Intelligence** (AI Generation, RAG)

### User Stories (G/W/T)

**US 1.1: Secure Session**
*   **Given** I am on the login page
*   **When** I enter valid credentials
*   **Then** I receive an `httpOnly` cookie and am redirected to the Wizard.
*   **And** browser `localStorage` remains empty of tokens.

**US 2.1: Safe Upload**
*   **Given** I have a photo of ingredients
*   **When** I upload it via the mobile interface
*   **Then** the browser uploads directly to Storage (S3/MinIO) via a presigned URL.
*   **And** the backend validates "Magic Bytes" to confirm it's a real image before processing.

**US 3.1: Personalized Recipe**
*   **Given** I selected "Vegan" and uploaded a picture of "Avocados"
*   **When** I request a recipe
*   **Then** the AI generates a recipe specifically using Avocados AND excluding all animal products.
*   **And** the response streams text to reduce perceived latency.

## 6. Non-Functional Requirements (NFRs)

### Security (The "Locked" List)
1.  **Auth**: `httpOnly`, `SameSite=Lax` cookies. No JWTs in client JS.
2.  **CSRF**: Anti-CSRF token header required for state-changing methods OR standard browser protections documented.
3.  **Rate Limiting**:
    *   `/uploads/presign`: 10 req/min (prevent storage spam).
    *   `/ai/generate`: 5 req/min (cost control).
4.  **Privacy**: Images strictly associated with `session_id/user_id`.

### Performance
1.  **LCP (Largest Contentful Paint)**: < 2.5s on 4G.
2.  **AI TTB (Time to First Byte)**: < 1.0s (Streaming required).
3.  **Upload**: Resumable/robust for spotty Bogotá mobile data.

### Accessibility (A11y)
1.  **ARIA-Live**: Announce "Uploading...", "Recipe Generating..." status changes.
2.  **Keyboard**: Full tab navigation for forms.
3.  **Contrast**: WCAG AA compliance.

### Observability
1.  **Correlation**: Every log line has `request_id`.
2.  **Headers**: `X-Request-Id` returned to client.
3.  **Metrics**: Track `ai_latency`, `upload_failures`, `token_usage`.

## 7. Risks & Mitigations

| Risk | Prob | Impact | Mitigation |
| :--- | :--- | :--- | :--- |
| **OpenAI Cost Spikes** | Med | High | Hard limit on daily spend ($5). Rate limiting. Caching (optional). |
| **Slow Mobile Internet** | High | Med | Optimistic UI updates. Skeleton screens. Small upload max size (8MB). |
| **AI "Hallucination" (Unsafe)**| Low | High | System Prompt: "You are a safety-critical nutritionist." Disclaimer in UI. |
| **Rubric Miss** | Low | High | **Pre-flight Checklist** mapping every artifact to criterion. |

## 8. Rubric Maximization Checklist (Execution)

| Criterion (1-12) | Deliverable / Proof | Status |
| :--- | :--- | :--- |
| 1. Problem | This PRD (`docs/PRD.md`) + README | ✅ Pending |
| 2. AI/RAG | Streaming Endpoint + System Prompt | ⏳ In Progress |
| 3. Evaluation | `evals/` script comparing AI output vs Constraints | ⏳ Planned |
| 4. Interface | Next.js Wizard (Responsive) | ⏳ Planned |
| 5. Ingestion | Presigned URLs + Magic Byte Validation | ⏳ Planned |
| 6. Monitoring | JSON Logs + Request IDs | ⏳ Planned |
| 7. Reproducibility| `docker-compose up` (One command) | ✅ Done |
| 8. Code Quality | Ruff/MyPy/ESLint (Strict) | ✅ Setup |
| 9. Tests | 80% Cov (Backend) + Critical Paths (Front) | ⏳ Planned |
| 10. Deployment | Render URL (Healthcheck 200) | ⏳ Planned |
| 11. Best Practices| OpenAPI Contract-First | ✅ Done |
| 12. Documentation | ADRs + API Docs (Swagger) | ⏳ Planned |

---
**Approval**:
*   [x] Project Charter
*   [ ] PRD Review (Current)
