import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2";

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const PARAMS = ["T2M", "T2M_MAX", "T2M_MIN", "PRECTOTCORR", "ALLSKY_SFC_SW_DWN", "RH2M", "IMERG_PRECTOT"];
const UNITS: Record<string, string> = {
  T2M: "°C", T2M_MAX: "°C", T2M_MIN: "°C",
  PRECTOTCORR: "mm/day", ALLSKY_SFC_SW_DWN: "kWh/m²/day", RH2M: "%", IMERG_PRECTOT: "mm/day"
};

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...cors, "Content-Type": "application/json; charset=utf-8", "Cache-Control": "no-store" },
  });
}
function dateStamp(date: Date) {
  return date.toISOString().slice(0, 10).replaceAll("-", "");
}
function isoDate(stamp: string) {
  return stamp.slice(0, 4) + "-" + stamp.slice(4, 6) + "-" + stamp.slice(6, 8);
}
function validStamp(value: unknown): value is string {
  return typeof value === "string" && /^\d{8}$/.test(value) &&
    !Number.isNaN(Date.parse(isoDate(value) + "T00:00:00Z"));
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
        publishableKey = parsed.default ?? Object.values(parsed)[0] as string ?? publishableKey;
      } catch { /* use legacy anon key if available */ }
    }
    if (!supabaseUrl || !publishableKey) return json({ error: "إعدادات اتصال قاعدة البيانات غير مكتملة." }, 500);

    const supabase = createClient(supabaseUrl, publishableKey, {
      global: { headers: { Authorization: authorization } },
      auth: { persistSession: false, autoRefreshToken: false },
    });
    const { data: authData, error: authError } = await supabase.auth.getUser();
    if (authError || !authData.user) return json({ error: "جلسة الدخول غير صالحة. سجّل الدخول مرة أخرى." }, 401);

    const body = await req.json();
    const fieldId = String(body.field_id ?? "");
    if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(fieldId)) {
      return json({ error: "اختيار الحقل غير صالح." }, 400);
    }

    const { data: field, error: fieldError } = await supabase
      .from("fields")
      .select("id,name,current_crop,farm_id,farms!inner(id,owner_id,name,latitude,longitude,governorate,locality)")
      .eq("id", fieldId)
      .single();
    if (fieldError || !field) return json({ error: "لم نتمكن من العثور على الحقل أو لا تملك صلاحية الوصول إليه." }, 404);
    const farm = Array.isArray(field.farms) ? field.farms[0] : field.farms;
    if (!farm || farm.owner_id !== authData.user.id) return json({ error: "هذا الحقل ليس تابعاً لمزرعتك." }, 403);
    const latitude = Number(farm.latitude);
    const longitude = Number(farm.longitude);
    if (farm.latitude == null || farm.longitude == null || !Number.isFinite(latitude) || !Number.isFinite(longitude)) {
      return json({ error: "أضف خط العرض وخط الطول للمزرعة أولاً من صفحة مزارعي." }, 422);
    }

    const now = new Date();
    const endDefault = new Date(now.getTime() - 3 * 86400000);
    const startDefault = new Date(endDefault.getTime() - 13 * 86400000);
    const start = body.start ?? dateStamp(startDefault);
    const end = body.end ?? dateStamp(endDefault);
    if (!validStamp(start) || !validStamp(end) || start > end ||
        Date.parse(isoDate(end) + "T00:00:00Z") - Date.parse(isoDate(start) + "T00:00:00Z") > 30 * 86400000 ||
        end > dateStamp(now)) {
      return json({ error: "الفترة الزمنية غير صالحة. اختر فترة لا تتجاوز 31 يوماً ولا تتضمن تاريخاً مستقبلياً." }, 400);
    }

    const url = new URL("https://power.larc.nasa.gov/api/temporal/daily/point");
    url.search = new URLSearchParams({
      parameters: PARAMS.join(","),
      community: "AG",
      longitude: String(longitude),
      latitude: String(latitude),
      start,
      end,
      format: "JSON",
      "time-standard": "UTC",
    }).toString();

    const response = await fetch(url, { headers: { Accept: "application/json" } });
    if (!response.ok) throw new Error("NASA POWER returned HTTP " + response.status);
    const payload = await response.json();
    const parameterData = payload?.properties?.parameter ?? {};
    const observations: Array<{date:string;parameter:string;value:number;unit:string}> = [];
    const latest: Record<string, {date:string;value:number;unit:string}> = {};

    for (const parameter of PARAMS) {
      const values = parameterData[parameter] ?? {};
      for (const [stamp, raw] of Object.entries(values)) {
        const value = Number(raw);
        if (!validStamp(stamp) || !Number.isFinite(value) || value <= -900) continue;
        const date = isoDate(stamp);
        observations.push({ date, parameter, value, unit: UNITS[parameter] });
        if (!latest[parameter] || date > latest[parameter].date) {
          latest[parameter] = { date, value, unit: UNITS[parameter] };
        }
      }
    }
    observations.sort((a, b) => a.date.localeCompare(b.date) || a.parameter.localeCompare(b.parameter));
    if (!observations.length) return json({ error: "لم تُرجع NASA POWER قراءات صالحة لهذه الفترة والموقع." }, 502);

    let storedCount = 0;
    let storageWarning: string | null = null;
    const { data: existing, error: existingError } = await supabase
      .from("climate_observations")
      .select("parameter,observed_on")
      .eq("field_id", fieldId)
      .eq("source", "NASA POWER")
      .gte("observed_on", isoDate(start))
      .lte("observed_on", isoDate(end));
    if (existingError) {
      storageWarning = "تم جلب البيانات لكن تعذر قراءة سجل التخزين.";
    } else {
      const known = new Set((existing ?? []).map((row: {parameter:string;observed_on:string}) => row.parameter + "|" + row.observed_on));
      const inserts = observations.filter(row => !known.has(row.parameter + "|" + row.date)).map(row => ({
        field_id: fieldId,
        latitude,
        longitude,
        source: "NASA POWER",
        parameter: row.parameter,
        observed_on: row.date,
        value: row.value,
        unit: row.unit,
        spatial_resolution: row.parameter === "IMERG_PRECTOT" ? "GPM IMERG 0.1° (~10 km)" : "MERRA-2/GEOS-IT meteorology ~0.5° × 0.625°",
        temporal_resolution: "Daily UTC",
        metadata: {
          community: "AG",
          source_parameter: row.parameter,
          source_url: url.toString(),
          field_name: field.name,
          farm_name: farm.name,
          source_product: row.parameter === "IMERG_PRECTOT" ? "NASA GPM IMERG" : "NASA POWER meteorology",
          caveat: "Gridded estimate; not a field sensor measurement.",
        },
      }));
      if (inserts.length) {
        const { error: insertError } = await supabase.from("climate_observations").insert(inserts);
        if (insertError) storageWarning = "تم جلب البيانات لكن تعذر حفظها في سجل المناخ: " + insertError.message;
        else storedCount = inserts.length;
      }
    }

    return json({
      source: "NASA POWER",
      source_url: url.toString(),
      fetched_at: new Date().toISOString(),
      field: { id: field.id, name: field.name, crop: field.current_crop ?? null },
      farm: { name: farm.name, governorate: farm.governorate, locality: farm.locality },
      coordinates: { latitude, longitude },
      start_date: isoDate(start),
      end_date: isoDate(end),
      temporal_resolution: "Daily UTC",
      spatial_resolution: "Mixed sources: meteorology MERRA-2/GEOS-IT ~0.5° × 0.625°; GPM IMERG precipitation 0.1° (~10 km)",
      units: UNITS,
      latest,
      observations,
      stored_count: storedCount,
      storage_warning: storageWarning,
      limitations: [
        "NASA POWER is a gridded estimate at the farm coordinates, not an on-farm weather station.",
        "The latest available day can lag behind the current date.",
        "IMERG_PRECTOT is the GPM IMERG daily precipitation estimate at 0.1° (~10 km); it is not a field rain-gauge reading.",
        "PRECTOTCORR is a separate NASA POWER meteorological precipitation estimate and should not be confused with IMERG.",
      ],
    });
  } catch (error) {
    console.error("nasa-power error", error);
    return json({ error: error instanceof Error ? error.message : "تعذر جلب بيانات NASA POWER." }, 502);
  }
});