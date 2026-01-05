import base64
from datetime import datetime
import uuid

def encode_cursor(dt: datetime, id: uuid.UUID) -> str:
    """Encodes a cursor from a datetime and UUID."""
    # isoformat usually includes Request-ID-like precision, good enough for stable sorting
    payload = f"{dt.isoformat()}|{str(id)}"
    return base64.b64encode(payload.encode("utf-8")).decode("utf-8")

def decode_cursor(cursor: str) -> tuple[datetime, uuid.UUID]:
    """Decodes a cursor into a datetime and UUID."""
    try:
        payload = base64.b64decode(cursor).decode("utf-8")
        dt_str, id_str = payload.split("|")
        return datetime.fromisoformat(dt_str), uuid.UUID(id_str)
    except Exception:
        # Invalid cursor format or padding
        raise ValueError("Invalid cursor format")
