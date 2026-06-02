from __future__ import annotations

"""Async Remnawave API client (Python port of lib/remnawave.ts)."""

import logging
from dataclasses import dataclass, field
from datetime import datetime, timezone
from typing import Any, Dict, List, Optional
from urllib.parse import urlencode, urlparse, urlunparse, parse_qsl

import aiohttp

log = logging.getLogger(__name__)


@dataclass
class RemnawaveUser:
    uuid: str
    short_uuid: str
    username: str
    status: str  # active / disabled / limited / expired
    used_traffic: int  # bytes
    data_limit: Optional[int]  # bytes or None
    expire: Optional[int]  # unix seconds or None
    created_at: str
    links: List[str]
    subscription_url: str
    note: Optional[str]
    online_at: Optional[str]


@dataclass
class SystemStats:
    version: str
    mem_total: int
    mem_used: int
    cpu_cores: int
    cpu_usage: float
    total_user: int
    users_active: int
    incoming_bandwidth: int
    outgoing_bandwidth: int


def _map_user(u: Dict[str, Any], links: List[str] | None = None) -> RemnawaveUser:
    expire_at = u.get("expireAt")
    expire_sec: Optional[int] = None
    if expire_at:
        try:
            dt = datetime.fromisoformat(expire_at.replace("Z", "+00:00"))
            expire_sec = int(dt.timestamp())
        except Exception:
            pass

    traffic = u.get("userTraffic") or {}
    status = (u.get("status") or "ACTIVE").lower()

    return RemnawaveUser(
        uuid=u.get("uuid", ""),
        short_uuid=u.get("shortUuid", ""),
        username=u.get("username", ""),
        status=status,
        used_traffic=traffic.get("usedTrafficBytes", 0),
        data_limit=u.get("trafficLimitBytes") or None,
        expire=expire_sec,
        created_at=u.get("createdAt", ""),
        links=links or [],
        subscription_url=u.get("subscriptionUrl", ""),
        note=u.get("description"),
        online_at=traffic.get("onlineAt"),
    )


