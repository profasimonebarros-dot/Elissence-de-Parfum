---
name: Atlântico catalog import
description: Durable constraints for refreshing the external perfume catalog.
---

The Atlântico Stor catalog is loaded incrementally in the browser rather than exposing the full collection in the initial HTML. Product cards may expose only a promotional price, so importers must read both standard and promotional price fields.

**Why:** The initial server-rendered page underreported large categories and a standard-price-only parser produced incomplete prices.

**How to apply:** Scroll until the product-card count stabilizes, normalize repeated leading punctuation in names, deduplicate by SKU, validate the resulting count and image uniqueness, and only then replace the database catalog.