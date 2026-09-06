#!/usr/bin/env python3
"""Refresh the vendored latin woff2 subsets under tools/og/fonts.

Only needed when the font list in templates.py changes, or to pick up a new
Google Fonts revision. The generator itself never touches the network.
"""
import pathlib
import re
import subprocess

URL = ("https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600"
       "&family=Space+Grotesk:wght@600;700&family=JetBrains+Mono:wght@500&display=swap")
UA = ("Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 "
      "(KHTML, like Gecko) Chrome/120.0 Safari/537.36")

out = pathlib.Path(__file__).parent / "fonts"
out.mkdir(parents=True, exist_ok=True)
css = subprocess.run(["curl", "-fsS", "-A", UA, URL], capture_output=True,
                     text=True, check=True).stdout

seen = {}
for subset, body in re.findall(r"/\*\s*([^*]+?)\s*\*/\s*@font-face\s*\{(.*?)\}", css, re.S):
    if subset.strip() != "latin":
        continue
    fam = re.search(r"font-family:\s*'([^']+)'", body).group(1)
    wgt = re.search(r"font-weight:\s*(\d+)", body).group(1)
    seen[(fam, wgt)] = re.search(r"url\((https[^)]+)\)", body).group(1)

for (fam, wgt), url in sorted(seen.items()):
    name = f"{fam.replace(' ', '')}-{wgt}.woff2"
    subprocess.run(["curl", "-fsS", "-o", str(out / name), url], check=True)
    print(f"{name:<28} {(out / name).stat().st_size / 1024:6.1f} KB")
