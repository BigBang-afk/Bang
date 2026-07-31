"""Security primitives: Argon2 hashing, JWT issuance, refresh-token hashing."""

from app.core.security import (
    create_access_token,
    create_refresh_token,
    decode_token,
    hash_password,
    hash_token,
    verify_password,
    verify_token_hash,
)


def test_password_hash_is_not_the_plaintext_and_verifies_correctly():
    hashed = hash_password("CorrectHorseBatteryStaple123!")
    assert hashed != "CorrectHorseBatteryStaple123!"
    assert verify_password("CorrectHorseBatteryStaple123!", hashed) is True
    assert verify_password("wrong-password", hashed) is False


def test_access_token_round_trips_subject_and_role():
    token = create_access_token(subject="user-123", role="admin")
    payload = decode_token(token)
    assert payload is not None
    assert payload["sub"] == "user-123"
    assert payload["role"] == "admin"
    assert payload["type"] == "access"


def test_refresh_token_hash_never_equals_raw_token_and_verifies():
    raw_token, jti, _expires_at = create_refresh_token(subject="user-123")
    token_hash = hash_token(raw_token)

    assert token_hash != raw_token
    assert jti  # jti is embedded in the JWT claims and used to look up/revoke the token
    assert verify_token_hash(raw_token, token_hash) is True
    assert verify_token_hash("a-different-token", token_hash) is False


def test_invalid_token_does_not_decode():
    assert decode_token("not-a-real-token") is None
