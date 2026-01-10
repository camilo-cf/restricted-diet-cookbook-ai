# ADR 0002: Multi-Backend Storage Strategy (S3 vs. Local Disk)

## Status
Accepted

## Context
The application requires a way to store and serve ingredient photos uploaded by users. 
In a local development environment, we use MinIO to simulate an S3-compatible service.
However, deploying MinIO on Render's free tier can be resource-intensive or complex due to the need for persistent disks and managing a separate service. 
Furthermore, the frontend must be able to upload files directly to the storage backend using presigned URLs to minimize backend load and latency.

## Decision
We decided to implement a dual-backend storage strategy:
1.  **S3/MinIO Backend**: used in local development and potentially in production if an S3-compatible service (like AWS S3 or Cloudflare R2) is available.
2.  **Local Disk Backend**: a fallback for lightweight deployments (like Render) that uses the application's own persistent disk.

### Implementation Details:
-   An abstract `StorageServiceBase` defines the interface (`initialize`, `generate_presigned_url`, `verify_upload`, `download_file`).
-   `S3StorageService` handles S3-compatible logic using `boto3`.
-   `DiskStorageService` handles local filesystem storage.
-   When using `DiskStorageService`, the "presigned URL" points back to a special PUT endpoint in our FastAPI backend (`/uploads/direct-upload/{key}`), ensuring the frontend code remains consistent (it always performs a `PUT` to the URL provided by the `presign` endpoint).

## Alternatives Considered
-   **MinIO on Render**: Feasible but requires more configuration and potentially hits free tier limits faster.
-   **Base64 in Postgres**: Rejected due to database bloat and performance issues with binary data.
-   **Paid S3**: Rejected as per the "zero additional costs" constraint.

## Consequences
-   **Consistency**: The frontend doesn't need to know which backend is being used; it always follows the "Get URL -> PUT file -> Complete" flow.
-   **Portability**: The app can be deployed anywhere with just a disk volume.
-   **Security**: Minimal exposure, as even the disk backend can be extended with temporary "signing" logic in the future.
-   **Maintenance**: Requires maintaining two implementations, though they are relatively simple.
