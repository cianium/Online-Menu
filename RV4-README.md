# ROMANO Digital Menu — Rv4.6 Complete Merged

منوی دیجیتال رستوران رمانو · Editorial Luxury / Food-first

## معماری Customer

- `css/style.css` — Foundation / reset / base layout
- `css/romano.css` — Presentation، component system، responsive و navigation drawer
- `js/data.js` — seed data
- `js/app.js` — هسته منطق + Search + Reading Progress + Deep Links + Share + Editorial content + Navigation UX

منطق Customer که در لایه‌های جداگانه نسخه‌های قبلی بود اکنون در فایل‌های اصلی ادغام شده و فایل‌های deprecated از بسته حذف شده‌اند.

## تغییرات کلیدی Rv4.3

### Visual system
- radius و shadow مشترک برای کارت‌های Customer
- کارت‌های Product / Category / Signature و Modal با سلسله‌مراتب ظریف اما یکپارچه
- micro-interactionهای کنترل‌شده و سازگار با reduced-motion

### Hamburger navigation
- drawer واحد RTL با backdrop مستقل
- فقط ۵ مسیر اصلی: خانه، منوی رمانو، انتخاب ویژه، درباره رمانو، تماس
- دسته‌بندی‌ها در بخش جداگانه و به‌صورت پویا
- حذف مسیر تکراری «دسته‌بندی‌ها» از navigation اصلی
- close button، backdrop click، Escape، focus restore و focus trap
- scroll-lock بدون پرش layout

### QA / Hardening
- active navigation برای مسیرهای اصلی و دسته‌ها
- شماره تلفن و metadataهای نسخه Rv4.3 هماهنگ شده‌اند
- Admin component system نیز rounded و shadowدار شده است

## Production notes

اطلاعات تماس و تصاویر نمونه هنوز باید با داده‌های واقعی رستوران جایگزین و تأیید شوند. احراز هویت Admin در این پروژه همچنان یک لایه MVP است و برای Production به server-side authorization و backend نیاز دارد.

## اجرا
```bash
python3 -m http.server 8080
```


## Admin Console update — Rv4.6 Complete Merged

- Refined the admin header with direct customer-menu preview and a one-click add-product action.
- Added a localized date stamp and a dashboard welcome strip.
- Added quick navigation cards for Products, Categories, and Restaurant Settings.
- Added dashboard integrity indicators for inactive products, invalid category references, and contact-detail completeness.
- Added a responsive premium footer and refined keyboard focus styles.
- Expanded product search to include category, description, and badge text.
- Kept the UI enhancement layer additive; existing data operations and local-storage behavior remain in place.

### Admin QA scope
- JavaScript syntax checks pass for the Customer and Admin scripts.
- Admin HTML IDs are unique and all local asset references resolve.
- Browser-based interactive verification was not available in this execution environment.
- Admin access remains a client-side MVP gate; do not treat it as production-grade authentication.


## Rv4.6 Complete Merge

این بسته بر پایه‌ی کامل‌ترین شاخه‌ی Rv4.5 Language Switcher ساخته شده و همه‌ی قابلیت‌های پایدار Rv4.3.1، پنل Admin Workspace و Language Switcher را یکپارچه می‌کند.

### Merge hardening
- داده‌های ذخیره‌شده‌ی Admin منبع حقیقت هستند و تغییر زبان آن‌ها را بازنویسی نمی‌کند.
- برای category/product/restaurantهای سفارشی، ترجمه فقط زمانی اعمال می‌شود که مقدار هنوز همان seed اولیه باشد.
- پس از تغییر زبان، observerهای دسته‌بندی و navigation دوباره bind می‌شوند تا DOM جدید بدون regression کار کند.
- labelهای پویا، accessibility textهای اصلی، اشتراک‌گذاری/کپی، signature dish، عنوان صفحه و meta description با زبان فعال هماهنگ می‌شوند.
- نسخه‌ی backup به Rv4.6 به‌روزرسانی شده است.

### Verification note
در این محیط اجرای interactive browser به‌دلیل محدودیت محیطی قابل اتکا نبود؛ بنابراین این بسته با بررسی syntax، ساختار HTML، شناسه‌های تکراری، asset referenceها و integrity بین نسخه‌ها اعتبارسنجی شده است.
