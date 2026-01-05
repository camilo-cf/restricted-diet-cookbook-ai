import botocore
import boto3
import magic
from botocore.config import Config
from tenacity import retry, stop_after_attempt, wait_exponential
from app.core.config import settings

class StorageService:
    def __init__(self):
        self.s3_client = boto3.client(
            "s3",
            endpoint_url=settings.AWS_ENDPOINT_URL,
            aws_access_key_id=settings.AWS_ACCESS_KEY_ID,
            aws_secret_access_key=settings.AWS_SECRET_ACCESS_KEY,
            region_name=settings.AWS_REGION,
            config=Config(signature_version="s3v4"),
        )
        self.bucket = settings.AWS_BUCKET_NAME

    def generate_presigned_url(self, object_name: str, content_type: str, expiration=120) -> str:
        """Generate a presigned URL to share an S3 object"""
        try:
            response = self.s3_client.generate_presigned_url(
                "put_object",
                Params={
                    "Bucket": self.bucket,
                    "Key": object_name,
                    "ContentType": content_type,
                },
                ExpiresIn=expiration,
            )
            return response
        except Exception as e:
            # logging handled by middleware/caller
            raise e

    @retry(stop=stop_after_attempt(2), wait=wait_exponential(multiplier=1, min=1, max=4))
    def verify_upload(self, object_name: str, expected_size_max: int = 8388608) -> bool:
        """
        Verify object exists, size is within limits, and magic bytes match.
        For MVP optimization is skipped/mocked if disabled.
        """
        try:
            # 1. HEAD Object
            metadata = self.s3_client.head_object(Bucket=self.bucket, Key=object_name)
            size = metadata["ContentLength"]
            
            if size > expected_size_max:
                raise ValueError(f"File too large: {size} bytes")

            # 2. Magic Byte Check (requires downloading header)
            # Range=bytes=0-2048 to get enough for magic check
            response = self.s3_client.get_object(Bucket=self.bucket, Key=object_name, Range="bytes=0-2048")
            head_content = response["Body"].read()
            mime = magic.from_buffer(head_content, mime=True)
            
            if mime not in ["image/jpeg", "image/png", "image/webp"]:
                 raise ValueError(f"Invalid mime type from bytes: {mime}")

            return True

        except botocore.exceptions.ClientError as e:
            if e.response['Error']['Code'] == "404":
                raise ValueError("Object not found in storage")
            raise e

storage_service = StorageService()
