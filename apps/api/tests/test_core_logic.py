import pytest
from datetime import datetime
import uuid
from app.core.pagination import encode_cursor, decode_cursor
from app.core.prompts import GENERATE_RECIPE_PROMPT

def test_pagination_logic():
    id = uuid.uuid4()
    now = datetime.now()
    cursor = encode_cursor(now, id)
    dt, uid = decode_cursor(cursor)
    assert uid == id
    
    with pytest.raises(ValueError):
        decode_cursor("invalid-base64")

def test_prompts_logic():
    assert "Ingredients" in GENERATE_RECIPE_PROMPT
