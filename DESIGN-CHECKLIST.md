# ROMANO Digital Menu — Rv4.3.1 Debugged / Cleaned

چک‌لیست نهایی دیزاین، محتوا و لانچ برای نسخه Editorial Luxury / Food-first.

## 1. تصاویر محصول

| مورد | مشخصات |
|---|---|
| نسبت | **۴:۵** عمودی |
| رزولوشن | حداقل **1200 × 1500** px |
| فرمت | JPEG کیفیت ۸۲–۸۸٪ یا WebP |
| حجم هدف | زیر **180KB** در صورت امکان |
| پس‌زمینه | تیره / خنثی / سنگی یا چوبی مات |
| ممنوع | واترمارک، لوگوی استوک، متن روی عکس، فیلتر اغراق‌شده |

اولویت تعویض تصاویر نمونه: برگرها، پیتزاها و ساندویچ استیک.

## 2. تصاویر دسته‌بندی

نسبت **۱۶:۹** یا **۳:۲**، حداقل **1600 × 900** px و با یک سوژه غالب اشتهابرانگیز.

## 3. Hero / Story / Footer

- Hero: عریض و دارای فضای تنفس مناسب برای تیتر در RTL.
- Story: تصویر سینمایی از تجربه/فضای رستوران، نه فقط غذا.
- Footer: تیره و خلوت تا متن خوانا بماند.

## 4. Component UI

- [x] Product Card دارای radius و shadow مشترک
- [x] Category Card دارای radius و shadow مشترک
- [x] Signature Dish دارای radius بزرگ‌تر و shadow عمیق‌تر
- [x] Modal و overlay با زبان بصری مشترک
- [x] drawer همبرگری به یک الگوی واحد تبدیل شده است
- [x] مسیرهای تکراری از hamburger حذف شده‌اند
- [x] category links به‌صورت پویا از داده فعال منو ساخته می‌شوند
- [x] Escape، backdrop click و focus trap برای drawer

## 5. محتوای واقعی پیش از Production

- [ ] شماره تلفن واقعی در `js/data.js` → `restaurantData.phone`
- [ ] آدرس دقیق و تأییدشده
- [ ] لینک واقعی Instagram
- [ ] تصاویر نهایی بدون watermark
- [ ] متن‌های نهایی محصول، قیمت و badgeها

## 6. Production Security

- [ ] اتصال Admin به backend authentication
- [ ] server-side authorization / RBAC
- [ ] database + RLS
- [ ] حذف اتکا به `localStorage` برای مجوز دسترسی

## 7. تست نهایی

- [x] JavaScript syntax check
- [x] Modal focus/restore lifecycle consolidated
- [x] Observer cleanup / rebind hardened
- [x] Broken/default image references removed
- [x] Admin storage rollback on failed writes
- [x] local asset reference check
- [x] duplicate HTML id check
- [x] کارت‌های اصلی در Customer و Admin گرد و shadowدار شده‌اند
- [x] طراحی موبایل و دسکتاپ جداگانه برای drawer
- [ ] بررسی عکس‌ها و محتوا در دستگاه واقعی
- [ ] تأیید اطلاعات تماس قبل از انتشار
