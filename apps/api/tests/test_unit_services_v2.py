import pytest
import time
import uuid
import os
import botocore
from unittest.mock import MagicMock, patch
from app.core.circuit_breaker import CircuitBreaker, CircuitBreakerOpen
from app.services.storage_service import S3StorageService, DiskStorageService
from app.core.config import settings

def test_circuit_breaker_open_state():
    cb = CircuitBreaker(failure_threshold=1, recovery_timeout=60)
    cb.record_failure()
    assert cb.state == "OPEN"
    with pytest.raises(CircuitBreakerOpen):
        cb.call(lambda: "success")

def test_circuit_breaker_half_open_recovery():
    cb = CircuitBreaker(failure_threshold=1, recovery_timeout=0.1)
    cb.record_failure()
    assert cb.state == "OPEN"
    time.sleep(0.2)
    # This call should transition to HALF_OPEN and then CLOSED on success
    res = cb.call(lambda: "success")
    assert res == "success"
    assert cb.state == "CLOSED"

def test_circuit_breaker_half_open_failure():
    cb = CircuitBreaker(failure_threshold=1, recovery_timeout=0.1)
    cb.record_failure()
    time.sleep(0.2)
    # This call should transition to HALF_OPEN and then back to OPEN on failure
    with pytest.raises(Exception):
        cb.call(lambda: 1/0)
    assert cb.state == "OPEN"

@pytest.mark.asyncio
async def test_circuit_breaker_async_half_open():
    cb = CircuitBreaker(failure_threshold=1, recovery_timeout=0.1)
    cb.record_failure()
    time.sleep(0.2)
    async def async_success(): return "ok"
    res = await cb.call_async(async_success)
    assert res == "ok"
    assert cb.state == "CLOSED"

def test_s3_storage_ensure_bucket_exists_error():
    with patch("app.services.storage_service.boto3.client") as mock_boto:
        mock_s3 = MagicMock()
        mock_boto.return_value = mock_s3
        error_response = {'Error': {'Code': '500', 'Message': 'Internal Server Error'}}
        mock_s3.head_bucket.side_effect = botocore.exceptions.ClientError(error_response, "head_bucket")
        svc = S3StorageService()
        with pytest.raises(botocore.exceptions.ClientError):
            svc.ensure_bucket_exists()

def test_disk_storage_safe_path_traversal():
    ds = DiskStorageService()
    with patch("app.core.config.settings.UPLOAD_DIR", "/tmp/uploads"):
        ds.upload_dir = "/tmp/uploads"
        with pytest.raises(ValueError) as exc:
            ds._get_safe_path("../etc/passwd")
        assert "Path traversal" in str(exc.value)

def test_disk_storage_verify_upload_not_found():
    ds = DiskStorageService()
    with patch("os.path.exists", return_value=False):
        with pytest.raises(ValueError) as exc:
            ds.verify_upload("test.jpg")
        assert "File not found" in str(exc.value)

def test_disk_storage_verify_upload_too_large():
    ds = DiskStorageService()
    with patch("os.path.exists", return_value=True):
        with patch("os.path.getsize", return_value=99999999):
            with pytest.raises(ValueError) as exc:
                ds.verify_upload("test.jpg")
            assert "File too large" in str(exc.value)
