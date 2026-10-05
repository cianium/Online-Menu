/* =========================================================
   ROMANO DIGITAL MENU — Full UI localization layer
   Languages: Persian, English, Turkish, Arabic
   Scope: presentation only. Menu/admin data remains untouched.
========================================================= */
(function () {
    "use strict";

    const STORAGE_KEY = "romano_language";
    const LANGUAGES = ["fa", "en", "tr", "ar"];

    const staticText = {
        "رمانو | منوی دیجیتال": { fa: "رمانو | منوی دیجیتال", en: "ROMANO | Digital Menu", tr: "ROMANO | Dijital Menü", ar: "رومانو | القائمة الرقمية" },
        "منوی دیجیتال رستوران رمانو": { fa: "منوی دیجیتال رستوران رمانو", en: "ROMANO digital restaurant menu", tr: "ROMANO dijital restoran menüsü", ar: "القائمة الرقمية لمطعم رومانو" },
        "رمانو": { fa: "رمانو", en: "ROMANO", tr: "ROMANO", ar: "رومانو" },
        "رستوران و کافه": { fa: "رستوران و کافه", en: "Restaurant & Cafe", tr: "Restoran & Kafe", ar: "مطعم ومقهى" },
        "کافه و رستوران": { fa: "کافه و رستوران", en: "Cafe & Restaurant", tr: "Kafe & Restoran", ar: "مقهى ومطعم" },
        "مسیرهای سریع": { fa: "مسیرهای سریع", en: "Quick Links", tr: "Hızlı Bağlantılar", ar: "روابط سريعة" },
        "خانه": { fa: "خانه", en: "Home", tr: "Ana Sayfa", ar: "الرئيسية" },
        "منوی رمانو": { fa: "منوی رمانو", en: "ROMANO Menu", tr: "ROMANO Menüsü", ar: "قائمة رومانو" },
        "انتخاب ویژه": { fa: "انتخاب ویژه", en: "Featured Selection", tr: "Özel Seçimler", ar: "الاختيارات المميزة" },
        "درباره رمانو": { fa: "درباره رمانو", en: "About ROMANO", tr: "ROMANO Hakkında", ar: "عن رومانو" },
        "تماس با رمانو": { fa: "تماس با رمانو", en: "Contact ROMANO", tr: "ROMANO İletişim", ar: "تواصل مع رومانو" },
        "دسته‌بندی‌های منو": { fa: "دسته‌بندی‌های منو", en: "Menu Categories", tr: "Menü Kategorileri", ar: "تصنيفات القائمة" },
        "انتخاب سریع": { fa: "انتخاب سریع", en: "Quick Selection", tr: "Hızlı Seçim", ar: "اختيار سريع" },
        "مشاهده منو": { fa: "مشاهده منو", en: "View Menu", tr: "Menüyü Gör", ar: "عرض القائمة" },
        "اسکرول کنید": { fa: "اسکرول کنید", en: "Scroll", tr: "Kaydır", ar: "مرر" },
        "غذای خوب.": { fa: "غذای خوب.", en: "Good food.", tr: "İyi yemek.", ar: "طعام جيد." },
        "حال خوب": { fa: "حال خوب", en: "Good mood.", tr: "İyi his.", ar: "مزاج جيد" },
        "طعم‌هایی که برای ماندن در خاطره ساخته شده‌اند.": { fa: "طعم‌هایی که برای ماندن در خاطره ساخته شده‌اند.", en: "Flavors made to stay in your memory.", tr: "Hafızanızda kalmak için yaratılmış lezzetler.", ar: "نكهات صُنعت لتبقى في الذاكرة." },
        "یک دسته را انتخاب کنید تا مستقیماً به بخش محصولات آن بروید.": { fa: "یک دسته را انتخاب کنید تا مستقیماً به بخش محصولات آن بروید.", en: "Choose a category to jump directly to its products.", tr: "Ürünlerine doğrudan gitmek için bir kategori seçin.", ar: "اختر تصنيفًا للانتقال مباشرة إلى منتجاته." },
        "داستان رمانو": { fa: "داستان رمانو", en: "The ROMANO Story", tr: "ROMANO Hikâyesi", ar: "قصة رومانو" },
        "رمانو جایی برای غذاهای آشنا با نگاهی متفاوت است؛ از مواد اولیه تا آخرین جزئیات تجربه شما.": { fa: "رمانو جایی برای غذاهای آشنا با نگاهی متفاوت است؛ از مواد اولیه تا آخرین جزئیات تجربه شما.", en: "ROMANO is a place for familiar food with a different perspective — from the ingredients to the final detail of your experience.", tr: "ROMANO, tanıdık lezzetlere farklı bir bakış sunar; malzemelerden deneyiminizin son detayına kadar.", ar: "رومانو مكان للأطعمة المألوفة برؤية مختلفة، من المكونات حتى أدق تفاصيل تجربتك." },
        "مواد اولیه": { fa: "مواد اولیه", en: "Ingredients", tr: "Malzemeler", ar: "المكونات" },
        "دقت در جزئیات": { fa: "دقت در جزئیات", en: "Attention to Detail", tr: "Detaylara Özen", ar: "الاهتمام بالتفاصيل" },
        "تجربه‌ی ماندگار": { fa: "تجربه‌ی ماندگار", en: "A Lasting Experience", tr: "Kalıcı Bir Deneyim", ar: "تجربة لا تُنسى" },
        "آدرس رمانو": { fa: "آدرس رمانو", en: "ROMANO Address", tr: "ROMANO Adresi", ar: "عنوان رومانو" },
        "منتظر": { fa: "منتظر", en: "We are", tr: "Sizi", ar: "نحن" },
        "شما": { fa: "شما", en: "you", tr: "sizi", ar: "كم" },
        "هستیم.": { fa: "هستیم.", en: "waiting.", tr: "bekliyoruz.", ar: "بانتظاركم." },
        "آدرس": { fa: "آدرس", en: "Address", tr: "Adres", ar: "العنوان" },
        "تلفن": { fa: "تلفن", en: "Phone", tr: "Telefon", ar: "الهاتف" },
        "ما را دنبال کنید": { fa: "ما را دنبال کنید", en: "Follow us", tr: "Bizi takip edin", ar: "تابعنا" },
        "Instagram": { fa: "Instagram", en: "Instagram", tr: "Instagram", ar: "Instagram" },
        "در حال بارگذاری رمانو": { fa: "در حال بارگذاری رمانو", en: "Loading ROMANO", tr: "ROMANO yükleniyor", ar: "جارٍ تحميل رومانو" },
        "آدرس رستوران": { fa: "آدرس رستوران", en: "Restaurant Address", tr: "Restoran Adresi", ar: "عنوان المطعم" },
        "بستن": { fa: "بستن", en: "Close", tr: "Kapat", ar: "إغلاق" },
        "مشاهده جزئیات": { fa: "مشاهده جزئیات", en: "View Details", tr: "Detayları Gör", ar: "عرض التفاصيل" },
        "رفتن به منو": { fa: "رفتن به منو", en: "Skip to menu", tr: "Menüye geç", ar: "الانتقال إلى القائمة" },
        "منوی اصلی": { fa: "منوی اصلی", en: "Main Menu", tr: "Ana Menü", ar: "القائمة الرئيسية" },
        "Designed by Cian Khayat": { fa: "Designed by Cian Khayat", en: "Designed by Cian Khayat", tr: "Cian Khayat tarafından tasarlandı", ar: "تصميم Cian Khayat" },
        "ROMANO · RESTAURANT & CAFE": { fa: "ROMANO · RESTAURANT & CAFE", en: "ROMANO · RESTAURANT & CAFE", tr: "ROMANO · RESTORAN & KAFE", ar: "رومانو · مطعم ومقهى" },
        "© 2026 رمانو": { fa: "© 2026 رمانو", en: "© 2026 ROMANO", tr: "© 2026 ROMANO", ar: "© 2026 رومانو" },
        "صفحه اصلی رمانو": { fa: "صفحه اصلی رمانو", en: "ROMANO home", tr: "ROMANO ana sayfa", ar: "صفحة رومانو الرئيسية" },
        "باز کردن منوی اصلی": { fa: "باز کردن منوی اصلی", en: "Open main menu", tr: "Ana menüyü aç", ar: "فتح القائمة الرئيسية" },
        "ناوبری اصلی رمانو": { fa: "ناوبری اصلی رمانو", en: "ROMANO main navigation", tr: "ROMANO ana navigasyonu", ar: "التنقل الرئيسي لرومانو" },
        "بستن منوی اصلی": { fa: "بستن منوی اصلی", en: "Close main menu", tr: "Ana menüyü kapat", ar: "إغلاق القائمة الرئيسية" },
        "ارزش‌های رمانو": { fa: "ارزش‌های رمانو", en: "ROMANO values", tr: "ROMANO değerleri", ar: "قيم رومانو" },
        "اینستاگرام رمانو": { fa: "اینستاگرام رمانو", en: "ROMANO Instagram", tr: "ROMANO Instagram", ar: "إنستغرام رومانو" },
        "لگو رمانو": { fa: "لگو رمانو", en: "ROMANO logo", tr: "ROMANO logosu", ar: "شعار رومانو" },
        "بازگشت به بالای صفحه": { fa: "بازگشت به بالای صفحه", en: "Back to top", tr: "Yukarı dön", ar: "العودة إلى الأعلى" },
        "اشتراک‌گذاری": { fa: "اشتراک‌گذاری", en: "Share", tr: "Paylaş", ar: "مشاركة" },
        "کپی لینک": { fa: "کپی لینک", en: "Copy link", tr: "Bağlantıyı kopyala", ar: "نسخ الرابط" },
        "کپی شد ✓": { fa: "کپی شد ✓", en: "Copied ✓", tr: "Kopyalandı ✓", ar: "تم النسخ ✓" },
        "فیلتر وضعیت محصول": { fa: "فیلتر وضعیت محصول", en: "Product status filter", tr: "Ürün durum filtresi", ar: "مرشح حالة المنتج" },
        "مرتب‌سازی محصولات": { fa: "مرتب‌سازی محصولات", en: "Sort products", tr: "Ürünleri sırala", ar: "ترتيب المنتجات" }
    };

    const categoryText = {
        drinks: { fa: "نوشیدنی", en: "Drinks", tr: "İçecekler", ar: "المشروبات" },
        cake: { fa: "کیک", en: "Cake", tr: "Kek", ar: "الكعك" },
        dessert: { fa: "دسر", en: "Dessert", tr: "Tatlı", ar: "الحلويات" },
        pizza: { fa: "پیتزا", en: "Pizza", tr: "Pizza", ar: "البيتزا" },
        burger: { fa: "برگر", en: "Burgers", tr: "Burger", ar: "البرغر" },
        sandwich: { fa: "ساندویچ", en: "Sandwiches", tr: "Sandviçler", ar: "السندويتشات" },
        salad: { fa: "سالاد", en: "Salads", tr: "Salatalar", ar: "السلطات" }
    };

    const products = {
        "classic-burger": { name: { fa: "برگر کلاسیک", en: "Classic Burger", tr: "Klasik Burger", ar: "برغر كلاسيكي" }, description: { fa: "گوشت گریل‌شده، پنیر چدار، کاهو، گوجه و سس مخصوص ROMANO.", en: "Grilled beef, cheddar cheese, lettuce, tomato and ROMANO signature sauce.", tr: "Izgara dana eti, cheddar peyniri, marul, domates ve ROMANO özel sosu.", ar: "لحم بقري مشوي، جبنة شيدر، خس، طماطم وصلصة رومانو الخاصة." }, badge: { fa: "پرفروش", en: "Best Seller", tr: "Çok Satan", ar: "الأكثر مبيعًا" } },
        "double-burger": { name: { fa: "دابل برگر", en: "Double Burger", tr: "Double Burger", ar: "دبل برغر" }, description: { fa: "دو لایه گوشت گریل‌شده، پنیر چدار، پیاز کاراملی و سس مخصوص.", en: "Two layers of grilled beef, cheddar cheese, caramelized onion and signature sauce.", tr: "İki kat ızgara dana eti, cheddar peyniri, karamelize soğan ve özel sos.", ar: "طبقتان من اللحم البقري المشوي، جبنة شيدر، بصل مكرمل وصلصة خاصة." }, badge: { fa: "ویژه", en: "Special", tr: "Özel", ar: "مميز" } },
        "smoky-burger": { name: { fa: "برگر دودی", en: "Smoky Burger", tr: "Smoky Burger", ar: "برغر مدخن" }, description: { fa: "برگر گوشت گریل‌شده با پنیر، بیکن، پیاز و سس دودی.", en: "Grilled beef burger with cheese, bacon, onion and smoky sauce.", tr: "Peynir, bacon, soğan ve füme soslu ızgara dana burger.", ar: "برغر لحم بقري مشوي مع الجبن، لحم مقدد، بصل وصلصة مدخنة." } },
        "pepperoni-pizza": { name: { fa: "پیتزا پپرونی", en: "Pepperoni Pizza", tr: "Pepperoni Pizza", ar: "بيتزا بيبروني" }, description: { fa: "پیتزای کلاسیک با پپرونی، موزارلا و سس گوجه مخصوص.", en: "Classic pizza with pepperoni, mozzarella and signature tomato sauce.", tr: "Pepperoni, mozzarella ve özel domates soslu klasik pizza.", ar: "بيتزا كلاسيكية مع البيبروني والموزاريلا وصلصة الطماطم الخاصة." }, badge: { fa: "پرفروش", en: "Best Seller", tr: "Çok Satan", ar: "الأكثر مبيعًا" } },
        "margherita-pizza": { name: { fa: "پیتزا مارگاریتا", en: "Margherita Pizza", tr: "Margherita Pizza", ar: "بيتزا مارغريتا" }, description: { fa: "سس گوجه، موزارلا، ریحان تازه و روغن زیتون.", en: "Tomato sauce, mozzarella, fresh basil and olive oil.", tr: "Domates sosu, mozzarella, taze fesleğen ve zeytinyağı.", ar: "صلصة طماطم، موزاريلا، ريحان طازج وزيت زيتون." } },
        "chicken-pizza": { name: { fa: "پیتزا مرغ", en: "Chicken Pizza", tr: "Tavuklu Pizza", ar: "بيتزا الدجاج" }, description: { fa: "مرغ گریل‌شده، قارچ، موزارلا و سس مخصوص.", en: "Grilled chicken, mushrooms, mozzarella and signature sauce.", tr: "Izgara tavuk, mantar, mozzarella ve özel sos.", ar: "دجاج مشوي، فطر، موزاريلا وصلصة خاصة." }, badge: { fa: "ویژه", en: "Special", tr: "Özel", ar: "مميز" } },
        "chicken-sandwich": { name: { fa: "ساندویچ مرغ", en: "Chicken Sandwich", tr: "Tavuklu Sandviç", ar: "ساندويتش الدجاج" }, description: { fa: "مرغ گریل‌شده، سبزیجات تازه و سس مخصوص در نان تازه.", en: "Grilled chicken, fresh vegetables and signature sauce in fresh bread.", tr: "Taze ekmekte ızgara tavuk, taze sebzeler ve özel sos.", ar: "دجاج مشوي، خضروات طازجة وصلصة خاصة داخل خبز طازج." }, badge: { fa: "پرفروش", en: "Best Seller", tr: "Çok Satan", ar: "الأكثر مبيعًا" } },
        "steak-sandwich": { name: { fa: "ساندویچ استیک", en: "Steak Sandwich", tr: "Steak Sandviç", ar: "ساندويتش ستيك" }, description: { fa: "استیک گریل‌شده، پیاز کاراملی و سس مخصوص در نان تازه.", en: "Grilled steak, caramelized onion and signature sauce in fresh bread.", tr: "Taze ekmekte ızgara biftek, karamelize soğan ve özel sos.", ar: "ستيك مشوي، بصل مكرمل وصلصة خاصة داخل خبز طازج." }, badge: { fa: "ویژه", en: "Special", tr: "Özel", ar: "مميز" } },
        "vegetable-sandwich": { name: { fa: "ساندویچ سبزیجات", en: "Vegetable Sandwich", tr: "Sebzeli Sandviç", ar: "ساندويتش الخضار" }, description: { fa: "سبزیجات تازه، پنیر و سس مخصوص در نان تازه.", en: "Fresh vegetables, cheese and ROMANO signature sauce in fresh bread.", tr: "Taze sebzeler, peynir ve ROMANO özel sosundan oluşan sandviç.", ar: "خضروات طازجة، جبن وصلصة رومانو الخاصة داخل خبز طازج." } },
        "caesar-salad": { name: { fa: "سالاد سزار", en: "Caesar Salad", tr: "Sezar Salata", ar: "سلطة سيزر" }, description: { fa: "کاهوی تازه، مرغ گریل‌شده، پارمزان، کروتان و سس سزار.", en: "Fresh lettuce, grilled chicken, parmesan, croutons and Caesar dressing.", tr: "Taze marul, ızgara tavuk, parmesan, kruton ve Sezar sosu.", ar: "خس طازج، دجاج مشوي، بارميزان، خبز محمص وصلصة سيزر." }, badge: { fa: "پرفروش", en: "Best Seller", tr: "Çok Satan", ar: "الأكثر مبيعًا" } },
        "garden-salad": { name: { fa: "سالاد باغ", en: "Garden Salad", tr: "Bahçe Salatası", ar: "سلطة الحديقة" }, description: { fa: "ترکیبی تازه از سبزیجات فصل با سس مخصوص.", en: "A fresh mix of seasonal vegetables with signature dressing.", tr: "Özel sosla servis edilen taze mevsim sebzeleri karışımı.", ar: "مزيج طازج من الخضروات الموسمية مع صلصة خاصة." } },
        "chicken-salad": { name: { fa: "سالاد مرغ", en: "Chicken Salad", tr: "Tavuklu Salata", ar: "سلطة الدجاج" }, description: { fa: "مرغ گریل‌شده، سبزیجات تازه، پنیر و سس مخصوص.", en: "Grilled chicken, fresh vegetables, cheese and signature dressing.", tr: "Izgara tavuk, taze sebzeler, peynir ve özel sos.", ar: "دجاج مشوي، خضروات طازجة، جبن وصلصة خاصة." }, badge: { fa: "ویژه", en: "Special", tr: "Özel", ar: "مميز" } },
        "tiramisu": { name: { fa: "تیرامیسو", en: "Tiramisu", tr: "Tiramisu", ar: "تيراميسو" }, description: { fa: "تیرامیسوی کلاسیک با قهوه، ماسکارپونه و پودر کاکائو.", en: "Classic tiramisu with coffee, mascarpone and cocoa powder.", tr: "Kahve, mascarpone ve kakao tozuyla klasik tiramisu.", ar: "تيراميسو كلاسيكي بالقهوة والماسكاربوني ومسحوق الكاكاو." }, badge: { fa: "پرفروش", en: "Best Seller", tr: "Çok Satan", ar: "الأكثر مبيعًا" } },
        "chocolate-dessert": { name: { fa: "دسر شکلاتی", en: "Chocolate Dessert", tr: "Çikolatalı Tatlı", ar: "حلوى الشوكولاتة" }, description: { fa: "دسری نرم با طعم عمیق شکلات.", en: "A soft chocolate dessert with a deep chocolate flavor.", tr: "Yumuşak dokulu, yoğun çikolata aromalı tatlı.", ar: "حلوى شوكولاتة بقوام ناعم ونكهة شوكولاتة عميقة." }, badge: { fa: "ویژه", en: "Special", tr: "Özel", ar: "مميز" } },
        "berry-dessert": { name: { fa: "دسر میوه‌های جنگلی", en: "Berry Dessert", tr: "Orman Meyveli Tatlı", ar: "حلوى التوت" }, description: { fa: "ترکیبی سبک و تازه از خامه، میوه‌های جنگلی و بیسکویت.", en: "A light, fresh combination of cream, fresh berries and biscuit.", tr: "Krema, taze orman meyveleri ve bisküviden oluşan hafif ve taze bir tatlı.", ar: "مزيج خفيف وطازج من الكريمة والتوت الطازج والبسكويت." } },
        "chocolate-cake": { name: { fa: "کیک شکلاتی", en: "Chocolate Cake", tr: "Çikolatalı Kek", ar: "كعكة الشوكولاتة" }, description: { fa: "کیک شکلاتی نرم با کرم شکلات و روکش مخصوص.", en: "Soft chocolate cake with chocolate cream and a signature topping.", tr: "Çikolata kreması ve özel kaplamalı yumuşak çikolatalı kek.", ar: "كعكة شوكولاتة طرية مع كريمة الشوكولاتة وتغطية خاصة." }, badge: { fa: "پرفروش", en: "Best Seller", tr: "Çok Satan", ar: "الأكثر مبيعًا" } },
        "cheesecake": { name: { fa: "چیزکیک", en: "Cheesecake", tr: "Cheesecake", ar: "تشيز كيك" }, description: { fa: "چیزکیک خامه‌ای با پایه بیسکویت و روکش میوه‌ای.", en: "Creamy cheesecake with a biscuit base and fruit topping.", tr: "Bisküvi tabanlı, meyve kaplamalı kremamsı cheesecake.", ar: "تشيز كيك كريمي مع قاعدة بسكويت وتغطية بالفواكه." }, badge: { fa: "ویژه", en: "Special", tr: "Özel", ar: "مميز" } },
        "red-velvet": { name: { fa: "رد ولوت", en: "Red Velvet", tr: "Red Velvet", ar: "ريد فيلفت" }, description: { fa: "کیک رد ولوت نرم با کرم پنیر مخصوص.", en: "Soft red velvet cake with signature cream cheese frosting.", tr: "Özel krem peynirli, yumuşak red velvet kek.", ar: "كعكة ريد فيلفت طرية مع كريمة الجبن الخاصة." } },
        "fresh-orange": { name: { fa: "آب پرتقال تازه", en: "Fresh Orange Juice", tr: "Taze Portakal Suyu", ar: "عصير برتقال طازج" }, description: { fa: "آب پرتقال طبیعی و تازه که هنگام سفارش تهیه می‌شود.", en: "Fresh natural orange juice, prepared to order.", tr: "Sipariş üzerine hazırlanan taze ve doğal portakal suyu.", ar: "عصير برتقال طبيعي وطازج يُحضّر عند الطلب." }, badge: { fa: "پرفروش", en: "Best Seller", tr: "Çok Satan", ar: "الأكثر مبيعًا" } },
        "mojito": { name: { fa: "موهیتو", en: "Mojito", tr: "Mojito", ar: "موهيتو" }, description: { fa: "ترکیبی خنک و تازه از نعناع، لیمو، یخ و نوشیدنی مخصوص.", en: "A refreshing mix of mint, lime, ice and signature drink.", tr: "Nane, lime, buz ve özel içeceğin ferahlatıcı karışımı.", ar: "مزيج منعش من النعناع والليمون والثلج والمشروب الخاص." }, badge: { fa: "ویژه", en: "Special", tr: "Özel", ar: "مميز" } },
        "iced-coffee": { name: { fa: "آیس کافی", en: "Iced Coffee", tr: "Soğuk Kahve", ar: "قهوة مثلجة" }, description: { fa: "قهوه سرد با یخ و شیر؛ انتخابی خنک و تازه.", en: "Cold coffee with ice and milk, perfect for a refreshing choice.", tr: "Buz ve süt ile hazırlanan, ferahlatıcı bir soğuk kahve.", ar: "قهوة باردة مع الثلج والحليب، خيار منعش." } }
    };

    const restaurant = {
        name: { fa: "رمانو", en: "ROMANO", tr: "ROMANO", ar: "رومانو" },
        tagline: { fa: "کافه و رستوران", en: "Cafe & Restaurant", tr: "Kafe & Restoran", ar: "مقهى ومطعم" },
        description: { fa: "طعم‌هایی که برای ماندن در خاطره ساخته شده‌اند.", en: "Flavors made to stay in your memory.", tr: "Hafızanızda kalmak için yaratılmış lezzetler.", ar: "نكهات صُنعت لتبقى في الذاكرة." },
        address: { fa: "اصفهان، میدان انقلاب، بر گذر چهارباغ عباسی، بعد از مادی نیاصرم، کافه رستوران رمانو", en: "ROMANO Cafe & Restaurant, Chaharbagh Abbasi, Enghelab Square, Isfahan, Iran", tr: "ROMANO Kafe & Restoran, Chaharbagh Abbasi, Enghelab Meydanı, Isfahan, İran", ar: "مقهى ومطعم رومانو، شارع تشهارباغ عباسي، ميدان الثورة، أصفهان، إيران" }
    };

    const dynamicText = {
        fa: {
            categoryView: v => `مشاهده ${v}`,
            rating: v => `امتیاز ${v} از ۵`,
            previous: () => "مشاهده موارد قبلی",
            next: () => "مشاهده موارد بعدی",
            productView: v => `مشاهده ${v}`,
            skipToMenu: () => "رفتن به منو",
            logoAlt: () => "لوگوی رمانو",
            backToTop: () => "بازگشت به بالای صفحه",
            share: () => "اشتراک‌گذاری",
            copyLink: () => "کپی لینک",
            copied: () => "کپی شد ✓",
            signatureEyebrow: v => `غذای امضای رمانو · ${v}`,
            signatureFallback: () => "انتخاب ویژه‌ی امروز رمانو.",
            signatureButton: () => "مشاهده جزئیات",
            menuCount: v => `${v} انتخاب`,
            noResults: v => `نتیجه‌ای برای «${v}» پیدا نشد.`,
            search: () => "جستجو در منوی رمانو…",
            searchSr: () => "جستجوی منو",
            categories: () => "دسته‌بندی‌های منو",
            results: () => "نتایج جستجوی منو",
            currency: () => " تومان"
        },
        en: {
            categoryView: v => `View ${v}`,
            rating: v => `${v} out of 5`,
            previous: () => "View previous items",
            next: () => "View next items",
            productView: v => `View ${v}`,
            skipToMenu: () => "Skip to menu",
            logoAlt: () => "ROMANO logo",
            backToTop: () => "Back to top",
            share: () => "Share",
            copyLink: () => "Copy link",
            copied: () => "Copied ✓",
            signatureEyebrow: v => `SIGNATURE DISH · ${v}`,
            signatureFallback: () => "Today's ROMANO featured selection.",
            signatureButton: () => "View Details",
            menuCount: v => `${v} items`,
            noResults: v => `No results found for “${v}”.`,
            search: () => "Search ROMANO menu…",
            searchSr: () => "Search menu",
            categories: () => "Menu categories",
            results: () => "Menu search results",
            currency: () => " Toman"
        },
        tr: {
            categoryView: v => `${v} görüntüle`,
            rating: v => `${v} / 5 puan`,
            previous: () => "Önceki öğeleri görüntüle",
            next: () => "Sonraki öğeleri görüntüle",
            productView: v => `${v} görüntüle`,
            skipToMenu: () => "Menüye geç",
            logoAlt: () => "ROMANO logosu",
            backToTop: () => "Yukarı dön",
            share: () => "Paylaş",
            copyLink: () => "Bağlantıyı kopyala",
            copied: () => "Kopyalandı ✓",
            signatureEyebrow: v => `ÖZEL ÜRÜN · ${v}`,
            signatureFallback: () => "Bugünün ROMANO özel seçimi.",
            signatureButton: () => "Detayları Gör",
            menuCount: v => `${v} ürün`,
            noResults: v => `“${v}” için sonuç bulunamadı.`,
            search: () => "ROMANO menüsünde ara…",
            searchSr: () => "Menüde ara",
            categories: () => "Menü kategorileri",
            results: () => "Menü arama sonuçları",
            currency: () => " Toman"
        },
        ar: {
            categoryView: v => `عرض ${v}`,
            rating: v => `${v} من 5`,
            previous: () => "عرض العناصر السابقة",
            next: () => "عرض العناصر التالية",
            productView: v => `عرض ${v}`,
            skipToMenu: () => "الانتقال إلى القائمة",
            logoAlt: () => "شعار رومانو",
            backToTop: () => "العودة إلى الأعلى",
            share: () => "مشاركة",
            copyLink: () => "نسخ الرابط",
            copied: () => "تم النسخ ✓",
            signatureEyebrow: v => `طبق رومانو المميز · ${v}`,
            signatureFallback: () => "اختيار رومانو المميز اليوم.",
            signatureButton: () => "عرض التفاصيل",
            menuCount: v => `${v} عناصر`,
            noResults: v => `لم يتم العثور على نتائج لـ «${v}».`,
            search: () => "ابحث في قائمة رومانو…",
            searchSr: () => "ابحث في القائمة",
            categories: () => "تصنيفات القائمة",
            results: () => "نتائج البحث في القائمة",
            currency: () => " تومان"
        }
    };

    // Badges are a small closed vocabulary, so they are translated once here
    // instead of per product. Also covers products created later in the admin.
    const badgeText = {
        "پرفروش": { fa: "پرفروش", en: "Best Seller", tr: "Çok Satan", ar: "الأكثر مبيعًا" },
        "ویژه": { fa: "ویژه", en: "Special", tr: "Özel", ar: "مميز" }
    };

    // Content translations that travel with the entity (API / admin data).
    // Accepts { en: { name, description, badge } } or [{ language, name, description, badge }].
    function entityTranslation(entity, lang) {
        const source = entity?.translations;
        if (!source) return null;
        if (Array.isArray(source)) return source.find(item => item?.language === lang) || null;
        return typeof source === "object" ? (source[lang] || null) : null;
    }

    let current = localStorage.getItem(STORAGE_KEY);
    if (!LANGUAGES.includes(current)) current = "fa";

    const t = (fa, fallback = "") => {
        if (current === "fa") return fa;
        const entry = staticText[fa];
        return entry?.[current] || fallback || fa;
    };

    const pick = (entry, fallback = "") => entry?.[current] || entry?.fa || fallback || "";

    function seedValue(value, seedValueText, translated) {
        if (value == null || value === "") return value;
        if (current === "fa") return value;
        if (value === seedValueText) return translated || value;
        return value;
    }

    function findSeedCategory(id) {
        return Array.isArray(window.categories) ? window.categories.find(item => String(item?.id) === String(id)) : null;
    }

    function findSeedProduct(id) {
        return Array.isArray(window.products) ? window.products.find(item => String(item?.id) === String(id)) : null;
    }

    function localizeRestaurant(config) {
        if (!config) return config;
        const fields = {};
        const own = entityTranslation(config, current) || {};
        ["name", "tagline", "description", "address"].forEach(key => {
            if (own[key]) { fields[key] = own[key]; return; }
            const value = config[key] ?? "";
            const seed = restaurant[key]?.fa ?? "";
            fields[key] = seedValue(value, seed, restaurant[key]?.[current]);
        });
        return { ...config, ...fields };
    }

    function localizeCategory(category) {
        if (!category) return category;
        const own = entityTranslation(category, current);
        if (own?.name) return { ...category, name: own.name };
        if (current === "fa") return category;
        const seed = findSeedCategory(category.id);
        const seedName = seed?.name ?? category.name;
        return { ...category, name: seedValue(category.name, seedName, categoryText[category.id]?.[current]) };
    }

    function localizeProduct(product) {
        if (!product) return product;
        const own = entityTranslation(product, current) || {};
        const ownCategory = entityTranslation({ translations: product.categoryTranslations }, current);
        // Server-provided text wins over whatever language the API resolved the base fields in.
        if (current === "fa") {
            return own.name || ownCategory?.name
                ? { ...product, name: own.name || product.name, description: own.description ?? product.description, badge: own.badge ?? product.badge, categoryName: ownCategory?.name || product.categoryName }
                : product;
        }
        const translation = products[product.id] || {};
        const seed = findSeedProduct(product.id);
        const seedCategory = findSeedCategory(product.category);
        return {
            ...product,
            name: own.name || seedValue(product.name, seed?.name ?? product.name, translation.name?.[current]),
            description: own.description || seedValue(product.description, seed?.description ?? product.description, translation.description?.[current]),
            categoryName: ownCategory?.name || seedValue(product.categoryName, seed?.categoryName ?? seedCategory?.name ?? product.categoryName, categoryText[product.category]?.[current]),
            badge: product.badge
                ? (own.badge || badgeText[product.badge]?.[current] || seedValue(product.badge, seed?.badge ?? product.badge, translation.badge?.[current]))
                : ""
        };
    }

    function ui(key, value = "") {
        const fn = dynamicText[current]?.[key] || dynamicText.fa[key];
        return typeof fn === "function" ? fn(value) : value;
    }

    function translateElementContents() {
        const set = (selector, value, html = false) => {
            const el = document.querySelector(selector);
            if (!el) return;
            if (html) el.innerHTML = value;
            else el.textContent = value;
        };

        set(".hero-title", current === "fa" ? "<span>غذای خوب.</span><span>حال خوب</span>" :
            current === "en" ? "<span>Good food.</span><span>Good mood.</span>" :
            current === "tr" ? "<span>İyi yemek.</span><span>İyi his.</span>" :
            "<span>طعام جيد.</span><span>مزاج جيد.</span>", true);

        set(".hero-description", pick(restaurant.description));
        set(".hero-button span:first-child", ui("skipToMenu"));

        // Elements created once by app.js: they cannot capture the language at creation time,
        // so their labels are (re)written here on every language change.
        document.querySelectorAll(".rv4-skip-link").forEach(el => { el.textContent = ui("skipToMenu"); });
        document.querySelectorAll(".products-scroll-btn--prev").forEach(el => el.setAttribute("aria-label", ui("previous")));
        document.querySelectorAll(".products-scroll-btn--next").forEach(el => el.setAttribute("aria-label", ui("next")));
        document.querySelectorAll(".rv4-back-top").forEach(el => el.setAttribute("aria-label", ui("backToTop")));
        document.querySelectorAll(".brand-logo img, .splash-logo").forEach(el => el.setAttribute("alt", ui("logoAlt")));
        set(".hero-scroll-indicator span:first-child", t("اسکرول کنید"));

        set("#categories .section-title", current === "fa" ? "انتخاب <em>شما</em>" : current === "en" ? "<em>Your</em> Choice" : current === "tr" ? "<em>Sizin</em> Seçiminiz" : "<em>اختيارك</em>", true);
        set("#categories .section-description", t("یک دسته را انتخاب کنید تا مستقیماً به بخش محصولات آن بروید."));

        set("#featured .section-title", current === "fa" ? "انتخاب <em>ویژه.</em>" : current === "en" ? "<em>Featured</em> Selection." : current === "tr" ? "<em>Özel</em> Seçim." : "<em>اختيار مميز.</em>", true);

        set("#story .section-eyebrow", t("داستان رمانو"));
        set("#story .section-title", current === "fa" ? "ساده <em>نیست</em><br><span>خاص است</span>" : current === "en" ? "It is <em>not</em><br><span>ordinary.</span>" : current === "tr" ? "Sıradan <em>değil</em><br><span>özel.</span>" : "الأمر <em>ليس</em><br><span>عاديًا.</span>", true);
        set("#story .story-description", t("رمانو جایی برای غذاهای آشنا با نگاهی متفاوت است؛ از مواد اولیه تا آخرین جزئیات تجربه شما."));
        const points = document.querySelectorAll("#story .romano-story-point strong");
        ["مواد اولیه", "دقت در جزئیات", "تجربه‌ی ماندگار"].forEach((key, i) => { if (points[i]) points[i].textContent = t(key); });
        const storyGrid = document.querySelector("#story .romano-story-grid");
        if (storyGrid) storyGrid.setAttribute("aria-label", t("ارزش‌های رمانو"));

        set("#contact .section-eyebrow", t("آدرس رمانو"));
        set("#contact .section-title", current === "fa" ? "منتظر <em>شما</em> هستیم." : current === "en" ? "We are waiting for <em>you.</em>" : current === "tr" ? "<em>Sizi</em> bekliyoruz." : "<em>بانتظاركم.</em>", true);
        const contactLabels = document.querySelectorAll("#contact .contact-label");
        if (contactLabels[0]) contactLabels[0].textContent = t("آدرس");
        if (contactLabels[1]) contactLabels[1].textContent = t("تلفن");
        const contactActions = document.querySelectorAll("#contact .romano-contact-action");
        if (contactActions[0]) contactActions[0].textContent = t("مشاهده منو");
        if (contactActions[1]) contactActions[1].textContent = t("تماس با رمانو");

        const footerBrand = document.querySelector(".footer-brand p");
        if (footerBrand) footerBrand.textContent = t("کافه و رستوران");
        const footerHeadings = document.querySelectorAll(".site-footer .footer-heading");
        if (footerHeadings[0]) footerHeadings[0].textContent = current === "fa" ? "ارتباط با ما" : current === "en" ? "Contact" : current === "tr" ? "İletişim" : "تواصل معنا";
        if (footerHeadings[1]) footerHeadings[1].textContent = t("ما را دنبال کنید");
        const footerAddress = document.querySelector(".site-footer [data-restaurant-address]");
        if (footerAddress && !footerAddress.closest("#contact")) footerAddress.textContent = t("آدرس رستوران");
        const footerCopyright = document.querySelector(".footer-bottom span");
        if (footerCopyright) footerCopyright.textContent = current === "fa" ? "© 2026 رمانو" : current === "en" ? "© 2026 ROMANO" : current === "tr" ? "© 2026 ROMANO" : "© 2026 رومانو";

        const modalClose = document.querySelector(".product-modal .modal-close");
        if (modalClose) modalClose.setAttribute("aria-label", t("بستن"));
        document.querySelector(".site-header")?.setAttribute("data-language", current);
    }

    function applyStatic() {
        document.querySelectorAll("[data-i18n]").forEach(el => {
            const key = el.getAttribute("data-i18n");
            const value = staticText[key]?.[current] || key;
            if (el.matches("input, textarea")) el.placeholder = value;
            else el.textContent = value;
        });
        document.querySelectorAll("[data-i18n-aria]").forEach(el => {
            const key = el.getAttribute("data-i18n-aria");
            el.setAttribute("aria-label", staticText[key]?.[current] || key);
        });
    }

    function markStaticNodes() {
        const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
        const nodes = [];
        while (walker.nextNode()) nodes.push(walker.currentNode);
        nodes.forEach(node => {
            const value = node.nodeValue.trim();
            if (!value || !staticText[value]) return;
            const parent = node.parentElement;
            if (!parent || parent.closest("script, style")) return;
            if (parent.children.length > 0 && value !== parent.textContent.trim()) return;
            parent.setAttribute("data-i18n", value);
        });
        document.querySelectorAll("[aria-label]").forEach(el => {
            const value = el.getAttribute("aria-label");
            if (staticText[value]) el.setAttribute("data-i18n-aria", value);
        });
    }

    function updateButton() {
        const button = document.querySelector("#romano-language-toggle");
        if (!button) return;
        const labels = { fa: "فارسی", en: "English", tr: "Türkçe", ar: "العربية" };
        button.title = labels[current];
        button.setAttribute("aria-label", current === "fa" ? "تغییر زبان" : current === "en" ? "Change language" : current === "tr" ? "Dili değiştir" : "تغيير اللغة");
        const label = button.querySelector("#romano-language-label");
        if (label) label.textContent = current.toUpperCase();
    }

    function setLanguage(lang, announce = true) {
        if (!LANGUAGES.includes(lang)) return;
        current = lang;
        try { localStorage.setItem(STORAGE_KEY, current); } catch (_) {}

        const html = document.documentElement;
        html.lang = current;
        html.dir = current === "fa" || current === "ar" ? "rtl" : "ltr";

        applyStatic();
        translateElementContents();
        updateButton();
        document.title = t("رمانو | منوی دیجیتال", document.title);
        const metaDescription = document.querySelector('meta[name="description"]');
        if (metaDescription) metaDescription.setAttribute("content", pick(restaurant.description));
        document.dispatchEvent(new CustomEvent("romano:language-changed", { detail: { lang: current } }));
        if (announce) {
            const label = document.querySelector("#romano-language-label");
            if (label) label.textContent = current.toUpperCase();
        }
    }

    function cycleLanguage() {
        const next = LANGUAGES[(LANGUAGES.indexOf(current) + 1) % LANGUAGES.length];
        setLanguage(next);
    }

    function init() {
        markStaticNodes();
        document.querySelector("#romano-language-toggle")?.addEventListener("click", cycleLanguage);
        setLanguage(current, false);
    }

    window.ROMANO_I18N = {
        get language() { return current; },
        languages: LANGUAGES,
        t,
        pick,
        localizeCategory,
        localizeProduct,
        localizeRestaurant,
        ui,
        restaurant,
        setLanguage,
        cycleLanguage,
        init
    };

    document.addEventListener("DOMContentLoaded", init);
})();
