"""PIN / password hashing and local session lock logic."""
import hashlib
import os
import secrets


def _hash(value: str, salt: str) -> str:
    return hashlib.pbkdf2_hmac("sha256", value.encode(), salt.encode(), 200_000).hex()


def new_salt() -> str:
    return secrets.token_hex(16)


def hash_secret(value: str, salt: str) -> str:
    return _hash(value, salt)


def verify_secret(value: str, salt: str, expected_hash: str) -> bool:
    if not expected_hash:
        return False
    return secrets.compare_digest(_hash(value, salt), expected_hash)


def _derive_fernet_key(password: str, salt: bytes) -> bytes:
    import base64
    from cryptography.hazmat.primitives import hashes
    from cryptography.hazmat.primitives.kdf.pbkdf2 import PBKDF2HMAC

    kdf = PBKDF2HMAC(algorithm=hashes.SHA256(), length=32, salt=salt, iterations=200_000)
    return base64.urlsafe_b64encode(kdf.derive(password.encode()))


def encrypt_file(source_path: str, password: str) -> str:
    """Encrypts a file in place -> returns new path with .enc suffix (source untouched)."""
    from cryptography.fernet import Fernet

    salt = os.urandom(16)
    key = _derive_fernet_key(password, salt)
    with open(source_path, "rb") as fh:
        data = fh.read()
    token = Fernet(key).encrypt(data)
    dest = source_path + ".enc"
    with open(dest, "wb") as fh:
        fh.write(salt + token)
    return dest


def decrypt_file(enc_path: str, password: str) -> bytes:
    """Returns decrypted bytes. Raises cryptography.fernet.InvalidToken on wrong password."""
    from cryptography.fernet import Fernet

    with open(enc_path, "rb") as fh:
        raw = fh.read()
    salt, token = raw[:16], raw[16:]
    key = _derive_fernet_key(password, salt)
    return Fernet(key).decrypt(token)
