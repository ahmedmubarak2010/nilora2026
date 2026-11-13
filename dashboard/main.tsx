import React, { useEffect, useMemo, useState } from "react";
import { createRoot } from "react-dom/client";
import L from "leaflet";
import {
  Area, AreaChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis,
} from "recharts";
import {
  Activity, AlertTriangle, ArrowDownRight, ArrowUpRight, Bell, BookOpen,
  Building2, CalendarDays, CheckCircle2, ChevronDown, Cloud, CloudRain,
  Droplets, ExternalLink, FileBarChart, FileCheck2, Filter, Gauge, Globe2,
  Leaf, LogOut, Map as MapIcon, MapPin, Menu, Plus, RefreshCw, Ruler,
  Satellite, Search, Settings2, ShieldCheck, Sprout, Sun, Thermometer,
  Users, Wind, X,
} from "lucide-react";
import "leaflet/dist/leaflet.css";
import "./style.css";

declare global {
  interface Window {
    NILORA_CONFIG: { supabaseUrl: string; supabaseAnonKey: string };
    supabase: any;
  }
}

type Profile = {
  id: string; full_name?: string; role: "farmer" | "agronomist";
  account_status?: string; agronomist_status?: string; organization?: string;
};
type Farm = {
  id: string; name: string; area_feddan?: number; latitude?: number | null;
  longitude?: number | null; governorate?: string; locality?: string;
};
type Field = {
  id: string; name: string; current_crop?: string; area_feddan?: number;
  length_m?: number; width_m?: number; perimeter_m?: number;
  boundary_geojson?: any; farms?: Farm | Farm[];
};
type ClimateResponse = {
  latest?: Record<string, { date: string; value: number; unit: string }>;
  observations?: Array<{ date: string; parameter: string; value: number; unit: string }>;
  fetched_at?: string; start_date?: string; end_date?: string;
  spatial_resolution?: string; source_url?: string; storage_warning?: string | null;
  limitations?: string[];
};
type Scene = { id: string; datetime?: string; cloud_cover?: number | null; item_url?: string | null; thumbnail_url?: string | null };

const db = window.supabase.createClient(
  window.NILORA_CONFIG.supabaseUrl,
  window.NILORA_CONFIG.supabaseAnonKey,
  { auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: true } },
);
const fmt = (n: unknown, digits = 1) =>
  n === null || n === undefined || !Number.isFinite(Number(n))
    ? "—"
    : Number(n).toLocaleString("en-US", { maximumFractionDigits: digits });
const shortDate = (s?: string) => s ? new Date(s).toLocaleDateString("en-US", { month: "short", day: "numeric" }) : "—";
const farmOf = (field: Field): Farm | undefined =>
  Array.isArray(field.farms) ? field.farms[0] : field.farms;
const initials = (s: string) => s.split(/[\s@._-]+/).filter(Boolean).slice(0, 2).map(x => x[0]?.toUpperCase()).join("") || "N";

function useAccount() {
  const [profile, setProfile] = useState<Profile | null>(null);
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        const { data: { session } } = await db.auth.getSession();
        if (!session) { location.href = "signup.html"; return; }
        const { data, error: profileError } = await db.from("profiles").select("*").eq("id", session.user.id).single();
        if (profileError || !data) { location.href = "onboarding.html"; return; }
        if (data.account_status !== "active") { await db.auth.signOut(); location.href = "signup.html"; return; }
        if (!data.onboarding_completed) { location.href = "onboarding.html"; return; }
        const requiredRole = location.pathname.includes("agronomist-dashboard") ? "agronomist" : "farmer";
        if (data.role !== requiredRole) {
          location.href = data.role === "agronomist" ? "agronomist-dashboard.html" : "farmer-dashboard.html";
          return;
        }
        if (alive) { setProfile(data); setUser(session.user); }
      } catch (e: any) {
        if (alive) setError(e?.message || "Unable to load your account.");
      } finally { if (alive) setLoading(false); }
    })();
    return () => { alive = false; };
  }, []);
  return { profile, user, loading, error };
}

