# ROMANO Multilingual Content Model

The current client already switches its presentation UI between `fa`, `en`, `tr` and `ar`. That solves interface localization, not multilingual customer content.

## Production model
Keep IDs stable and store language fields separately:

```text
product(id)
  └── product_translations(product_id, language_code, name, description, badge_label)

category(id)
  └── category_translations(category_id, language_code, name)

restaurant(id)
  └── restaurant_translations(restaurant_id, language_code, name, tagline, description, address)
```

## Fallback
1. Requested language.
2. Restaurant default language.
3. `fa` seed content as a final fallback only during migration.

## Admin UX
The product/category/restaurant editor should eventually expose a language tab or side-by-side fields for the four supported languages, with an explicit “copy from default language” action. Do not silently overwrite an existing translation.
