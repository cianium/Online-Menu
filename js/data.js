/* =========================================================
   ROMANO DIGITAL MENU
   Menu Data
   Rv4.3 Seed Data
========================================================= */


/* =========================================================
   RESTAURANT
========================================================= */

const restaurantData = {

    name:
        "رمانو",

    tagline:
        "کافه و رستوران",

    description:
        "طعم‌هایی که برای ماندن در خاطره ساخته شده‌اند.",

    phone:
        "+98 31 0000 0000",

    address:
        "اصفهان، میدان انقلاب، بر گذر چهارباغ عباسی، بعد از مادی نیاصرم، کافه رستوران رمانو",

    instagram:
        "#"

};


/* =========================================================
   CATEGORIES
========================================================= */

const categories = [

    {
        id:
            "drinks",

        name:
            "نوشیدنی",

        image:
            "assets/images/categories/drinks.jpg"
    },


    {
        id:
            "cake",

        name:
            "کیک",

        image:
            "assets/images/categories/cake.jpg"
    },


    {
        id:
            "dessert",

        name:
            "دسر",

        image:
            "assets/images/categories/dessert.jpg"
    },


    {
        id:
            "pizza",

        name:
            "پیتزا",

        image:
            "assets/images/categories/pizza.jpg"
    },


    {
        id:
            "burger",

        name:
            "برگر",

        image:
            "assets/images/categories/burger.jpg"
    },


    {
        id:
            "sandwich",

        name:
            "ساندویچ",

        image:
            "assets/images/categories/sandwich.jpg"
    },


    {
        id:
            "salad",

        name:
            "سالاد",

        image:
            "assets/images/categories/salad.jpg"
    }

];


/* =========================================================
   PRODUCTS
========================================================= */

