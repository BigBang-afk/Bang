"""JWT authentication for WebSocket connections.

Accepts the token either as a `token` query parameter or an `Authorization:
Bearer` header, since browser WebSocket clients cannot set custom headers
for the handshake in all environments.
"""

from __future__ import annotations

from fastapi import WebSocket

from app.core.security import decode_token


async def authenticate_ws(websocket: WebSocket) -> dict | None:
    token = websocket.query_params.get("token")
    if not token:
        auth_header = websocket.headers.get("authorization")
        if auth_header and auth_header.lower().startswith("bearer "):
            token = auth_header.split(" ", 1)[1]
    if not token:
        return None
    payload = decode_token(token)
    if not payload or payload.get("type") != "access":
        return None
    return payload
