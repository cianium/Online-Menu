import { createClient } from "npm:@supabase/supabase-js@2.118.0";

/**
 * Public, read-only menu API mirrored from the active Production function.
 * Database access stays server-side through the service role; responses only
 * include published restaurants and active catalog entries.
 */
const languages = ["fa", "en", "tr", "ar"];
const url = Deno.env.get("SUPABASE_URL");
const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

type RestaurantTranslation = Record<string, unknown> & {
  language_code: string;
  name: string | null;
  tagline: string | null;
  description: string | null;
  address: string | null;
};

type CategoryRow = {
  id: string;
  slug: string;
  image_url: string | null;
  sort_order: number;
  active: boolean;
  created_at: string;
};

type ProductRow = {
  id: string;
  slug: string;
  category_id: string;
  price: number | string;
  image_url: string | null;
  rating: number | string | null;
  featured: boolean;
  active: boolean;
  sort_order: number;
  created_at: string;
};

type CategoryTranslation = Record<string, unknown> & {
  category_id: string;
  language_code: string;
  name: string;
};

type ProductTranslation = Record<string, unknown> & {
  product_id: string;
  language_code: string;
  name: string;
  description: string | null;
  badge_label: string | null;
};

if (!url || !serviceKey) {
  throw new Error("Supabase runtime secrets are not configured");
}

const client = createClient(url, serviceKey, {
  auth: { persistSession: false, autoRefreshToken: false },
});

const json = (body: unknown, status = 200, cache = "no-store") =>
  new Response(JSON.stringify(body), {
    status,
    headers: {
      "content-type": "application/json; charset=utf-8",
      "cache-control": cache,
      "x-content-type-options": "nosniff",
    },
  });

const ok = (data: unknown, requestId: string) => ({ data, error: null, requestId });
const fail = (code: string, message: string, requestId: string) => ({
  data: null,
  error: { code, message },
  requestId,
});

function translatedFields(rows: Record<string, unknown>[], language: string) {
  const map: Record<string, Record<string, unknown>> = {};
  for (const row of rows) {
    const code = String(row.language_code || "");
    if (!languages.includes(code)) continue;
    const value = { ...row };
    delete value.language_code;
    delete value.restaurant_id;
    delete value.category_id;
    delete value.product_id;
    map[code] = value;
  }
  const read = (field: string) => String(map[language]?.[field] || map.fa?.[field] || "");
  return { map, read };
}

