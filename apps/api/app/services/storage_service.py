import os
import shutil
import botocore
import boto3
import magic
from abc import ABC, abstractmethod
from typing import List
from botocore.config import Config
from tenacity import retry, stop_after_attempt, wait_exponential
from app.core.config import settings

class StorageServiceBase(ABC):
    @abstractmethod
    def initialize(self):
        pass

    @abstractmethod
    def generate_presigned_url(self, object_name: str, content_type: str = None, expiration=120, operation="put_object") -> str:
        pass

    @abstractmethod
    def verify_upload(self, object_name: str, expected_size_max: int = 8388608) -> bool:
        pass

    @abstractmethod
    def download_file(self, object_name: str) -> bytes:
        pass

    @abstractmethod
    def delete_file(self, object_name: str) -> bool:
        pass

class S3StorageService(StorageServiceBase):
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
        self._initialized = False

    def initialize(self):
        if self._initialized:
            return
        try:
            self.ensure_bucket_exists()
            self.ensure_bucket_cors()
            self._initialized = True
        except Exception as e:
            print(f"Warning: Failed to initialize S3 storage for bucket {self.bucket}: {e}")

    def ensure_bucket_exists(self):
        try:
            self.s3_client.head_bucket(Bucket=self.bucket)
        except botocore.exceptions.ClientError as e:
            error_code = e.response.get('Error', {}).get('Code')
            if error_code in ['404', '403']:
                print(f"Bucket {self.bucket} missing. Creating...")
                self.s3_client.create_bucket(Bucket=self.bucket)
                import json
                policy = {
                    "Version": "2012-10-17",
                    "Statement": [{
                        "Effect": "Allow", 
                        "Principal": "*", 
                        "Action": ["s3:GetObject"], 
                        "Resource": [f"arn:aws:s3:::{self.bucket}/recipes/*"]
                    }]
                }
                self.s3_client.put_bucket_policy(Bucket=self.bucket, Policy=json.dumps(policy))
            else:
                raise e

    def ensure_bucket_cors(self):
        cors_configuration = {
            'CORSRules': [{
                'AllowedHeaders': ['*'],
                'AllowedMethods': ['PUT', 'POST', 'GET', 'HEAD'],
                'AllowedOrigins': settings.CORS_ORIGINS + ["http://localhost:3000", "http://127.0.0.1:3000"],
                'ExposeHeaders': ['ETag'],
                'MaxAgeSeconds': 3000
            }]
        }
        self.s3_client.put_bucket_cors(Bucket=self.bucket, CORSConfiguration=cors_configuration)

    def generate_presigned_url(self, object_name: str, content_type: str = None, expiration=120, operation="put_object") -> str:
        # Prevent traversal in object name
        if ".." in object_name or object_name.startswith("/"):
             raise ValueError("Invalid object name")
        
        params = {"Bucket": self.bucket, "Key": object_name}
        if content_type and operation == "put_object":
            params["ContentType"] = content_type
            
        return self.presign_client.generate_presigned_url(
            operation,
            Params=params,
            ExpiresIn=expiration,
        )

    @retry(stop=stop_after_attempt(2), wait=wait_exponential(multiplier=1, min=1, max=4))
    def verify_upload(self, object_name: str, expected_size_max: int = 8388608) -> bool:
        if ".." in object_name or object_name.startswith("/"):
             raise ValueError("Invalid object name")
        try:
            metadata = self.s3_client.head_object(Bucket=self.bucket, Key=object_name)
            if metadata["ContentLength"] > expected_size_max:
                raise ValueError(f"File too large")
            response = self.s3_client.get_object(Bucket=self.bucket, Key=object_name, Range="bytes=0-2048")
            mime = magic.from_buffer(response["Body"].read(), mime=True)
            if mime not in ["image/jpeg", "image/png", "image/webp"]:
                 raise ValueError(f"Invalid mime: {mime}")
            return True
        except botocore.exceptions.ClientError as e:
            if e.response['Error']['Code'] == "404":
                raise ValueError("Object not found")
            raise e

    def download_file(self, object_name: str) -> bytes:
        if ".." in object_name or object_name.startswith("/"):
             raise ValueError("Invalid object name")
        response = self.s3_client.get_object(Bucket=self.bucket, Key=object_name)
        return response["Body"].read()

    def delete_file(self, object_name: str) -> bool:
        """Delete a file from S3 storage."""
        if ".." in object_name or object_name.startswith("/"):
             raise ValueError("Invalid object name")
        try:
            self.s3_client.delete_object(Bucket=self.bucket, Key=object_name)
            return True
        except botocore.exceptions.ClientError as e:
            print(f"Error deleting object {object_name}: {e}")
            return False

class DiskStorageService(StorageServiceBase):
    def __init__(self):
        self.upload_dir = os.path.abspath(settings.UPLOAD_DIR)

    def initialize(self):
        os.makedirs(self.upload_dir, exist_ok=True)
        print(f"Disk storage initialized at {self.upload_dir}")

    def _get_safe_path(self, object_name: str) -> str:
        file_path = os.path.normpath(os.path.join(self.upload_dir, object_name))
        if not file_path.startswith(self.upload_dir):
             raise ValueError("Path traversal attempt detected")
        return file_path

    def generate_presigned_url(self, object_name: str, content_type: str = None, expiration=120, operation="put_object") -> str:
        # Validate path but we don't return the path here, just the URL
        self._get_safe_path(object_name)
        return f"{settings.PUBLIC_API_URL}/uploads/direct-upload/{object_name}"

    def verify_upload(self, object_name: str, expected_size_max: int = 8388608) -> bool:
        file_path = self._get_safe_path(object_name)
        if not os.path.exists(file_path):
            raise ValueError("File not found")
        size = os.path.getsize(file_path)
        if size > expected_size_max:
            raise ValueError("File too large")
        with open(file_path, "rb") as f:
            mime = magic.from_buffer(f.read(2048), mime=True)
        if mime not in ["image/jpeg", "image/png", "image/webp"]:
            raise ValueError(f"Invalid mime: {mime}")
        return True

    def download_file(self, object_name: str) -> bytes:
        file_path = self._get_safe_path(object_name)
        with open(file_path, "rb") as f:
            return f.read()

    def delete_file(self, object_name: str) -> bool:
        """Delete a file from disk storage."""
        try:
            file_path = self._get_safe_path(object_name)
            if os.path.exists(file_path):
                os.remove(file_path)
                return True
            return False
        except Exception as e:
            print(f"Error deleting file {object_name}: {e}")
            return False

def get_storage_service() -> StorageServiceBase:
    if settings.STORAGE_BACKEND == "disk":
        return DiskStorageService()
    return S3StorageService()

storage_service = get_storage_service()
