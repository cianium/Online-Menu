# Online Menu — Standalone demo

**Sample data only / فقط داده آزمایشی / بيانات تجريبية فقط / Yalnızca örnek veri**

Requirements: Node.js 22 or later, a modern browser. No npm install, API keys, database or backend required. Extract the entire ZIP into a new directory. Run from that directory:

```sh
node start.mjs
```

Customer: http://127.0.0.1:8765/
Admin: http://127.0.0.1:8765/admin/

Use the same browser profile and origin for the menu and admin. Changes are stored in that browser, not a shared database. Use only fictional products, contact details and reviews. Real ordering, payment, revenue, SMS and multi-device synchronization are not offered by this standalone package. Noindex is not authentication. Do not expose this local server to the internet. The demo bundles its fonts and sample photographs. The local launcher serves only loopback, with a restrictive Content Security Policy. Stop with Ctrl+C. To reset use a fresh browser profile; save any sample catalog backup before clearing site data. Source identity: VERSION.json. Public checksums: SHA256SUMS (relative to public/); entire delivery: PACKAGE-SHA256SUMS (relative to package root).

## فارسی
Node.js نسخه ۲۲ یا جدیدتر را نصب کنید؛ فایل ZIP را کامل استخراج کنید. در همان پوشه دستور `node start.mjs` را اجرا کنید و لینک‌های بالا را باز کنید. منوی مشتری و پنل مدیریت باید در یک مرورگر و با همان آدرس باز شوند. تغییرات فقط در مرورگر شما ذخیره می‌شوند. اطلاعات واقعی مشتری، سفارش، پرداخت یا پیامک وارد نکنید. توقف با Ctrl+C؛ برای شروع تازه از پروفایل جدید مرورگر استفاده کنید.

## العربية
ثبّت Node.js 22 أو أحدث، وفك ضغط الملف كاملاً. شغّل `node start.mjs` من المجلد وافتح الرابطين أعلاه في ملف تعريف المتصفح نفسه. تُحفظ التغييرات محلياً في المتصفح فقط. لا تستخدم بيانات العملاء الحقيقية أو الطلبات أو المدفوعات أو الرسائل النصية. للإيقاف استخدم Ctrl+C. للبدء من جديد استخدم ملف تعريف متصفح جديداً.

## Türkçe
Node.js 22 veya daha yeni bir sürüm kurun, ZIP dosyasının tamamını çıkarın ve klasörde `node start.mjs` komutunu çalıştırın. Yukarıdaki bağlantıları aynı tarayıcı profilinde açın. Değişiklikler yalnızca tarayıcıda saklanır. Gerçek müşteri verisi, sipariş, ödeme veya SMS kullanmayın. Ctrl+C ile durdurun; temiz başlangıç için yeni bir tarayıcı profili kullanın.

## Sample entry / ورود آزمایشی
Open http://127.0.0.1:8765/?qr=demo to preview the scan flow (synthetic marker, not a live table token). Use fictional name and phone only; the same tab retains its sample profile across reloads. A saved sample profile can be resumed in a new tab in the same browser with the same normalized name and phone. The name is checked even when the profile is already active. Sign out in the customer profile before switching accounts. Sample orders and club memberships stay in the browser. Orders and sample order totals appear in the demo admin. Generate a QR only for an admin-created table in Settings. The generic entry link above is a compatibility preview, not a table QR generator. Table QR links require the same browser profile and origin as the table registry. Scanning from another phone will not share the local data. The loopback address above works only on the computer running the demo. There is no live order, payment, SMS or OTP. Admin demo ID: `demo-admin`, password: `Demo-Only-2026` (public sample credentials, NOT real access control). Connected admin still uses server-owned email ID and password.
فارسی: لینک نمونه بالا فرم ورود مشتری را نشان می‌دهد؛ فقط اطلاعات ساختگی وارد کنید. برای بازیابی پروفایل، همان نام و شماره را وارد کنید. برای تغییر پروفایل ابتدا خارج شوید. رمز و شناسه مدیریت بالا عمومی‌اند و امنیت واقعی نیستند.
العربية: الرابط أعلاه يعرض تسجيل العميل التجريبي؛ استخدم بيانات وهمية فقط. لاستعادة الملف أدخل الاسم والرقم نفسيهما، وللتبديل سجّل الخروج أولاً. بيانات دخول الإدارة عامة وليست حماية فعلية.
Türkçe: Yukarıdaki bağlantı demo müşteri girişini gösterir; yalnızca kurgusal veriler kullanın. Profili açmak için aynı adı ve numarayı girin. Profil değiştirmek için önce çıkış yapın. Yönetim kimliği ve şifresi herkese açıktır, gerçek güvenlik değildir.