function useFarmerData() {
  const [farms, setFarms] = useState<Farm[]>([]);
  const [fields, setFields] = useState<Field[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const reload = async () => {
    setLoading(true); setError("");
    try {
      const [farmResult, fieldResult] = await Promise.all([
        db.from("farms").select("*").order("created_at", { ascending: false }),
        db.from("fields").select("*,farms(name,latitude,longitude,governorate,locality)").order("created_at", { ascending: false }),
      ]);
      if (farmResult.error) throw farmResult.error;
      if (fieldResult.error) throw fieldResult.error;
      setFarms(farmResult.data || []); setFields(fieldResult.data || []);
    } catch (e: any) { setError(e?.message || "Could not load your farms."); }
    finally { setLoading(false); }
  };
  useEffect(() => { reload(); }, []);
  return { farms, fields, loading, error, reload };
}

function useEarthData(fieldId: string) {
  const [climate, setClimate] = useState<ClimateResponse | null>(null);
  const [scenes, setScenes] = useState<Scene[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [lastUpdated, setLastUpdated] = useState("");
  const reload = async () => {
    if (!fieldId) return;
    setLoading(true); setError("");
    try {
      const [climateResult, sceneResult] = await Promise.allSettled([
        db.functions.invoke("nasa-power", { body: { field_id: fieldId } }),
        db.functions.invoke("sentinel-scenes", { body: { field_id: fieldId } }),
      ]);
      if (climateResult.status === "fulfilled" && !climateResult.value.error && !climateResult.value.data?.error) {
        setClimate(climateResult.value.data);
        setLastUpdated(climateResult.value.data?.fetched_at || "");
      } else {
        const reason = climateResult.status === "rejected" ? climateResult.reason : climateResult.value.error || climateResult.value.data?.error;
        throw reason || new Error("NASA POWER data could not be loaded.");
      }
      if (sceneResult.status === "fulfilled" && !sceneResult.value.error && !sceneResult.value.data?.error) {
        setScenes(sceneResult.value.data?.scenes || []);
      }
    } catch (e: any) { setError(e?.message || "Earth observation data is temporarily unavailable."); }
    finally { setLoading(false); }
  };
  useEffect(() => { setClimate(null); setScenes([]); if (fieldId) reload(); }, [fieldId]);
  return { climate, scenes, loading, error, lastUpdated, reload };
}

function Sidebar({ role, profile, user }: { role: string; profile: Profile; user: any }) {
  const [mobileOpen, setMobileOpen] = useState(false);
  const name = profile.full_name || user?.email || "NILORA user";
  const photo = user?.user_metadata?.avatar_url || user?.user_metadata?.picture || "";
  const nav = role === "farmer"
    ? [
        { href: "farmer-dashboard.html", label: "Overview", icon: Activity },
        { href: "farmer-farms.html", label: "My farms", icon: Building2 },
        { href: "farmer-fields.html", label: "My fields", icon: MapIcon },
        { href: "onboarding.html", label: "Profile settings", icon: Settings2 },
      ]
    : [
        { href: "agronomist-dashboard.html", label: "Overview", icon: Activity },
        { href: "agronomist-farms.html", label: "Assigned farms", icon: Building2 },
        { href: "agronomist-reviews.html", label: "Assessments", icon: FileCheck2 },
        { href: "onboarding.html", label: "Profile settings", icon: Settings2 },
      ];
  const path = location.pathname.split("/").pop();
  return <>
    <button className="mobile-nav-toggle" onClick={() => setMobileOpen(v => !v)} aria-label="Toggle navigation">{mobileOpen ? <X/> : <Menu/>}</button>
    <aside className={"sidebar " + (mobileOpen ? "sidebar-open" : "")}>
      <a className="brand" href="index.html"><img src="Assets/logo.png" alt="NILORA"/><span>NILORA<small>FIELD INTELLIGENCE</small></span></a>
      <div className="nav-caption">WORKSPACE</div>
      <nav>{nav.map(item => <a key={item.href} className={path === item.href ? "active" : ""} href={item.href}><item.icon size={18}/><span>{item.label}</span></a>)}</nav>
      <div className="sidebar-bottom">
        <div className="profile-mini">
          {photo ? <img src={photo} alt="" referrerPolicy="no-referrer"/> : <span className="avatar-fallback">{initials(name)}</span>}
          <span><b>{name}</b><small>{role === "farmer" ? "Farmer account" : "Agronomist account"}</small></span>
        </div>
        <button className="signout" onClick={async () => { await db.auth.signOut(); location.href = "index.html"; }}><LogOut size={16}/> Sign out</button>
      </div>
    </aside>
  </>;
}

function Topbar({ title, profile, user }: { title: string; profile: Profile; user: any }) {
  const name = profile.full_name || user?.email || "NILORA user";
  const photo = user?.user_metadata?.avatar_url || user?.user_metadata?.picture || "";
  return <header className="topbar">
    <div><span className="topbar-kicker">NILORA / WORKSPACE</span><b>{title}</b></div>
    <div className="topbar-right"><span className="live-dot"/> <span className="topbar-live">Live workspace</span>
      <button className="icon-button" aria-label="Notifications"><Bell size={18}/></button>
      {photo ? <img className="top-avatar" src={photo} alt="" referrerPolicy="no-referrer"/> : <span className="top-avatar top-avatar-fallback">{initials(name)}</span>}
    </div>
  </header>;
}

function StatCard({ label, value, note, icon: Icon, trend }: any) {
  return <article className="stat-card">
    <div className="stat-card-top"><span>{label}</span><span className="stat-icon"><Icon size={19}/></span></div>
    <strong>{value}</strong><small>{note}</small>
    {trend && <span className="stat-trend"><ArrowUpRight size={13}/>{trend}</span>}
  </article>;
}

function SectionTitle({ title, subtitle, action }: { title: string; subtitle?: string; action?: React.ReactNode }) {
  return <div className="section-title"><div><h2>{title}</h2>{subtitle && <p>{subtitle}</p>}</div>{action}</div>;
}

function EmptyState({ icon: Icon = Sprout, title, description, action }: any) {
  return <div className="empty-state"><span><Icon size={23}/></span><b>{title}</b><p>{description}</p>{action}</div>;
}

function FarmMap({ fields, farms }: { fields: Field[]; farms: Farm[] }) {
  const mapRef = React.useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!mapRef.current) return;
    const map = L.map(mapRef.current, { scrollWheelZoom: false, zoomControl: true }).setView([26.8, 30.8], 5);
    L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
      maxZoom: 19,
    }).addTo(map);
    const imageryDate = new Date(Date.now() - 3 * 86400000).toISOString().slice(0, 10);
    L.tileLayer("https://gibs.earthdata.nasa.gov/wmts/epsg3857/best/MODIS_Terra_CorrectedReflectance_TrueColor/default/" + imageryDate + "/GoogleMapsCompatible_Level9/{z}/{y}/{x}.jpg", {
      attribution: "NASA GIBS · MODIS Terra",
      maxZoom: 9, opacity: 0.62,
    }).addTo(map);
    const bounds: L.LatLngExpression[] = [];
    fields.forEach(field => {
      const farm = farmOf(field);
      const geometry = field.boundary_geojson;
      if (geometry) {
        try {
          const layer = L.geoJSON(geometry, { style: { color: "#556d4a", weight: 2, fillColor: "#a4ac86", fillOpacity: 0.25 } }).addTo(map);
          layer.bindPopup("<b>" + field.name.replace(/[<>]/g, "") + "</b>");
          const b = layer.getBounds(); if (b.isValid()) bounds.push(b.getCenter());
          return;
        } catch { /* show farm marker below */ }
      }
      if (farm?.latitude != null && farm?.longitude != null) {
        const point: L.LatLngExpression = [Number(farm.latitude), Number(farm.longitude)];
        L.circleMarker(point, { radius: 7, color: "#fff", weight: 2, fillColor: "#556d4a", fillOpacity: 1 }).addTo(map).bindPopup("<b>" + field.name.replace(/[<>]/g, "") + "</b>");
        bounds.push(point);
      }
    });
    if (!fields.length) farms.forEach(farm => {
      if (farm.latitude != null && farm.longitude != null) {
        const point: L.LatLngExpression = [Number(farm.latitude), Number(farm.longitude)];
        L.circleMarker(point, { radius: 7, color: "#fff", weight: 2, fillColor: "#556d4a", fillOpacity: 1 }).addTo(map).bindPopup("<b>" + farm.name.replace(/[<>]/g, "") + "</b>");
        bounds.push(point);
      }
    });
    if (bounds.length) map.fitBounds(L.latLngBounds(bounds).pad(0.25), { maxZoom: 13 });
    return () => map.remove();
  }, [fields, farms]);
  return <div className="map-wrap"><div ref={mapRef} className="farm-map"/><div className="map-legend"><span><i/> Registered farm / field</span><span><Satellite size={13}/> NASA GIBS MODIS context imagery · 250 m source</span></div></div>;
}

