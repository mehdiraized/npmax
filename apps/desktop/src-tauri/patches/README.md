# Cargo patches

## `glib` (GHSA-wrw7-89jp-8q8g / RUSTSEC-2024-0429)

Tauri 2's Linux stack pins `gtk`/`webkit2gtk` → `glib ^0.18`. Upstream only marked `0.20.0` as fixed, and GTK3 bindings cannot move to `0.20`.

This directory vendors `glib` 0.18.5 with the two-character upstream fix from [gtk-rs/gtk-rs-core#1343](https://github.com/gtk-rs/gtk-rs-core/pull/1343) (`&p` → `&mut p` in `VariantStrIter::impl_get`), backported the same way as [gtk-rs/gtk-rs-core#2009](https://github.com/gtk-rs/gtk-rs-core/pull/2009).

Remove this patch once `glib` 0.18.6 (or Tauri GTK4 / v3) is available and Dependabot clears.
