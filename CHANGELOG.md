# Changelog

تمام تغییرات مهم Online Menu از این نسخه در این فایل ثبت می‌شوند. نسخه‌های قدیمی و نام‌گذاری تاریخی در [docs/CHANGELOG.md](docs/CHANGELOG.md) و [docs/RELEASES.md](docs/RELEASES.md) نگهداری شده‌اند.

## [Online-Menu-vq.3] — 2026-10-20

### افزوده شد

- سبد خرید، نشست امن QR میز، ثبت idempotent سفارش و صفحهٔ پیگیری مشتری
- برد زندهٔ سفارش‌ها/KDS با فیلتر شعبه، ماشین وضعیت و optimistic locking
- پرداخت مستقیم هر شعبه با آداپتر زرین‌پال و verify سمت سرور
- مدل دادهٔ شعبه، میز، نشست، سفارش، پرداخت، رویداد و integration outbox
- Edge Functionهای version-controlled برای API عمومی، سفارش و پرداخت
- formatter مشترک پول و تفکیک مبلغ canonical از برچسب نمایشی تومان
- تست‌های قرارداد API، idempotency، migration و callback تکراری روی PostgreSQL 17

### تغییر کرد

- برند محصول در رابط و metadata به RAMEN تغییر کرد؛ شناسه‌های فنی ROMANO برای سازگاری حفظ شدند.
- هدرهای امنیتی Vercel، CSP، origin checks و مسیرهای same-origin API کامل شدند.
- پنل مدیریت به عملیات سفارش و تنظیمات درگاه شعبه گسترش یافت.

### امنیت

- یک تلاش فعال و یک پرداخت verified برای هر سفارش enforce می‌شود.
- وضعیت پرداخت paid/refunded monotonic است و callback قدیمی امکان downgrade ندارد.
- request مبهم PSP به‌جای retry خودکار با `requires_review` برای reconciliation علامت می‌خورد.
- مبلغ و قیمت از دیتابیس خوانده می‌شود و دادهٔ مرورگر منبع حقیقت نیست.

### نکات استقرار

- migrationها additive هستند و سفارش QR تا تنظیم صحیح شعبه به‌صورت پیش‌فرض خاموش می‌ماند.
- فعال‌سازی پرداخت نیازمند Merchant ID همان شعبه و secretهای Edge معتبر است.
- ترتیب دقیق انتشار و rollback در [docs/DEPLOY_VQ3_FA.md](docs/DEPLOY_VQ3_FA.md) آمده است.

[Online-Menu-vq.3]: https://github.com/cianium/Online-Menu/releases/tag/vq.3
