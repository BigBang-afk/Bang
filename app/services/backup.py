"""Database backup / restore / integrity check."""
import os
import shutil
from datetime import datetime

from app.config import BACKUPS_DIR, DB_PATH
from app.database.db import close_connection, get_connection
from app.database.repository import BackupRepo


def create_backup(label="", encrypt_password=None):
    os.makedirs(BACKUPS_DIR, exist_ok=True)
    ts = datetime.now().strftime("%Y%m%d_%H%M%S")
    suffix = f"_{label}" if label else ""
    dest = os.path.join(BACKUPS_DIR, f"aurum_backup_{ts}{suffix}.db")

    conn = get_connection()
    conn.commit()
    dest_conn_path = dest
    import sqlite3
    dest_conn = sqlite3.connect(dest_conn_path)
    conn.backup(dest_conn)
    dest_conn.close()

    if encrypt_password:
        from app.services.security import encrypt_file
        enc_path = encrypt_file(dest, encrypt_password)
        os.remove(dest)
        dest = enc_path

    size = os.path.getsize(dest) if os.path.exists(dest) else 0
    BackupRepo().create(dest, size)
    return dest


def restore_backup(backup_path, decrypt_password=None):
    """Restores the DB from a backup file. Caller must restart the app/reload connections."""
    if not os.path.exists(backup_path):
        raise FileNotFoundError(backup_path)
    close_connection()
    if backup_path.endswith(".enc"):
        from app.services.security import decrypt_file
        data = decrypt_file(backup_path, decrypt_password or "")
        with open(DB_PATH, "wb") as fh:
            fh.write(data)
    else:
        shutil.copy2(backup_path, DB_PATH)


def list_backups():
    return BackupRepo().recent(50)


def health_check():
    conn = get_connection()
    result = conn.execute("PRAGMA integrity_check").fetchone()
    fk_issues = conn.execute("PRAGMA foreign_key_check").fetchall()
    return {
        "integrity": result[0] if result else "unknown",
        "foreign_key_violations": len(fk_issues),
        "db_size_bytes": os.path.getsize(DB_PATH) if os.path.exists(DB_PATH) else 0,
    }
