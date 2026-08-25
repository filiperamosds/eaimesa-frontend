#!/usr/bin/env python3
"""Prepara o destino FTP: pastas do `out/` + remove sync-state obsoleto.

O FTP-Deploy-Action trata arquivo existente no .ftp-deploy-sync-state.json
como replace. Se o wipe anterior apagou a pasta, o STOR vira 550
(No such file or directory) — caso de `__venue/bem-vindo/index.html`.

Conexão Hostinger às vezes timeout a partir do runner do Actions — retry
com backoff antes de falhar o job.
"""

from __future__ import annotations

import ftplib
import os
import socket
import sys
import time
from pathlib import Path

CONNECT_ATTEMPTS = 5
CONNECT_TIMEOUT_S = 60
BACKOFF_S = (4, 8, 16, 32)


def mkdir_cwd(ftp: ftplib.FTP, parts: list[str]) -> None:
    ftp.cwd("/")
    for part in parts:
        if not part or part == ".":
            continue
        try:
            ftp.cwd(part)
        except ftplib.error_perm:
            ftp.mkd(part)
            ftp.cwd(part)


def connect(host: str, user: str, password: str) -> ftplib.FTP:
    last: BaseException | None = None
    for attempt in range(1, CONNECT_ATTEMPTS + 1):
        ftp = ftplib.FTP()
        try:
            print(f"FTP connect {host}:21 (tentativa {attempt}/{CONNECT_ATTEMPTS})")
            ftp.connect(host, 21, timeout=CONNECT_TIMEOUT_S)
            ftp.login(user, password)
            return ftp
        except (TimeoutError, socket.timeout, OSError, ftplib.error_temp) as exc:
            last = exc
            print(f"FTP falhou: {exc}", file=sys.stderr)
            try:
                ftp.close()
            except Exception:
                pass
            if attempt >= CONNECT_ATTEMPTS:
                break
            wait = BACKOFF_S[min(attempt - 1, len(BACKOFF_S) - 1)]
            print(f"Aguardando {wait}s…", file=sys.stderr)
            time.sleep(wait)
    assert last is not None
    raise last


def main() -> int:
    host = os.environ["FTP_SERVER"].strip()
    user = os.environ["FTP_USERNAME"]
    password = os.environ["FTP_PASSWORD"]
    remote = os.environ["FTP_REMOTE_DIR"].strip().strip("/")
    local_out = Path("out")
    if not local_out.is_dir():
        print("out/ não existe", file=sys.stderr)
        return 1

    ftp = connect(host, user, password)
    mkdir_cwd(ftp, remote.split("/"))

    try:
        ftp.delete(".ftp-deploy-sync-state.json")
        print("Removido .ftp-deploy-sync-state.json obsoleto")
    except ftplib.error_perm as exc:
        print(f"Sync state ausente ou intacto ({exc})")

    root = ftp.pwd()
    dirs = sorted(
        {
            p.parent.relative_to(local_out).as_posix()
            for p in local_out.rglob("*")
            if p.is_file()
        }
    )
    created = 0
    for rel in dirs:
        ftp.cwd(root)
        if rel == ".":
            continue
        for part in rel.split("/"):
            try:
                ftp.cwd(part)
            except ftplib.error_perm:
                ftp.mkd(part)
                ftp.cwd(part)
                created += 1
    ftp.quit()
    print(f"Pastas FTP conferidas ({created} criadas)")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
