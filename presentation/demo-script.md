# Demo Script: Restricted Diet Cookbook AI (5-7 Minutes)

## Pre-Flight Checklist
- [ ] Database migrated and running.
- [ ] OpenAI API Key configured (or using Mock Mode).
- [ ] Browser open at `localhost:3000`.

---

## 1. Intro & Landing (1 Min)
- **Action**: Open home page.
- **Script**: "Welcome to the Restricted Diet Cookbook AI. Our goal is to eliminate the 'safety anxiety' for people with strict dietary needs. Let's start a new recipe."
- **Action**: Click 'Create Recipe'.

## 2. Setting Constraints (1 Min)
- **Action**: Select "Vegan" and "Gluten-Free". Type "Keto" in additional notes.
- **Script**: "We start by defining the perimeter. These are hard constraints. The AI model is specifically prompted to treat these as safety-critical."

## 3. Ingredient Ingestion (1.5 Mins)
- **Action**: Drag an image into the upload box (or click to browse).
- **Script**: "Instead of manual typing, we can ingest data visually. Here we're using S3 presigned URLs for a secure, direct-to-bucket upload. This minimizes backend load and ensures security."
- **Verification**: Point to the progress bar.

## 4. Generation & Result (1.5 Mins)
- **Action**: Click 'Generate Recipe'.
- **Script**: "Now, our FastAPI backend orchestrates the request to GPT-4o. Note the skeleton loader—we prioritize UX while the model streams the structured output (Ingredients, Steps, Nutrition)."
- **Observation**: Show the final recipe card. Highlight that it respects the "Vegan" and "Keto" constraints.

## 5. Technical Provenance (1 Min)
- **Action**: Open `/health` or a terminal showing Logs.
- **Script**: "Behind the scenes, we're monitoring everything. Notice the structured JSON logs in the console—each request has a unique ID for end-to-end tracing. Also, our system is self-healing; if the storage layer is down, the health check reflects it immediately."

## 6. Closing (0.5 Min)
- **Script**: "This project demonstrates a production-grade monorepo, a strict OpenAPI contract, and a robust CI/CD pipeline. Thank you!"

---

## Backup Plan
- **If AI fails**: Mention the built-in 'Mock Mode' which provides a high-quality fallback recipe instantly.
- **If Upload fails**: Use the manual ingredient input fallback.
