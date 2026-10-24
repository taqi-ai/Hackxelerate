"""SSRF guard for connectors that take an institution-supplied base URL.

Not wired to any live connector yet (none exists); every future API connector must pass its endpoint through
`check_url` before connecting, and re-check the address of each redirect hop (`check_url` on the Location value).
Rules: https only, no credentials in the URL, no raw IPs in private/loopback/link-local/metadata ranges, and every
address the hostname resolves to must be public. Callers should connect to the address returned here (pinning it) to
avoid a DNS change between check and use."""
from __future__ import annotations

import ipaddress
import re
import socket
from urllib.parse import urlsplit

MAX_URL_LEN = 2048
ALLOWED_PORTS = {443}
BLOCKED_HOSTS = {"localhost", "metadata.google.internal", "metadata", "instance-data"}
BLOCKED_SUFFIXES = (".local", ".internal", ".localhost", ".lan", ".corp", ".home")


class UnsafeUrl(ValueError):
    pass


def _public(ip: ipaddress._BaseAddress) -> bool:
    if isinstance(ip, ipaddress.IPv6Address) and ip.ipv4_mapped:
        ip = ip.ipv4_mapped
    return ip.is_global and not (ip.is_multicast or ip.is_reserved or ip.is_loopback or ip.is_link_local
                                 or ip.is_private or ip.is_unspecified)


def _system_resolver(host: str, port: int) -> list[str]:
    return sorted({ai[4][0] for ai in socket.getaddrinfo(host, port, type=socket.SOCK_STREAM)})


def check_url(url: str, resolver=_system_resolver) -> tuple[str, list[str]]:
    """Return (normalised URL, resolved public addresses) or raise UnsafeUrl."""
    if not isinstance(url, str) or not url or len(url) > MAX_URL_LEN or any(ord(c) < 33 for c in url):
        raise UnsafeUrl("URL is empty, too long or contains whitespace or control characters")
    parts = urlsplit(url)
    if parts.scheme != "https":
        raise UnsafeUrl("only https URLs are allowed")
    if parts.username or parts.password:
        raise UnsafeUrl("credentials must not be embedded in the URL")
    host = (parts.hostname or "").lower().rstrip(".")
    if not host:
        raise UnsafeUrl("URL has no host")
    port = parts.port or 443
    if port not in ALLOWED_PORTS:
        raise UnsafeUrl("only port 443 is allowed")
    if host in BLOCKED_HOSTS or host.endswith(BLOCKED_SUFFIXES):
        raise UnsafeUrl("host is not allowed")
    try:                                              # a literal IP: judge it directly (also catches decimal/hex forms)
        literal = ipaddress.ip_address(host)
    except ValueError:
        literal = None
    if literal is None and (host.replace(".", "").isdigit() or re.fullmatch(r"(0x[0-9a-f]+)(\.0x[0-9a-f]+)*", host)):
        raise UnsafeUrl("numeric host forms are not allowed")
    if literal is not None:
        if not _public(literal):
            raise UnsafeUrl("address is not public")
        return url, [str(literal)]
    try:
        addrs = resolver(host, port)
    except OSError:
        raise UnsafeUrl("host does not resolve")
    if not addrs:
        raise UnsafeUrl("host does not resolve")
    for a in addrs:
        if not _public(ipaddress.ip_address(a)):
            raise UnsafeUrl("host resolves to a non-public address")
    return url, list(addrs)
