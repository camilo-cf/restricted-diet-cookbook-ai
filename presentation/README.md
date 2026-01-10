# Presentation Tools & Documentation

This folder contains the materials needed to present the **Restricted Diet Cookbook AI** project.

## Contents
- **[slide-outline.md](slide-outline.md)**: A high-level structure for your pitch decks.
- **[demo-script.md](demo-script.md)**: A timed, step-by-step walkthrough of the live application.
- **`assets/`**: (Optional) Folder for UI screenshots or architecture diagrams.

## How to use
1.  **Preparation**: Ensure your local stack is running via `./run.sh dev`.
2.  **Environment**: Verify that `OPENAI_API_KEY` is set in `apps/api/.env` if you want live results, otherwise the system will use the Mock Generator.
3.  **Flow**: Follow the `demo-script.md` for a consistent, professional presentation that hits all the rubric-required features.

## Key Talking Points for Graders
- **Contract-First**: Emphasize how `openapi.yaml` prevents frontend/backend drift.
- **Reliability**: Mention the retry logic and structured logging.
- **Deployment**: Highlight the Render deployment and the storage adapter strategy.
