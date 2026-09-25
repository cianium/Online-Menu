# ROMANO API Contract — v1 draft

## Public
- `GET /api/v1/public/restaurants/:slug/menu?lang=fa`
- `GET /api/v1/public/restaurants/:slug/categories?lang=fa`
- `GET /api/v1/public/restaurants/:slug/products?lang=fa&category=...`

Public responses should contain only published/active content.

## Admin
- `GET /api/v1/admin/me`
- `GET /api/v1/admin/restaurants/:restaurantId`
- `PATCH /api/v1/admin/restaurants/:restaurantId`
- `POST /api/v1/admin/restaurants/:restaurantId/categories`
- `PATCH /api/v1/admin/restaurants/:restaurantId/categories/:categoryId`
- `DELETE /api/v1/admin/restaurants/:restaurantId/categories/:categoryId`
- `POST /api/v1/admin/restaurants/:restaurantId/products`
- `PATCH /api/v1/admin/restaurants/:restaurantId/products/:productId`
- `DELETE /api/v1/admin/restaurants/:restaurantId/products/:productId`
- `POST /api/v1/admin/restaurants/:restaurantId/media`
- `GET /api/v1/admin/restaurants/:restaurantId/audit-logs`

## Publishing
Add explicit draft/published version entities before allowing multiple staff users to edit a live menu. The public API should read a stable published version rather than an actively edited draft.
