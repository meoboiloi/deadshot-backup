"""mitmproxy addon: serve patched DEADSHOT responses locally.

Usage:
    mitmproxy -s mitm-deadshot.py
    # or
    mitmdump -s mitm-deadshot.py

It replaces:
    GET https://deadshot.io/                     -> out/index.html
    GET https://deadshot.io/final.pkg?*          -> out/final.pkg
    GET https://deadshot.io/final_legacy.pkg?*   -> out/final.pkg

Build the files first:  node build.js  (or your own build).
"""
import os
from mitmproxy import http

BASE = os.path.join(os.path.dirname(os.path.abspath(__file__)), "out")
INDEX = os.path.join(BASE, "index.html")
PKG = os.path.join(BASE, "final.pkg")


def _read(path: str) -> bytes:
    with open(path, "rb") as f:
        return f.read()


class DeadshotPatch:
    def response(self, flow: http.HTTPFlow) -> None:
        if flow.request.pretty_host != "deadshot.io":
            return
        path = flow.request.path.split("?")[0]

        if path in ("/", "/index.html"):
            flow.response = http.Response.make(
                200,
                _read(INDEX),
                {
                    "Content-Type": "text/html; charset=utf-8",
                    "Cache-Control": "no-store, must-revalidate",
                },
            )
            return

        if path in ("/final.pkg", "/final_legacy.pkg"):
            flow.response = http.Response.make(
                200,
                _read(PKG),
                {
                    "Content-Type": "application/octet-stream",
                    "Cache-Control": "no-store",
                },
            )


addons = [DeadshotPatch()]
