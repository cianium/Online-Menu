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
Open http://127.0.0.1:8765/?qr=demo to preview the scan flow (synthetic marker, not a live table token). Use fictional name and phone only; the same tab retains its sample profile across reloads. A phone number alone cannot unlock another profile. Sample orders and club memberships stay in the browser. Orders, sample order totals and the sign-in QR appear in the demo admin. A phone scanning a QR must be able to reach the URL encoded in it. The loopback address above works on the computer running the demo. There is no live order, payment, SMS or OTP. Admin demo ID: `demo-admin`, password: `Demo-Only-2026` (public sample credentials, NOT real access control). Connected admin still uses server-owned email ID and password.
فارسی: لینک نمونه بالا فرم ورود مشتری را نشان می‌دهد؛ فقط اطلاعات ساختگی وارد کنید. رمز و شناسه مدیریت بالا عمومی‌اند و امنیت واقعی نیستند.
العربية: الرابط أعلاه يعرض تسجيل العميل التجريبي؛ استخدم بيانات وهمية فقط. بيانات دخول الإدارة عامة وليست حماية فعلية.
Türkçe: Yukarıdaki bağlantı demo müşteri girişini gösterir; yalnızca kurgusal veriler kullanın. Yönetim kimliği ve şifresi herkese açıktır, gerçek güvenlik değildir.
