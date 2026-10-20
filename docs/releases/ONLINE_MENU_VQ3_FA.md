# Release notes — Online-Menu-vq.3

تاریخ: ۲۸ مهر ۱۴۰۵ / ۲۰ اکتبر ۲۰۲۶<br>
برند: RAMEN<br>
مخزن: `cianium/Online-Menu`<br>
Production: <https://food.kiankhayat.me>

## نتیجهٔ نسخه

vq.3 منوی دیجیتال را از یک تجربهٔ مشاهده و مدیریت محتوا به هستهٔ قابل‌گسترش عملیات رستوران تبدیل می‌کند: مهمان از QR میز وارد می‌شود، سفارش را با قیمت سروری ثبت می‌کند، پرداخت را مستقیماً به درگاه شعبه می‌فرستد و وضعیت را پیگیری می‌کند؛ کارکنان همان سفارش را در KDS مدیریت می‌کنند.

## اجزای تحویلی

- تجربهٔ مشتری چهارزبانه با جستجو، فیلتر، علاقه‌مندی، سبد و tracking؛
- نشست QR امضاشده و قابل ابطال با token هش‌شده؛
- سفارش اتمیک، idempotency key، snapshot نام/قیمت و شمارهٔ ترتیبی شعبه؛
- KDS با transitionهای مجاز، version check و audit/event log؛
- پرداخت زرین‌پال با request/verify سروری و callback امن؛
- تنظیمات payment gateway در سطح شعبه؛
- outbox برای اتصال بعدی POS، چاپگر و notification؛
- CI، تست قرارداد و اجرای واقعی چهار migration روی PostgreSQL 17.

## invariantهای مالی

1. مرورگر قیمت و مبلغ نهایی را تعیین نمی‌کند.
2. هر سفارش فقط یک تلاش پرداخت فعال و یک نتیجهٔ verified دارد.
3. retry همان درخواست رکورد یا تراکنش تازه نمی‌سازد.
4. پرداخت `paid/refunded` با callback ناموفق قدیمی به عقب برنمی‌گردد.
5. timeout مبهم PSP برای بررسی انسانی علامت می‌خورد و خودکار تکرار نمی‌شود.
6. پول مهمان مستقیماً به Merchant ID شعبه می‌رود؛ پلتفرم تجمیع‌کنندهٔ وجوه نیست.

## سازگاری و تغییرات عملیاتی

- schema سفارش additive است اما به جدول‌های پایهٔ `restaurants`، `products` و `users` متکی است.
- نام‌های `romano-*` و متغیرهای `ROMANO_*` فعلاً contract سازگاری زیرساخت‌اند و در این release تغییر نمی‌کنند.
- ordering در هر شعبه با `qr_ordering_enabled=false` ساخته می‌شود و فقط پس از تنظیم currency، multiplier، میزها و QR فعال می‌شود.
- هیچ Merchant ID یا secret واقعی داخل repository یا artifact قرار ندارد.

## معیار پذیرش release

- `npm run qa` بدون خطا؛
- `npm run qa:db` روی PostgreSQL 17 بدون خطا؛
- عدم وجود secret در diff و artifact؛
- migration preflight و advisory check روی Supabase؛
- deploy و smoke test Edge Functionها پیش از تغییر frontend production؛
- ساخت deployment آماده، تست مستقیم و سپس promotion دامنه؛
- امکان rollback به deployment قبلی بدون rollback کردن migrationهای additive.

## مواردی که feature flag می‌مانند

- سفارش واقعی میز تا صدور QRهای production؛
- پرداخت تا ثبت Merchant ID معتبر و تست sandbox/real callback؛
- SMS، چاپ آشپزخانه، loyalty، POS sync و delivery که در roadmap هستند.

## rollback

در رخداد frontend/API، دامنه به deployment قبلی promote می‌شود و ordering شعبه خاموش می‌گردد. migrationها به دلیل additive بودن درجا می‌مانند؛ حذف جدول یا داده بخشی از rollback اضطراری نیست. پرداخت‌های `requires_review` باید پیش از retry با PSP تطبیق داده شوند.