const products = [

    /* =====================================================
       BURGER
    ====================================================== */

    {
        id:
            "classic-burger",

        name:
            "برگر کلاسیک",

        category:
            "burger",

        categoryName:
            "برگر",

        image:
            "assets/images/products/classic-burger.jpg",

        description:
            "گوشت گریل‌شده، پنیر چدار، کاهو، گوجه و سس مخصوص ROMANO.",

        price:
            250000,

        rating:
            "★★★★★",

        badge:
            "پرفروش",

        featured:
            true,

        active:
            true
    },


    {
        id:
            "double-burger",

        name:
            "دابل برگر",

        category:
            "burger",

        categoryName:
            "برگر",

        image:
            "assets/images/products/double-burger.jpg",

        description:
            "دو لایه گوشت گریل‌شده، پنیر چدار، پیاز کاراملی و سس مخصوص.",

        price:
            350000,

        rating:
            "★★★★★",

        badge:
            "ویژه",

        featured:
            true,

        active:
            true
    },


    {
        id:
            "smoky-burger",

        name:
            "اسموکی برگر",

        category:
            "burger",

        categoryName:
            "برگر",

        image:
            "assets/images/products/smoky-burger.jpg",

        description:
            "برگر گوشت گریل‌شده با پنیر، بیکن، پیاز و سس دودی.",

        price:
            320000,

        rating:
            "★★★★☆",

        badge:
            "",

        featured:
            false,

        active:
            true
    },


    /* =====================================================
       PIZZA
    ====================================================== */

    {
        id:
            "pepperoni-pizza",

        name:
            "پیتزا پپرونی",

        category:
            "pizza",

        categoryName:
            "پیتزا",

        image:
            "assets/images/products/pepperoni-pizza.jpg",

        description:
            "پیتزای کلاسیک با پپرونی، پنیر موزارلا و سس گوجه مخصوص.",

        price:
            380000,

        rating:
            "★★★★★",

        badge:
            "پرفروش",

        featured:
            true,

        active:
            true
    },


    {
        id:
            "margherita-pizza",

        name:
            "پیتزا مارگاریتا",

        category:
            "pizza",

        categoryName:
            "پیتزا",

        image:
            "assets/images/products/margherita-pizza.jpg",

        description:
            "سس گوجه، موزارلا، ریحان تازه و روغن زیتون.",

        price:
            320000,

        rating:
            "★★★★☆",

        badge:
            "",

        featured:
            false,

        active:
            true
    },


    {
        id:
            "chicken-pizza",

        name:
            "پیتزا چیکن",

        category:
            "pizza",

        categoryName:
            "پیتزا",

        image:
            "assets/images/products/chicken-pizza.jpg",

        description:
            "مرغ گریل‌شده، قارچ، پنیر موزارلا و سس مخصوص.",

        price:
            360000,

        rating:
            "★★★★☆",

        badge:
            "ویژه",

        featured:
            false,

        active:
            true
    },


    /* =====================================================
       SANDWICH
    ====================================================== */

    {
        id:
            "chicken-sandwich",

        name:
            "ساندویچ چیکن",

        category:
            "sandwich",

        categoryName:
            "ساندویچ",

        image:
            "assets/images/products/chicken-sandwich.jpg",

        description:
            "مرغ گریل‌شده، سبزیجات تازه و سس مخصوص داخل نان تازه.",

        price:
            280000,

        rating:
            "★★★★★",

        badge:
            "پرفروش",

        featured:
            false,

        active:
            true
    },


    {
        id:
            "steak-sandwich",

        name:
            "ساندویچ استیک",

        category:
            "sandwich",

        categoryName:
            "ساندویچ",

        image:
            "assets/images/products/steak-sandwich.jpg",

        description:
            "استیک گریل‌شده، پنیر، پیاز کاراملی و سس مخصوص.",

        price:
            360000,

        rating:
            "★★★★★",

        badge:
            "ویژه",

        featured:
            true,

        active:
            true
    },


    {
        id:
            "vegetable-sandwich",

        name:
            "ساندویچ سبزیجات",

        category:
            "sandwich",

        categoryName:
            "ساندویچ",

        image:
            "assets/images/products/vegetable-sandwich.jpg",

        description:
            "ترکیبی از سبزیجات تازه، پنیر و سس مخصوص ROMANO.",

        price:
            230000,

        rating:
            "★★★★☆",

        badge:
            "",

        featured:
            false,

        active:
            true
    },


    /* =====================================================
       SALAD
    ====================================================== */

    {
        id:
            "caesar-salad",

        name:
            "سالاد سزار",

        category:
            "salad",

        categoryName:
            "سالاد",

        image:
            "assets/images/products/caesar-salad.jpg",

        description:
            "کاهوی تازه، مرغ گریل‌شده، پارمزان، کروتان و سس سزار.",

        price:
            270000,

        rating:
            "★★★★★",

        badge:
            "پرفروش",

        featured:
            true,

        active:
            true
    },


    {
        id:
            "garden-salad",

        name:
            "سالاد گاردن",

        category:
            "salad",

        categoryName:
            "سالاد",

        image:
            "assets/images/products/garden-salad.jpg",

        description:
            "ترکیبی تازه از سبزیجات فصل با سس مخصوص.",

        price:
            220000,

        rating:
            "★★★★☆",

        badge:
            "",

        featured:
            false,

        active:
            true
    },


    {
        id:
            "chicken-salad",

        name:
            "سالاد چیکن",

        category:
            "salad",

        categoryName:
            "سالاد",

        image:
            "assets/images/products/chicken-salad.jpg",

        description:
            "مرغ گریل‌شده، سبزیجات تازه، پنیر و سس مخصوص.",

        price:
            290000,

        rating:
            "★★★★☆",

        badge:
            "ویژه",

        featured:
            false,

        active:
            true
    },


    /* =====================================================
       DESSERT
    ====================================================== */

    {
        id:
            "tiramisu",

        name:
            "تیرامیسو",

        category:
            "dessert",

        categoryName:
            "دسر",

        image:
            "assets/images/products/tiramisu.jpg",

        description:
            "تیرامیسوی کلاسیک با قهوه، ماسکارپونه و پودر کاکائو.",

        price:
            180000,

        rating:
            "★★★★★",

        badge:
            "پرفروش",

        featured:
            true,

        active:
            true
    },


    {
        id:
            "chocolate-dessert",

        name:
            "دسر شکلاتی",

        category:
            "dessert",

        categoryName:
            "دسر",

        image:
            "assets/images/products/chocolate-dessert.jpg",

        description:
            "دسر شکلاتی با بافت نرم و طعم عمیق شکلات.",

        price:
            170000,

        rating:
            "★★★★★",

        badge:
            "ویژه",

        featured:
            false,

        active:
            true
    },


    {
        id:
            "berry-dessert",

        name:
            "بری دسر",

        category:
            "dessert",

        categoryName:
            "دسر",

        image:
            "assets/images/products/berry-dessert.jpg",

        description:
            "ترکیبی سبک و تازه از کرم، بری‌های تازه و بیسکویت.",

        price:
            190000,

        rating:
            "★★★★☆",

        badge:
            "",

        featured:
            false,

        active:
            true
    },


    /* =====================================================
       CAKE
    ====================================================== */

    {
        id:
            "chocolate-cake",

        name:
            "کیک شکلاتی",

        category:
            "cake",

        categoryName:
            "کیک",

        image:
            "assets/images/products/chocolate-cake.jpg",

        description:
            "کیک شکلاتی نرم با کرم شکلات و روکش مخصوص.",

        price:
            160000,

        rating:
            "★★★★★",

        badge:
            "پرفروش",

        featured:
            true,

        active:
            true
    },


    {
        id:
            "cheesecake",

        name:
            "چیزکیک",

        category:
            "cake",

        categoryName:
            "کیک",

        image:
            "assets/images/products/cheesecake.jpg",

        description:
            "چیزکیک خامه‌ای با پایه بیسکویتی و تاپینگ میوه‌ای.",

        price:
            180000,

        rating:
            "★★★★★",

        badge:
            "ویژه",

        featured:
            false,

        active:
            true
    },


    {
        id:
            "red-velvet",

        name:
            "ردولوت",

        category:
            "cake",

        categoryName:
            "کیک",

        image:
            "assets/images/products/red-velvet.jpg",

        description:
            "کیک ردولوت نرم با کرم پنیر مخصوص.",

        price:
            175000,

        rating:
            "★★★★☆",

        badge:
            "",

        featured:
            false,

        active:
            true
    },


    /* =====================================================
       DRINKS
    ====================================================== */

    {
        id:
            "fresh-orange",

        name:
            "آب پرتقال تازه",

        category:
            "drinks",

        categoryName:
            "نوشیدنی",

        image:
            "assets/images/products/fresh-orange.jpg",

        description:
            "آب پرتقال تازه و طبیعی، تهیه‌شده در لحظه.",

        price:
            130000,

        rating:
            "★★★★★",

        badge:
            "پرفروش",

        featured:
            false,

        active:
            true
    },


    {
        id:
            "mojito",

        name:
            "موهیتو",

        category:
            "drinks",

        categoryName:
            "نوشیدنی",

        image:
            "assets/images/products/mojito.jpg",

        description:
            "ترکیب خنک نعناع، لیمو، یخ و نوشیدنی مخصوص.",

        price:
            160000,

        rating:
            "★★★★★",

        badge:
            "ویژه",

        featured:
            true,

        active:
            true
    },


    {
        id:
            "iced-coffee",

        name:
            "آیس کافی",

        category:
            "drinks",

        categoryName:
            "نوشیدنی",

        image:
            "assets/images/products/iced-coffee.jpg",

        description:
            "قهوه سرد با یخ و شیر، مناسب برای یک انتخاب خنک.",

        price:
            150000,

        rating:
            "★★★★☆",

        badge:
            "",

        featured:
            false,

        active:
            true
    }

];


/* =========================================================
   HELPER FUNCTIONS
========================================================= */


/**
 * دریافت محصولات یک دسته‌بندی
 *
 * @param {string} categoryId
 * @returns {Array}
 */

function getProductsByCategory(categoryId) {

    return products.filter(
        product =>
            product.category === categoryId &&
            product.active !== false
    );

}


/**
 * دریافت تمام محصولات ویژه و فعال
 *
 * @returns {Array}
 */

function getFeaturedProducts() {

    return products.filter(
        product =>
            product.featured === true &&
            product.active !== false
    );

}


/**
 * پیدا کردن محصول با ID
 *
 * @param {string} productId
 * @returns {Object|undefined}
 */

function getProductById(productId) {

    return products.find(
        product =>
            product.id === productId
    );

}


/**
 * پیدا کردن دسته‌بندی با ID
 *
 * @param {string} categoryId
 * @returns {Object|undefined}
 */

function getCategoryById(categoryId) {

    return categories.find(
        category =>
            category.id === categoryId
    );

}