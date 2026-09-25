/* =========================================================
   ROMANO ADMIN — Full UI localization
   Presentation only; saved content remains unchanged.
========================================================= */
(function () {
    "use strict";

    const STORAGE_KEY = "romano_language";
    const LANGS = ["fa", "en", "tr", "ar"];

    const T = {
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
      "حجم فایل تصویر نباید بیشتر از ۱۲ مگابایت باشد.": ["Image files must be 12 MB or smaller.","Görsel dosyaları 12 MB veya daha küçük olmalıdır.","يجب ألا يتجاوز حجم ملفات الصور 12 ميغابايت."],
      "مورد از": ["of","/","من"],
      "این دسته‌بندی دارای محصول است. ابتدا محصولات آن را جابه‌جا یا حذف کنید.": ["This category contains products. Move or delete its products first.","Bu kategoride ürünler var. Önce ürünleri taşıyın veya silin.","يحتوي هذا التصنيف على منتجات. انقل منتجاته أو احذفها أولًا."],
      "نتیجه‌ای پیدا نشد.": ["No results found.","Sonuç bulunamadı.","لم يتم العثور على نتائج."],
      "پشتیبان‌گیری": ["Backup","Yedekleme","النسخ الاحتياطي"],
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

    let lang = localStorage.getItem(STORAGE_KEY);
    if (!LANGS.includes(lang)) lang = "fa";

    const get = key => key === "fa" ? "فارسی" : (T[key]?.[LANGS.indexOf(lang)-1] ?? key);

    function dynamic(text) {
        const trim = text.trim();
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
        if ((m = trim.match(/^(.+?)\s+(?: · )?(?:ویژه|Featured|Özel|مميز)$/))) return `${m[1]} · ${get("ویژه")}`;
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
        if (!node || node.nodeType !== Node.TEXT_NODE) return;
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
        if (!el || el.nodeType !== Node.ELEMENT_NODE || el.closest("script,style")) return;

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
        if (label) label.textContent = lang.toUpperCase();
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
