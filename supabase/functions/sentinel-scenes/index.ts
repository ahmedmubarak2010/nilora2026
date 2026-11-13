import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2";

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};
function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...cors, "Content-Type": "application/json; charset=utf-8", "Cache-Control": "no-store" },
  });
}
Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });
  if (req.method !== "POST") return json({ error: "Method not allowed" }, 405);
  try {
    const authorization = req.headers.get("Authorization");
    if (!authorization?.startsWith("Bearer ")) return json({ error: "تسجيل الدخول مطلوب." }, 401);
    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const publishableKeys = Deno.env.get("SUPABASE_PUBLISHABLE_KEYS");
    let publishableKey = Deno.env.get("SUPABASE_ANON_KEY") ?? "";
    if (publishableKeys) {
      try {
        const parsed = JSON.parse(publishableKeys);
        publishableKey = parsed.default ?? (Object.values(parsed)[0] as string) ?? publishableKey;
      } catch { /* fallback to legacy anon key */ }
    }
    if (!supabaseUrl || !publishableKey) return json({ error: "إعدادات اتصال قاعدة البيانات غير مكتملة." }, 500);
    const supabase = createClient(supabaseUrl, publishableKey, {
      global: { headers: { Authorization: authorization } },
      auth: { persistSession: false, autoRefreshToken: false },
    });
    const { data: authData, error: authError } = await supabase.auth.getUser();
    if (authError || !authData.user) return json({ error: "جلسة الدخول غير صالحة." }, 401);
    const body = await req.json();
    const fieldId = String(body.field_id ?? "");
    if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(fieldId)) {
      return json({ error: "اختيار الحقل غير صالح." }, 400);
    }
    const { data: field, error: fieldError } = await supabase
      .from("fields")
      .select("id,name,current_crop,farm_id,farms!inner(id,owner_id,name,latitude,longitude)")
      .eq("id", fieldId)
      .single();
    if (fieldError || !field) return json({ error: "لم نتمكن من العثور على الحقل." }, 404);
    const farm = Array.isArray(field.farms) ? field.farms[0] : field.farms;
    if (!farm || farm.owner_id !== authData.user.id) return json({ error: "هذا الحقل ليس تابعاً لمزرعتك." }, 403);
    const latitude = Number(farm.latitude), longitude = Number(farm.longitude);
    if (farm.latitude == null || farm.longitude == null || !Number.isFinite(latitude) || !Number.isFinite(longitude)) {
      return json({ error: "أضف إحداثيات المزرعة أولاً." }, 422);
    }
    const now = new Date();
    const end = new Date(now.getTime());
    const start = new Date(now.getTime() - 60 * 86400000);
    const dateRange = start.toISOString().slice(0,10) + "T00:00:00Z/" + end.toISOString().slice(0,10) + "T23:59:59Z";
    const endpoint = "https://stac.dataspace.copernicus.eu/v1/search";
    const response = await fetch(endpoint, {
      method: "POST",
      headers: { "Content-Type": "application/json", "Accept": "application/geo+json, application/json" },
      body: JSON.stringify({
        collections: ["sentinel-2-l2a"],
        intersects: { type: "Point", coordinates: [longitude, latitude] },
        datetime: dateRange,
        limit: 20,
      }),
    });
    if (!response.ok) throw new Error("Copernicus STAC returned HTTP " + response.status);
    const payload = await response.json();
    const scenes = (payload?.features ?? []).map((item: any) => {
      const props = item.properties ?? {};
      const assets = item.assets ?? {};
      const selfLink = (item.links ?? []).find((link: any) => link.rel === "self")?.href ?? null;
      return {
        id: item.id ?? "Sentinel-2 scene",
        datetime: props.datetime ?? props.start_datetime ?? null,
        cloud_cover: typeof props["eo:cloud_cover"] === "number" ? props["eo:cloud_cover"] : null,
        platform: props.platform ?? null,
        processing_level: props["processing:level"] ?? "Level-2A",
        item_url: selfLink,
        thumbnail_url: assets.thumbnail?.href ?? assets.preview?.href ?? null,
      };
    }).sort((a: any,b: any) => String(b.datetime ?? "").localeCompare(String(a.datetime ?? ""))).slice(0,10);
    return json({
      source: "Copernicus Data Space Ecosystem — Sentinel-2 L2A",
      catalog_url: "https://stac.dataspace.copernicus.eu/v1/",
      fetched_at: new Date().toISOString(),
      field: { id: field.id, name: field.name, crop: field.current_crop ?? null },
      farm: { name: farm.name },
      coordinates: { latitude, longitude },
      date_range: dateRange,
      scenes,
      scene_count: scenes.length,
      analysis_status: "scene_catalogue_only",
      limitations: [
        "This response lists satellite scenes intersecting the farm coordinate; it does not calculate NDVI or diagnose crop disease.",
        "A farm point is used because a verified field boundary polygon is not available in this request.",
        "Cloud cover is scene-level metadata and does not guarantee cloud-free pixels over the field.",
      ],
    });
  } catch (error) {
    console.error("sentinel-scenes error", error);
    return json({ error: error instanceof Error ? error.message : "تعذر البحث عن مشاهد Sentinel-2." }, 502);
  }
});