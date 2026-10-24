import pytest

from app.netguard import UnsafeUrl, check_url


def fake(mapping):
    return lambda host, port: mapping[host]


def test_public_https_host_is_allowed_and_addresses_returned():
    url, addrs = check_url("https://api.example.edu/v1/students", fake({"api.example.edu": ["93.184.216.34"]}))
    assert addrs == ["93.184.216.34"]


@pytest.mark.parametrize("url", [
    "http://api.example.edu/",                    # not https
    "ftp://api.example.edu/",
    "https://user:pw@api.example.edu/",           # embedded credentials
    "https://api.example.edu:8443/",              # odd port
    "https://localhost/",
    "https://metadata.google.internal/",
    "https://db.corp/",
    "https://127.0.0.1/",
    "https://10.0.0.5/",
    "https://192.168.1.10/",
    "https://172.16.0.1/",
    "https://169.254.169.254/latest/meta-data/",  # cloud metadata
    "https://[::1]/",
    "https://[fd00::1]/",
    "https://[::ffff:127.0.0.1]/",                # IPv4-mapped loopback
    "https://2130706433/",                        # decimal 127.0.0.1
    "https://0x7f000001/",
    "https://0.0.0.0/",
    "https://api.example.edu/a b",                # whitespace
    "",
    "https://",
])
def test_unsafe_urls_are_refused(url):
    with pytest.raises(UnsafeUrl):
        check_url(url, fake({}))


def test_host_resolving_to_private_address_is_refused_even_if_one_address_is_public():
    with pytest.raises(UnsafeUrl):
        check_url("https://rebind.example.com/", fake({"rebind.example.com": ["93.184.216.34", "10.1.2.3"]}))


def test_unresolvable_host_is_refused():
    def boom(host, port):
        raise OSError("nxdomain")
    with pytest.raises(UnsafeUrl):
        check_url("https://nope.example.com/", boom)


def test_overlong_url_refused():
    with pytest.raises(UnsafeUrl):
        check_url("https://a.example.com/" + "x" * 3000, fake({"a.example.com": ["93.184.216.34"]}))
