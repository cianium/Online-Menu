# RAMEN · Online Menu vq.3

<div align="center">

**منوی دیجیتال چندزبانه، سفارش QR، عملیات رستوران و پرداخت مستقیم شعبه**

[![CI](https://github.com/cianium/Online-Menu/actions/workflows/ci.yml/badge.svg)](https://github.com/cianium/Online-Menu/actions/workflows/ci.yml)
[![Live](https://img.shields.io/badge/Live-food.kiankhayat.me-0B7285)](https://food.kiankhayat.me)
![Release](https://img.shields.io/badge/Release-vq.3-F59E0B)

</div>

> **هویت محصول:** `RAMEN` نام برند فعلی و `Online-Menu` نام مخزن و نسخهٔ محصول است. نام `ROMANO` در شناسه‌های فنی، Edge Functionها و اسناد تاریخی برای سازگاری با محیط موجود حفظ شده است.

## محصول چیست؟

Online Menu vq.3 مسیر مهمان را از اسکن QR تا ثبت، پرداخت و پیگیری سفارش کوتاه می‌کند و هم‌زمان به تیم رستوران یک پنل مدیریت منو و برد زندهٔ سفارش‌ها می‌دهد. پول سفارش مستقیماً با درگاه همان شعبه تسویه می‌شود؛ پلتفرم وجه رستوران را نگهداری نمی‌کند.

```text
مهمان و QR میز             کارکنان رستوران
      │                           │
      ▼                           ▼
منوی موبایل → سبد → سفارش → برد زنده / KDS
      │              │            │
      │              └──── Supabase/PostgreSQL
      ▼                           │
پرداخت زرین‌پال ← verify سرور ←───┘

          پنل مدیریت
     منو · ترجمه · رسانه · شعبه
```

## قابلیت‌های vq.3

| بخش | وضعیت در سورس |
| --- | --- |
| منوی مشتری | جستجو، فیلتر، علاقه‌مندی، چهار زبان، RTL/LTR و طراحی responsive/image-first |
| سفارش QR | نشست امن میز، سبد، قیمت‌گذاری سمت سرور، ثبت idempotent و پیگیری وضعیت |
| عملیات | صف زنده، KDS، ماشین وضعیت، optimistic locking و رویدادهای immutable |
| پرداخت | آداپتر زرین‌پال، request/verify سمت سرور، callback idempotent و کنترل پرداخت تکراری |
| مدیریت | CMS منو و رسانه، snapshot اتمیک، نقش‌های tenant-aware و audit log |
| زیرساخت | Vercel، Supabase Edge Functions، PostgreSQL 17، CSP و RLS fail-closed |

فعال‌شدن سفارش واقعی هر شعبه به ساخت شعبه/میز، QR امضاشده، تنظیم واحد پول و Merchant ID معتبر نیاز دارد. این قابلیت عمداً با feature flag شعبه بسته می‌ماند تا تنظیمات مالی کامل شود.

## معماری و ساختار مخزن

```text
index.html, js/, css/             رابط مشتری
admin/                            پنل مدیریت و KDS
supabase/functions/               API عمومی، ادمین، سفارش و پرداخت
supabase/migrations/              مدل داده و invariantهای تراکنش
backend/                          مسیر محلی Fastify/PostgreSQL
qa/, backend/test/                تست‌های استاتیک، قراردادی، مرورگر و دیتابیس
.github/workflows/                CI و smoke testهای محیط زنده
docs/                             تحلیل محصول، امنیت و راهنمای انتشار
```

در Production، `vercel.json` درخواست‌های `/api/v1/*` را به Edge Functionهای Supabase هدایت می‌کند. مرورگر هیچ‌وقت service-role key، Merchant ID یا حقیقت مبلغ سفارش را در اختیار ندارد.

## اجرای محلی

پیش‌نیازها: Node.js 22+، npm، PostgreSQL 17 یا Docker.

```bash
git clone https://github.com/cianium/Online-Menu.git
cd Online-Menu
npm --prefix backend ci
cp backend/.env.example backend/.env
# فقط credential محلی را در backend/.env قرار دهید.
docker compose up -d postgres
npm run backend:migrate
npm run backend:seed
npm run backend:start
```

سپس `http://localhost:3000/` برای منوی مشتری و `http://localhost:3000/admin/` برای پنل مدیریت در دسترس است. فایل `.env`، کلید service role و tokenها نباید commit شوند.

## کیفیت و تست

```bash
npm run qa          # syntax + static audit + unit/contract tests
npm run qa:db       # اجرای واقعی migrationها و smoke test روی PostgreSQL 17
npm run qa:customer # سناریوهای مرورگر منوی مشتری
npm run qa:browser  # سناریوهای مرورگر پنل مدیریت
```

تست مرورگر به Playwright/Chromium و preview محلی نیاز دارد. موفقیت تست‌های mock جای تست callback واقعی PSP، backup/restore و tenant isolation روی staging را نمی‌گیرد.

## امنیت و مرز اعتماد

- قیمت، مبلغ نهایی و مجازبودن پرداخت فقط در سرور تعیین می‌شود.
- نشست‌ها با cookie امن و token هش‌شده نگهداری می‌شوند؛ QR با HMAC امضا و قابل ابطال است.
- سفارش، شروع پرداخت و callback در برابر retry و concurrency idempotent هستند.
- وضعیت `paid/refunded` به عقب برنمی‌گردد و پرداخت مبهم برای reconciliation علامت می‌خورد.
- جدول‌های حساس برای `anon` و `authenticated` بسته‌اند و RPCهای مالی فقط در اختیار `service_role` هستند.
- CSP، HSTS، محدودیت origin/CSRF و audit trail در لایه‌های وب و API اعمال شده‌اند.

گزارش آسیب‌پذیری را عمومی ثبت نکنید؛ روش گزارش در [SECURITY.md](SECURITY.md) آمده است.

## انتشار و اسناد محصول

- [تعریف محصول، بازار و مدل درآمد](docs/ONLINE_MENU_VQ3_FA.md)
- [راهنمای استقرار و Definition of Done](docs/DEPLOY_VQ3_FA.md)
- [Release notes نسخهٔ vq.3](docs/releases/ONLINE_MENU_VQ3_FA.md)
- [سیاست نسخه‌ها و سوابق قدیمی](docs/RELEASES.md)
- [معماری](docs/ARCHITECTURE.md) و [قرارداد API](docs/API_CONTRACT.md)

## وضعیت و مجوز

مخزن عمومی است اما مجوز متن‌باز برای آن انتخاب نشده؛ نبود فایل `LICENSE` به معنی اعطای مجوز استفاده، تغییر یا توزیع نیست.

**Maintainer:** [Kian Khayat](https://github.com/cianium)<br>
**Repository:** https://github.com/cianium/Online-Menu<br>
**Production:** https://food.kiankhayat.me