function ClimatePanel({ fieldId }: { fieldId: string }) {
  const { climate, scenes, loading, error, lastUpdated, reload } = useEarthData(fieldId);
  const latest = climate?.latest || {};
  const metrics = [
    { key: "T2M", label: "Air temperature", unit: "°C", icon: Thermometer },
    { key: "T2M_MAX", label: "Daily max temperature", unit: "°C", icon: Sun },
    { key: "RH2M", label: "Relative humidity", unit: "%", icon: Droplets },
    { key: "IMERG_PRECTOT", label: "GPM precipitation", unit: "mm/day", icon: CloudRain },
    { key: "PRECTOTCORR", label: "POWER precipitation", unit: "mm/day", icon: Cloud },
    { key: "ALLSKY_SFC_SW_DWN", label: "Solar radiation", unit: "kWh/m²/day", icon: Sun },
  ];
  const chartData = useMemo(() => {
    const values = (climate?.observations || []).filter(x => x.parameter === "T2M");
    return values.map(x => ({ date: shortDate(x.date), temperature: x.value }));
  }, [climate]);
  return <section className="panel-card climate-panel">
    <SectionTitle title="Climate & satellite intelligence" subtitle="Location-based observations from NASA and Copernicus data services." action={<button className="button button-outline button-small" onClick={reload} disabled={loading}><RefreshCw size={14} className={loading ? "spin" : ""}/> Refresh</button>}/>
    <div className="data-source-row"><span className="source-tag"><Globe2 size={13}/> NASA POWER</span><span className="source-tag"><CloudRain size={13}/> GPM IMERG</span><span className="source-tag"><Satellite size={13}/> Sentinel-2 · Copernicus</span></div>
    {loading && <div className="loading-state"><span className="spinner"/><span>Fetching the latest available Earth observation data…</span></div>}
    {error && <div className="inline-alert"><AlertTriangle size={16}/><span>{error}</span></div>}
    {!loading && !error && climate && <>
      <div className="climate-grid">{metrics.map(m => {
        const value = latest[m.key]; const Icon = m.icon;
        return <div className="climate-tile" key={m.key}><span className="climate-icon"><Icon size={17}/></span><small>{m.label}</small><b>{value ? fmt(value.value) : "—"} <em>{m.unit}</em></b><span>{value ? shortDate(value.date) : "No reading"}</span></div>;
      })}</div>
      <div className="chart-panel"><div className="chart-heading"><b>Daily mean temperature</b><small>Latest available NASA POWER observations</small></div>
        {chartData.length ? <div className="chart-area"><ResponsiveContainer width="100%" height={220}>
          <AreaChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
            <defs><linearGradient id="tempFill" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="#8ea27b" stopOpacity={0.28}/><stop offset="95%" stopColor="#8ea27b" stopOpacity={0.02}/></linearGradient></defs>
            <CartesianGrid stroke="#edf0e8" strokeDasharray="4 4" vertical={false}/>
            <XAxis dataKey="date" tick={{ fill: "#8b9385", fontSize: 10 }} axisLine={false} tickLine={false}/>
            <YAxis tick={{ fill: "#8b9385", fontSize: 10 }} axisLine={false} tickLine={false}/>
            <Tooltip contentStyle={{ border: "1px solid #e7ebdf", borderRadius: 10, fontSize: 12 }}/>
            <Area type="monotone" dataKey="temperature" name="Temperature (°C)" stroke="#556d4a" strokeWidth={2.5} fill="url(#tempFill)" activeDot={{ r: 5 }}/>
          </AreaChart>
        </ResponsiveContainer></div> : <p className="muted-copy">No daily temperature series was returned for this date range.</p>}
      </div>
      <div className="source-note"><b>Data provenance</b><span>Retrieved {new Date(lastUpdated).toLocaleString("en-US")} · {climate.start_date} to {climate.end_date}</span><span>{climate.spatial_resolution}</span><p>These are gridded estimates at the farm coordinates, not readings from sensors installed in the field. The latest available date may lag behind today.</p><a href={climate.source_url || "https://power.larc.nasa.gov/"} target="_blank" rel="noreferrer">Open NASA POWER source <ExternalLink size={12}/></a></div>
      {climate.storage_warning && <div className="inline-alert"><AlertTriangle size={15}/>{climate.storage_warning}</div>}
      <div className="sentinel-section"><SectionTitle title="Sentinel-2 scene catalogue" subtitle="Available L2A scenes intersecting the farm location · last 60 days."/>
        {scenes.length ? <div className="scene-list">{scenes.slice(0, 5).map(scene => <div className="scene-row" key={scene.id}><span className="scene-icon"><Satellite size={17}/></span><div><b>{shortDate(scene.datetime)}</b><small>{scene.id}</small></div><span className="cloud-pill">{scene.cloud_cover == null ? "Cloud n/a" : fmt(scene.cloud_cover, 0) + "% scene cloud"}</span>{scene.item_url && <a href={scene.item_url} target="_blank" rel="noreferrer" aria-label="Open scene"><ExternalLink size={15}/></a>}</div>)}</div> : <div className="muted-copy">No Sentinel-2 scenes were found for this location and time window.</div>}
        <p className="fine-print">Catalogue discovery only. NILORA does not yet download imagery, calculate NDVI, or diagnose crop disease. Cloud cover is scene-level metadata.</p>
      </div>
    </>}
    {!loading && !error && !climate && <EmptyState icon={Satellite} title="No Earth data loaded yet" description="Select a mapped field to fetch its latest available climate and satellite context."/>}
  </section>;
}

