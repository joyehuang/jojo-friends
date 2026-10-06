# Filo · 值班版 (On duty) — private sources

A static identity look for **Filo `o18` (No.24)**, approved by Joye on 2026-10-06. It is a costume for an existing character, not a 27th character: Filo's id, number, default design and its 16 emotions × 6 statuses are unchanged, and this look has none of them.

| file | what it is |
| --- | --- |
| `filo-ops-avatar-1024.png` | the approved image (the single source of truth), 1024 × 1024 |
| `filo-ops-avatar-128.png` | small-size check |
| `filo-ops-avatar.private.svg` | vector master: the private `o18` export plus a one-ear headset, a mint indicator light and a heartbeat safeguard badge |
| `design.py` | the script that built the SVG (reads `private-exports/o18/o18.svg` from `pnpm export:private`) |
| `design-notes.txt` | the original design note |

**Public copy:** `src/site/variants/filo-on-duty.webp` is a lossless WebP of `filo-ops-avatar-1024.png` (pixel-identical, made with `sharp(...).webp({ lossless: true })`) and is the only file of this look the website ships, shown at `/c/o18#on-duty`. The SVG master, the PNGs, the script and this folder stay in the private repository; `scripts/check-public-dist.ts` allows exactly one `assets/filo-on-duty-*.webp` in the public build and nothing else from here. Not a bot / Telegram / QQ avatar.
