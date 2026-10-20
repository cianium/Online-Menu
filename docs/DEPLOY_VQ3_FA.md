# راه‌اندازی و انتشار vq.3

## متغیرهای Edge

- `SUPABASE_URL`
- `SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_ROLE_KEY`
- `ROMANO_QR_SIGNING_SECRET` حداقل ۳۲ کاراکتر تصادفی
- `ROMANO_PUBLIC_ORIGINS` و `ROMANO_ADMIN_ALLOWED_ORIGINS`
- `ROMANO_PAYMENT_PUBLIC_ORIGIN` مانند `https://food.kiankhayat.me`
- `ROMANO_PAYMENT_ALLOWED_ORIGINS`

> مطابق مستندات فعلی Supabase، کلیدهای legacy یعنی `anon` و
> `service_role` فقط تا پایان ۲۰۲۶ پشتیبانی می‌شوند. کد فعلی هنوز برای سازگاری
> با پروژهٔ موجود `SUPABASE_SERVICE_ROLE_KEY` را می‌خواند؛ مهاجرت کنترل‌شده به
> `SUPABASE_SECRET_KEYS` و `@supabase/server` باید پیش از خاموش‌کردن کلید legacy
> روی staging انجام شود. Secret هرگز نباید وارد فایل استاتیک یا مرورگر شود.

## ترتیب انتشار امن

1. از دیتابیس نسخه پشتیبان بگیرید و migration drift را بررسی کنید.
2. schema پایهٔ کاتالوگ را با `supabase db dump` از پروژهٔ مرجع version کنید؛
   migrationهای موجود به جدول‌های قدیمی `restaurants/products/users` متکی‌اند و
   هنوز یک دیتابیس خالی را به‌تنهایی bootstrap نمی‌کنند.
3. تمام migrationها را ابتدا روی staging/PostgreSQL 17 اجرا کنید. migration
   `20261020120708_harden_payment_invariants.sql` اگر چند تلاش فعال/تأییدشدهٔ
   تاریخی برای یک سفارش ببیند عمداً متوقف می‌شود تا با زرین‌پال تطبیق دستی شود.
4. شعبه را با `currency_code='IRR'`، `currency_exponent=0` و در صورت تومان بودن کاتالوگ با `menu_price_to_minor_multiplier=10` تنظیم کنید.
5. جدول‌ها را بسازید، QR امضاشده تولید کنید و سپس `qr_ordering_enabled` را فعال کنید.
6. در پنل، Merchant ID شعبه را ابتدا با Sandbox ذخیره و پرداخت/callback را end-to-end تست کنید.
7. Edge Functionهای `romano-order`، `romano-payment` و `romano-admin` را منتشر و سپس فایل‌های استاتیک را deploy کنید.
8. نرخ‌محدودسازی Edge/WAF، لاگ خطا، هشدار `payment.request_ambiguous` و
   `payment.duplicate_verified` و reconciliation روزانه پرداخت را فعال کنید.

پیش از migration این دو query باید هیچ ردیفی برنگردانند:

```sql
select order_id, count(*)
from public.payment_attempts
where status in ('initiated', 'requested', 'requires_review')
group by order_id having count(*) > 1;

select order_id, count(*)
from public.payment_attempts
where status = 'verified'
group by order_id having count(*) > 1;
```

Merchant ID زرین‌پال در جدول private-to-browser ذخیره می‌شود و فقط service role آن را می‌خواند. اگر provider آینده API secret داشت، secret باید در Vault/KMS قرار گیرد و نه در جدول یا مرورگر.

## Definition of Done عملیاتی

- QR قدیمی بعد از افزایش `qr_version` رد شود.
- قیمت دست‌کاری‌شده مرورگر اثری بر مبلغ سفارش نداشته باشد.
- retry سفارش و پرداخت رکورد تکراری نسازد.
- callback تکراری زرین‌پال idempotent باشد.
- callback ناموفق قدیمی نتواند سفارش `paid` را به `failed` برگرداند.
- timeout مبهم request درگاه retry خودکار نسازد و برای تطبیق علامت‌گذاری شود.
- مدیر رستوران دیگر نتواند سفارش tenant دیگر را ببیند.
- transition همزمان با version قدیمی خطای 409 بدهد.
- هیچ `.env`، service key یا credential داخل بسته/مرورگر نباشد.

## تست محلی دیتابیس

`npm run qa:db` یک PostgreSQL 17 موقت می‌سازد، fixture حداقلی schema قدیمی را
بارگذاری می‌کند، چهار migration سفارش/پرداخت را واقعاً اجرا می‌کند و سناریوی
سفارش، reuse تلاش فعال، callback تکراری و جلوگیری از downgrade را می‌آزماید.
fixture فقط برای QA است و جایگزین baseline واقعی production نیست.
