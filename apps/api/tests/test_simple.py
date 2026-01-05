import pytest

def test_trivial():
    assert 1 == 1

@pytest.mark.asyncio
async def test_trivial_async():
    assert 1 == 1
