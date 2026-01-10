# ADR 0001: Contract-First OpenAPI + Generated Client

## Status
Accepted

## Context
When building a full-stack application with a FastAPI backend and a Next.js frontend, maintaining synchronization between API endpoints and frontend types is a common challenge. Manual type definitions often drift from the actual API implementation, leading to runtime errors and developer frustration.

## Decision
We have adopted a **Contract-First OpenAPI** approach:
1.  **Single Source of Truth**: The `openapi.yaml` file at the root of the repository is the authoritative definition of our API.
2.  **Schema-Driven Development**: Changes to the API must be reflected in `openapi.yaml` before implementation.
3.  **Automated Client Generation**: We use `openapi-fetch` and `openapi-typescript` to generate a strictly typed TypeScript client (`packages/api-client`) directly from the YAML spec.
4.  **CI Validation**: GitHub Actions enforce that the generated client is always in sync with the current spec.

## Alternatives Considered
- **Code-First (FastAPI generated spec)**: While FastAPI can generate its own spec, it often results in "implementation-led" contracts where the frontend has to adapt to whatever the backend produces. Contract-first allows for better design and coordination.
- **Manual Type Definition**: Highly error-prone and requires constant maintenance.
- **GraphQL**: Offers type safety but introduces significant complexity and overhead for this specific project's scale.

## Consequences
- **Pros**:
    - Compile-time error detection in the frontend if the API contract changes.
    - Improved developer experience with IDE autocomplete for API responses.
    - Zero drift between documentation and implementation.
- **Cons**:
    - Initial overhead in learning the OpenAPI spec format.
    - Requires a ritual of regenerating the client after spec changes.
