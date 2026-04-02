import { useDeferredValue, useEffect, useMemo, useState } from "react";
import { Toaster, toast } from "sonner";
import {
  Plus,
  Search,
  Grid2X2,
  List,
  RotateCcw,
  Pencil,
  Trash2,
  X,
  Bike,
  Package,
  AlertTriangle,
  XCircle,
  Wallet,
  TrendingUp,
  Filter,
  ChevronDown,
  ChevronUp,
  Check,
  RefreshCw,
} from "lucide-react";

import axiosInstance from '../../api/axios';

const cn = (...xs) => xs.filter(Boolean).join(" ");

const COMPANIES = ["all", "Zimota", "Forza", "GSM", "Sanya"];
const DEFAULT_COMPANY = "N/A";

function money(n) {
  const num = typeof n === "string" ? Number(n) : n;
  if (n === "" || n === null || n === undefined || Number.isNaN(num)) return "-";
  return `${num.toLocaleString()} TND`;
}
function clampInt(v) {
  const n = Number(v);
  if (Number.isNaN(n)) return 0;
  return Math.max(0, Math.floor(n));
}
function clampNum(v) {
  const n = Number(v);
  if (Number.isNaN(n)) return 0;
  return Math.max(0, n);
}

function getCompanyDot(company) {
  const dots = {
    Zimota: "bg-blue-500",
    Forza: "bg-red-500",
    GSM: "bg-green-500",
    Sanya: "bg-purple-500",
  };
  return dots[company] || "bg-slate-400";
}

function stockInfo(qty) {
  if (qty <= 0)
    return {
      label: "Rupture",
      bg: "bg-rose-50 border-rose-200",
      text: "text-rose-700",
      badge: "bg-rose-100 text-rose-700 border-rose-200",
      dot: "bg-rose-500",
    };
  if (qty <= 2)
    return {
      label: "Stock bas",
      bg: "bg-amber-50 border-amber-200",
      text: "text-amber-800",
      badge: "bg-amber-100 text-amber-800 border-amber-200",
      dot: "bg-amber-500",
    };
  return {
    label: "En stock",
    bg: "bg-emerald-50 border-emerald-200",
    text: "text-emerald-700",
    badge: "bg-emerald-100 text-emerald-700 border-emerald-200",
    dot: "bg-emerald-500",
  };
}

/**
 * API SHAPE (what we expect from backend):
 * ApiResponse<T> -> { success, message, data }
 *
 * MotorcycleDto:
 * {
 *   motorcycleId: guid/int,
 *   revendeurId: guid/int,
 *   company, brand, model,
 *   qty, purchasePrice, salePrice
 * }
 */

function fromApi(x) {
  return {
    id: x.motorcycleId ?? x.id,
    revendeurId: x.revendeurId,
    company: x.company,
    brand: x.brand,
    model: x.model,
    qty: x.qty,
    purchasePrice: x.purchasePrice,
    salePrice: x.salePrice,
  };
}

function toPayload(m) {
  return {
    company: String(m.company || DEFAULT_COMPANY).trim(),
    brand: String(m.brand).trim(),
    model: String(m.model).trim(),
    qty: Number(m.qty),
    purchasePrice: Number(m.purchasePrice),
    salePrice: Number(m.salePrice),
  };
}

