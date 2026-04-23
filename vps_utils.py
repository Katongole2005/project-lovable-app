import os
from dataclasses import dataclass

import paramiko
from dotenv import load_dotenv

load_dotenv()


@dataclass(frozen=True)
class VpsConfig:
    host: str
    port: int
    username: str
    password: str
    remote_dir: str
    pm2_process: str


def get_vps_config() -> VpsConfig:
    host = os.getenv("VPS_HOST", "").strip()
    username = os.getenv("VPS_USERNAME", "").strip()
    password = os.getenv("VPS_PASSWORD", "").strip()
    if not host or not username or not password:
        raise RuntimeError(
            "Set VPS_HOST, VPS_USERNAME, and VPS_PASSWORD in your environment or .env."
        )

    return VpsConfig(
        host=host,
        port=int(os.getenv("VPS_PORT", "22") or "22"),
        username=username,
        password=password,
        remote_dir=os.getenv("VPS_REMOTE_DIR", "/root/scraper_bot").strip() or "/root/scraper_bot",
        pm2_process=os.getenv("VPS_PM2_PROCESS", "moviescraper").strip() or "moviescraper",
    )


def create_ssh_client(config: VpsConfig, timeout: int = 10) -> paramiko.SSHClient:
    client = paramiko.SSHClient()
    client.set_missing_host_key_policy(paramiko.AutoAddPolicy())
    client.connect(
        hostname=config.host,
        port=config.port,
        username=config.username,
        password=config.password,
        timeout=timeout,
    )
    return client
