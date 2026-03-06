from common import config

from .public_relays import relay_hostnames

# Generate the CSP header to send to browsers
relay_hosts = " ".join(relay_hostnames)
csp_header = ""
csp_header = ";".join(
    [
        f"default-src 'self' {config.hostname} *.{config.hostname}",
        "object-src 'none'",
        f"media-src {relay_hosts}",
        f"font-src 'self'",
        f"connect-src wss://{config.websocket_host}",
        f"style-src 'self' {config.hostname} 'unsafe-inline'",
        f"img-src 'self' {config.hostname} *.{config.hostname} https://cdn.discordapp.com",
    ]
)