export default function MotorcyclesPage() {
  const [viewMode, setViewMode] = useState("grid");
  const [selected, setSelected] = useState([]);
  const [showFilters, setShowFilters] = useState(false);

  const [filterCompany, setFilterCompany] = useState("all");
  const [filterBrand, setFilterBrand] = useState("all");
  const [searchTerm, setSearchTerm] = useState("");
  const deferredSearchTerm = useDeferredValue(searchTerm);

  const [panelOpen, setPanelOpen] = useState(false);
  const [editing, setEditing] = useState(null);

  const [form, setForm] = useState({
    company: DEFAULT_COMPANY,
    brand: "",
    model: "",
    qty: 1,
    purchasePrice: "",
    salePrice: "",
  });

  const [motos, setMotos] = useState([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  // ---------------- API CALLS ----------------
  async function fetchMotos() {
    setLoading(true);
    try {
      const res = await axiosInstance.get("/Motorcycles");
      const list = (res?.data?.data ?? []).map(fromApi);
      setMotos(list);
    } catch (e) {
      console.error(e);
      toast.error("Erreur chargement motos");
    } finally {
      setLoading(false);
    }
  }

  async function apiCreate(payload) {
    const res = await axiosInstance.post("/Motorcycles", payload);
    return fromApi(res?.data?.data);
  }

  async function apiUpdate(id, payload) {
    const res = await axiosInstance.put(`/Motorcycles/${id}`, payload);
    return fromApi(res?.data?.data);
  }

  async function apiDelete(id) {
    await axiosInstance.delete(`/Motorcycles/${id}`);
  }
  // -------------------------------------------

  useEffect(() => {
    fetchMotos();
  }, []);

  const filtered = useMemo(() => {
    const q = deferredSearchTerm.trim().toLowerCase();
    return motos.filter((m) => {
      const matchesCompany = filterCompany === "all" || m.company === filterCompany;
      const matchesBrand = filterBrand === "all" || m.brand === filterBrand;
      const matchesSearch =
        !q || m.brand.toLowerCase().includes(q) || m.model.toLowerCase().includes(q);
      return matchesCompany && matchesBrand && matchesSearch;
    });
  }, [motos, filterCompany, filterBrand, deferredSearchTerm]);

  const stats = useMemo(() => {
    const totalModels = motos.length;
    const totalQty = motos.reduce((s, x) => s + (x.qty || 0), 0);
    const low = motos.filter((x) => (x.qty || 0) > 0 && (x.qty || 0) <= 2).length;
    const out = motos.filter((x) => (x.qty || 0) <= 0).length;
    const buy = motos.reduce((s, x) => s + (x.qty || 0) * (x.purchasePrice || 0), 0);
    const sell = motos.reduce((s, x) => s + (x.qty || 0) * (x.salePrice || 0), 0);
    return { totalModels, totalQty, low, out, buy, sell };
  }, [motos]);

  const brandOptions = useMemo(() => {
    const uniques = [...new Set(motos.map((m) => (m.brand || "").trim()).filter(Boolean))];
    return ["all", ...uniques.sort((a, b) => a.localeCompare(b))];
  }, [motos]);

  const hasActiveFilters = filterCompany !== "all" || filterBrand !== "all" || searchTerm.trim() !== "";

  function isSelected(id) {
    return selected.includes(id);
  }

  function toggleSelect(id) {
    setSelected((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));
  }

  function selectAll() {
    if (selected.length === filtered.length) setSelected([]);
    else setSelected(filtered.map((x) => x.id));
  }

  function resetFilters() {
    setFilterCompany("all");
    setFilterBrand("all");
    setSearchTerm("");
    setSelected([]);
    toast.message("Filtres reinitialises");
  }

  function openAdd() {
    setEditing(null);
    setForm({
      company: DEFAULT_COMPANY,
      brand: "",
      model: "",
      qty: 1,
      purchasePrice: "",
      salePrice: "",
    });
    setPanelOpen(true);
  }

  function openEdit(m) {
    setEditing(m);
    setForm({
      company: m.company || DEFAULT_COMPANY,
      brand: m.brand || "",
      model: m.model,
      qty: m.qty,
      purchasePrice: m.purchasePrice,
      salePrice: m.salePrice,
    });
    setPanelOpen(true);
  }

  async function save() {
    const payload = {
      company: String(form.company || DEFAULT_COMPANY).trim(),
      brand: String(form.brand).trim(),
      model: String(form.model).trim(),
      qty: clampInt(form.qty),
      purchasePrice: clampNum(form.purchasePrice),
      salePrice: clampNum(form.salePrice),
    };

    if (!payload.brand || !payload.model) {
      return toast.error("Champs requis manquants");
    }

    setSaving(true);
    try {
      if (!editing) {
        const created = await apiCreate(toPayload(payload));
        setMotos((prev) => [created, ...prev]);
        toast.success("Moto ajoutee");
      } else {
        const updated = await apiUpdate(editing.id, toPayload(payload));
        setMotos((prev) => prev.map((x) => (x.id === editing.id ? updated : x)));
        toast.success("Moto modifiee");
      }
      setPanelOpen(false);
    } catch (e) {
      console.error(e);
      toast.error("Erreur enregistrement");
    } finally {
      setSaving(false);
    }
  }

  async function remove(id) {
    const old = motos;
    setMotos((prev) => prev.filter((x) => x.id !== id));
    setSelected((prev) => prev.filter((x) => x !== id));

    try {
      await apiDelete(id);
      toast.success("Moto supprimee");
    } catch (e) {
      console.error(e);
      setMotos(old);
      toast.error("Suppression echouee");
    }
  }

  async function removeSelected() {
    const ids = [...selected];
    if (ids.length === 0) return;

    const old = motos;
    setMotos((prev) => prev.filter((x) => !ids.includes(x.id)));
    setSelected([]);

    try {
      await Promise.all(ids.map((id) => apiDelete(id)));
      toast.success("Suppression terminee");
    } catch (e) {
      console.error(e);
      setMotos(old);
      toast.error("Suppression partielle/echouee");
    }
  }

  const formMargin = form.purchasePrice !== "" && form.salePrice !== "" && Number(form.purchasePrice) > 0
    ? Number(form.salePrice) - Number(form.purchasePrice)
    : null;

  const inputClass = "w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-800 shadow-sm transition-all placeholder:text-slate-400 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 focus:outline-none";
  const labelClass = "mb-1.5 block text-xs font-medium uppercase tracking-wider text-slate-500";

  return (
    <div className="space-y-5">
      <Toaster richColors position="bottom-right" />

      {/* ── Header ── */}
      <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
        <div className="bg-gradient-to-r from-slate-900 via-slate-800 to-blue-900 px-4 sm:px-6 py-6 sm:py-7 text-white">
          <div className="flex items-start justify-between gap-4">
            <div>
              <h1 className="text-2xl sm:text-3xl font-bold">Gestion Stock Motos</h1>
              <p className="mt-1.5 text-sm text-slate-300">
                Suivez les modeles, les quantites et la valeur du stock.
              </p>
            </div>
            <button
              onClick={openAdd}
              className="hidden sm:inline-flex items-center gap-2 rounded-xl bg-white/10 border border-white/20 px-4 py-2.5 text-sm font-semibold text-white backdrop-blur-sm transition hover:bg-white/20"
            >
              <Plus className="h-4 w-4" />
              Ajouter
            </button>
          </div>
          <div className="mt-4 flex flex-wrap items-center gap-2">
            <span className="inline-flex items-center gap-1.5 rounded-full bg-white/10 px-3 py-1 text-xs font-medium">
              <Bike className="h-3 w-3" />
              {stats.totalModels} modele(s)
            </span>
            <span className="inline-flex items-center gap-1.5 rounded-full bg-white/10 px-3 py-1 text-xs font-medium">
              <Package className="h-3 w-3" />
              {stats.totalQty} unite(s)
            </span>
            {stats.low > 0 && (
              <span className="inline-flex items-center gap-1.5 rounded-full bg-amber-500/20 border border-amber-400/30 px-3 py-1 text-xs font-medium text-amber-200">
                <AlertTriangle className="h-3 w-3" />
                {stats.low} stock bas
              </span>
            )}
            {stats.out > 0 && (
              <span className="inline-flex items-center gap-1.5 rounded-full bg-rose-500/20 border border-rose-400/30 px-3 py-1 text-xs font-medium text-rose-200">
                <XCircle className="h-3 w-3" />
                {stats.out} rupture
              </span>
            )}
          </div>
        </div>
      </section>

      {/* ── Stats Grid ── */}
      <div className="grid grid-cols-1 gap-3 min-[420px]:grid-cols-2 sm:grid-cols-3 xl:grid-cols-6">
        <article className="rounded-xl border border-slate-200 bg-white p-3.5 shadow-sm">
          <div className="flex items-center gap-2">
            <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-slate-100">
              <Bike className="h-4 w-4 text-slate-500" />
            </span>
            <div className="min-w-0">
              <p className="text-[11px] font-medium uppercase tracking-wider text-slate-400">Modeles</p>
              <p className="text-lg font-bold text-slate-900 leading-tight">{stats.totalModels}</p>
            </div>
          </div>
        </article>
        <article className="rounded-xl border border-blue-200 bg-blue-50/50 p-3.5 shadow-sm">
          <div className="flex items-center gap-2">
            <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-blue-100">
              <Package className="h-4 w-4 text-blue-600" />
            </span>
            <div className="min-w-0">
              <p className="text-[11px] font-medium uppercase tracking-wider text-blue-400">Quantite</p>
              <p className="text-lg font-bold text-blue-700 leading-tight">{stats.totalQty}</p>
            </div>
          </div>
        </article>
        <article className="rounded-xl border border-amber-200 bg-amber-50/50 p-3.5 shadow-sm">
          <div className="flex items-center gap-2">
            <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-amber-100">
              <AlertTriangle className="h-4 w-4 text-amber-600" />
            </span>
            <div className="min-w-0">
              <p className="text-[11px] font-medium uppercase tracking-wider text-amber-500">Stock bas</p>
              <p className="text-lg font-bold text-amber-700 leading-tight">{stats.low}</p>
            </div>
          </div>
        </article>
        <article className="rounded-xl border border-rose-200 bg-rose-50/50 p-3.5 shadow-sm">
          <div className="flex items-center gap-2">
            <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-rose-100">
              <XCircle className="h-4 w-4 text-rose-600" />
            </span>
            <div className="min-w-0">
              <p className="text-[11px] font-medium uppercase tracking-wider text-rose-400">Rupture</p>
              <p className="text-lg font-bold text-rose-700 leading-tight">{stats.out}</p>
            </div>
          </div>
        </article>
        <article className="rounded-xl border border-slate-200 bg-white p-3.5 shadow-sm">
          <div className="flex items-center gap-2">
            <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-slate-100">
              <Wallet className="h-4 w-4 text-slate-500" />
            </span>
            <div className="min-w-0">
              <p className="text-[11px] font-medium uppercase tracking-wider text-slate-400">Val. achat</p>
              <p className="text-sm font-bold text-slate-900 leading-tight truncate">{money(stats.buy)}</p>
            </div>
          </div>
        </article>
        <article className="rounded-xl border border-emerald-200 bg-emerald-50/50 p-3.5 shadow-sm">
          <div className="flex items-center gap-2">
            <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-emerald-100">
              <TrendingUp className="h-4 w-4 text-emerald-600" />
            </span>
            <div className="min-w-0">
              <p className="text-[11px] font-medium uppercase tracking-wider text-emerald-500">CA potentiel</p>
              <p className="text-sm font-bold text-emerald-700 leading-tight truncate">{money(stats.sell)}</p>
            </div>
          </div>
        </article>
      </div>

      {/* ── Toolbar ── */}
      <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
        <div className="p-3 sm:p-4">
          {/* Main row */}
          <div className="flex items-center gap-2 sm:gap-3">
            {/* Search - grows to fill */}
            <div className="relative flex-1 min-w-0">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Rechercher marque, modele..."
                className="w-full rounded-xl border border-slate-200 bg-slate-50 py-2.5 pl-10 pr-4 text-sm shadow-sm transition-all placeholder:text-slate-400 focus:bg-white focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 focus:outline-none"
              />
            </div>

            {/* Filter toggle */}
            <button
              onClick={() => setShowFilters(!showFilters)}
              className={cn(
                "inline-flex items-center gap-1.5 rounded-xl border px-3 py-2.5 text-sm font-medium shadow-sm transition",
                hasActiveFilters
                  ? "border-blue-200 bg-blue-50 text-blue-600"
                  : "border-slate-200 bg-white text-slate-500 hover:bg-slate-50"
              )}
            >
              <Filter className="h-4 w-4" />
              <span className="hidden sm:inline">Filtres</span>
              {hasActiveFilters && (
                <span className="flex h-5 w-5 items-center justify-center rounded-full bg-blue-600 text-[10px] font-bold text-white">
                  {(filterCompany !== "all" ? 1 : 0) + (filterBrand !== "all" ? 1 : 0)}
                </span>
              )}
              {showFilters ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
            </button>

            {/* View toggle */}
            <div className="hidden sm:flex overflow-hidden rounded-xl border border-slate-200 shadow-sm">
              <button
                onClick={() => setViewMode("grid")}
                className={cn("p-2.5 transition", viewMode === "grid" ? "bg-blue-50 text-blue-600" : "bg-white text-slate-400 hover:bg-slate-50 hover:text-slate-600")}
              >
                <Grid2X2 className="h-4 w-4" />
              </button>
              <button
                onClick={() => setViewMode("list")}
                className={cn("border-l border-slate-200 p-2.5 transition", viewMode === "list" ? "bg-blue-50 text-blue-600" : "bg-white text-slate-400 hover:bg-slate-50 hover:text-slate-600")}
              >
                <List className="h-4 w-4" />
              </button>
            </div>

            {/* Refresh */}
            <button
              onClick={fetchMotos}
              disabled={loading}
              className="rounded-xl border border-slate-200 bg-white p-2.5 text-slate-400 shadow-sm transition hover:bg-slate-50 hover:text-slate-600 disabled:opacity-50"
              title="Rafraichir"
            >
              <RefreshCw className={cn("h-4 w-4", loading && "animate-spin")} />
            </button>
          </div>

          {/* Filters row (collapsible) */}
          {showFilters && (
            <div className="mt-3 flex flex-col gap-3 border-t border-slate-100 pt-3 sm:flex-row sm:items-center">
              <select
                value={filterCompany}
                onChange={(e) => setFilterCompany(e.target.value)}
                className="flex-1 rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm shadow-sm transition-all focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 focus:outline-none"
              >
                {COMPANIES.map((c) => (
                  <option key={c} value={c}>{c === "all" ? "Tous fournisseurs" : c}</option>
                ))}
              </select>

              <select
                value={filterBrand}
                onChange={(e) => setFilterBrand(e.target.value)}
                className="flex-1 rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm shadow-sm transition-all focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 focus:outline-none"
              >
                {brandOptions.map((b) => (
                  <option key={b} value={b}>{b === "all" ? "Toutes marques" : b}</option>
                ))}
              </select>

              {hasActiveFilters && (
                <button
                  onClick={resetFilters}
                  className="inline-flex items-center justify-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm font-medium text-slate-500 shadow-sm transition hover:bg-slate-50"
                >
                  <RotateCcw className="h-3.5 w-3.5" />
                  Reinitialiser
                </button>
              )}
            </div>
          )}

          {/* Actions row */}
          <div className="mt-3 flex items-center gap-2 border-t border-slate-100 pt-3">
            <button
              onClick={selectAll}
              className="inline-flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-medium text-slate-600 transition hover:bg-slate-50"
            >
              <input
                type="checkbox"
                checked={selected.length === filtered.length && filtered.length > 0}
                readOnly
                className="h-3.5 w-3.5 rounded border-slate-300 text-blue-600"
              />
              {selected.length > 0 ? `${selected.length} sel.` : "Tout"}
            </button>

            {selected.length > 0 && (
              <button
                onClick={removeSelected}
                className="inline-flex items-center gap-1.5 rounded-lg bg-rose-600 px-3 py-2 text-xs font-semibold text-white shadow-sm transition hover:bg-rose-700"
              >
                <Trash2 className="h-3.5 w-3.5" />
                Supprimer ({selected.length})
              </button>
            )}

            <div className="flex-1" />

            {/* Mobile add + view toggle */}
            <div className="flex items-center gap-2 sm:hidden">
              <div className="flex overflow-hidden rounded-lg border border-slate-200">
                <button
                  onClick={() => setViewMode("grid")}
                  className={cn("p-2 transition", viewMode === "grid" ? "bg-blue-50 text-blue-600" : "bg-white text-slate-400")}
                >
                  <Grid2X2 className="h-3.5 w-3.5" />
                </button>
                <button
                  onClick={() => setViewMode("list")}
                  className={cn("border-l border-slate-200 p-2 transition", viewMode === "list" ? "bg-blue-50 text-blue-600" : "bg-white text-slate-400")}
                >
                  <List className="h-3.5 w-3.5" />
                </button>
              </div>
            </div>

            <button
              onClick={openAdd}
              className="inline-flex items-center gap-1.5 rounded-lg bg-blue-600 px-3 py-2 text-xs font-semibold text-white shadow-sm shadow-blue-600/20 transition hover:bg-blue-700 sm:hidden"
            >
              <Plus className="h-3.5 w-3.5" />
              Ajouter
            </button>

            <p className="hidden text-xs text-slate-400 sm:block">
              <span className="font-semibold text-slate-600">{filtered.length}</span> / {motos.length}
            </p>
          </div>
        </div>
      </section>

      {/* ── Content ── */}
      <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
        <div className="flex items-center justify-between border-b border-slate-100 bg-slate-50/80 px-4 py-3 sm:px-5">
          <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">Stock motos</p>
          <span className="rounded-full bg-blue-100 px-2.5 py-0.5 text-xs font-bold text-blue-700">{filtered.length}</span>
        </div>

        {/* Empty State */}
        {filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 px-4">
            <div className="flex h-20 w-20 items-center justify-center rounded-2xl bg-slate-100">
              <Bike className="h-10 w-10 text-slate-300" />
            </div>
            <p className="mt-4 text-sm font-semibold text-slate-900">Aucune moto trouvee</p>
            <p className="mt-1 text-xs text-slate-400 text-center max-w-xs">
              {hasActiveFilters
                ? "Aucun resultat ne correspond a vos filtres. Essayez de modifier vos criteres."
                : "Commencez par ajouter votre premiere moto au stock."
              }
            </p>
            <div className="mt-5 flex items-center gap-2">
              {hasActiveFilters && (
                <button
                  onClick={resetFilters}
                  className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-medium text-slate-600 shadow-sm transition hover:bg-slate-50"
                >
                  <RotateCcw className="h-4 w-4" />
                  Reinitialiser
                </button>
              )}
              <button
                onClick={openAdd}
                className="inline-flex items-center gap-2 rounded-xl bg-blue-600 px-5 py-2.5 text-sm font-semibold text-white shadow-sm shadow-blue-600/20 transition hover:bg-blue-700"
              >
                <Plus className="h-4 w-4" /> Ajouter une moto
              </button>
            </div>
          </div>

        ) : viewMode === "grid" ? (
          /* ── GRID VIEW ── */
          <div className="p-3 sm:p-5">
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
              {filtered.map((m) => {
                const st = stockInfo(m.qty);
                const sel = isSelected(m.id);
                const profit = (m.salePrice || 0) - (m.purchasePrice || 0);

                return (
                  <div
                    key={m.id}
                    className={cn(
                      "group relative overflow-hidden rounded-xl border transition-all",
                      sel
                        ? "border-blue-500 bg-blue-50/20 shadow-md shadow-blue-500/10 ring-1 ring-blue-500/20"
                        : "border-slate-200 bg-white hover:border-slate-300 hover:shadow-md"
                    )}
                  >
                    {/* Selection checkbox */}
                    <div
                      className="absolute left-3 top-3 z-10"
                      onClick={(e) => { e.stopPropagation(); toggleSelect(m.id); }}
                    >
                      <div className={cn(
                        "flex h-5 w-5 items-center justify-center rounded-md border-2 transition cursor-pointer",
                        sel
                          ? "border-blue-500 bg-blue-500 text-white"
                          : "border-slate-300 bg-white hover:border-blue-400"
                      )}>
                        {sel && <Check className="h-3 w-3" strokeWidth={3} />}
                      </div>
                    </div>

                    {/* Card top: icon + company + status */}
                    <div className="flex items-center justify-between bg-gradient-to-r from-slate-50 to-white px-4 py-3 border-b border-slate-100">
                      <div className="flex items-center gap-2.5 pl-6">
                        <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-blue-50 border border-blue-100">
                          <Bike className="h-5 w-5 text-blue-500" />
                        </div>
                        <div className="flex items-center gap-1.5">
                          <span className={cn("h-2 w-2 rounded-full", getCompanyDot(m.company))} />
                          <span className="text-xs font-semibold text-slate-600">{m.company}</span>
                        </div>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <span className={cn("h-1.5 w-1.5 rounded-full", st.dot)} />
                        <span className={cn("text-[11px] font-semibold", st.text)}>{st.label}</span>
                      </div>
                    </div>

                    {/* Card body */}
                    <div className="p-4 cursor-pointer" onClick={() => openEdit(m)}>
                      {/* Brand + Model + Qty */}
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0">
                          <p className="text-base font-bold text-slate-900 truncate">{m.brand}</p>
                          <p className="text-sm text-slate-500 truncate">{m.model}</p>
                        </div>
                        <div className={cn(
                          "flex h-10 w-10 shrink-0 items-center justify-center rounded-xl text-sm font-bold",
                          m.qty <= 0
                            ? "bg-rose-100 text-rose-700"
                            : m.qty <= 2
                              ? "bg-amber-100 text-amber-700"
                              : "bg-slate-100 text-slate-700"
                        )}>
                          {m.qty}
                        </div>
                      </div>

                      {/* Prices row */}
                      <div className="mt-3 grid grid-cols-3 gap-2">
                        <div className="rounded-lg bg-slate-50 px-2.5 py-2 text-center">
                          <p className="text-[10px] font-medium uppercase tracking-wider text-slate-400">Achat</p>
                          <p className="mt-0.5 text-xs font-bold text-slate-700">{money(m.purchasePrice)}</p>
                        </div>
                        <div className="rounded-lg bg-slate-50 px-2.5 py-2 text-center">
                          <p className="text-[10px] font-medium uppercase tracking-wider text-slate-400">Vente</p>
                          <p className="mt-0.5 text-xs font-bold text-slate-700">{money(m.salePrice)}</p>
                        </div>
                        <div className={cn(
                          "rounded-lg px-2.5 py-2 text-center",
                          profit >= 0 ? "bg-emerald-50" : "bg-rose-50"
                        )}>
                          <p className="text-[10px] font-medium uppercase tracking-wider text-slate-400">Marge</p>
                          <p className={cn("mt-0.5 text-xs font-bold", profit >= 0 ? "text-emerald-600" : "text-rose-600")}>
                            {profit >= 0 ? "+" : ""}{money(profit)}
                          </p>
                        </div>
                      </div>
                    </div>

                    {/* Card actions */}
                    <div className="flex border-t border-slate-100">
                      <button
                        onClick={(e) => { e.stopPropagation(); openEdit(m); }}
                        className="flex flex-1 items-center justify-center gap-1.5 py-2.5 text-xs font-semibold text-slate-500 transition hover:bg-slate-50 hover:text-slate-700"
                      >
                        <Pencil className="h-3.5 w-3.5" /> Modifier
                      </button>
                      <div className="w-px bg-slate-100" />
                      <button
                        onClick={(e) => { e.stopPropagation(); remove(m.id); }}
                        className="flex flex-1 items-center justify-center gap-1.5 py-2.5 text-xs font-semibold text-slate-500 transition hover:bg-rose-50 hover:text-rose-600"
                      >
                        <Trash2 className="h-3.5 w-3.5" /> Supprimer
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        ) : (
          /* ── LIST VIEW ── */
          <>
            {/* Desktop table */}
            <div className="hidden sm:block overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-slate-100 bg-slate-50/40">
                    <th className="px-5 py-3 text-left w-10">
                      <input type="checkbox" checked={selected.length === filtered.length && filtered.length > 0} onChange={selectAll} className="h-4 w-4 rounded border-slate-300 text-blue-600" />
                    </th>
                    <th className="px-3 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-400">Moto</th>
                    <th className="hidden md:table-cell px-3 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-400">Fournisseur</th>
                    <th className="px-3 py-3 text-center text-xs font-semibold uppercase tracking-wider text-slate-400">Qte</th>
                    <th className="hidden lg:table-cell px-3 py-3 text-right text-xs font-semibold uppercase tracking-wider text-slate-400">Achat</th>
                    <th className="px-3 py-3 text-right text-xs font-semibold uppercase tracking-wider text-slate-400">Vente</th>
                    <th className="hidden xl:table-cell px-3 py-3 text-right text-xs font-semibold uppercase tracking-wider text-slate-400">Marge</th>
                    <th className="px-3 py-3 w-24"></th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filtered.map((m) => {
                    const sel = isSelected(m.id);
                    const st = stockInfo(m.qty);
                    const profit = (m.salePrice || 0) - (m.purchasePrice || 0);

                    return (
                      <tr
                        key={m.id}
                        className={cn("group cursor-pointer transition-colors", sel ? "bg-blue-50/50" : "hover:bg-slate-50/60")}
                        onClick={() => openEdit(m)}
                      >
                        <td className="px-5 py-3.5">
                          <input
                            type="checkbox"
                            checked={sel}
                            onChange={() => {}}
                            onClick={(e) => { e.stopPropagation(); toggleSelect(m.id); }}
                            className="h-4 w-4 rounded border-slate-300 text-blue-600"
                          />
                        </td>
                        <td className="px-3 py-3.5">
                          <div className="flex items-center gap-3">
                            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-blue-50 border border-blue-100">
                              <Bike className="h-4.5 w-4.5 text-blue-500" />
                            </div>
                            <div className="min-w-0">
                              <p className="text-sm font-semibold text-slate-900 truncate">{m.brand} {m.model}</p>
                              <div className="mt-0.5 flex items-center gap-1.5">
                                <span className={cn("h-1.5 w-1.5 rounded-full", st.dot)} />
                                <span className="text-[11px] font-medium text-slate-400">{st.label}</span>
                              </div>
                            </div>
                          </div>
                        </td>
                        <td className="hidden md:table-cell px-3 py-3.5">
                          <div className="flex items-center gap-1.5">
                            <span className={cn("h-2 w-2 rounded-full", getCompanyDot(m.company))} />
                            <span className="text-sm text-slate-600">{m.company}</span>
                          </div>
                        </td>
                        <td className="px-3 py-3.5 text-center">
                          <span className={cn(
                            "inline-flex h-8 w-8 items-center justify-center rounded-lg text-sm font-bold",
                            m.qty <= 0
                              ? "bg-rose-100 text-rose-700"
                              : m.qty <= 2
                                ? "bg-amber-100 text-amber-700"
                                : "bg-slate-100 text-slate-700"
                          )}>{m.qty}</span>
                        </td>
                        <td className="hidden lg:table-cell px-3 py-3.5 text-right text-sm text-slate-600">{money(m.purchasePrice)}</td>
                        <td className="px-3 py-3.5 text-right text-sm font-semibold text-slate-900">{money(m.salePrice)}</td>
                        <td className="hidden xl:table-cell px-3 py-3.5 text-right">
                          <span className={cn("text-sm font-bold", profit >= 0 ? "text-emerald-600" : "text-rose-600")}>
                            {profit >= 0 ? "+" : ""}{money(profit)}
                          </span>
                        </td>
                        <td className="px-3 py-3.5">
                          <div className="flex items-center justify-end gap-1">
                            <button
                              onClick={(e) => { e.stopPropagation(); openEdit(m); }}
                              className="rounded-lg p-2 text-slate-400 transition hover:bg-slate-100 hover:text-slate-600"
                              title="Modifier"
                            >
                              <Pencil className="h-4 w-4" />
                            </button>
                            <button
                              onClick={(e) => { e.stopPropagation(); remove(m.id); }}
                              className="rounded-lg p-2 text-slate-400 transition hover:bg-red-50 hover:text-red-500"
                              title="Supprimer"
                            >
                              <Trash2 className="h-4 w-4" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* Mobile list cards */}
            <div className="divide-y divide-slate-100 sm:hidden">
              {filtered.map((m) => {
                const sel = isSelected(m.id);
                const st = stockInfo(m.qty);
                const profit = (m.salePrice || 0) - (m.purchasePrice || 0);

                return (
                  <div
                    key={m.id}
                    className={cn("p-3.5 transition-colors", sel && "bg-blue-50/40")}
                    onClick={() => openEdit(m)}
                  >
                    <div className="flex items-start gap-3">
                      {/* Checkbox */}
                      <div
                        className="mt-0.5"
                        onClick={(e) => { e.stopPropagation(); toggleSelect(m.id); }}
                      >
                        <div className={cn(
                          "flex h-5 w-5 items-center justify-center rounded-md border-2 transition cursor-pointer",
                          sel
                            ? "border-blue-500 bg-blue-500 text-white"
                            : "border-slate-300 bg-white"
                        )}>
                          {sel && <Check className="h-3 w-3" strokeWidth={3} />}
                        </div>
                      </div>

                      {/* Icon */}
                      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-blue-50 border border-blue-100">
                        <Bike className="h-5 w-5 text-blue-500" />
                      </div>

                      {/* Info */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between gap-2">
                          <div className="min-w-0">
                            <p className="text-sm font-bold text-slate-900 truncate">{m.brand} {m.model}</p>
                            <div className="mt-1 flex items-center gap-2">
                              <div className="flex items-center gap-1">
                                <span className={cn("h-1.5 w-1.5 rounded-full", getCompanyDot(m.company))} />
                                <span className="text-[11px] text-slate-500">{m.company}</span>
                              </div>
                              <span className="text-slate-300">|</span>
                              <div className="flex items-center gap-1">
                                <span className={cn("h-1.5 w-1.5 rounded-full", st.dot)} />
                                <span className={cn("text-[11px] font-medium", st.text)}>{st.label}</span>
                              </div>
                            </div>
                          </div>
                          <div className={cn(
                            "flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-sm font-bold",
                            m.qty <= 0
                              ? "bg-rose-100 text-rose-700"
                              : m.qty <= 2
                                ? "bg-amber-100 text-amber-700"
                                : "bg-slate-100 text-slate-700"
                          )}>
                            {m.qty}
                          </div>
                        </div>

                        {/* Price row */}
                        <div className="mt-2 flex items-center gap-3 text-xs">
                          <span className="text-slate-400">A: <span className="font-semibold text-slate-600">{money(m.purchasePrice)}</span></span>
                          <span className="text-slate-400">V: <span className="font-semibold text-slate-900">{money(m.salePrice)}</span></span>
                          <span className={cn("font-bold", profit >= 0 ? "text-emerald-600" : "text-rose-600")}>
                            {profit >= 0 ? "+" : ""}{money(profit)}
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Mobile actions */}
                    <div className="mt-2.5 ml-[3.75rem] flex items-center gap-2">
                      <button
                        onClick={(e) => { e.stopPropagation(); openEdit(m); }}
                        className="flex items-center gap-1 rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-[11px] font-semibold text-slate-500 transition hover:bg-slate-50"
                      >
                        <Pencil className="h-3 w-3" /> Modifier
                      </button>
                      <button
                        onClick={(e) => { e.stopPropagation(); remove(m.id); }}
                        className="flex items-center gap-1 rounded-lg border border-rose-200 bg-white px-2.5 py-1.5 text-[11px] font-semibold text-rose-500 transition hover:bg-rose-50"
                      >
                        <Trash2 className="h-3 w-3" /> Supprimer
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </>
        )}

        {filtered.length > 0 && (
          <div className="flex items-center justify-between border-t border-slate-100 px-4 py-3 sm:px-5">
            <p className="text-xs text-slate-400">
              <span className="font-semibold text-slate-600">{filtered.length}</span> sur <span className="font-semibold text-slate-600">{motos.length}</span> motos
            </p>
          </div>
        )}
      </section>

      {/* ── Modal / Drawer ── */}
      {panelOpen && (
        <>
          {/* Backdrop */}
          <div
            className="fixed inset-0 z-40 bg-black/30 backdrop-blur-sm transition-opacity"
            onClick={() => setPanelOpen(false)}
          />

          {/* Modal: centered on mobile, slide-from-right on desktop */}
          <div className="fixed inset-0 z-50 flex items-end sm:items-stretch sm:justify-end">
            <div
              className={cn(
                "flex w-full flex-col bg-white shadow-2xl transition-transform duration-300 ease-out",
                // Mobile: bottom sheet with rounded top
                "rounded-t-2xl max-h-[90vh] sm:rounded-t-none sm:rounded-l-2xl",
                // Desktop: side panel
                "sm:max-w-md sm:max-h-full sm:h-full"
              )}
              onClick={(e) => e.stopPropagation()}
            >
              {/* Handle bar (mobile only) */}
              <div className="flex justify-center pt-2 pb-0 sm:hidden">
                <div className="h-1 w-10 rounded-full bg-slate-300" />
              </div>

              {/* Modal header */}
              <div className="flex items-center justify-between px-5 py-4 sm:border-b sm:border-slate-100">
                <div className="flex items-center gap-3">
                  <div className={cn(
                    "flex h-10 w-10 items-center justify-center rounded-xl",
                    editing ? "bg-amber-100" : "bg-blue-100"
                  )}>
                    {editing
                      ? <Pencil className="h-5 w-5 text-amber-600" />
                      : <Plus className="h-5 w-5 text-blue-600" />
                    }
                  </div>
                  <div>
                    <h3 className="text-lg font-bold text-slate-900">
                      {editing ? "Modifier la moto" : "Nouvelle moto"}
                    </h3>
                    <p className="text-xs text-slate-400">
                      {editing ? "Modifiez les informations ci-dessous" : "Remplissez les informations ci-dessous"}
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => setPanelOpen(false)}
                  className="flex h-9 w-9 items-center justify-center rounded-xl text-slate-400 transition hover:bg-slate-100 hover:text-slate-600"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>

              {/* Modal body */}
              <div className="flex-1 overflow-y-auto px-5 py-4 sm:py-5">
                <div className="space-y-4">
                  {/* Brand + Model side by side on larger screens */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className={labelClass}>Marque <span className="text-red-400">*</span></label>
                      <input
                        className={inputClass}
                        value={form.brand}
                        onChange={(e) => setForm((p) => ({ ...p, brand: e.target.value }))}
                        placeholder="Yamaha, Honda..."
                      />
                    </div>
                    <div>
                      <label className={labelClass}>Modele <span className="text-red-400">*</span></label>
                      <input
                        className={inputClass}
                        value={form.model}
                        onChange={(e) => setForm((p) => ({ ...p, model: e.target.value }))}
                        placeholder="R125, Ninja 300..."
                      />
                    </div>
                  </div>

                  {/* Quantity */}
                  <div>
                    <label className={labelClass}>Quantite en stock</label>
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => setForm((p) => ({ ...p, qty: Math.max(0, Number(p.qty) - 1) }))}
                        className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-500 transition hover:bg-slate-50 active:bg-slate-100"
                      >
                        <span className="text-lg font-bold">-</span>
                      </button>
                      <input
                        type="number"
                        min={0}
                        className={cn(inputClass, "text-center text-lg font-bold")}
                        value={form.qty}
                        onChange={(e) => setForm((p) => ({ ...p, qty: e.target.value }))}
                      />
                      <button
                        type="button"
                        onClick={() => setForm((p) => ({ ...p, qty: Number(p.qty) + 1 }))}
                        className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-500 transition hover:bg-slate-50 active:bg-slate-100"
                      >
                        <span className="text-lg font-bold">+</span>
                      </button>
                    </div>
                  </div>

                  {/* Prices */}
                  <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                    <div>
                      <label className={labelClass}>Prix achat (TND)</label>
                      <input
                        type="number"
                        min={0}
                        className={inputClass}
                        value={form.purchasePrice}
                        onChange={(e) => setForm((p) => ({ ...p, purchasePrice: e.target.value }))}
                        placeholder="0"
                      />
                    </div>
                    <div>
                      <label className={labelClass}>Prix vente (TND)</label>
                      <input
                        type="number"
                        min={0}
                        className={inputClass}
                        value={form.salePrice}
                        onChange={(e) => setForm((p) => ({ ...p, salePrice: e.target.value }))}
                        placeholder="0"
                      />
                    </div>
                  </div>

                  {/* Margin preview */}
                  {formMargin !== null && (
                    <div className={cn(
                      "rounded-xl border p-4",
                      formMargin >= 0
                        ? "border-emerald-200 bg-emerald-50/50"
                        : "border-rose-200 bg-rose-50/50"
                    )}>
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <TrendingUp className={cn("h-4 w-4", formMargin >= 0 ? "text-emerald-500" : "text-rose-500")} />
                          <p className={cn("text-xs font-medium uppercase tracking-wider", formMargin >= 0 ? "text-emerald-500" : "text-rose-500")}>
                            Marge estimee
                          </p>
                        </div>
                        <p className={cn("text-xl font-bold", formMargin >= 0 ? "text-emerald-700" : "text-rose-700")}>
                          {formMargin >= 0 ? "+" : ""}{money(formMargin)}
                        </p>
                      </div>
                      {formMargin > 0 && Number(form.purchasePrice) > 0 && (
                        <p className="mt-1 text-xs text-emerald-500 text-right">
                          {((formMargin / Number(form.purchasePrice)) * 100).toFixed(1)}% de marge
                        </p>
                      )}
                    </div>
                  )}
                </div>
              </div>

              {/* Modal footer */}
              <div className="border-t border-slate-100 px-5 py-4 safe-area-bottom">
                <div className="flex items-center gap-3">
                  <button
                    onClick={() => setPanelOpen(false)}
                    disabled={saving}
                    className="flex-1 rounded-xl border border-slate-200 bg-white py-3 text-sm font-semibold text-slate-600 transition hover:bg-slate-50 disabled:opacity-50"
                  >
                    Annuler
                  </button>
                  <button
                    onClick={save}
                    disabled={saving}
                    className={cn(
                      "flex flex-1 items-center justify-center gap-2 rounded-xl py-3 text-sm font-bold text-white shadow-sm transition disabled:opacity-50",
                      editing
                        ? "bg-amber-500 hover:bg-amber-600 shadow-amber-500/20"
                        : "bg-blue-600 hover:bg-blue-700 shadow-blue-600/20"
                    )}
                  >
                    {saving ? (
                      <div className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
                    ) : (
                      <Check className="h-4 w-4" />
                    )}
                    {saving ? "Enregistrement..." : editing ? "Mettre a jour" : "Ajouter au stock"}
                  </button>
                </div>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
