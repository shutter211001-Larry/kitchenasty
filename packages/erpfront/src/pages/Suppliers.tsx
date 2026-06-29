import i18n from "../i18n";
import React, { useState, useEffect } from "react";
import axios from "axios";
import {
  Search,
  Users,
  Phone,
  MapPin,
  Plus,
  UserPlus,
  Edit,
  Trash2,
  ShieldAlert,
} from "lucide-react";
import { SupplierModal } from "../components/SupplierModal";
import { SupplierPriceModal } from "../components/SupplierPriceModal";
import { useTranslation } from "react-i18next";
interface Supplier {
  id: string;
  name: string;
  contactPerson: string;
  phone: string;
  address: string;
  _count?: {
    prices: number;
  };
}
const Suppliers = () => {
  const { t } = useTranslation();
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");

  // Modals state
  const [selectedSupplier, setSelectedSupplier] = useState<
    Supplier | null | "new"
  >(null);
  const [pricingSupplier, setPricingSupplier] = useState<Supplier | null>(null);
  const fetchSuppliers = async () => {
    try {
      setLoading(true);
      const response = await axios.get("http://localhost:3000/api/suppliers");
      setSuppliers(response.data);
    } catch (error) {
      console.error("Failed to fetch suppliers", error);
    } finally {
      setLoading(false);
    }
  };
  const handleDelete = async (id: string, name: string) => {
    const { t } = useTranslation();
    if (
      !confirm(
        `確定要刪除供應商「${name}」嗎？\n此操作將會連帶清除該廠商名下的所有原料報價合約！`,
      )
    )
      return;
    try {
      setLoading(true);
      await axios.delete(`http://localhost:3000/api/suppliers/${id}`);
      fetchSuppliers();
    } catch (error) {
      console.error("Failed to delete supplier", error);
      alert(t("erp_809"));
    } finally {
      setLoading(false);
    }
  };
  useEffect(() => {
    fetchSuppliers();
  }, []);

  // Filter suppliers by name or contact person
  const filteredSuppliers = suppliers.filter((s) => {
    const term = search.trim().toLowerCase();
    if (!term) return true;
    return (
      s.name.toLowerCase().includes(term) ||
      (s.contactPerson && s.contactPerson.toLowerCase().includes(term))
    );
  });
  return (
    <div className="flex flex-col gap-8">
      <header className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">{t("erp_191")}</h2>
          <p className="text-muted-foreground mt-1">{t("erp_810")}</p>
        </div>
        <button
          onClick={() => setSelectedSupplier("new")}
          className="w-full sm:w-auto flex items-center justify-center gap-2 px-4 py-2.5 bg-primary text-white rounded-xl font-bold shadow-lg shadow-primary/20 hover:opacity-90 transition-opacity cursor-pointer text-xs"
        >
          <UserPlus className="w-4 h-4" />
          <span>{t("erp_811")}</span>
        </button>
      </header>

      {/* Search Filter */}
      <div className="bg-white/50 backdrop-blur-md p-4 rounded-2xl border border-border flex gap-4 items-center shadow-sm">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
          <input
            type="text"
            placeholder={t("erp_812")}
            className="w-full pl-11 pr-4 py-2.5 bg-white border border-border rounded-xl outline-none focus:ring-2 focus:ring-primary/20 transition-all text-sm"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
      </div>

      {/* Supplier Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
        {loading ? (
          <div className="col-span-full py-20 text-center">
            <div className="w-10 h-10 border-4 border-primary/20 border-t-primary rounded-full animate-spin mx-auto mb-4" />
            <span className="text-sm font-medium text-muted-foreground">
              {t("erp_813")}
            </span>
          </div>
        ) : filteredSuppliers.length === 0 ? (
          <div className="col-span-full py-20 text-center text-muted-foreground border-2 border-dashed border-border rounded-3xl bg-white/50">
            <Users className="w-12 h-12 mx-auto mb-4 opacity-20" />
            <p className="font-medium">{t("erp_814")}</p>
          </div>
        ) : (
          filteredSuppliers.map((s) => (
            <div
              key={s.id}
              className="bg-white p-6 sm:p-8 rounded-[2rem] border border-border shadow-sm hover:shadow-xl transition-all duration-300 flex flex-col justify-between min-h-[360px] relative group"
            >
              <div>
                <div className="flex justify-between items-start mb-6">
                  <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-primary to-orange-600 flex items-center justify-center text-white font-bold text-2xl shadow-lg shadow-primary/20">
                    {s.name[0]}
                  </div>
                  <div className="flex items-center gap-1.5">
                    {s.name === i18n.t("erp_815") ? (
                      <span className="px-2.5 py-0.5 bg-slate-100 text-slate-600 text-[9px] font-bold rounded-full uppercase tracking-wider">
                        System Default
                      </span>
                    ) : (
                      <>
                        <button
                          onClick={() => setSelectedSupplier(s)}
                          className="p-2 hover:bg-primary/10 rounded-full transition-all text-muted-foreground hover:text-primary active:scale-90"
                        >
                          <Edit className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleDelete(s.id, s.name)}
                          className="p-2 hover:bg-destructive/10 rounded-full transition-all text-muted-foreground hover:text-destructive active:scale-90"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </>
                    )}
                  </div>
                </div>

                <h3 className="text-2xl font-bold mb-1 text-gray-800">
                  {s.name}
                </h3>
                <p className="text-sm text-muted-foreground mb-6 font-medium">
                  {s.contactPerson
                    ? `聯絡窗口: ${s.contactPerson}`
                    : i18n.t("erp_816")}
                </p>

                <div className="space-y-4 pt-6 border-t border-border">
                  <div className="flex items-center gap-3 text-sm text-gray-600">
                    <div className="w-8 h-8 rounded-full bg-muted flex items-center justify-center shrink-0">
                      <Phone className="w-4 h-4 text-muted-foreground" />
                    </div>
                    <span className="font-semibold text-gray-700">
                      {s.phone || i18n.t("erp_817")}
                    </span>
                  </div>
                  <div className="flex items-center gap-3 text-sm text-gray-600">
                    <div className="w-8 h-8 rounded-full bg-muted flex items-center justify-center shrink-0">
                      <MapPin className="w-4 h-4 text-muted-foreground" />
                    </div>
                    <span
                      className="truncate font-semibold text-gray-700"
                      title={s.address || i18n.t("erp_818")}
                    >
                      {s.address || i18n.t("erp_818")}
                    </span>
                  </div>
                </div>
              </div>

              <div className="mt-8 flex flex-col gap-2">
                {s._count && s._count.prices > 0 && (
                  <div className="px-3 py-1 bg-emerald-50 border border-emerald-100 rounded-xl text-center text-[10px] text-emerald-600 font-extrabold">
                    {t("erp_368")}
                    {s._count.prices}
                    {t("erp_819")}
                  </div>
                )}
                <button
                  onClick={() => setPricingSupplier(s)}
                  className="w-full py-3 bg-muted hover:bg-primary hover:text-white rounded-xl text-sm font-bold transition-all duration-200 shadow-sm"
                >
                  {t("erp_820")}
                </button>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Supplier Modal */}
      {selectedSupplier && (
        <SupplierModal
          supplier={selectedSupplier}
          onClose={() => setSelectedSupplier(null)}
          onSuccess={fetchSuppliers}
        />
      )}

      {/* Supplier Pricing Modal */}
      {pricingSupplier && (
        <SupplierPriceModal
          supplier={pricingSupplier}
          onClose={() => {
            setPricingSupplier(null);
            fetchSuppliers(); // refresh to get updated counts
          }}
        />
      )}
    </div>
  );
};
export default Suppliers;