Deno.serve(async (request) => {
  const requestId = crypto.randomUUID();
  if (request.method !== "GET") {
    return json(fail("METHOD_NOT_ALLOWED", "Method not allowed.", requestId), 405);
  }

  const requestUrl = new URL(request.url);
  const path = requestUrl.pathname
    .replace(/^\/romano-public(?:\/|$)/, "/")
    .replace(/^\/api\/v1/, "");

  if (path === "/health") {
    return json(ok({ status: "ok", service: "romano-supabase-public" }, requestId));
  }

  const match = path.match(
    /^\/public\/(?:restaurants\/([^/]+)\/(menu|categories|products)|menu\/([^/]+))\/?$/,
  );
  if (!match) return json(fail("NOT_FOUND", "Route not found.", requestId), 404);

  const slug = decodeURIComponent(match[1] || match[3]).toLowerCase();
  if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slug)) {
    return json(fail("MENU_NOT_FOUND", "Restaurant menu not found.", requestId), 404);
  }

  const requestedLanguage = requestUrl.searchParams.get("lang") || "";
  const language = languages.includes(requestedLanguage) ? requestedLanguage : "fa";

  try {
    const { data: restaurant, error: restaurantError } = await client
      .from("restaurants")
      .select(
        "id,slug,name,tagline,description,logo_url,instagram_url,phone,address,currency,default_language",
      )
      .eq("slug", slug)
      .eq("published", true)
      .maybeSingle();

    if (restaurantError) throw restaurantError;
    if (!restaurant) {
      return json(fail("MENU_NOT_FOUND", "Restaurant menu not found.", requestId), 404);
    }

    const results = await Promise.all([
      client
        .from("restaurant_translations")
        .select("language_code,name,tagline,description,address")
        .eq("restaurant_id", restaurant.id),
      client
        .from("categories")
        .select("id,slug,image_url,sort_order,active,created_at")
        .eq("restaurant_id", restaurant.id)
        .eq("active", true)
        .order("sort_order")
        .order("created_at"),
      client
        .from("products")
        .select("id,slug,category_id,price,image_url,rating,featured,active,sort_order,created_at")
        .eq("restaurant_id", restaurant.id)
        .eq("active", true)
        .order("sort_order")
        .order("created_at"),
    ]);

    for (const result of results) if (result.error) throw result.error;
    const restaurantTranslations = (results[0].data || []) as RestaurantTranslation[];
    const categoriesData = (results[1].data || []) as CategoryRow[];
    const productsData = (results[2].data || []) as ProductRow[];
    const categoryIds = categoriesData.map((category) => category.id);
    const productIds = productsData.map((product) => product.id);

    const translationResults = await Promise.all([
      categoryIds.length
        ? client
          .from("category_translations")
          .select("category_id,language_code,name")
          .in("category_id", categoryIds)
        : Promise.resolve({ data: [], error: null }),
      productIds.length
        ? client
          .from("product_translations")
          .select("product_id,language_code,name,description,badge_label")
          .in("product_id", productIds)
        : Promise.resolve({ data: [], error: null }),
    ]);

    for (const result of translationResults) if (result.error) throw result.error;
    const categoryTranslations = (translationResults[0].data || []) as CategoryTranslation[];
    const productTranslations = (translationResults[1].data || []) as ProductTranslation[];
    const categoryMap = new Map(categoriesData.map((category) => [category.id, category]));
    const categoryText = new Map(
      categoriesData.map((category) => [
        category.id,
        translatedFields(
          categoryTranslations.filter((translation) => translation.category_id === category.id),
          language,
        ),
      ]),
    );

    const categories = categoriesData.map((category) => ({
      id: category.slug,
      name: categoryText.get(category.id)!.read("name") || category.slug,
      image: category.image_url || "",
      active: category.active,
      sortOrder: category.sort_order,
      translations: categoryText.get(category.id)!.map,
    }));

    const products = productsData
      .filter((product) => categoryMap.has(product.category_id))
      .map((product) => {
        const translation = translatedFields(
          productTranslations.filter((item) => item.product_id === product.id),
          language,
        );
        const category = categoryMap.get(product.category_id)!;
        return {
          id: product.slug,
          name: translation.read("name") || product.slug,
          description: translation.read("description"),
          badge: translation.read("badge_label"),
          category: category.slug,
          categoryName: categoryText.get(product.category_id)!.read("name"),
          image: product.image_url || "",
          price: Number(product.price),
          rating: Number(product.rating || 0),
          featured: product.featured,
          active: product.active,
          sortOrder: product.sort_order,
          translations: Object.fromEntries(
            Object.entries(translation.map).map(([code, value]) => [
              code,
              { ...value, badge: value.badge_label },
            ]),
          ),
        };
      });

    const restaurantText = translatedFields(restaurantTranslations, language);
    const menu = {
      restaurant: {
        slug: restaurant.slug,
        name: restaurantText.read("name") || restaurant.name,
        tagline: restaurantText.read("tagline") || restaurant.tagline || "",
        description: restaurantText.read("description") || restaurant.description || "",
        address: restaurantText.read("address") || restaurant.address || "",
        logo_url: restaurant.logo_url || "",
        instagram: restaurant.instagram_url || "",
        phone: restaurant.phone || "",
        currency: restaurant.currency,
        defaultLanguage: restaurant.default_language || "fa",
        translations: restaurantText.map,
      },
      categories,
      products,
    };

    const type = match[2] || "menu";
    const categoryFilter = requestUrl.searchParams.get("category");
    const result = type === "categories"
      ? { categories }
      : type === "products"
      ? { products: categoryFilter ? products.filter((product) => product.category === categoryFilter) : products }
      : menu;

    return json(ok(result, requestId), 200, "public, max-age=30, stale-while-revalidate=120");
  } catch (error) {
    console.error("romano public API failure", error);
    return json(fail("INTERNAL_ERROR", "Service temporarily unavailable.", requestId), 503);
  }
});
