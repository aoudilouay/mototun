import { useMemo, useState, useEffect } from "react";
import { motion } from "framer-motion";
import { Toaster, toast } from "sonner";
import {
  Plus,
  Search,
  Grid2X2,
  List,
  RotateCcw,
  Pencil,
  Trash2,
} from "lucide-react";

import axiosInstance from '../../api/axios';
 
const cn = (...xs) => xs.filter(Boolean).join(" ");

const BRANDS = ["all", "Yamaha", "Honda", "Suzuki", "Kawasaki", "KTM", "BMW"];
const COMPANIES = ["all", "Zimota", "Forza", "GSM", "Sanya"];

function money(n) {
  const num = typeof n === "string" ? Number(n) : n;
  if (n === "" || n === null || n === undefined || Number.isNaN(num)) return "—";
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

function getCompanyColor(company) {
  const colors = {
    Zimota: "bg-blue-100 text-blue-700 border-blue-200",
    Forza: "bg-red-100 text-red-700 border-red-200",
    GSM: "bg-green-100 text-green-700 border-green-200",
    Sanya: "bg-purple-100 text-purple-700 border-purple-200",
  };
  return colors[company] || "bg-slate-100 text-slate-700 border-slate-200";
}

function stockInfo(qty) {
  if (qty <= 0)
    return {
      label: "Rupture",
      bg: "bg-rose-50 border-rose-200",
      text: "text-rose-700",
      badge: "bg-rose-100 text-rose-700 border-rose-200",
      icon: "⛔",
    };
  if (qty <= 2)
    return {
      label: "Stock bas",
      bg: "bg-amber-50 border-amber-200",
      text: "text-amber-800",
      badge: "bg-amber-100 text-amber-800 border-amber-200",
      icon: "⚠️",
    };
  return {
    label: "En stock",
    bg: "bg-emerald-50 border-emerald-200",
    text: "text-emerald-700",
    badge: "bg-emerald-100 text-emerald-700 border-emerald-200",
    icon: "✓",
  };
}

function StatBox({ value, label, cls }) {
  return (
    <div className={cn("text-center p-4 rounded-lg", cls)}>
      <p className="text-2xl font-bold">{value}</p>
      <p className="text-xs mt-1">{label}</p>
    </div>
  );
}

function SoftBtn({ children, onClick, variant = "default", className, disabled }) {
  const base =
    "inline-flex items-center gap-2 px-4 py-2 rounded-lg transition-colors font-semibold";
  const styles = {
    default: "border border-slate-300 hover:bg-slate-50 text-slate-700 bg-white",
    primary: "bg-slate-900 hover:bg-slate-950 text-white shadow-lg",
    danger: "bg-rose-600 hover:bg-rose-700 text-white",
  };
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={cn(
        base,
        styles[variant],
        disabled && "opacity-60 cursor-not-allowed",
        className
      )}
    >
      {children}
    </button>
  );
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

// ✅ map API -> UI
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

// ✅ map UI -> API payload
function toPayload(m) {
  return {
    company: String(m.company).trim(),
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

  const [filterCompany, setFilterCompany] = useState("all");
  const [filterBrand, setFilterBrand] = useState("all");
  const [searchTerm, setSearchTerm] = useState("");

  // Drawer state
  const [panelOpen, setPanelOpen] = useState(false);
  const [editing, setEditing] = useState(null);

  const [form, setForm] = useState({
    company: "Zimota",
    brand: "Yamaha",
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
    const q = searchTerm.trim().toLowerCase();
    return motos.filter((m) => {
      const matchesCompany = filterCompany === "all" || m.company === filterCompany;
      const matchesBrand = filterBrand === "all" || m.brand === filterBrand;
      const matchesSearch =
        !q || m.brand.toLowerCase().includes(q) || m.model.toLowerCase().includes(q);
      return matchesCompany && matchesBrand && matchesSearch;
    });
  }, [motos, filterCompany, filterBrand, searchTerm]);

  const stats = useMemo(() => {
    const totalModels = motos.length;
    const totalQty = motos.reduce((s, x) => s + (x.qty || 0), 0);
    const low = motos.filter((x) => (x.qty || 0) > 0 && (x.qty || 0) <= 2).length;
    const out = motos.filter((x) => (x.qty || 0) <= 0).length;
    const buy = motos.reduce((s, x) => s + (x.qty || 0) * (x.purchasePrice || 0), 0);
    const sell = motos.reduce((s, x) => s + (x.qty || 0) * (x.salePrice || 0), 0);
    return { totalModels, totalQty, low, out, buy, sell };
  }, [motos]);

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
    toast.message("Réinitialisé");
  }

  function openAdd() {
    setEditing(null);
    setForm({
      company: "Zimota",
      brand: "Yamaha",
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
      company: m.company,
      brand: m.brand,
      model: m.model,
      qty: m.qty,
      purchasePrice: m.purchasePrice,
      salePrice: m.salePrice,
    });
    setPanelOpen(true);
  }

  async function save() {
    const payload = {
      company: String(form.company).trim(),
      brand: String(form.brand).trim(),
      model: String(form.model).trim(),
      qty: clampInt(form.qty),
      purchasePrice: clampNum(form.purchasePrice),
      salePrice: clampNum(form.salePrice),
    };

    if (!payload.company || !payload.brand || !payload.model) {
      return toast.error("Champs requis manquants");
    }

    setSaving(true);
    try {
      if (!editing) {
        const created = await apiCreate(toPayload(payload));
        setMotos((prev) => [created, ...prev]);
        toast.success("Moto ajoutée");
      } else {
        const updated = await apiUpdate(editing.id, toPayload(payload));
        setMotos((prev) => prev.map((x) => (x.id === editing.id ? updated : x)));
        toast.success("Moto modifiée");
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
    // optimistic
    setMotos((prev) => prev.filter((x) => x.id !== id));
    setSelected((prev) => prev.filter((x) => x !== id));

    try {
      await apiDelete(id);
      toast.success("Moto supprimée");
    } catch (e) {
      console.error(e);
      setMotos(old); // rollback
      toast.error("Suppression échouée");
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
      toast.success("Suppression terminée");
    } catch (e) {
      console.error(e);
      setMotos(old);
      toast.error("Suppression partielle/échouée");
    }
  }

  return (
    <div className="space-y-6">
      <Toaster richColors position="bottom-right" />

      {/* Page Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-slate-900">📦 Gestion Stock Motos</h1>
          <p className="text-slate-600 mt-1">Explorer pattern + Drawer ERP</p>
        </div>
        <div className="flex items-center gap-3">
          <SoftBtn variant="primary" onClick={openAdd}>
            <Plus className="w-5 h-5" />
            Ajouter Moto
          </SoftBtn>
        </div>
      </div>

      {/* Stats Bar */}
      <div className="bg-white rounded-xl border border-slate-200 p-6">
        <div className="grid grid-cols-2 md:grid-cols-6 gap-4">
          <StatBox value={stats.totalModels} label="Modèles" cls="bg-slate-50 text-slate-900" />
          <StatBox value={stats.totalQty} label="Quantité" cls="bg-blue-50 text-blue-700" />
          <StatBox value={stats.low} label="Stock bas" cls="bg-amber-50 text-amber-800" />
          <StatBox value={stats.out} label="Rupture" cls="bg-rose-50 text-rose-700" />
          <StatBox value={money(stats.buy)} label="Valeur achat" cls="bg-slate-50 text-slate-900" />
          <StatBox value={money(stats.sell)} label="CA potentiel" cls="bg-emerald-50 text-emerald-700" />
        </div>
      </div>

      {/* Toolbar */}
      <div className="bg-white rounded-xl border border-slate-200 p-4">
        <div className="flex flex-col lg:flex-row items-center justify-between gap-4">
          {/* Left Side */}
          <div className="flex items-center gap-3 flex-wrap">
            <button
              onClick={selectAll}
              className="flex items-center gap-2 px-4 py-2 border border-slate-300 hover:bg-slate-50 rounded-lg transition-colors"
            >
              <input
                type="checkbox"
                checked={selected.length === filtered.length && filtered.length > 0}
                readOnly
                className="w-4 h-4 text-blue-600 border-slate-300 rounded"
              />
              <span className="text-sm font-medium text-slate-700">
                {selected.length > 0 ? `${selected.length} sélectionné(s)` : "Tout sélectionner"}
              </span>
            </button>

            {selected.length > 0 && (
              <SoftBtn variant="danger" onClick={removeSelected}>
                <Trash2 className="w-4 h-4" />
                Supprimer
              </SoftBtn>
            )}

            {loading && <span className="text-sm text-slate-500">Chargement...</span>}
          </div>

          {/* Right Side */}
          <div className="flex items-center gap-3">
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <Search className="w-5 h-5 text-slate-400" />
              </div>
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Rechercher..."
                className="pl-10 pr-4 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500 w-64"
              />
            </div>

            <select
              value={filterCompany}
              onChange={(e) => setFilterCompany(e.target.value)}
              className="px-4 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500"
            >
              {COMPANIES.map((c) => (
                <option key={c} value={c}>
                  {c === "all" ? "🏢 Tous fournisseurs" : c}
                </option>
              ))}
            </select>

            <select
              value={filterBrand}
              onChange={(e) => setFilterBrand(e.target.value)}
              className="px-4 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500"
            >
              {BRANDS.map((b) => (
                <option key={b} value={b}>
                  {b === "all" ? "🏍️ Toutes marques" : b}
                </option>
              ))}
            </select>

            <SoftBtn variant="default" onClick={resetFilters}>
              <RotateCcw className="w-4 h-4" />
              Reset
            </SoftBtn>

            <div className="flex items-center border border-slate-200 rounded-lg overflow-hidden">
              <button
                onClick={() => setViewMode("grid")}
                className={cn(
                  "p-2",
                  viewMode === "grid" ? "bg-blue-50 text-blue-600" : "text-slate-600 hover:bg-slate-50"
                )}
                title="Grille"
              >
                <Grid2X2 className="w-5 h-5" />
              </button>
              <button
                onClick={() => setViewMode("list")}
                className={cn(
                  "p-2 border-l border-slate-200",
                  viewMode === "list" ? "bg-blue-50 text-blue-600" : "text-slate-600 hover:bg-slate-50"
                )}
                title="Liste"
              >
                <List className="w-5 h-5" />
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* GRID VIEW */}
      {viewMode === "grid" ? (
        <div className="bg-white rounded-xl border border-slate-200 p-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {filtered.map((m) => {
              const st = stockInfo(m.qty);
              const selectedRow = isSelected(m.id);
              const profit = (m.salePrice || 0) - (m.purchasePrice || 0);

              return (
                <div
                  key={m.id}
                  className={cn(
                    "relative group border-2 rounded-xl p-4 cursor-pointer transition-all",
                    selectedRow
                      ? "border-blue-500 bg-blue-50 shadow-lg"
                      : "border-slate-200 hover:border-blue-300 hover:shadow-md"
                  )}
                  onClick={() => openEdit(m)}
                >
                  <div
                    className="absolute top-2 left-2 z-10"
                    onClick={(e) => {
                      e.stopPropagation();
                      toggleSelect(m.id);
                    }}
                  >
                    <input
                      type="checkbox"
                      checked={selectedRow}
                      onChange={() => {}}
                      className="w-5 h-5 text-blue-600 border-slate-300 rounded focus:ring-blue-500"
                    />
                  </div>

                  <div className="flex justify-center mb-4 mt-6">
                    <div className="relative">
                      <div className={cn("text-7xl", st.text)}>🏍️</div>
                      <div
                        className={cn(
                          "absolute -bottom-2 -right-2 w-8 h-8 rounded-full border-2 flex items-center justify-center text-sm",
                          st.bg
                        )}
                      >
                        {st.icon}
                      </div>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <div className="text-center">
                      <p className="font-bold text-slate-900 text-sm">
                        {m.brand} {m.model}
                      </p>
                      <span
                        className={cn(
                          "inline-block mt-2 px-2 py-1 rounded-full text-xs font-semibold border",
                          getCompanyColor(m.company)
                        )}
                      >
                        {m.company}
                      </span>
                    </div>

                    <div className="grid grid-cols-2 gap-2 text-center">
                      <div className="bg-slate-50 rounded-lg p-2 border border-slate-200">
                        <p className="text-[10px] text-slate-500 font-semibold">Achat</p>
                        <p className="text-xs font-bold text-slate-900">{money(m.purchasePrice)}</p>
                      </div>
                      <div className="bg-slate-50 rounded-lg p-2 border border-slate-200">
                        <p className="text-[10px] text-slate-500 font-semibold">Vente</p>
                        <p className="text-xs font-bold text-slate-900">{money(m.salePrice)}</p>
                      </div>
                    </div>

                    <div className="flex items-center justify-between">
                      <span className={cn("px-2 py-1 rounded-full text-xs font-semibold border", st.badge)}>
                        {st.label}
                      </span>
                      <span className="text-xs font-bold text-slate-900">Qté: {m.qty}</span>
                    </div>

                    <div className="text-center">
                      <span className={cn("text-xs font-bold", profit >= 0 ? "text-emerald-700" : "text-rose-700")}>
                        Marge: {profit >= 0 ? "+" : ""}
                        {money(profit)}
                      </span>
                    </div>

                    <div className="mt-2 flex items-center gap-2 opacity-0 group-hover:opacity-100 transition">
                      <SoftBtn
                        variant="default"
                        className="flex-1 justify-center"
                        onClick={(e) => {
                          e.stopPropagation();
                          openEdit(m);
                        }}
                      >
                        <Pencil className="w-4 h-4" />
                        Modifier
                      </SoftBtn>
                      <SoftBtn
                        variant="danger"
                        className="flex-1 justify-center"
                        onClick={(e) => {
                          e.stopPropagation();
                          remove(m.id);
                        }}
                      >
                        <Trash2 className="w-4 h-4" />
                        Suppr.
                      </SoftBtn>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          {filtered.length === 0 && (
            <div className="text-center py-16">
              <div className="text-6xl mb-4">📦</div>
              <p className="text-xl font-semibold text-slate-900 mb-2">Aucune moto trouvée</p>
              <p className="text-slate-600">Modifiez vos filtres ou ajoutez une nouvelle moto</p>
            </div>
          )}
        </div>
      ) : (
        /* LIST VIEW */
        <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-slate-50 border-b border-slate-200">
                <tr>
                  <th className="px-6 py-4 text-left">
                    <input
                      type="checkbox"
                      checked={selected.length === filtered.length && filtered.length > 0}
                      onChange={selectAll}
                      className="w-4 h-4 text-blue-600 border-slate-300 rounded"
                    />
                  </th>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-slate-600 uppercase">Moto</th>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-slate-600 uppercase">Fournisseur</th>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-slate-600 uppercase">Nombre</th>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-slate-600 uppercase">Prix achat</th>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-slate-600 uppercase">Prix vente</th>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-slate-600 uppercase">Marge</th>
                  <th className="px-6 py-4 text-right text-xs font-semibold text-slate-600 uppercase">Actions</th>
                </tr>
              </thead>

              <tbody className="divide-y divide-slate-200">
                {filtered.map((m) => {
                  const selectedRow = isSelected(m.id);
                  const st = stockInfo(m.qty);
                  const profit = (m.salePrice || 0) - (m.purchasePrice || 0);

                  return (
                    <tr
                      key={m.id}
                      className={cn("hover:bg-slate-50 transition-colors cursor-pointer", selectedRow ? "bg-blue-50" : "")}
                      onClick={() => openEdit(m)}
                    >
                      <td className="px-6 py-4">
                        <input
                          type="checkbox"
                          checked={selectedRow}
                          onChange={() => {}}
                          onClick={(e) => {
                            e.stopPropagation();
                            toggleSelect(m.id);
                          }}
                          className="w-4 h-4 text-blue-600 border-slate-300 rounded"
                        />
                      </td>

                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          <span className="text-2xl">🏍️</span>
                          <div>
                            <p className="font-semibold text-slate-900">
                              {m.brand} {m.model}
                            </p>
                            <span className={cn("inline-block mt-1 px-2 py-0.5 rounded-full text-xs font-semibold border", st.badge)}>
                              {st.icon} {st.label}
                            </span>
                          </div>
                        </div>
                      </td>

                      <td className="px-6 py-4">
                        <span className={cn("px-3 py-1 rounded-full text-xs font-semibold border", getCompanyColor(m.company))}>
                          {m.company}
                        </span>
                      </td>

                      <td className="px-6 py-4 font-bold text-slate-900">{m.qty}</td>
                      <td className="px-6 py-4 font-semibold text-slate-900">{money(m.purchasePrice)}</td>
                      <td className="px-6 py-4 font-semibold text-slate-900">{money(m.salePrice)}</td>

                      <td className="px-6 py-4">
                        <span className={cn("font-bold", profit >= 0 ? "text-emerald-700" : "text-rose-700")}>
                          {profit >= 0 ? "+" : ""}
                          {money(profit)}
                        </span>
                      </td>

                      <td className="px-6 py-4">
                        <div className="flex items-center justify-end gap-2">
                          <SoftBtn
                            variant="default"
                            onClick={(e) => {
                              e.stopPropagation();
                              openEdit(m);
                            }}
                          >
                            <Pencil className="w-4 h-4" />
                            Modifier
                          </SoftBtn>
                          <SoftBtn
                            variant="danger"
                            onClick={(e) => {
                              e.stopPropagation();
                              remove(m.id);
                            }}
                          >
                            <Trash2 className="w-4 h-4" />
                            Supprimer
                          </SoftBtn>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* RIGHT DRAWER */}
      <motion.div
        initial={false}
        animate={{ x: panelOpen ? 0 : 420 }}
        transition={{ type: "spring", stiffness: 260, damping: 28 }}
        className="fixed top-0 right-0 h-full w-[420px] bg-white border-l border-slate-200 shadow-[0_25px_80px_rgba(2,6,23,0.18)] z-50"
      >
        <div className="p-6 border-b border-slate-200 flex items-start justify-between">
          <div>
            <div className="text-xs font-extrabold text-slate-500">Formulaire</div>
            <div className="text-xl font-bold text-slate-900">
              {editing ? "Modifier la moto" : "Ajouter une moto"}
            </div>
          </div>
          <button
            className="h-10 w-10 rounded-xl ring-1 ring-slate-200 hover:bg-slate-50 font-black"
            onClick={() => setPanelOpen(false)}
          >
            ✕
          </button>
        </div>

        <div className="p-6 space-y-4">
          <div>
            <label className="text-xs font-semibold text-slate-600">Fournisseur</label>
            <select
              className="mt-2 w-full px-4 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500"
              value={form.company}
              onChange={(e) => setForm((p) => ({ ...p, company: e.target.value }))}
            >
              {COMPANIES.filter((c) => c !== "all").map((c) => (
                <option key={c} value={c}>{c}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="text-xs font-semibold text-slate-600">Marque</label>
            <select
              className="mt-2 w-full px-4 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500"
              value={form.brand}
              onChange={(e) => setForm((p) => ({ ...p, brand: e.target.value }))}
            >
              {BRANDS.filter((b) => b !== "all").map((b) => (
                <option key={b} value={b}>{b}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="text-xs font-semibold text-slate-600">Modèle</label>
            <input
              className="mt-2 w-full px-4 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500"
              value={form.model}
              onChange={(e) => setForm((p) => ({ ...p, model: e.target.value }))}
              placeholder="R125, Ninja 300..."
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-semibold text-slate-600">Nombre</label>
              <input
                type="number"
                min={0}
                className="mt-2 w-full px-4 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500"
                value={form.qty}
                onChange={(e) => setForm((p) => ({ ...p, qty: e.target.value }))}
              />
            </div>

            <div>
              <label className="text-xs font-semibold text-slate-600">Prix achat</label>
              <input
                type="number"
                min={0}
                className="mt-2 w-full px-4 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500"
                value={form.purchasePrice}
                onChange={(e) => setForm((p) => ({ ...p, purchasePrice: e.target.value }))}
              />
            </div>
          </div>

          <div>
            <label className="text-xs font-semibold text-slate-600">Prix vente</label>
            <input
              type="number"
              min={0}
              className="mt-2 w-full px-4 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500"
              value={form.salePrice}
              onChange={(e) => setForm((p) => ({ ...p, salePrice: e.target.value }))}
            />
          </div>

          {form.purchasePrice !== "" &&
            form.salePrice !== "" &&
            Number(form.purchasePrice) > 0 && (
              <div className="bg-slate-50 rounded-xl p-4 border border-slate-200">
                <p className="text-xs text-slate-500 font-semibold">Marge estimée</p>
                <p className="text-lg font-bold text-slate-900 mt-1">
                  {money(Number(form.salePrice) - Number(form.purchasePrice))}
                </p>
              </div>
            )}
        </div>

        <div className="p-6 border-t border-slate-200 flex items-center justify-end gap-2">
          <SoftBtn variant="default" onClick={() => setPanelOpen(false)} disabled={saving}>
            Annuler
          </SoftBtn>
          <SoftBtn variant="primary" onClick={save} disabled={saving}>
            {saving ? "..." : "Enregistrer"}
          </SoftBtn>
        </div>
      </motion.div>

      {/* Backdrop */}
      {panelOpen && (
        <div className="fixed inset-0 bg-black/20 z-40" onClick={() => setPanelOpen(false)} />
      )}
    </div>
  );
}
