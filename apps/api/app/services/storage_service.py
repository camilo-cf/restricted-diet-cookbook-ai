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
        
        # Public URL for presigning (Host header must match browser's view)
        public_url = settings.PUBLIC_AWS_ENDPOINT_URL or settings.AWS_ENDPOINT_URL
        self.presign_client = boto3.client(
            "s3",
            endpoint_url=public_url,
            aws_access_key_id=settings.AWS_ACCESS_KEY_ID,
            aws_secret_access_key=settings.AWS_SECRET_ACCESS_KEY,
            region_name=settings.AWS_REGION,
            config=Config(signature_version="s3v4"),
        )
        
        # Lazy initialization for bucket and CORS
        self._initialized = False

    def initialize(self):
        """Explicitly initialize bucket and CORS. Should be called during lifespan."""
        if self._initialized:
            return
        try:
            self.ensure_bucket_exists()
            self.ensure_bucket_cors()
            self._initialized = True
        except Exception as e:
            print(f"Warning: Failed to initialize storage for bucket {self.bucket}: {e}")

    def ensure_bucket_exists(self):
        """Check if bucket exists, create it and set public access if missing"""
        try:
            self.s3_client.head_bucket(Bucket=self.bucket)
        except botocore.exceptions.ClientError as e:
            error_code = e.response.get('Error', {}).get('Code')
            if error_code == '404' or error_code == '403': # MinIO sometimes returns 403 on head if no permissions
                print(f"Bucket {self.bucket} does not exist or is inaccessible. Attempting to create...")
                self.s3_client.create_bucket(Bucket=self.bucket)
                # Set basic public read policy (equivalent to mc anonymous set public)
                import json
                policy = {
                    "Version": "2012-10-17",
                    "Statement": [
                        {
                            "Effect": "Allow",
                            "Principal": "*",
                            "Action": ["s3:GetObject"],
                            "Resource": [f"arn:aws:s3:::{self.bucket}/*"]
                        }
                    ]
                }
                self.s3_client.put_bucket_policy(Bucket=self.bucket, Policy=json.dumps(policy))
                print(f"Bucket {self.bucket} created and public policy applied.")
            else:
                raise e

    def ensure_bucket_cors(self):
        """Set CORS policy to allow browser-based PUT requests"""
        cors_configuration = {
            'CORSRules': [
                {
                    'AllowedHeaders': ['*'],
                    'AllowedMethods': ['PUT', 'POST', 'GET', 'HEAD'],
                    'AllowedOrigins': settings.CORS_ORIGINS + ["http://localhost:3000", "http://127.0.0.1:3000"],
                    'ExposeHeaders': ['ETag'],
                    'MaxAgeSeconds': 3000
                }
            ]
        }
        self.s3_client.put_bucket_cors(
            Bucket=self.bucket,
            CORSConfiguration=cors_configuration
        )
    def generate_presigned_url(self, object_name: str, content_type: str, expiration=120) -> str:
        """Generate a presigned URL to share an S3 object"""
        try:
            # Generate using the client oriented towards the public endpoint 
            # so the Host header in the signature matches what the browser sends.
            response = self.presign_client.generate_presigned_url(
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

    def download_file(self, object_name: str) -> bytes:
        """Download file content as bytes for AI processing"""
        try:
            response = self.s3_client.get_object(Bucket=self.bucket, Key=object_name)
            return response["Body"].read()
        except Exception as e:
            raise e

storage_service = StorageService()