function FarmerDashboard({ profile, user }: { profile: Profile; user: any }) {
  const { farms, fields, loading, error, reload } = useFarmerData();
  const [selectedField, setSelectedField] = useState("");
  const mappedFields = fields.filter(f => {
    const farm = farmOf(f);
    return farm?.latitude != null && farm?.longitude != null && Number.isFinite(Number(farm.latitude)) && Number.isFinite(Number(farm.longitude));
  });
  useEffect(() => { if (!selectedField && mappedFields[0]) setSelectedField(mappedFields[0].id); }, [fields]);
  const totalArea = farms.reduce((sum, f) => sum + (Number(f.area_feddan) || 0), 0);
  const firstName = (profile.full_name || user?.email || "there").trim().split(/\s+/)[0];
  return <div className="page-content">
    <section className="welcome-banner"><div><span className="eyebrow"><Leaf size={14}/> FIELD INTELLIGENCE · FARMER WORKSPACE</span><h1>Welcome back, {firstName}.</h1><p>Your land, crop and climate information — brought together in one place.</p><span className="welcome-meta"><CalendarDays size={14}/> {new Date().toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric" })}</span></div><div className="welcome-actions"><a className="button button-light" href="farmer-farms.html"><Plus size={15}/> Add a farm</a><a className="button button-ghost" href="farmer-fields.html"><MapPin size={15}/> Add a field</a></div></section>
    {loading ? <div className="loading-state"><span className="spinner"/> Loading your farm records…</div> : error ? <div className="inline-alert"><AlertTriangle size={16}/>{error}<button onClick={reload}>Try again</button></div> : <>
      <section className="stats-grid">
        <StatCard label="REGISTERED FARMS" value={fmt(farms.length, 0)} note="Farms in your account" icon={Building2}/>
        <StatCard label="REGISTERED FIELDS" value={fmt(fields.length, 0)} note="Fields across your farms" icon={Sprout}/>
        <StatCard label="TOTAL AREA" value={fmt(totalArea, 2)} note="Feddans recorded" icon={Ruler}/>
        <StatCard label="MAPPED FIELDS" value={fmt(mappedFields.length, 0)} note="Ready for location-based data" icon={MapPin}/>
      </section>
      <div className="dashboard-grid">
        <section className="panel-card map-panel"><SectionTitle title="Your farms on the map" subtitle="Registered field boundaries and farm locations." action={<span className="source-tag"><Satellite size={13}/> NASA GIBS</span>}/><FarmMap fields={fields} farms={farms}/></section>
        <section className="panel-card field-panel"><SectionTitle title="Your fields" subtitle="A quick overview of your registered plots." action={<a className="text-link" href="farmer-fields.html">View all <ArrowUpRight size={13}/></a>}/>
          {fields.length ? <div className="field-list">{fields.slice(0, 6).map(field => <div className="field-row" key={field.id}><span className="field-symbol"><Sprout size={17}/></span><div><b>{field.name}</b><small>{farmOf(field)?.name || "Farm not selected"} · {field.current_crop || "Crop not set"}</small></div><div className="field-measure"><b>{fmt(field.area_feddan, 2)} <small>fed</small></b><span>{field.length_m && field.width_m ? fmt(field.length_m, 0) + " × " + fmt(field.width_m, 0) + " m" : "Dimensions n/a"}</span></div></div>)}</div> : <EmptyState title="Your first field starts here" description="Add a farm and draw its field boundary to unlock location-based insights." action={<a className="button button-primary" href="farmer-fields.html"><Plus size={14}/> Add a field</a>}/>}
        </section>
      </div>
      {mappedFields.length > 0 && <section className="panel-card"><div className="field-picker"><div><h2>Earth observation for your field</h2><p>Choose a mapped field to load its climate and satellite data.</p></div><select value={selectedField} onChange={e => setSelectedField(e.target.value)}>{mappedFields.map(f => <option value={f.id} key={f.id}>{f.name} · {farmOf(f)?.name || "Farm"}</option>)}</select></div><ClimatePanel fieldId={selectedField}/></section>}
      {fields.length === 0 && <section className="panel-card"><EmptyState icon={Globe2} title="Connect your first field to NASA data" description="Once your farm boundary and location are saved, NILORA can retrieve NASA POWER and GPM observations for that location." action={<a className="button button-primary" href="farmer-farms.html"><Plus size={14}/> Set up your farm</a>}/></section>}
      <section className="notice-strip"><ShieldCheck size={18}/><div><b>Evidence first, always.</b><span>Climate and satellite products provide regional estimates and scene metadata. They are not field sensors, crop diagnoses or a replacement for an agronomist's assessment.</span></div></section>
    </>}
  </div>;
}

function AgronomistDashboard({ profile, user }: { profile: Profile; user: any }) {
  const [farms, setFarms] = useState<any[]>([]);
  const [assessments, setAssessments] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        const [farmResult, assessmentResult] = await Promise.all([
          db.from("farm_assignments").select("status,farms(id,name,governorate,locality,area_feddan,latitude,longitude)").eq("status", "active"),
          db.from("crop_assessments").select("id,crop_code,season,status,score,fields(name)").order("created_at", { ascending: false }),
        ]);
        if (farmResult.error) throw farmResult.error;
        if (assessmentResult.error) throw assessmentResult.error;
        if (alive) { setFarms(farmResult.data || []); setAssessments(assessmentResult.data || []); }
      } catch (e: any) { if (alive) setError(e?.message || "Unable to load your workspace."); }
      finally { if (alive) setLoading(false); }
    })();
    return () => { alive = false; };
  }, []);
  const pending = assessments.filter(a => ["pending", "draft", "needs_review", "in_review"].includes(String(a.status || "").toLowerCase()));
  const firstName = (profile.full_name || user?.email || "there").trim().split(/\s+/)[0];
  if (profile.agronomist_status !== "approved") return <div className="page-content"><section className="approval-state"><span><ShieldCheck size={28}/></span><div className="eyebrow">PROFESSIONAL ACCESS</div><h1>Verification in progress</h1><p>Welcome, {profile.full_name || "Agronomist"}. Your professional workspace will unlock after the NILORA team approves your agronomist profile.</p><div className="pending-badge"><span/> Approval pending</div><a className="text-link" href="onboarding.html">Review profile details <ArrowUpRight size={14}/></a></section></div>;
  return <div className="page-content">
    <section className="welcome-banner agronomist-banner"><div><span className="eyebrow"><Activity size={14}/> PROFESSIONAL WORKSPACE</span><h1>Welcome back, {firstName}.</h1><p>Review assigned farms, monitor crop assessments and support better field decisions.</p></div><div className="welcome-actions"><a className="button button-light" href="agronomist-farms.html"><Building2 size={15}/> Assigned farms</a><a className="button button-ghost" href="agronomist-reviews.html"><FileCheck2 size={15}/> Assessments</a></div></section>
    {loading ? <div className="loading-state"><span className="spinner"/> Loading assigned records…</div> : error ? <div className="inline-alert"><AlertTriangle size={16}/>{error}</div> : <>
      <section className="stats-grid">
        <StatCard label="ASSIGNED FARMS" value={fmt(farms.length, 0)} note="Active farm assignments" icon={Building2}/>
        <StatCard label="CROP ASSESSMENTS" value={fmt(assessments.length, 0)} note="Records available to you" icon={FileBarChart}/>
        <StatCard label="NEEDS REVIEW" value={fmt(pending.length, 0)} note="Based on current record status" icon={AlertTriangle}/>
        <StatCard label="ACCOUNT STATUS" value="Approved" note="Professional access enabled" icon={ShieldCheck}/>
      </section>
      <div className="dashboard-grid">
        <section className="panel-card"><SectionTitle title="Assigned farms" subtitle="Farms currently assigned to your account." action={<a className="text-link" href="agronomist-farms.html">View all <ArrowUpRight size={13}/></a>}/>
          {farms.length ? <div className="farm-list">{farms.slice(0, 7).map((item, i) => { const farm = Array.isArray(item.farms) ? item.farms[0] : item.farms; return farm && <div className="farm-row" key={farm.id || i}><span className="field-symbol"><Building2 size={17}/></span><div><b>{farm.name || "Unnamed farm"}</b><small>{[farm.locality, farm.governorate].filter(Boolean).join(", ") || "Location not provided"}</small></div><span className="farm-area">{farm.area_feddan ? fmt(farm.area_feddan, 2) + " fed" : "Area n/a"}</span></div>; })}</div> : <EmptyState icon={Building2} title="No farm assignments yet" description="Assigned farms will appear here once the platform team links farmers to your account."/>}
        </section>
        <section className="panel-card"><SectionTitle title="Assessment activity" subtitle="Latest records and their current review status."/>
          {assessments.length ? <div className="assessment-list">{assessments.slice(0, 6).map(a => <div className="assessment-row" key={a.id}><span className="field-symbol"><FileCheck2 size={17}/></span><div><b>{a.crop_code || "Crop assessment"}</b><small>{Array.isArray(a.fields) ? a.fields[0]?.name : a.fields?.name || "Field not specified"} · {a.season || "Season n/a"}</small></div><span className={"status-chip " + (pending.includes(a) ? "status-pending" : "")}>{a.status || "Unknown"}</span></div>)}</div> : <EmptyState icon={FileCheck2} title="No assessments available" description="Crop assessments accessible to your account will appear here."/>}
        </section>
      </div>
      <section className="notice-strip"><ShieldCheck size={18}/><div><b>Professional review stays human-led.</b><span>Satellite indicators and model outputs must be interpreted with their source, resolution and uncertainty. Final crop assessments and advice remain the agronomist's responsibility.</span></div></section>
    </>}
  </div>;
}

function App() {
  const { profile, user, loading, error } = useAccount();
  const role = location.pathname.includes("agronomist-dashboard") ? "agronomist" : "farmer";
  const title = role === "farmer" ? "Farmer overview" : "Agronomist overview";
  if (loading) return <div className="app-loading"><span className="spinner"/><b>Preparing your NILORA workspace…</b></div>;
  if (error) return <div className="app-loading"><AlertTriangle/><b>{error}</b><a href="signup.html">Return to sign in</a></div>;
  if (!profile || !user) return null;
  return <div className="app-shell"><Sidebar role={role} profile={profile} user={user}/><main className="main-area"><Topbar title={title} profile={profile} user={user}/>{role === "farmer" ? <FarmerDashboard profile={profile} user={user}/> : <AgronomistDashboard profile={profile} user={user}/>}</main></div>;
}

createRoot(document.getElementById("app")!).render(<React.StrictMode><App/></React.StrictMode>);
