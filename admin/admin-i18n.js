/* =========================================================
   ROMANO ADMIN — Full UI localization
   Presentation only; saved content remains unchanged.
========================================================= */
(function () {
    "use strict";

    const STORAGE_KEY = "romano_language";
    const LANGS = ["fa", "en", "tr", "ar"];

    const T = {
      "پشتیبان همه شعبه‌ها": ["All-branch backup","Tüm şubelerin yedeği","نسخة احتياطية لكل الفروع"],
      "شامل منو، میزها، اعضا، سفارش‌ها، پیش‌نویس وفاداری و نظرات همه شعبه‌ها؛ فایل حاوی اطلاعات شخصی است و باید خصوصی بماند.": ["Includes menus, tables, members, orders, loyalty drafts and reviews for every branch. The file contains personal information; keep it private.","Tüm şubelerin menülerini, masalarını, üyelerini, siparişlerini, sadakat taslaklarını ve yorumlarını içerir. Dosyada kişisel bilgiler vardır; gizli tutun.","يشمل القوائم والطاولات والأعضاء والطلبات ومسودات الولاء والتقييمات لكل الفروع. يحتوي الملف على بيانات شخصية؛ احفظه بسرية."],
      "برای بازیابی کامل از یک مرورگر یا پروفایل خالی استفاده کنید و تب‌های دیگر را ببندید. اطلاعات موجود بازنویسی نمی‌شوند.": ["For full restore, use an empty browser profile and close other tabs. Existing data will not be overwritten.","Tam geri yükleme için boş bir tarayıcı profili kullanın ve diğer sekmeleri kapatın. Mevcut verilerin üzerine yazılmaz.","للاستعادة الكاملة استخدم ملف متصفح فارغًا وأغلق علامات التبويب الأخرى. لن تُستبدل البيانات الموجودة."],
      "خروجی همه شعبه‌ها": ["Export all branches","Tüm şubeleri dışa aktar","تصدير كل الفروع"],
      "بازیابی همه شعبه‌ها": ["Restore all branches","Tüm şubeleri geri yükle","استعادة كل الفروع"],
      "همه داده‌های پشتیبان در این محیط خالی بازیابی شوند؟": ["Restore all backup data into this empty workspace?","Tüm yedek veriler bu boş çalışma alanına geri yüklensin mi?","هل تريد استعادة جميع بيانات النسخة الاحتياطية في مساحة العمل الفارغة؟"],
      "برای بازیابی همه شعبه‌ها از محیط خالی استفاده کنید.": ["Use an empty workspace to restore all branches.","Tüm şubeleri geri yüklemek için boş bir çalışma alanı kullanın.","استخدم مساحة عمل فارغة لاستعادة كل الفروع."],
      "بازیابی ناقص است؛ داده‌ها را بررسی کنید و دوباره وارد نکنید.": ["Restore was incomplete. Inspect the data before attempting another import.","Geri yükleme tamamlanamadı. Yeniden içe aktarmadan önce verileri kontrol edin.","الاستعادة غير مكتملة. افحص البيانات قبل محاولة الاستيراد مجددًا."],
      "مدیریت وضعیت شعبه": ["Manage branch status","Şube durumunu yönet","إدارة حالة الفرع"],
      "غیرفعال‌سازی، ورود و سفارش جدید را متوقف می‌کند؛ اطلاعات قبلی حذف نمی‌شوند.": ["Deactivation stops new sign-ins and orders; existing data is retained.","Devre dışı bırakma yeni girişleri ve siparişleri durdurur; mevcut veriler korunur.","يوقف التعطيل تسجيل الدخول والطلبات الجديدة؛ وتُحفظ البيانات السابقة."],
      "شعبه غیرفعال": ["Inactive branch","Pasif şube","فرع غير نشط"],
      "شعبه فعال": ["Active branch","Aktif şube","فرع نشط"],
      "این شعبه غیرفعال شود؟ اطلاعات قبلی حفظ می‌شوند.": ["Deactivate this branch? Existing data will be retained.","Bu şube devre dışı bırakılsın mı? Mevcut veriler korunacak.","هل تريد تعطيل هذا الفرع؟ ستُحفظ البيانات السابقة."],
      "مشتریان دارای سفارش نمونه": ["Customers with sample orders","Örnek siparişi olan müşteriler","العملاء الذين لديهم طلبات تجريبية"],
      "پنج قلم پر‌سفارش بر اساس تعداد": ["Top five items by quantity","Adede göre en çok sipariş edilen beş ürün","أكثر خمسة أصناف طلبًا حسب الكمية"],
      "شعبه‌های آزمایشی": ["Demo branches","Demo şubeler","الفروع التجريبية"],
      "کاتالوگ، اعضا و سفارش‌های هر شعبه در همین مرورگر جداگانه ذخیره می‌شوند.": ["Each branch keeps its own catalog, members and orders in this browser.","Her şubenin menüsü, üyeleri ve siparişleri bu tarayıcıda ayrı saklanır.","يُحفظ منيو كل فرع وأعضاؤه وطلباته بشكل منفصل في هذا المتصفح."],
      "نام شعبه جدید": ["New branch name","Yeni şube adı","اسم الفرع الجديد"],
      "نام شعبه فعال": ["Current branch name","Geçerli şubenin adı","اسم الفرع الحالي"],
      "ذخیره نام شعبه": ["Save branch name","Şube adını kaydet","حفظ اسم الفرع"],
      "افزودن شعبه آزمایشی": ["Add demo branch","Demo şube ekle","إضافة فرع تجريبي"],
      "نام یا کد معتبر و غیرتکراری وارد کنید.": ["Enter a valid, unique name or code.","Geçerli ve benzersiz bir ad veya kod girin.","أدخل اسمًا أو رمزًا صالحًا وغير مكرر."],
      "باز کردن ورود آزمایشی مشتری": ["Open demo customer entry","Demo müşteri girişini aç","فتح دخول العميل التجريبي"],
      "فقط داده آزمایشی": ["Sample data only","Yalnızca örnek veri","بيانات تجريبية فقط"],
      "با شناسه و رمز عمومی نمونه وارد شوید؛ این حساب واقعی نیست.": ["Sign in with the public sample ID and password; this is not a real account.","Herkese açık örnek kimlik ve şifreyle giriş yapın; bu gerçek hesap değildir.","ادخل بالمعرّف وكلمة المرور التجريبيين العامين؛ هذا ليس حسابًا حقيقيًا."],
      "دسترسی آزمایشی مدیریت": ["Demo admin access","Demo yönetim erişimi","دخول الإدارة التجريبي"],
      "زبان": ["Language","Dil","اللغة"],
      "عضو نمونه‌ای ثبت نشده است.": ["No sample members yet.","Henüz örnek üye yok.","لا يوجد أعضاء تجريبيون بعد."],
      "تعداد سفارش‌های نمونه": ["Sample order count","Örnek sipariş sayısı","عدد الطلبات التجريبية"],
      "فقط داده آزمایشی مرورگر": ["Browser sample data","Tarayıcıdaki örnek veriler","بيانات تجريبية في المتصفح"],
      "سفارش‌های نمونه ثبت‌شده در همین مرورگر.": ["Sample orders saved in this browser.","Bu tarayıcıya kaydedilen örnek siparişler.","الطلبات التجريبية المحفوظة في هذا المتصفح."],
      "هنوز سفارش نمونه‌ای ثبت نشده است.": ["No sample orders yet.","Henüz örnek sipariş yok.","لا توجد طلبات تجريبية بعد."],
      "نمایش ۵۰ سفارش اخیر": ["Showing the 50 most recent orders","Son 50 sipariş gösteriliyor","عرض أحدث ٥٠ طلبًا"],
      "واحد پول ثبت نشده": ["Currency not recorded","Para birimi kaydedilmemiş","العملة غير مسجلة"],
      "QR ورود آزمایشی": ["Sample sign-in QR","Örnek giriş QR kodu","رمز الدخول التجريبي"],
      "برای باز کردن فرم عضویت نمونه اسکن کنید.": ["Scan to open the sample registration form.","Örnek kayıt formunu açmak için tarayın.","امسح الرمز لفتح نموذج التسجيل التجريبي."],
      "این بخش فقط پیش‌نویس محلی است؛ ارسال پیامک، اعمال تخفیف و اطلاعات اعضای واقعی به سرویس سرور نیاز دارد.": ["Local drafts only; SMS, discounts and real members require a server.","Yalnızca yerel taslaklar; SMS, indirimler ve gerçek üyeler sunucu gerektirir.","مسودات محلية فقط؛ الرسائل والخصومات والأعضاء الحقيقيون يتطلبون خادمًا."],
      "فقط اطلاعات ساختگی همین مرورگر؛ عضویت و سفارش واقعی نیست.": ["Fictional data in this browser only; no real memberships or orders.","Yalnızca bu tarayıcıdaki kurgusal veriler; gerçek üyelik veya sipariş değildir.","بيانات وهمية في هذا المتصفح فقط؛ لا عضويات أو طلبات حقيقية."],
      "اعضای آزمایشی باشگاه مشتریان": ["Demo customer club members","Demo müşteri kulübü üyeleri","أعضاء نادي العملاء التجريبيون"],
      "ورود آزمایشی؛ امنیت واقعی نیست.": ["Demo login; not real security.","Demo girişi; gerçek güvenlik değildir.","دخول تجريبي؛ ليس حماية حقيقية."],
      "شناسه یا رمز عبور آزمایشی نادرست است.": ["Incorrect demo ID or password.","Demo kimliği veya şifresi hatalı.","معرّف أو كلمة مرور التجربة غير صحيحة."],
      "شناسه و رمز عبور را وارد کنید.": ["Enter your ID and password.","Kimlik ve şifrenizi girin.","أدخل المعرّف وكلمة المرور."],
      "شناسه ورود": ["Login ID","Giriş kimliği","معرّف الدخول"],
      "شناسه ورود (ایمیل)": ["Login ID (email)","Giriş kimliği (e-posta)","معرّف الدخول (البريد الإلكتروني)"],
      "رفتن به محتوای اصلی": ["Skip to main content", "Ana içeriğe geç", "الانتقال إلى المحتوى الرئيسي"],
      "ارسال واقعی نیازمند رضایت دریافت پیامک، لغو عضویت و نگهداری کلید سرویس در سرور است.": ["Live delivery requires SMS consent, opt-out and server-side credential storage.", "Gerçek gönderim SMS onayı, abonelik iptali ve sunucuda kimlik bilgisi saklama gerektirir.", "يتطلب الإرسال الفعلي موافقة الرسائل وإلغاء الاشتراك وحفظ بيانات الاعتماد على الخادم."],
      "سرویس ارسال متصل نیست. فقط متن و قوانین را آماده کنید.": ["No messaging service is connected. Prepare text and rules only.", "Mesaj hizmeti bağlı değil. Yalnızca metin ve kuralları hazırlayın.", "خدمة الرسائل غير متصلة. جهّز النص والقواعد فقط."],
      "تنظیمات پیامکی": ["SMS settings", "SMS ayarları", "إعدادات الرسائل النصية"],
      "بر اساس حداکثر ۱۰۰ سفارش اخیر": ["Based on up to 100 recent orders", "En fazla son 100 siparişe göre", "بناءً على أحدث 100 طلب كحد أقصى"],
      "سرو یا تحویل‌شده": ["Served or delivered", "Servis edildi veya teslim edildi", "تم التقديم أو التسليم"],
      "بازگردانی تغییرات ذخیره‌نشده": ["Reset unsaved changes", "Kaydedilmemiş değişiklikleri sıfırla", "إعادة ضبط التغييرات غير المحفوظة"],
      "راه‌های ارتباطی": ["Contact channels", "İletişim kanalları", "قنوات التواصل"],
      "هویت رستوران": ["Restaurant identity", "Restoran kimliği", "هوية المطعم"],
      "پیش‌نویس ذخیره‌نشده کنار گذاشته شود؟": ["Discard the unsaved draft?", "Kaydedilmemiş taslak atılsın mı?", "هل تريد تجاهل المسودة غير المحفوظة؟"],
      "پیش‌نمایش محلی؛ هزینه و ارسال پیامک محاسبه نمی‌شود.": ["Local preview; SMS delivery and cost are not calculated.", "Yerel önizleme; SMS gönderimi ve maliyeti hesaplanmaz.", "معاينة محلية؛ لا يُحتسب الإرسال أو التكلفة."],
      "تعداد نویسه‌ها": ["Character count", "Karakter sayısı", "عدد الأحرف"],
      "پیش‌نمایش متن پیامک": ["SMS text preview", "SMS metni önizlemesi", "معاينة نص الرسالة"],
      "نظر تغییر کرده است؛ دوباره بررسی کنید.": ["The review changed; check it again.", "Yorum değişti; tekrar inceleyin.", "تغير التعليق؛ راجعه مجددًا."],
      "خانه": ["Home", "Ana sayfa", "الرئيسية"],
      "تنظیمات": ["Settings", "Ayarlar", "الإعدادات"],
      "باشگاه مشتریان": ["Customer club", "Müşteri kulübü", "نادي العملاء"],
        "صندوق مکالمات": ["Conversation inbox", "Sohbet gelen kutusu", "صندوق المحادثات"],
      "ناوبری سریع مدیریت": ["Quick admin navigation", "Hızlı yönetim menüsü", "التنقل السريع للإدارة"],
      "خلاصه عملیات": ["Operations overview", "Operasyon özeti", "ملخص العمليات"],
      "مبلغ سفارش‌های نمونه؛ درآمد یا پرداخت واقعی نیست.": ["Sample order value; not real revenue or payments.","Örnek sipariş tutarı; gerçek gelir veya ödeme değildir.","قيمة الطلبات التجريبية؛ ليست إيرادات أو مدفوعات فعلية."],
      "در این بازه سفارش نمونه‌ای ثبت نشده است.": ["No sample orders in this period.","Bu dönemde örnek sipariş yok.","لا توجد طلبات تجريبية في هذه الفترة."],
      "بازه گزارش": ["Reporting period","Rapor dönemi","فترة التقرير"],
      "امروز": ["Today","Bugün","اليوم"],
      "۷ روز اخیر": ["Last 7 days","Son 7 gün","آخر ٧ أيام"],
      "۳۰ روز اخیر": ["Last 30 days","Son 30 gün","آخر ٣٠ يومًا"],
      "۳۶۵ روز اخیر": ["Last 365 days","Son 365 gün","آخر ٣٦٥ يومًا"],
      "واحد پول": ["Currency","Para birimi","العملة"],
      "مجموع مبلغ سفارش‌های نمونه": ["Total sample order value","Toplam örnek sipariş tutarı","إجمالي قيمة الطلبات التجريبية"],
      "میانگین مبلغ سفارش": ["Average order value","Ortalama sipariş tutarı","متوسط قيمة الطلب"],
      "تغییر نسبت به دوره قبل": ["Change vs previous period","Önceki döneme göre değişim","التغير عن الفترة السابقة"],
      "دوره قبل": ["Previous period","Önceki dönem","الفترة السابقة"],
      "جزئیات بازه نمودار": ["Chart interval details","Grafik aralığı ayrıntıları","تفاصيل فترة الرسم البياني"],
      "جدول داده‌های نمودار": ["Chart data table","Grafik veri tablosu","جدول بيانات الرسم البياني"],
      "مبلغ سفارش": ["Order value","Sipariş tutarı","قيمة الطلب"],
      "خروجی CSV": ["Export CSV","CSV dışa aktar","تصدير CSV"],
      "سفارش‌های قدیمی بدون واحد پول از گزارش حذف شده‌اند.": ["Older orders without a currency are excluded.","Para birimi olmayan eski siparişler hariç tutulur.","تُستبعد الطلبات القديمة بلا عملة."],
      "سفارش‌های با واحد پول دیگر جداگانه گزارش می‌شوند.": ["Orders in other currencies are reported separately.","Diğer para birimlerindeki siparişler ayrı raporlanır.","تُعرض طلبات العملات الأخرى في تقارير منفصلة."],
      "درآمد": ["Revenue", "Gelir", "الإيرادات"],
      "گزارش درآمد نیازمند تاریخچه پرداخت معتبر است.": ["Revenue reporting requires verified payment history.", "Gelir raporu doğrulanmış ödeme geçmişi gerektirir.", "يتطلب تقرير الإيرادات سجل دفع موثوقًا."],
      "داده کافی برای نمودار وجود ندارد.": ["Not enough data for a chart.", "Grafik için yeterli veri yok.", "لا توجد بيانات كافية للرسم البياني."],
      "سفارش‌های در جریان": ["Orders in progress", "Devam eden siparişler", "الطلبات الجارية"],
      "داده زنده در دسترس نیست.": ["Live data is unavailable.", "Canlı veriler kullanılamıyor.", "البيانات المباشرة غير متاحة."],
      "امتیاز رستوران": ["Restaurant rating", "Restoran puanı", "تقييم المطعم"],
      "امتیاز تأییدشده در دسترس نیست.": ["No approved rating available.", "Onaylı puan bulunmuyor.", "لا يوجد تقييم معتمد."],
      "تأیید امتیاز آزمایشی": ["Approve demo rating", "Deneme puanını onayla", "اعتماد التقييم التجريبي"],
      "رد امتیاز آزمایشی": ["Reject demo rating", "Deneme puanını reddet", "رفض التقييم التجريبي"],
      "بر اساس سفارش‌های دریافت‌شده": ["Based on retrieved orders", "Alınan siparişlere göre", "بناءً على الطلبات المسترجعة"],
      "یک امتیاز آزمایشی تأییدشده در همین مرورگر": ["One approved demo rating in this browser", "Bu tarayıcıda onaylanan bir deneme puanı", "تقييم تجريبي واحد معتمد في هذا المتصفح"],
      "امتیاز آزمایشی رد شد.": ["Demo rating rejected.", "Deneme puanı reddedildi.", "تم رفض التقييم التجريبي."],
      "امتیاز آزمایشی در انتظار بررسی": ["Demo rating pending review", "Deneme puanı inceleme bekliyor", "التقييم التجريبي قيد المراجعة"],
      "خواندن داده محلی ممکن نیست.": ["Local data could not be read.", "Yerel veriler okunamadı.", "تعذرت قراءة البيانات المحلية."],
      "قوانین و کمپین‌ها": ["Rules & campaigns", "Kurallar ve kampanyalar", "القواعد والحملات"],
      "پیش‌نویس قوانین تخفیف و پیامک را مدیریت کنید.": ["Manage draft discount and SMS rules.", "İndirim ve SMS kural taslaklarını yönetin.", "إدارة مسودات قواعد الخصومات والرسائل النصية."],
      "+ قانون جدید": ["+ New rule", "+ Yeni kural", "+ قاعدة جديدة"],
      "این بخش فقط پیش‌نویس محلی است؛ ارسال پیامک، اعمال تخفیف و اطلاعات اعضا به سرویس سرور نیاز دارد.": ["Local drafts only. SMS delivery, discount redemption and member records require a server.", "Yalnızca yerel taslaklar. SMS gönderimi, indirim kullanımı ve üye kayıtları sunucu gerektirir.", "مسودات محلية فقط. إرسال الرسائل وتطبيق الخصومات وسجلات الأعضاء تتطلب خادمًا."],
      "مدیریت قوانین در حالت متصل هنوز فعال نیست.": ["Rule management is not enabled in connected mode.", "Bağlı modda kural yönetimi henüz etkin değil.", "إدارة القواعد غير مفعلة في الوضع المتصل."],
      "ویرایش قانون": ["Edit rule", "Kuralı düzenle", "تعديل القاعدة"],
      "نام قانون": ["Rule name", "Kural adı", "اسم القاعدة"],
      "محرک اجرا": ["Trigger", "Tetikleyici", "المحفز"],
      "تولد": ["Birthday", "Doğum günü", "عيد الميلاد"],
      "سال نو": ["New year", "Yeni yıl", "العام الجديد"],
      "اولین خرید": ["First purchase", "İlk alışveriş", "أول عملية شراء"],
      "حداقل مبلغ خرید": ["Minimum purchase amount", "Minimum alışveriş tutarı", "الحد الأدنى لمبلغ الشراء"],
      "مناسبت دلخواه": ["Custom occasion", "Özel etkinlik", "مناسبة مخصصة"],
      "شرط دلخواه": ["Custom condition", "Özel koşul", "شرط مخصص"],
      "نوع پاداش": ["Reward type", "Ödül türü", "نوع المكافأة"],
      "بدون پاداش": ["No reward", "Ödül yok", "دون مكافأة"],
      "درصد تخفیف": ["Discount percentage", "İndirim yüzdesi", "نسبة الخصم"],
      "مبلغ تخفیف": ["Fixed discount", "Sabit indirim", "خصم ثابت"],
      "هدیه": ["Gift", "Hediye", "هدية"],
      "مقدار تخفیف": ["Discount value", "İndirim değeri", "قيمة الخصم"],
      "شرح هدیه": ["Gift description", "Hediye açıklaması", "وصف الهدية"],
      "تاریخ انقضا": ["Expiry date", "Son geçerlilik tarihi", "تاريخ الانتهاء"],
      "متن پیامک (پیش‌نویس)": ["SMS text (draft)", "SMS metni (taslak)", "نص الرسالة (مسودة)"],
      "ذخیره پیش‌نویس": ["Save draft", "Taslağı kaydet", "حفظ المسودة"],
      "لغو": ["Cancel", "İptal", "إلغاء"],
      "هنوز پیش‌نویسی ثبت نشده است.": ["No drafts yet.", "Henüz taslak yok.", "لا توجد مسودات بعد."],
      "پیش‌نویس فعال": ["Enabled draft", "Etkin taslak", "مسودة مفعلة"],
      "پیش‌نویس غیرفعال": ["Disabled draft", "Devre dışı taslak", "مسودة معطلة"],
      "پیش‌نویس در تب دیگری تغییر کرده است. دوباره صفحه را باز کنید.": ["Drafts changed in another tab. Reload this page.", "Taslaklar başka bir sekmede değişti. Sayfayı yeniden yükleyin.", "تغيرت المسودات في علامة تبويب أخرى. أعد تحميل الصفحة."],
      "پیش‌نویس فقط در این مرورگر ذخیره شد.": ["Draft saved in this browser only.", "Taslak yalnızca bu tarayıcıya kaydedildi.", "حُفظت المسودة في هذا المتصفح فقط."],
      "حداکثر ۱۰۰ پیش‌نویس مجاز است.": ["A maximum of 100 drafts is allowed.", "En fazla 100 taslağa izin verilir.", "يُسمح بحد أقصى 100 مسودة."],
      "اطلاعات قانون معتبر نیست.": ["Rule details are invalid.", "Kural bilgileri geçersiz.", "تفاصيل القاعدة غير صالحة."],
      "این پیش‌نویس حذف شود؟": ["Delete this draft?", "Bu taslak silinsin mi?", "حذف هذه المسودة؟"],
      "شماره تلفن معتبر نیست.": ["Invalid phone number.", "Geçersiz telefon numarası.", "رقم الهاتف غير صالح."],
      "انتقال به بالا": ["Move up", "Yukarı taşı", "نقل لأعلى"],
      "انتقال به پایین": ["Move down", "Aşağı taşı", "نقل لأسفل"],

      "فعال‌سازی اعلان صوتی": ["Enable sound alerts","Sesli bildirimleri aç","تفعيل التنبيهات الصوتية"],
      "قطع اعلان صوتی": ["Mute sound alerts","Sesli bildirimleri kapat","كتم التنبيهات الصوتية"],
      "اعلان صوتی در این مرورگر پشتیبانی نمی‌شود.": ["Sound alerts are not supported in this browser.","Bu tarayıcı sesli bildirimi desteklemiyor.","هذا المتصفح لا يدعم التنبيهات الصوتية."],
      "QR میز": ["Table QR","Masa QR kodu","رمز QR للطاولة"],
      "برای دیدن منو و ثبت سفارش اسکن کنید.": ["Scan to view the menu and place an order.","Menüyü görmek ve sipariş vermek için tarayın.","امسح لعرض القائمة وتقديم الطلب."],
      "لینک سفارش میز": ["Table ordering link","Masa sipariş bağlantısı","رابط طلب الطاولة"],
      "چاپ QR": ["Print QR","QR kodunu yazdır","طباعة QR"],
      "میز فعال": ["Active table","Etkin masa","طاولة نشطة"],
      "میز غیرفعال": ["Inactive table","Devre dışı masa","طاولة غير نشطة"],
      "غیرفعال‌کردن میز": ["Disable table","Masayı devre dışı bırak","تعطيل الطاولة"],
      "فعال‌کردن میز": ["Enable table","Masayı etkinleştir","تفعيل الطاولة"],
      "باطل‌کردن QR قبلی": ["Revoke old QR","Eski QR kodunu iptal et","إلغاء رمز QR القديم"],
      "غیرفعال‌کردن میز، سفارش‌گیری از این میز را متوقف می‌کند. ادامه می‌دهید؟": ["Disabling this table stops new orders from it. Continue?","Bu masayı devre dışı bırakmak yeni siparişleri durdurur. Devam edilsin mi?","سيؤدي تعطيل الطاولة إلى إيقاف الطلبات الجديدة منها. هل تريد المتابعة؟"],
      "QR قبلی و نشست‌های فعال این میز باطل می‌شوند. ادامه می‌دهید؟": ["The previous QR code and active table sessions will be revoked. Continue?","Önceki QR kodu ve aktif masa oturumları iptal edilecek. Devam edilsin mi?","سيتم إلغاء رمز QR السابق وجلسات الطاولة النشطة. هل تريد المتابعة؟"],
      "برای کپی، لینک را انتخاب کنید.": ["Select the link to copy it.","Kopyalamak için bağlantıyı seçin.","حدد الرابط لنسخه."],
      "ساخت QR انجام نشد.": ["QR generation failed.","QR kodu oluşturulamadı.","تعذر إنشاء رمز QR."],
      "وضعیت میز ذخیره شد.": ["Table status saved.","Masa durumu kaydedildi.","تم حفظ حالة الطاولة."],
      "تغییر وضعیت میز انجام نشد.": ["Could not change table status.","Masa durumu değiştirilemedi.","تعذر تغيير حالة الطاولة."],
      "QR قبلی باطل شد. کد جدید را چاپ کنید.": ["Old QR revoked. Print the new code.","Eski QR iptal edildi. Yeni kodu yazdırın.","تم إلغاء رمز QR القديم. اطبع الرمز الجديد."],
      "باطل‌کردن QR انجام نشد.": ["Could not revoke the QR.","QR kodu iptal edilemedi.","تعذر إلغاء رمز QR."],
      "میزها و سفارش QR": ["Tables & QR ordering","Masalar ve QR siparişi","الطاولات وطلبات QR"],
      "میزها و سفارش‌گیری برای رستوران از قبل پیکربندی‌شده مدیریت می‌شوند.": ["Manage tables and ordering for the configured restaurant.","Yapılandırılmış restoranın masalarını ve siparişlerini yönetin.","أدر الطاولات والطلبات للمطعم المُعد مسبقًا."],
      "رستوران عملیاتی هنوز پیکربندی نشده است.": ["The restaurant is not configured for live operations yet.","Restoran canlı işlemler için henüz yapılandırılmadı.","لم يُهيأ المطعم للعمليات الفعلية بعد."],
      "تنظیمات عملیاتی در نسخه مستقل در دسترس نیست.": ["Live operation settings are unavailable in the standalone demo.","Canlı işlem ayarları bağımsız demoda kullanılamaz.","إعدادات العمليات الفعلية غير متاحة في النسخة التجريبية المستقلة."],
      "انتخاب شعبه": ["Choose branch","Şube seç","اختر الفرع"],
      "فعال‌سازی سفارش QR": ["Enable QR ordering","QR siparişi etkinleştir","تفعيل طلبات QR"],
      "ذخیره وضعیت سفارش‌گیری": ["Save ordering status","Sipariş durumunu kaydet","حفظ حالة الطلبات"],
      "کد میز (لاتین)": ["Table code (Latin letters)","Masa kodu (Latin harfleri)","رمز الطاولة (أحرف لاتينية)"],
      "نام میز": ["Table name","Masa adı","اسم الطاولة"],
      "افزودن میز": ["Add table","Masa ekle","إضافة طاولة"],
      "دریافت لینک QR": ["Generate QR link","QR bağlantısı oluştur","إنشاء رابط QR"],
      "کپی لینک": ["Copy link","Bağlantıyı kopyala","نسخ الرابط"],
      "شعبه‌ای ثبت نشده است.": ["No branches yet.","Henüz şube yok.","لا توجد فروع بعد."],
      "میزی ثبت نشده است.": ["No tables yet.","Henüz masa yok.","لا توجد طاولات بعد."],
      "میز ایجاد شد.": ["Table created.","Masa oluşturuldu.","تم إنشاء الطاولة."],
      "وضعیت ذخیره شد.": ["Status saved.","Durum kaydedildi.","تم حفظ الحالة."],
      "لینک کپی شد.": ["Link copied.","Bağlantı kopyalandı.","تم نسخ الرابط."],
      "عملیات انجام نشد.": ["Operation failed.","İşlem başarısız.","فشلت العملية."],
      "پذیرفته شد": ["Accepted","Kabul edildi","مقبول"],
      "در حال آماده‌سازی": ["Preparing","Hazırlanıyor","قيد التحضير"],
      "سرو شد": ["Served","Servis edildi","تم التقديم"],
      "تحویل شد": ["Delivered","Teslim edildi","تم التسليم"],
      "تکمیل": ["Complete","Tamamlandı","مكتمل"],
      "رد شده": ["Rejected","Reddedildi","مرفوض"],
      "لغو شده": ["Cancelled","İptal edildi","ملغي"],
      "پذیرش سفارش": ["Accept order","Siparişi kabul et","قبول الطلب"],
      "شروع آماده‌سازی": ["Start preparing","Hazırlamayı başlat","بدء التحضير"],
      "اعلام آماده": ["Mark ready","Hazır olarak işaretle","وضع علامة جاهز"],
      "ثبت سرو": ["Mark served","Servis edildi olarak işaretle","تسجيل التقديم"],
      "تکمیل سفارش": ["Complete order","Siparişi tamamla","إكمال الطلب"],
      "سفارش فعال": ["Active orders","Aktif siparişler","طلبات نشطة"],
      "در آشپزخانه": ["In kitchen","Mutfakta","في المطبخ"],
      "سفارشی در این وضعیت وجود ندارد.": ["No orders in this status.","Bu durumda sipariş yok.","لا توجد طلبات بهذه الحالة."],
      "پرداخت آنلاین ✓": ["Paid online ✓","Online ödendi ✓","تم الدفع عبر الإنترنت ✓"],
      "پرداخت‌نشده": ["Unpaid","Ödenmedi","غير مدفوع"],
      "برای مشاهده سفارش‌های زنده، پنل را به سرویس سرور متصل کنید.": ["Connect the admin panel to the server to view live orders.","Canlı siparişleri görmek için paneli sunucuya bağlayın.","اربط لوحة الإدارة بالخادم لعرض الطلبات المباشرة."],
      "دریافت سفارش‌ها ناموفق بود.": ["Unable to load orders.","Siparişler yüklenemedi.","تعذر تحميل الطلبات."],
      "تغییر وضعیت انجام نشد.": ["Unable to update order status.","Sipariş durumu güncellenemedi.","تعذر تحديث حالة الطلب."],
      "برای تغییر تنظیمات، Merchant ID کامل را وارد کنید.": ["Enter the complete Merchant ID to update gateway settings.","Ödeme geçidi ayarlarını değiştirmek için Merchant ID girin.","أدخل معرّف التاجر الكامل لتحديث إعدادات بوابة الدفع."],
      "تنظیمات درگاه با موفقیت ذخیره شد.": ["Gateway settings saved.","Ödeme geçidi ayarları kaydedildi.","تم حفظ إعدادات بوابة الدفع."],
      "ذخیره تنظیمات ناموفق بود.": ["Unable to save gateway settings.","Ödeme geçidi ayarları kaydedilemedi.","تعذر حفظ إعدادات بوابة الدفع."],
      "مثلاً 250000": ["e.g. 250000", "Örn. 250000", "مثلاً 250000"],
      "مدیریت رستوران": ["Restaurant management", "Restoran yönetimi", "إدارة المطعم"],
      "جستجوی سریع": ["Quick search", "Hızlı arama", "بحث سريع"],
      "نمای کلی": ["Overview", "Genel bakış", "نظرة عامة"],
      "مرکز مدیریت ROMANO": ["ROMANO control center", "ROMANO kontrol merkezi", "مركز تحكم ROMANO"],
      "وضعیت منو": ["Menu health", "Menü durumu", "حالة القائمة"],
      "رستوران": ["Restaurant", "Restoran", "المطعم"],
      "آخرین موارد": ["Recent", "Son öğeler", "الأخيرة"],
      "مدیریت منو": ["Menu management", "Menü yönetimi", "إدارة القائمة"],
      "ساختار منو": ["Menu structure", "Menü yapısı", "هيكل القائمة"],
      "پیکربندی رستوران": ["Restaurant configuration", "Restoran yapılandırması", "تهيئة المطعم"],
      "محصول": ["Product", "Ürün", "المنتج"],
      "برچسب": ["Badge", "Rozet", "الشارة"],
      "بدون برچسب": ["No badge", "Rozet yok", "بدون شارة"],
      "دسته‌بندی": ["Category", "Kategori", "التصنيف"],
      "شناسه پذیرنده": ["Merchant ID", "Üye işyeri kimliği", "معرّف التاجر"],
      "احراز هویت امن سرور": ["Secure server authentication", "Güvenli sunucu kimlik doğrulaması", "مصادقة آمنة للخادم"],
      "منوی دیجیتال ROMANO": ["ROMANO digital menu", "ROMANO dijital menüsü", "قائمة ROMANO الرقمية"],
      "فقط کاربران مجاز": ["Authorized users only", "Yalnızca yetkili kullanıcılar", "للمستخدمين المصرح لهم فقط"],
      "پنل مدیریت": ["Admin panel", "Yönetim paneli", "لوحة الإدارة"],
      "ROMANO | مدیریت": ["ROMANO | Admin", "ROMANO | Yönetim", "رومانو | الإدارة"],
      "دسترسی امن مدیریت": ["Secure admin access", "Güvenli yönetici erişimi", "وصول آمن للإدارة"],
      "عملیات زنده · آشپزخانه": ["Live operations · Kitchen", "Canlı operasyonlar · Mutfak", "العمليات المباشرة · المطبخ"],
      "فیلتر وضعیت سفارش": ["Order status filters", "Sipariş durumu filtreleri", "تصفية حالة الطلب"],
      "تنظیم میز و QR": ["Table & QR setup", "Masa ve QR kurulumu", "إعداد الطاولات ورمز QR"],
      "تسویه مستقیم": ["Direct settlement", "Doğrudan ödeme", "التسوية المباشرة"],
      "صفر یعنی بدون امتیاز": ["Zero means unrated", "Sıfır, puan yok demektir", "الصفر يعني بدون تقييم"],
      "برای این تغییر به دسترسی مدیر نیاز دارید.": ["Manager access is required for this change.", "Bu değişiklik için yönetici yetkisi gerekiyor.", "تحتاج إلى صلاحية مدير لإجراء هذا التغيير."],
      "فیلتر و مرتب‌سازی": ["Filters & sort","Filtreler ve sıralama","التصفية والترتيب"],
      "آدرس": ["Address", "Adres", "العنوان"],
      "تلفن": ["Phone", "Telefon", "الهاتف"],
      "اولین محصول منو را اضافه کنید.": ["Add your first menu item.", "İlk menü ürününüzü ekleyin.", "أضف أول منتج إلى القائمة."],
      "هنوز محصولی اضافه نشده است": ["No products yet", "Henüz ürün yok", "لا توجد منتجات بعد"],
      "بر اساس اطلاعات فعلی منو": ["Based on the current menu data", "Güncel menü verilerine göre", "بناءً على بيانات القائمة الحالية"],
      "سفارش‌ها": ["Orders", "Siparişler", "الطلبات"],
      "سفارش‌ها و آشپزخانه": ["Orders & kitchen", "Siparişler ve mutfak", "الطلبات والمطبخ"],
      "سفارش‌های QR را از پذیرش تا سرو، زنده مدیریت کنید.": ["Manage QR orders live from acceptance to service.", "QR siparişlerini kabulden servise canlı yönetin.", "أدر طلبات QR مباشرة من القبول حتى التقديم."],
      "به‌روزرسانی": ["Refresh", "Yenile", "تحديث"],
      "آشپزخانه": ["Kitchen", "Mutfak", "المطبخ"],
      "آماده": ["Ready", "Hazır", "جاهز"],
      "همه": ["All", "Tümü", "الكل"],
      "درگاه پرداخت رستوران": ["Restaurant payment gateway", "Restoran ödeme geçidi", "بوابة دفع المطعم"],
      "برای هر میز کد و نام تعیین کنید و QR اختصاصی آن را بسازید.": ["Set a code and name for each table and generate its own QR.", "Her masa için kod ve ad belirleyip QR kodu oluşturun.", "حدد رمزًا واسمًا لكل طاولة وأنشئ رمز QR خاصًا بها."],
      "مبالغ سفارش مستقیماً به پذیرنده خود رستوران واریز می‌شود.": ["Order payments settle directly to the restaurant's own merchant account.", "Sipariş ödemeleri doğrudan restoranın üye işyeri hesabına aktarılır.", "تُحوّل مدفوعات الطلب مباشرة إلى حساب تاجر المطعم."],
      "شعبه": ["Branch", "Şube", "الفرع"],
      "درگاه": ["Gateway", "Ödeme geçidi", "البوابة"],
      "محیط آزمایشی": ["Sandbox", "Test ortamı", "بيئة الاختبار"],
      "فعال‌سازی پرداخت آنلاین": ["Enable online payment", "Online ödemeyi etkinleştir", "تفعيل الدفع الإلكتروني"],
      "ذخیره درگاه": ["Save gateway", "Ödeme geçidini kaydet", "حفظ البوابة"],
      "تلاش دوباره": ["Try again", "Tekrar dene", "حاول مجددًا"],
      "اتصال به سرور را بررسی کنید و دوباره تلاش کنید.": ["Check the server connection and try again.", "Sunucu bağlantısını kontrol edip tekrar deneyin.", "تحقق من الاتصال بالخادم وحاول مجددًا."],
      "پنل بارگذاری نشد": ["Unable to load admin", "Panel yüklenemedi", "تعذر تحميل اللوحة"],
      "آخرین ویرایش": ["Recently edited", "Son düzenlenen", "آخر تعديل"],
      "فقط محصولات فعال": ["Active products only", "Yalnızca aktif ürünler", "المنتجات النشطة فقط"],
      "مشاهده موارد": ["Review items", "Ürünleri incele", "مراجعة العناصر"],
      "محصولات فعال را پیش از ارائه به مشتری بررسی کنید.": ["Review active products before sharing the menu.", "Menüyü paylaşmadan önce aktif ürünleri kontrol edin.", "راجع المنتجات النشطة قبل مشاركة القائمة."],
      "موارد نیازمند بررسی": ["Needs attention", "Kontrol gerekenler", "عناصر تحتاج إلى مراجعة"],
      "دسته‌بندی نامعتبر": ["Invalid category", "Geçersiz kategori", "تصنيف غير صالح"],
      "بدون توضیحات": ["Missing description", "Açıklama eksik", "بدون وصف"],
      "بدون قیمت": ["Missing price", "Fiyat eksik", "بدون سعر"],
      "همه محتوا": ["All content", "Tüm içerik", "كل المحتوى"],
      "بررسی محتوا": ["Content review", "İçerik kontrolü", "مراجعة المحتوى"],
      "وضعیت محصولات انتخاب‌شده تغییر کند؟": ["Change the status of the selected products?", "Seçilen ürünlerin durumu değiştirilsin mi?", "هل تريد تغيير حالة المنتجات المحددة؟"],
      "لغو انتخاب": ["Clear selection", "Seçimi temizle", "إلغاء التحديد"],
      "غیرفعال‌سازی گروهی": ["Deactivate selected", "Seçilenleri devre dışı bırak", "إلغاء تفعيل المحدد"],
      "فعال‌سازی گروهی": ["Activate selected", "Seçilenleri etkinleştir", "تفعيل المحدد"],
      "انتخاب‌شده": ["Selected", "Seçili", "محدد"],
      "انتخاب موارد نمایش‌داده‌شده": ["Select visible products", "Görünen ürünleri seç", "تحديد المنتجات الظاهرة"],
      "انتخاب محصول": ["Select product", "Ürün seç", "اختيار المنتج"],
      "رونوشت محصول": ["Duplicate product", "Ürünü kopyala", "نسخ المنتج"],
      "رونوشت": ["Copy", "Kopya", "نسخة"],
      "تغییرات ذخیره‌نشده کنار گذاشته شود؟": ["Discard unsaved changes?", "Kaydedilmemiş değişiklikler silinsin mi?", "هل تريد تجاهل التغييرات غير المحفوظة؟"],
      "داده‌ها در تب دیگری تغییر کرده‌اند. پیش از بارگذاری مجدد، تغییرات فرم را یادداشت کنید.": ["Data changed in another tab. Note your form edits before reloading.", "Veriler başka bir sekmede değişti. Yenilemeden önce form düzenlemelerinizi not edin.", "تغيرت البيانات في تبويب آخر. دوّن تعديلات النموذج قبل إعادة التحميل."],
      "ذخیره انجام نشد. اطلاعات فرم حفظ شده است؛ دوباره تلاش کنید.": ["Save failed. Your form is preserved; please retry.", "Kayıt başarısız. Formunuz korundu; tekrar deneyin.", "تعذر الحفظ. تم الاحتفاظ بمحتوى النموذج؛ حاول مجددًا."],
      "نشست شما پایان یافته است. دوباره وارد شوید.": ["Your session expired. Sign in again.", "Oturumunuz sona erdi. Tekrar giriş yapın.", "انتهت جلستك. سجّل الدخول مجددًا."],
      "نسخه آزمایشی محلی": ["Local demo", "Yerel demo", "نسخة تجريبية محلية"],
      "متصل به سرور": ["Connected to server", "Sunucuya bağlı", "متصل بالخادم"],
      "ذخیره انجام نشد": ["Save failed", "Kayıt başarısız", "تعذر الحفظ"],
      "تغییرات ذخیره شد": ["Changes saved", "Değişiklikler kaydedildi", "تم حفظ التغييرات"],
      "در حال ذخیره…": ["Saving…", "Kaydediliyor…", "جارٍ الحفظ…"],
      "تأیید": ["Confirm", "Onayla", "تأكيد"],
      "ادامه می‌دهید؟": ["Continue?", "Devam edilsin mi?", "هل تريد المتابعة؟"],
      "تأیید عملیات": ["Confirmation", "İşlem onayı", "تأكيد العملية"],
      "ایمیل": ["Email","E-posta","البريد الإلكتروني"],
      "رمز عبور": ["Password","Şifre","كلمة المرور"],
      "ورود به پنل": ["Sign in","Panele giriş yap","الدخول إلى اللوحة"],
      "در حال ورود…": ["Signing in…","Giriş yapılıyor…","جارٍ تسجيل الدخول…"],
      "ایمیل یا رمز عبور نادرست است.": ["Email or password is incorrect.","E-posta veya şifre hatalı.","البريد الإلكتروني أو كلمة المرور غير صحيحة."],
      "ایمیل و رمز عبور را وارد کنید.": ["Enter your email and password.","E-posta ve şifrenizi girin.","أدخل البريد الإلكتروني وكلمة المرور."],
      "تعداد تلاش‌ها زیاد است. کمی بعد دوباره تلاش کنید.": ["Too many attempts. Please try again shortly.","Çok fazla deneme. Lütfen biraz sonra tekrar deneyin.","محاولات كثيرة. حاول مرة أخرى بعد قليل."],
      "ورود انجام نشد. اتصال را بررسی کنید و دوباره تلاش کنید.": ["Sign-in failed. Check your connection and try again.","Giriş başarısız. Bağlantınızı kontrol edip tekrar deneyin.","تعذر تسجيل الدخول. تحقق من الاتصال وحاول مرة أخرى."],
      "حالت آزمایشی محلی: تغییرات فقط در همین مرورگر ذخیره می‌شود و با سرور همگام نمی‌شود.": ["Local demo mode: changes are saved only in this browser and are not synced to a server.","Yerel demo modu: değişiklikler yalnızca bu tarayıcıda saklanır ve sunucuyla eşitlenmez.","وضع تجريبي محلي: تُحفظ التغييرات في هذا المتصفح فقط ولا تتم مزامنتها مع الخادم."],
      "باز کردن منو": ["Open menu","Menüyü aç","فتح القائمة"],
      "بستن منو": ["Close menu","Menüyü kapat","إغلاق القائمة"],
      "افزودن محصول جدید": ["Add new product","Yeni ürün ekle","إضافة منتج جديد"],
      "دسترسی سریع": ["Quick access","Hızlı erişim","وصول سريع"],
      "مرتب‌سازی دسته‌بندی‌ها": ["Sort categories","Kategorileri sırala","ترتيب التصنيفات"],
      "داشبورد": ["Dashboard","Panel","لوحة التحكم"],
      "محصولات": ["Products","Ürünler","المنتجات"],
      "دسته‌بندی‌ها": ["Categories","Kategoriler","التصنيفات"],
      "تنظیمات رستوران": ["Restaurant Settings","Restoran Ayarları","إعدادات المطعم"],
      "مشاهده منوی مشتری": ["View Customer Menu","Müşteri Menüsünü Gör","عرض قائمة العملاء"],
      "منوی مدیریت": ["Admin menu","Yönetim menüsü","قائمة الإدارة"],
      "ناوبری پنل": ["Panel navigation","Panel navigasyonu","تنقل اللوحة"],
      "مدیریت": ["Management","Yönetim","الإدارة"],
      "پیش‌نمایش منو": ["Menu Preview","Menü Önizleme","معاينة القائمة"],
      "محصول جدید": ["New Product","Yeni Ürün","منتج جديد"],
      "سیستم آماده": ["System ready","Sistem hazır","النظام جاهز"],
      "حساب مدیر": ["Admin account","Yönetici hesabı","حساب المسؤول"],
      "مدیر": ["Admin","Yönetici","المسؤول"],
      "خروج": ["Log out","Çıkış","تسجيل الخروج"],
      "خروج از پنل": ["Log out of admin panel","Yönetim panelinden çık","تسجيل الخروج من لوحة الإدارة"],
      "OVERVIEW": ["OVERVIEW","GENEL BAKIŞ","نظرة عامة"],
      "وضعیت فعلی منوی ROMANO را مدیریت کنید.": ["Manage the current state of the ROMANO menu.","ROMANO menüsünün mevcut durumunu yönetin.","إدارة الحالة الحالية لقائمة رومانو."],
      "ROMANO · CONTROL CENTER": ["ROMANO · CONTROL CENTER","ROMANO · KONTROL MERKEZİ","رومانو · مركز التحكم"],
      "از اینجا منو، محصولات و اطلاعات نمایشی رستوران را مدیریت کنید.": ["Manage the menu, products, and restaurant display information from here.","Menüyü, ürünleri ve restoran bilgilerinin görünümünü buradan yönetin.","أدر القائمة والمنتجات ومعلومات عرض المطعم من هنا."],
      "محصولات فعال": ["Active Products","Aktif Ürünler","المنتجات النشطة"],
      "MENU HEALTH": ["MENU HEALTH","MENÜ DURUMU","حالة القائمة"],
      "نمای کلی وضعیت منو": ["Menu health overview","Menü durum özeti","نظرة عامة على حالة القائمة"],
      "بر اساس اطلاعات ذخیره‌شده در همین مرورگر": ["Based on data stored in this browser","Bu tarayıcıda saklanan verilere göre","استنادًا إلى البيانات المخزنة في هذا المتصفح"],
      "محصولات غیرفعال": ["Inactive Products","Pasif Ürünler","المنتجات غير النشطة"],
      "محصولات بدون دسته‌بندی معتبر": ["Products without a valid category","Geçerli kategorisi olmayan ürünler","منتجات بدون تصنيف صالح"],
      "اطلاعات تماس ثبت‌شده": ["Contact information status","İletişim bilgileri durumu","حالة معلومات الاتصال"],
      "مدیریت محصولات": ["Manage Products","Ürünleri Yönet","إدارة المنتجات"],
      "افزودن یا ویرایش آیتم‌های منو": ["Add or edit menu items","Menü öğeleri ekleyin veya düzenleyin","إضافة أو تعديل عناصر القائمة"],
      "مرتب‌سازی ساختار منو": ["Organize menu structure","Menü yapısını düzenleyin","تنظيم هيكل القائمة"],
      "اطلاعات و راه‌های ارتباطی": ["Restaurant information and contact methods","Restoran bilgileri ve iletişim yolları","معلومات المطعم وطرق التواصل"],
      "RESTAURANT": ["RESTAURANT","RESTORAN","المطعم"],
      "اطلاعات رستوران": ["Restaurant Information","Restoran Bilgileri","معلومات المطعم"],
      "ویرایش": ["Edit","Düzenle","تعديل"],
      "RECENT": ["RECENT","SON","الأخيرة"],
      "محصولات اخیر": ["Recent Products","Son Ürünler","المنتجات الأخيرة"],
      "مشاهده همه": ["View All","Tümünü Gör","عرض الكل"],
      "MENU MANAGEMENT": ["MENU MANAGEMENT","MENÜ YÖNETİMİ","إدارة القائمة"],
      "محصولات منوی رستوران را مدیریت کنید.": ["Manage the restaurant menu products.","Restoran menü ürünlerini yönetin.","إدارة منتجات قائمة المطعم."],
      "+ افزودن محصول": ["+ Add Product","+ Ürün Ekle","+ إضافة منتج"],
      "جستجوی محصول": ["Product search","Ürün arama","البحث عن منتج"],
      "جستجوی محصول...": ["Search products...","Ürünleri ara...","ابحث عن المنتجات..."],
      "فیلتر دسته‌بندی": ["Category filter","Kategori filtresi","مرشح التصنيف"],
      "همه دسته‌بندی‌ها": ["All categories","Tüm kategoriler","كل التصنيفات"],
      "در حال بارگذاری محصولات…": ["Loading products…","Ürünler yükleniyor…","جارٍ تحميل المنتجات…"],
      "MENU STRUCTURE": ["MENU STRUCTURE","MENÜ YAPISI","هيكل القائمة"],
      "ساختار دسته‌بندی‌های منو را مدیریت کنید.": ["Manage the menu category structure.","Menü kategori yapısını yönetin.","إدارة هيكل تصنيفات القائمة."],
      "+ افزودن دسته‌بندی": ["+ Add Category","+ Kategori Ekle","+ إضافة تصنيف"],
      "جستجوی دسته‌بندی": ["Category search","Kategori arama","البحث في التصنيفات"],
      "جستجوی دسته‌بندی…": ["Search categories…","Kategorilerde ara…","ابحث في التصنيفات…"],
      "ترتیب منو": ["Menu order","Menü sırası","ترتيب القائمة"],
      "نام (الفبا)": ["Name (A–Z)","Ad (A–Z)","الاسم (أبجديًا)"],
      "تعداد محصول (بیشتر)": ["Product count (high to low)","Ürün sayısı (çoktan aza)","عدد المنتجات (الأكثر)"],
      "تعداد محصول (کمتر)": ["Product count (low to high)","Ürün sayısı (azdan çoğa)","عدد المنتجات (الأقل)"],
      "RESTAURANT CONFIGURATION": ["RESTAURANT CONFIGURATION","RESTORAN YAPILANDIRMASI","إعدادات المطعم"],
      "اطلاعاتی که در منوی مشتری نمایش داده می‌شوند.": ["Information shown in the customer menu.","Müşteri menüsünde gösterilen bilgiler.","المعلومات التي تظهر في قائمة العملاء."],
      "نام رستوران": ["Restaurant name","Restoran adı","اسم المطعم"],
      "شعار": ["Tagline","Slogan","الشعار"],
      "توضیحات": ["Description","Açıklama","الوصف"],
      "شماره تلفن": ["Phone number","Telefon numarası","رقم الهاتف"],
      "ذخیره تغییرات": ["Save Changes","Değişiklikleri Kaydet","حفظ التغييرات"],
      "مدیریت منوی دیجیتال رستوران": ["Restaurant digital menu management","Restoran dijital menü yönetimi","إدارة القائمة الرقمية للمطعم"],
      "نسخه 4.5": ["Version 4.5","Sürüm 4.5","الإصدار 4.5"],
      "نسخه 4.6": ["Version 4.6","Sürüm 4.6","الإصدار 4.6"],
      "ذخیره‌سازی محلی مرورگر": ["Browser local storage","Tarayıcı yerel depolaması","التخزين المحلي للمتصفح"],
      "PRODUCT": ["PRODUCT","ÜRÜN","المنتج"],
      "افزودن محصول": ["Add Product","Ürün Ekle","إضافة منتج"],
      "ویرایش محصول": ["Edit Product","Ürünü Düzenle","تعديل المنتج"],
      "بستن پنجره": ["Close dialog","Pencereyi kapat","إغلاق النافذة"],
      "نام محصول": ["Product name","Ürün adı","اسم المنتج"],
      "دسته‌بندی": ["Category","Kategori","التصنيف"],
      "قیمت": ["Price","Fiyat","السعر"],
      "تصویر": ["Image","Görsel","الصورة"],
      "بدون تصویر": ["No image","Görsel yok","بدون صورة"],
      "انتخاب عکس": ["Choose image","Görsel seç","اختيار صورة"],
      "حذف عکس": ["Remove image","Görseli kaldır","حذف الصورة"],
      "JPG یا PNG — قبل از ذخیره خودکار فشرده می‌شود.": ["JPG or PNG — automatically compressed before saving.","JPG veya PNG — kaydetmeden önce otomatik sıkıştırılır.","JPG أو PNG — يتم ضغطها تلقائيًا قبل الحفظ."],
      "Badge": ["Badge","Rozet","الشارة"],
      "بدون Badge": ["No badge","Rozet yok","بدون شارة"],
      "پرفروش": ["Best Seller","Çok Satan","الأكثر مبيعًا"],
      "ویژه": ["Featured","Özel","مميز"],
      "جدید": ["New","Yeni","جديد"],
      "امتیاز": ["Rating","Puan","التقييم"],
      "نمایش در انتخاب ویژه": ["Show in featured selection","Özel seçimde göster","عرض ضمن الاختيارات المميزة"],
      "محصول فعال باشد": ["Product is active","Ürün aktif olsun","المنتج نشط"],
      "انصراف": ["Cancel","İptal","إلغاء"],
      "ذخیره محصول": ["Save Product","Ürünü Kaydet","حفظ المنتج"],
      "CATEGORY": ["CATEGORY","KATEGORİ","التصنيف"],
      "افزودن دسته‌بندی": ["Add Category","Kategori Ekle","إضافة تصنيف"],
      "ویرایش دسته‌بندی": ["Edit Category","Kategoriyi Düzenle","تعديل التصنيف"],
      "نام دسته‌بندی": ["Category name","Kategori adı","اسم التصنيف"],
      "ذخیره دسته‌بندی": ["Save Category","Kategoriyi Kaydet","حفظ التصنيف"],
      "PRIVATE ADMIN ACCESS": ["PRIVATE ADMIN ACCESS","ÖZEL YÖNETİCİ ERİŞİMİ","وصول خاص للمسؤول"],
      "خوش آمدید": ["Welcome","Hoş geldiniz","مرحبًا"],
      "برای ورود امن به پنل مدیریت، با حساب مجاز خود وارد شوید.": ["For secure admin access, sign in with an authorized account.","Yönetim paneline güvenli erişim için yetkili hesabınızla giriş yapın.","للدخول الآمن إلى لوحة الإدارة، سجّل الدخول باستخدام حساب مصرح به."],
      "ورود امن به پنل مدیریت": ["Secure Admin Sign In","Güvenli Yönetici Girişi","تسجيل دخول آمن إلى الإدارة"],
      "SECURE SERVER AUTHENTICATION": ["SECURE SERVER AUTHENTICATION","GÜVENLİ SUNUCU KİMLİK DOĞRULAMA","مصادقة الخادم الآمنة"],
      "ROMANO DIGITAL MENU": ["ROMANO DIGITAL MENU","ROMANO DİJİTAL MENÜ","قائمة رومانو الرقمية"],
      "AUTHORIZED USERS ONLY": ["AUTHORIZED USERS ONLY","YALNIZCA YETKİLİ KULLANICILAR","للمستخدمين المصرح لهم فقط"],
      "محصولی وجود ندارد.": ["No products yet.","Henüz ürün yok.","لا توجد منتجات بعد."],
      "محصولی پیدا نشد": ["No products found","Ürün bulunamadı","لم يتم العثور على منتجات"],
      "با تغییر عبارت جستجو یا فیلتر، دوباره امتحان کنید.": ["Try again by changing the search term or filter.","Arama ifadesini veya filtreyi değiştirip tekrar deneyin.","جرّب مرة أخرى بتغيير عبارة البحث أو المرشح."],
      "همه محصولات": ["All products","Tüm ürünler","كل المنتجات"],
      "فعال": ["Active","Aktif","نشط"],
      "غیرفعال": ["Inactive","Pasif","غير نشط"],
      "قیمت ثبت نشده": ["Price not set","Fiyat belirlenmemiş","السعر غير محدد"],
      "بدون دسته‌بندی": ["Uncategorized","Kategorisiz","بدون تصنيف"],
      "غیرفعال‌کردن": ["Deactivate","Devre dışı bırak","إلغاء التفعيل"],
      "فعال‌کردن": ["Activate","Etkinleştir","تفعيل"],
      "خاموش": ["Off","Kapalı","إيقاف"],
      "حذف": ["Delete","Sil","حذف"],
      "دسته‌بندی‌ای با این جستجو پیدا نشد": ["No category matches this search","Bu aramayla eşleşen kategori yok","لم يتم العثور على تصنيف بهذا البحث"],
      "هنوز دسته‌بندی‌ای ثبت نشده است": ["No categories have been added yet","Henüz kategori eklenmedi","لم تتم إضافة تصنيفات بعد"],
      "عبارت جستجو یا مرتب‌سازی را تغییر دهید.": ["Change the search term or sorting.","Arama terimini veya sıralamayı değiştirin.","غيّر عبارة البحث أو الترتيب."],
      "برای مرتب‌سازی منو، اولین دسته‌بندی را اضافه کنید.": ["Add your first category to organize the menu.","Menüyü düzenlemek için ilk kategorinizi ekleyin.","أضف أول تصنيف لتنظيم القائمة."],
      "محصول": ["Product","Ürün","منتج"],
      "صفحه": ["Page","Sayfa","صفحة"],
      "جستجوی سریع": ["Quick search","Hızlı arama","بحث سريع"],
      "جستجوی سریع پنل مدیریت": ["Search the admin panel","Yönetim panelinde ara","البحث السريع في لوحة الإدارة"],
      "محصول، صفحه یا عملیات را جستجو کنید…": ["Search a product, page, or action…","Ürün, sayfa veya işlem ara…","ابحث عن منتج أو صفحة أو إجراء…"],
      "فیلتر وضعیت محصول": ["Product status filter","Ürün durum filtresi","مرشح حالة المنتج"],
      "همه وضعیت‌ها": ["All statuses","Tüm durumlar","كل الحالات"],
      "مرتب‌سازی محصولات": ["Sort products","Ürünleri sırala","ترتيب المنتجات"],
      "ترتیب فعلی": ["Current order","Mevcut sıra","الترتيب الحالي"],
      "قیمت (بیشتر)": ["Price (high)","Fiyat (yüksek)","السعر (الأعلى)"],
      "قیمت (کمتر)": ["Price (low)","Fiyat (düşük)","السعر (الأدنى)"],
      "وضعیت": ["Status","Durum","الحالة"],
      "پاک‌کردن فیلتر": ["Clear filters","Filtreleri temizle","مسح المرشحات"],
      "پاک کردن جستجو و همه فیلترهای محصولات": ["Clear search and all product filters","Aramayı ve tüm ürün filtrelerini temizle","مسح البحث وكل مرشحات المنتجات"],
      "همه تغییرات ذخیره شده": ["All changes saved","Tüm değişiklikler kaydedildi","تم حفظ جميع التغييرات"],
      "تغییرات ذخیره‌نشده": ["Unsaved changes","Kaydedilmemiş değişiklikler","تغييرات غير محفوظة"],
      "پیش‌نمایش منوی مشتری": ["Customer menu preview","Müşteri menüsü önizlemesi","معاينة قائمة العملاء"],
      "سیستم فعال است": ["System is active","Sistem aktif","النظام نشط"],
      "از پنل مدیریت خارج شوید؟": ["Log out of the admin panel?","Yönetim panelinden çıkmak istiyor musunuz?","هل تريد تسجيل الخروج من لوحة الإدارة؟"],
      "نسخه پشتیبان آماده شد.": ["Backup is ready.","Yedek hazır.","تم إعداد النسخة الاحتياطية."],
      "این کار اطلاعات فعلی منو را با نسخه پشتیبان جایگزین می‌کند. ادامه می‌دهید؟": ["This will replace the current menu data with the backup. Continue?","Bu işlem mevcut menü verilerini yedekle değiştirecek. Devam edilsin mi?","سيؤدي هذا إلى استبدال بيانات القائمة الحالية بالنسخة الاحتياطية. هل تريد المتابعة؟"],
      "پشتیبان با موفقیت بازیابی شد.": ["Backup restored successfully.","Yedek başarıyla geri yüklendi.","تمت استعادة النسخة الاحتياطية بنجاح."],
      "فایل پشتیبان معتبر نیست یا ذخیره‌سازی انجام نشد.": ["The backup file is invalid or could not be saved.","Yedek dosyası geçersiz veya kaydedilemedi.","ملف النسخة الاحتياطية غير صالح أو تعذر حفظه."],
      "نام رستوران الزامی است.": ["Restaurant name is required.","Restoran adı gereklidir.","اسم المطعم مطلوب."],
      "ثبت شده": ["Registered","Kayıtlı","مسجل"],
      "نیازمند تکمیل": ["Needs completion","Tamamlanması gerekiyor","يحتاج إلى استكمال"],
      "انتخاب ویژه": ["Featured selection","Özel seçim","الاختيار المميز"],
      "لینک Instagram معتبر نیست.": ["The Instagram link is not valid.","Instagram bağlantısı geçerli değil.","رابط Instagram غير صالح."],
      "لطفاً نام محصول را وارد کنید.": ["Please enter a product name.","Lütfen ürün adını girin.","يرجى إدخال اسم المنتج."],
      "لطفاً یک دسته‌بندی معتبر انتخاب کنید.": ["Please select a valid category.","Lütfen geçerli bir kategori seçin.","يرجى اختيار تصنيف صالح."],
      "نام دسته‌بندی نمی‌تواند خالی باشد.": ["Category name cannot be empty.","Kategori adı boş bırakılamaz.","لا يمكن أن يكون اسم التصنيف فارغًا."],
      "دسته‌بندی دیگری با این نام وجود دارد.": ["Another category with this name already exists.","Bu ada sahip başka bir kategori zaten var.","يوجد تصنيف آخر بهذا الاسم بالفعل."],
      "لطفاً یک فایل تصویری انتخاب کنید.": ["Please select an image file.","Lütfen bir görsel dosyası seçin.","يرجى اختيار ملف صورة."],
      "پردازش این عکس ممکن نشد. فایل دیگری را امتحان کنید.": ["This image could not be processed. Try another file.","Bu görsel işlenemedi. Başka bir dosya deneyin.","تعذر معالجة هذه الصورة. جرّب ملفًا آخر."],
      "حجم فایل تصویر نباید بیشتر از ۲ مگابایت باشد.": ["Image files must be 2 MB or smaller.","Görsel dosyaları 2 MB veya daha küçük olmalıdır.","يجب ألا يتجاوز حجم ملفات الصور 2 ميغابايت."],
      "مورد از": ["of","/","من"],
      "این دسته‌بندی دارای محصول است. ابتدا محصولات آن را جابه‌جا یا حذف کنید.": ["This category contains products. Move or delete its products first.","Bu kategoride ürünler var. Önce ürünleri taşıyın veya silin.","يحتوي هذا التصنيف على منتجات. انقل منتجاته أو احذفها أولًا."],
      "نتیجه‌ای پیدا نشد.": ["No results found.","Sonuç bulunamadı.","لم يتم العثور على نتائج."],
      "پشتیبان‌گیری": ["Backup","Yedekleme","النسخ الاحتياطي"],
      "داده‌های منو": ["Menu data","Menü verileri","بيانات القائمة"],
      "خروجی JSON": ["Export JSON","JSON dışa aktar","تصدير JSON"],
      "بازیابی JSON": ["Restore JSON","JSON geri yükle","استعادة JSON"],
      "از اطلاعات منو یک فایل پشتیبان محلی بگیرید یا آن را در همین مرورگر بازیابی کنید.": ["Create a local backup of your menu data or restore one in this browser.","Menü verilerinizin yerel yedeğini alın veya bu tarayıcıda geri yükleyin.","أنشئ نسخة احتياطية محلية من بيانات القائمة أو استعد نسخة في هذا المتصفح."],
      "خروجی": ["Export","Dışa Aktar","تصدير"],
      "بازیابی": ["Restore","Geri Yükle","استعادة"],
      "تومان": ["Toman","Toman","تومان"],
      "تعداد": ["Count","Sayı","العدد"],
      "نام": ["Name","Ad","الاسم"],
      "اینستاگرام": ["Instagram","Instagram","Instagram"],
      "فقط کاربران مجاز": ["Authorized users only","Yalnızca yetkili kullanıcılar","للمستخدمين المصرح لهم فقط"],
      "تنظیمات با موفقیت ذخیره شد.": ["Settings saved successfully.","Ayarlar başarıyla kaydedildi.","تم حفظ الإعدادات بنجاح."],
      "سرویس ورود Google بارگذاری نشده است. اتصال اینترنت یا سرویس Google را بررسی کنید.": ["Google sign-in service is not loaded. Check your internet connection or Google service.","Google giriş hizmeti yüklenmedi. İnternet bağlantınızı veya Google hizmetini kontrol edin.","لم يتم تحميل خدمة تسجيل الدخول إلى Google. تحقق من اتصال الإنترنت أو خدمة Google."],
      "راه‌اندازی ورود Google ناموفق بود. دوباره تلاش کنید.": ["Google sign-in initialization failed. Please try again.","Google giriş başlatılamadı. Lütfen tekrar deneyin.","فشل تهيئة تسجيل الدخول إلى Google. حاول مرة أخرى."],
      "این حساب Google اجازه‌ی دسترسی به پنل مدیریت را ندارد.": ["This Google account is not authorized to access the admin panel.","Bu Google hesabının yönetim paneline erişim yetkisi yok.","ليس لحساب Google هذا تصريح للوصول إلى لوحة الإدارة."],
      "ورود با Google ناموفق بود. دوباره امتحان کنید.": ["Google sign-in failed. Please try again.","Google ile giriş başarısız oldu. Lütfen tekrar deneyin.","فشل تسجيل الدخول باستخدام Google. حاول مرة أخرى."],
      "فضای ذخیره‌سازی مرورگر پر شده و تغییرات ذخیره نشد.": ["Browser storage is full and changes were not saved.","Tarayıcı depolama alanı dolu ve değişiklikler kaydedilmedi.","مساحة تخزين المتصفح ممتلئة ولم يتم حفظ التغييرات."],
      "عکس چند محصول/دسته‌بندی را با فایل کوچک‌تری جایگزین کنید یا موارد قدیمی را حذف کنید.": ["Replace some product/category images with smaller files or remove old items.","Bazı ürün/kategori görsellerini daha küçük dosyalarla değiştirin veya eski öğeleri silin.","استبدل بعض صور المنتجات/التصنيفات بملفات أصغر أو احذف العناصر القديمة."]
    };

    const reverse = new Map();
    for (const [fa, vals] of Object.entries(T)) {
        [fa, ...vals].forEach((v, i) => {
            if (v) reverse.set(v, fa);
        });
    }

    let lang;
    try { lang = localStorage.getItem(STORAGE_KEY); } catch (_) {}
    if (!LANGS.includes(lang)) lang = "fa";

    const get = key => key === "fa" ? "فارسی" : (T[key]?.[LANGS.indexOf(lang)-1] ?? key);

    function dynamic(text) {
        const trim = text.trim();
        if (reverse.has(trim)) return null;
        let m;
        const words = {
            active: ["فعال", "Active", "Aktif", "نشط"],
            inactive: ["غیرفعال", "Inactive", "Pasif", "غير نشط"],
            product: ["محصول", "Product", "Ürün", "منتج"],
            edit: ["ویرایش", "Edit", "Düzenle", "تعديل"],
            del: ["حذف", "Delete", "Sil", "حذف"],
            deactivate: ["غیرفعال‌کردن", "Deactivate", "Devre dışı bırak", "إلغاء التفعيل"],
            activate: ["فعال‌کردن", "Activate", "Etkinleştir", "تفعيل"]
        };
        const inSet = (value, key) => words[key].includes(value);
        if ((m = trim.match(/^(\d+)\s+(.+)$/))) {
            const n=m[1], w=m[2];
            if (inSet(w,"active")) return `${n} ${get("فعال")}`;
            if (inSet(w,"inactive")) return `${n} ${get("غیرفعال")}`;
            if (inSet(w,"product")) return `${n} ${get("محصول")}`;
            if (/^(?:\S+\s+){1,2}(?:ویژه|Featured|Özel|مميز)$/.test(w)) return null;
        }
        if ((m = trim.match(/^(\d+)\s+مورد از\s+(\d+)$/))) {
            if (lang === "fa") return `${m[1]} مورد از ${m[2]}`;
            if (lang === "en") return `${m[1]} of ${m[2]}`;
            if (lang === "tr") return `${m[1]} / ${m[2]}`;
            return `${m[1]} من ${m[2]}`;
        }
        if ((m = trim.match(/^(\d+)\s+(?:دسته از|categories of|kategori \/|تصنيف من)\s+(\d+)$/))) {
            const labels = { fa: "دسته از", en: "categories of", tr: "kategori /", ar: "تصنيف من" };
            return `${m[1]} ${labels[lang]} ${m[2]}`;
        }
        for (const k of ["edit","del","deactivate","activate"]) {
            const found = words[k].find(w => trim.startsWith(w + " "));
            if (found) {
                const rest = trim.slice(found.length).trim();
                const out = get(k === "del" ? "حذف" : k === "edit" ? "ویرایش" : k === "deactivate" ? "غیرفعال‌کردن" : "فعال‌کردن");
                return `${out} ${rest}`;
            }
        }
        // Product-card status line, e.g. "فعال · ویژه". The explicit " · " separator is
        // required so standalone labels such as "انتخاب ویژه" are not split.
        if ((m = trim.match(/^(.+?)\s+·\s+(?:ویژه|Featured|Özel|مميز)$/))) return `${translate(m[1])} · ${get("ویژه")}`;
        if ((m = trim.match(/^آیا دسته «(.+)» حذف شود؟$|^Delete category “(.+)”\?$|^“(.+)” kategorisi silinsin mi\?$|^هل تريد حذف التصنيف «(.+)»؟$/))) {
            const name=m.slice(1).find(Boolean)||"";
            return ({fa:`آیا دسته «${name}» حذف شود؟`,en:`Delete category “${name}”?`,tr:`“${name}” kategorisi silinsin mi?`,ar:`هل تريد حذف التصنيف «${name}»؟`})[lang];
        }
        if ((m = trim.match(/^آیا از حذف «(.+)» مطمئن هستید؟$|^Are you sure you want to delete “(.+)”\?$|^“(.+)” silinsin mi\?$|^هل أنت متأكد من حذف «(.+)»؟$/))) {
            const name=m.slice(1).find(Boolean)||"";
            return ({fa:`آیا از حذف «${name}» مطمئن هستید؟`,en:`Are you sure you want to delete “${name}”?`,tr:`“${name}” silinsin mi?`,ar:`هل أنت متأكد من حذف «${name}»؟`})[lang];
        }
        return null;
    }

    function inferKey(value) { return reverse.get(value) || null; }

    function translate(value) {
        const text = String(value ?? "");
        return dynamic(text) || get(text);
    }

    const nodeKeys = new WeakMap();

    function translateTextNode(node) {
        if (!node || node.nodeType !== Node.TEXT_NODE || node.parentElement?.closest("[data-admin-user-text]")) return;
        const raw = node.nodeValue || "";
        const value = raw.trim();
        if (!value) return;
        const key = nodeKeys.get(node) || inferKey(value);
        const dyn = dynamic(value);
        if (!key && !dyn) return;
        if (key) nodeKeys.set(node, key);
        const out = dyn || get(key);
        const lead = raw.match(/^\s*/)?.[0] || "";
        const tail = raw.match(/\s*$/)?.[0] || "";
        node.nodeValue = lead + out + tail;
    }

    function applyElement(el) {
        if (!el || el.nodeType !== Node.ELEMENT_NODE || el.closest("script,style,[data-admin-user-text]")) return;

        if (el.matches("input, textarea")) {
            const val = el.getAttribute("placeholder");
            const pkey = el.getAttribute("data-admin-i18n-placeholder") || inferKey(val || "");
            if (pkey) { el.setAttribute("data-admin-i18n-placeholder", pkey); el.placeholder = get(pkey); }
        }

        ["aria-label", "title"].forEach(attr => {
            const val = el.getAttribute(attr);
            if (!val) return;
            const akey = el.getAttribute(`data-admin-i18n-${attr}`) || inferKey(val);
            if (akey) { el.setAttribute(`data-admin-i18n-${attr}`, akey); el.setAttribute(attr, get(akey)); }
            else {
                const adyn = dynamic(val);
                if (adyn) el.setAttribute(attr, adyn);
            }
        });

        el.childNodes.forEach(node => {
            if (node.nodeType === Node.TEXT_NODE) translateTextNode(node);
        });
    }

    function applyAll() {
        document.documentElement.lang = lang;
        document.documentElement.dir = (lang === "fa" || lang === "ar") ? "rtl" : "ltr";
        document.querySelectorAll("body *").forEach(el => applyElement(el));
        const label = document.querySelector("#admin-language-label");
        if (label) label.textContent = ({fa:"فارسی",en:"English",tr:"Türkçe",ar:"العربية"})[lang];
        const button = document.querySelector("#admin-language-toggle");
        if (button) {
            const names = {fa:"فارسی",en:"English",tr:"Türkçe",ar:"العربية"};
            button.title = names[lang];
            button.setAttribute("aria-label", {fa:"تغییر زبان",en:"Change language",tr:"Dili değiştir",ar:"تغيير اللغة"}[lang]);
        }
        document.title = ({fa:"ROMANO | پنل مدیریت",en:"ROMANO | Admin Panel",tr:"ROMANO | Yönetim Paneli",ar:"رومانو | لوحة الإدارة"})[lang];
        const meta = document.querySelector('meta[name="description"]');
        if (meta) meta.setAttribute("content", ({fa:"پنل مدیریت منوی دیجیتال ROMANO",en:"ROMANO digital menu admin panel",tr:"ROMANO dijital menü yönetim paneli",ar:"لوحة إدارة القائمة الرقمية لرومانو"})[lang]);
        document.dispatchEvent(new CustomEvent("romano:language-changed", { detail: { lang } }));
    }

    function setLanguage(next) {
        if (!LANGS.includes(next)) return;
        lang = next;
        try { localStorage.setItem(STORAGE_KEY, lang); } catch (_) {}
        applyAll();
    }

    function cycle() {
        setLanguage(LANGS[(LANGS.indexOf(lang) + 1) % LANGS.length]);
    }

    function boot() {
        document.querySelector("#admin-language-toggle")?.addEventListener("click", cycle);
        applyAll();
        const observer = new MutationObserver(records => {
            for (const record of records) {
                record.addedNodes.forEach(node => {
                    if (node.nodeType === Node.TEXT_NODE) {
                        translateTextNode(node);
                        return;
                    }
                    if (node.nodeType !== Node.ELEMENT_NODE) return;
                    applyElement(node);
                    node.querySelectorAll?.("*").forEach(applyElement);
                });
            }
        });
        observer.observe(document.body, { childList: true, subtree: true });
    }

    window.ROMANO_ADMIN_I18N = {
        get language() { return lang; },
        languages: LANGS,
        get,
        translate,
        setLanguage,
        cycle
    };
    document.addEventListener("DOMContentLoaded", boot, { once: true });
})();