class RemnawaveClient:
    def __init__(self, base_url: str, token: str, auth_query: str = "", squad_uuid: str = "", sub_url: str = "") -> None:
        self.base_url = base_url.rstrip("/")
        self.token = token
        self.auth_query = auth_query  # e.g. "tusdYCcc=LJaWKMpB"
        self.squad_uuid = squad_uuid
        self.sub_url = sub_url.rstrip("/") if sub_url else ""
        self._session: Optional[aiohttp.ClientSession] = None

    def _get_session(self) -> aiohttp.ClientSession:
        if self._session is None or self._session.closed:
            self._session = aiohttp.ClientSession(
                headers={
                    "Authorization": f"Bearer {self.token}",
                    "Content-Type": "application/json",
                }
            )
        return self._session

    async def close(self) -> None:
        if self._session and not self._session.closed:
            await self._session.close()

    def _build_url(self, path: str, params: Dict[str, Any] | None = None) -> str:
        url = f"{self.base_url}{path}"
        all_params: Dict[str, str] = {}
        if self.auth_query:
            parts = self.auth_query.split("=", 1)
            if len(parts) == 2:
                all_params[parts[0]] = parts[1]
        if params:
            for k, v in params.items():
                all_params[k] = str(v)
        if all_params:
            url = f"{url}?{urlencode(all_params)}"
        return url

    async def _request(self, method: str, path: str, params: Dict[str, Any] | None = None, json: Any = None) -> Any:
        session = self._get_session()
        url = self._build_url(path, params)
        async with session.request(method, url, json=json) as resp:
            text = await resp.text()
            if not resp.ok:
                raise Exception(f"Remnawave API {resp.status}: {text}")
            data = await resp.json(content_type=None)
            # API wraps response in {"response": ...}
            if isinstance(data, dict) and "response" in data:
                return data["response"]
            return data

    # ── internal helpers ──────────────────────────────────────────────────────

    async def _get_raw_by_username(self, username: str) -> Dict[str, Any]:
        try:
            return await self._request("GET", f"/api/users/by-username/{username}")
        except Exception:
            data = await self._request("GET", "/api/users", params={"search": username, "size": 25})
            users = data.get("users", []) if isinstance(data, dict) else []
            user = next((u for u in users if u.get("username") == username), None)
            if user:
                return user
            raise

    async def _fetch_links(self, short_uuid: str) -> List[str]:
        try:
            url = self._build_url(f"/api/sub/{short_uuid}")
            async with aiohttp.ClientSession(headers={"User-Agent": "v2rayN/6.0"}) as s:
                async with s.get(url) as r:
                    if not r.ok:
                        return []
                    text = await r.text()
            import base64
            try:
                decoded = base64.b64decode(text.strip()).decode("utf-8")
                if any(decoded.startswith(p) for p in ("vless://", "vmess://", "trojan://", "ss://")):
                    return [l for l in decoded.splitlines() if l.startswith(("vless://", "vmess://", "trojan://", "ss://"))]
            except Exception:
                pass
            return [l for l in text.splitlines() if l.startswith(("vless://", "vmess://", "trojan://", "ss://"))]
        except Exception:
            return []

    async def _update_raw_user(self, raw: Dict[str, Any], data: Dict[str, Any]) -> RemnawaveUser:
        body: Dict[str, Any] = {"uuid": raw["uuid"]}
        if "expire" in data:
            exp = data["expire"]
            body["expireAt"] = datetime.fromtimestamp(exp, tz=timezone.utc).isoformat() if exp else None
        if "data_limit" in data:
            body["trafficLimitBytes"] = data["data_limit"]
        if "note" in data:
            body["description"] = data["note"]
        if "device_limit" in data:
            body["hwidDeviceLimit"] = data["device_limit"]

        if len(body) > 1:
            updated = await self._request("PATCH", "/api/users", json=body)
        else:
            updated = raw

        if "status" in data:
            action = "enable" if data["status"] == "active" else "disable"
            updated = await self._request("POST", f"/api/users/{raw['uuid']}/actions/{action}")

        return _map_user(updated)

    # ── user management ───────────────────────────────────────────────────────

    async def create_user(self, username: str, expire: Optional[int] = None,
                          data_limit: int = 0, status: str = "active",
                          note: str = "", telegram_id: Optional[int] = None,
                          device_limit: int = 0) -> RemnawaveUser:
        body: Dict[str, Any] = {
            "username": username,
            "status": status.upper(),
            "trafficLimitBytes": data_limit,
            "trafficLimitStrategy": "NO_RESET",
        }
        if expire:
            body["expireAt"] = datetime.fromtimestamp(expire, tz=timezone.utc).isoformat()
        if self.squad_uuid:
            body["activeInternalSquads"] = [self.squad_uuid]
        if telegram_id:
            body["telegramId"] = telegram_id
        if note:
            body["description"] = note
        if device_limit > 0:
            body["hwidDeviceLimit"] = device_limit

        raw = await self._request("POST", "/api/users", json=body)
        return _map_user(raw)

    async def get_user(self, username: str) -> RemnawaveUser:
        raw = await self._get_raw_by_username(username)
        return _map_user(raw)

    async def update_user(self, username: str, **data: Any) -> RemnawaveUser:
        raw = await self._get_raw_by_username(username)
        return await self._update_raw_user(raw, data)

    async def delete_user(self, username: str) -> None:
        raw = await self._get_raw_by_username(username)
        await self._request("DELETE", f"/api/users/{raw['uuid']}")

    async def get_users(self, offset: int = 0, limit: int = 50, search: str = "", status: str = "") -> Dict[str, Any]:
        params: Dict[str, Any] = {"start": offset, "size": limit}
        if search:
            params["search"] = search
        if status:
            params["status"] = status.upper()
        data = await self._request("GET", "/api/users", params=params)
        users = [_map_user(u) for u in (data.get("users", []) if isinstance(data, dict) else [])]
        total = data.get("total", len(users)) if isinstance(data, dict) else len(users)
        return {"users": users, "total": total}

    async def disable_user(self, telegram_id: int) -> RemnawaveUser:
        return await self.update_user(f"tg_{telegram_id}", status="disabled")

    async def enable_user(self, telegram_id: int) -> RemnawaveUser:
        return await self.update_user(f"tg_{telegram_id}", status="active")

    # ── subscription helpers ──────────────────────────────────────────────────

    async def create_vpn_user(self, telegram_id: int, months: int,
                              device_limit: int = 1, data_limit_gb: int = 0) -> RemnawaveUser:
        """Создать или продлить VPN-юзера.

        device_limit: лимит устройств (HWID); 0 = без лимита.
        data_limit_gb: лимит трафика в ГБ; 0 = безлимит.
        """
        username = f"tg_{telegram_id}"
        now = int(datetime.now(tz=timezone.utc).timestamp())
        add_sec = months * 30 * 24 * 3600
        data_limit_bytes = int(data_limit_gb) * (1 << 30) if data_limit_gb and data_limit_gb > 0 else 0

        async def _extend(raw: Dict[str, Any]) -> RemnawaveUser:
            exp_str = raw.get("expireAt")
            if exp_str:
                try:
                    cur = int(datetime.fromisoformat(exp_str.replace("Z", "+00:00")).timestamp())
                except Exception:
                    cur = now
            else:
                cur = now
            base = cur if cur > now else now
            patch: Dict[str, Any] = {"expire": base + add_sec, "status": "active"}
            if device_limit > 0:
                patch["device_limit"] = device_limit
            # data_limit_bytes=0 значит безлимит — отправляем 0 явно, чтобы сбросить лимит
            patch["data_limit"] = data_limit_bytes
            return await self._update_raw_user(raw, patch)

        try:
            raw = await self._get_raw_by_username(username)
            return await _extend(raw)
        except Exception:
            try:
                return await self.create_user(
                    username=username,
                    expire=now + add_sec,
                    data_limit=data_limit_bytes,
                    status="active",
                    note=f"Telegram ID: {telegram_id}",
                    telegram_id=telegram_id,
                    device_limit=device_limit,
                )
            except Exception as e:
                if "A019" in str(e) or "already exists" in str(e).lower():
                    raw = await self._get_raw_by_username(username)
                    return await _extend(raw)
                raise

    async def extend_days(self, telegram_id: int, days: int) -> RemnawaveUser:
        """Extend (or set if no user) VPN subscription by exact number of days."""
        username = f"tg_{telegram_id}"
        now = int(datetime.now(tz=timezone.utc).timestamp())
        add_sec = days * 24 * 3600
        try:
            raw = await self._get_raw_by_username(username)
            exp_str = raw.get("expireAt")
            try:
                cur = int(datetime.fromisoformat(exp_str.replace("Z", "+00:00")).timestamp()) if exp_str else now
            except Exception:
                cur = now
            base = cur if cur > now else now
            return await self._update_raw_user(raw, {"expire": base + add_sec, "status": "active"})
        except Exception:
            return await self.create_user(
                username=username,
                expire=now + add_sec,
                status="active",
                note=f"Telegram ID: {telegram_id}",
                telegram_id=telegram_id,
            )

    async def check_subscription(self, telegram_id: int) -> Optional[Dict[str, Any]]:
        username = f"tg_{telegram_id}"
        try:
            raw = await self._get_raw_by_username(username)
            links = await self._fetch_links(raw.get("shortUuid", ""))
            expire_at = raw.get("expireAt")
            expires_dt: Optional[datetime] = None
            if expire_at:
                try:
                    expires_dt = datetime.fromisoformat(expire_at.replace("Z", "+00:00"))
                except Exception:
                    pass
            active = (raw.get("status") == "ACTIVE") and (not expires_dt or expires_dt.timestamp() > datetime.now(tz=timezone.utc).timestamp())
            traffic = raw.get("userTraffic") or {}
            return {
                "active": active,
                "expires_at": expires_dt,
                "used_traffic": traffic.get("usedTrafficBytes", 0),
                "data_limit": raw.get("trafficLimitBytes") or None,
                "links": links,
                "subscription_url": raw.get("subscriptionUrl", ""),
                "status": (raw.get("status") or "").lower(),
                "username": username,
                "uuid": raw.get("uuid", ""),
                "short_uuid": raw.get("shortUuid", ""),
                "hwid_device_limit": raw.get("hwidDeviceLimit") or 1,
            }
        except Exception:
            return None

    async def get_user_devices(self, telegram_id: int) -> List[Dict[str, Any]]:
        username = f"tg_{telegram_id}"
        try:
            raw = await self._get_raw_by_username(username)
            data = await self._request("GET", f"/api/hwid/devices/{raw['uuid']}")
            devices = data if isinstance(data, list) else []
            return [
                {
                    "hwid": d.get("hwid") or d.get("id") or str(d),
                    "device_model": d.get("deviceModel") or d.get("device_model"),
                    "platform": d.get("platform"),
                    "os_version": d.get("osVersion") or d.get("os_version"),
                    "user_agent": d.get("userAgent") or d.get("user_agent"),
                    "created_at": d.get("createdAt") or d.get("created_at"),
                }
                for d in devices
                if isinstance(d, dict)
            ]
        except Exception:
            return []

    async def disconnect_device(self, telegram_id: int, hwid: str) -> bool:
        username = f"tg_{telegram_id}"
        try:
            raw = await self._get_raw_by_username(username)
            await self._request(
                "POST",
                "/api/hwid/devices/delete",
                json={"userUuid": raw["uuid"], "hwid": hwid},
            )
            return True
        except Exception:
            log.exception("Failed to disconnect HWID device for telegram_id=%s", telegram_id)
            return False

    async def revoke_subscription(self, telegram_id: int) -> str:
        username = f"tg_{telegram_id}"
        raw = await self._get_raw_by_username(username)
        updated = await self._request("POST", f"/api/users/{raw['uuid']}/actions/revoke")
        return updated.get("subscriptionUrl") or await self.get_subscription_url(telegram_id)

    async def get_subscription_url(self, telegram_id: int) -> str:
        username = f"tg_{telegram_id}"
        if self.sub_url:
            return f"{self.sub_url}/{username}"
        return f"{self.base_url}/sub/{username}"

    # ── system stats ──────────────────────────────────────────────────────────

    async def get_system_stats(self) -> SystemStats:
        raw = await self._request("GET", "/api/system/stats")
        cpu = raw.get("cpu", {})
        mem = raw.get("memory", {})
        users = raw.get("users", {})
        nodes = raw.get("nodes", {})
        return SystemStats(
            version=raw.get("version", "remnawave"),
            mem_total=mem.get("total", 0),
            mem_used=mem.get("used", 0),
            cpu_cores=cpu.get("cores", 0),
            cpu_usage=cpu.get("usage") or 0.0,
            total_user=users.get("totalUsers", 0),
            users_active=users.get("statusCounts", {}).get("ACTIVE", 0),
            incoming_bandwidth=int(nodes.get("totalBytesLifetime", 0) or 0),
            outgoing_bandwidth=int(nodes.get("totalBytesLifetime", 0) or 0),
        )


_client: Optional[RemnawaveClient] = None


def init_remnawave(url: str, token: str, auth_query: str = "", squad_uuid: str = "", sub_url: str = "") -> RemnawaveClient:
    global _client
    _client = RemnawaveClient(url, token, auth_query, squad_uuid, sub_url)
    return _client


def get_remnawave() -> RemnawaveClient:
    if _client is None:
        raise RuntimeError("Remnawave client not initialized. Call init_remnawave() first.")
    return _client
