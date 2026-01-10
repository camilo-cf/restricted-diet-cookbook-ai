# ☁️ Persistent Storage: Cloudflare R2 Setup

Render's free tier uses ephemeral disks, meaning images vanish on restart. For persistent storage without upgrading to paid disks, use **Cloudflare R2** (AWS S3 Compatible).

## 1. Get R2 Credentials
1.  Log in to Cloudflare Dashboard > **R2**.
2.  Click **Create Bucket** (name it e.g., `cookbook-ai-uploads`).
3.  On the right, click **Manage R2 API Tokens**.
4.  Click **Create API Token**.
    *   **Permissions**: `Object Read & Write` (Admin Read & Write works too).
    *   **TTL**: `Forever` (or compliant with your policy).
5.  Copy the following values:
    *   `Access Key ID`
    *   `Secret Access Key`
    *   `Endpoint` (It looks like `https://<ACCOUNT_ID>.r2.cloudflarestorage.com`)

## 2. Configure Render Environment
In your Render Dashboard > **cookbook-backend** > **Environment**:

Add/Update these variables:

| Variable | Value | Notes |
|---|---|---|
| `STORAGE_BACKEND` | `r2` | Tells the app to use S3/R2 logic instead of disk. |
| `AWS_ENDPOINT_URL` | `https://<ACCOUNT_ID>.r2.cloudflarestorage.com` | **Use the base endpoint**, DO NOT include the bucket name here. |
| `AWS_ACCESS_KEY_ID` | `<YOUR_ACCESS_KEY_ID>` | From Step 1. |
| `AWS_SECRET_ACCESS_KEY` | `<YOUR_SECRET_ACCESS_KEY>` | From Step 1. |
| `AWS_BUCKET_NAME` | `cookbook-ai-uploads` | The name of the bucket you created. |
| `AWS_REGION` | `auto` | R2 uses 'auto', or 'us-east-1'. |

## 3. Setup CORS on Cloudflare (Crucial)
For the frontend to upload directly to R2 (if using direct uploads) or for the browser to view images:

1.  Go to your Bucket Settings in Cloudflare.
2.  Find **CORS Policy**.
3.  Add this JSON policy:
    ```json
    [
      {
        "AllowedOrigins": [
          "https://cookbook-frontend-xxxx.onrender.com",
          "http://localhost:3000"
        ],
        "AllowedMethods": [
          "GET",
          "PUT",
          "POST",
          "HEAD"
        ],
        "AllowedHeaders": [
          "*"
        ],
        "ExposeHeaders": [
          "ETag"
        ],
        "MaxAgeSeconds": 3000
      }
    ]
    ```
    *Replace `cookbook-frontend-xxxx.onrender.com` with your actual frontend URL.*

## 4. Deploy
Redeploy the **cookbook-backend** service. The app will now store all new recipe images and profile pictures in Cloudflare R2.
