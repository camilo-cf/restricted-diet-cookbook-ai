from app.core.security import verify_password, get_password_hash

def test_password_hashing():
    password = "secret_password"
    hashed = get_password_hash(password)
    assert hashed != password
    assert verify_password(password, hashed)
    assert not verify_password("wrong_password", hashed)

def test_jwt_token_creation():
    from app.core.security import create_session_token
    from app.core.config import settings
    from jose import jwt
    
    data = {"sub": "testuser"}
    token = create_session_token(data)
    decoded = jwt.decode(token, settings.SECRET_KEY, algorithms=[settings.ALGORITHM])
    assert decoded["sub"] == "testuser"
