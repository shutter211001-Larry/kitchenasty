import React, { useState, useEffect } from "react";
import axios from "axios";
import { X, Save, Building, User, Phone, MapPin } from "lucide-react";
import { useTranslation } from "react-i18next";
interface Supplier {
  id?: string;
  name: string;
  contactPerson: string;
  phone: string;
  address: string;
}
interface Props {
  supplier: Supplier | null | "new";
  onClose: () => void;
  onSuccess: () => void;
}
export const SupplierModal = ({ supplier, onClose, onSuccess }: Props) => {
  const { t } = useTranslation();
  const isCreate = supplier === "new";
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState<Supplier>({
    name: "",
    contactPerson: "",
    phone: "",
    address: "",
  });
  useEffect(() => {
    if (supplier && supplier !== "new") {
      setFormData({
        name: supplier.name || "",
        contactPerson: supplier.contactPerson || "",
        phone: supplier.phone || "",
        address: supplier.address || "",
      });
    } else {
      setFormData({
        name: "",
        contactPerson: "",
        phone: "",
        address: "",
      });
    }
  }, [supplier]);
  const handleSubmit = async (e: React.FormEvent) => {
    const { t } = useTranslation();
    e.preventDefault();
    if (!formData.name.trim()) {
      alert(t("erp_254"));
      return;
    }
    try {
      setLoading(true);
      if (isCreate) {
        await axios.post("http://localhost:3000/api/suppliers", formData);
      } else {
        const sup = supplier as Supplier;
        await axios.patch(
          `http://localhost:3000/api/suppliers/${sup.id}`,
          formData,
        );
      }
      onSuccess();
      onClose();
    } catch (error) {
      console.error("Failed to save supplier", error);
      alert(t("erp_255"));
    } finally {
      setLoading(false);
    }
  };
  return (
    <div className="fixed inset-0 z-40 flex items-center justify-center bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
      <div
        className="bg-background border border-border shadow-2xl rounded-3xl w-full max-w-md flex flex-col max-h-[90vh] overflow-hidden animate-in zoom-in-95 duration-200"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-border bg-muted/20">
          <div className="flex items-center gap-2">
            <h3 className="font-extrabold text-sm text-gray-800">
              {isCreate ? t("erp_256") : `編輯 - ${formData.name}`}
            </h3>
            <span className="text-[10px] bg-primary/10 text-primary font-bold px-2 py-0.5 rounded-full">
              {isCreate ? t("erp_94") : t("erp_257")}
            </span>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-muted rounded-full transition-all text-muted-foreground hover:text-gray-800"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-gray-700 flex items-center gap-1.5">
              <Building className="w-3.5 h-3.5 text-primary" />
              {t("erp_258")}
              <span className="text-destructive">*</span>
            </label>
            <input
              type="text"
              className="w-full px-3 py-2 bg-muted border border-border rounded-xl outline-none focus:ring-2 focus:ring-primary/20 transition-all font-bold text-sm text-gray-800 placeholder:text-gray-400 placeholder:font-normal"
              value={formData.name}
              onChange={(e) =>
                setFormData({
                  ...formData,
                  name: e.target.value,
                })
              }
              required
              placeholder={t("erp_259")}
            />
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-bold text-gray-700 flex items-center gap-1.5">
              <User className="w-3.5 h-3.5 text-primary" />
              {t("erp_260")}
            </label>
            <input
              type="text"
              className="w-full px-3 py-2 bg-muted border border-border rounded-xl outline-none focus:ring-2 focus:ring-primary/20 transition-all font-bold text-sm text-gray-800 placeholder:text-gray-400 placeholder:font-normal"
              value={formData.contactPerson}
              onChange={(e) =>
                setFormData({
                  ...formData,
                  contactPerson: e.target.value,
                })
              }
              placeholder={t("erp_261")}
            />
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-bold text-gray-700 flex items-center gap-1.5">
              <Phone className="w-3.5 h-3.5 text-primary" />
              {t("erp_262")}
            </label>
            <input
              type="text"
              className="w-full px-3 py-2 bg-muted border border-border rounded-xl outline-none focus:ring-2 focus:ring-primary/20 transition-all font-mono font-bold text-sm text-gray-800 placeholder:text-gray-400 placeholder:font-normal"
              value={formData.phone}
              onChange={(e) =>
                setFormData({
                  ...formData,
                  phone: e.target.value,
                })
              }
              placeholder={t("erp_263")}
            />
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-bold text-gray-700 flex items-center gap-1.5">
              <MapPin className="w-3.5 h-3.5 text-primary" />
              {t("erp_264")}
            </label>
            <input
              type="text"
              className="w-full px-3 py-2 bg-muted border border-border rounded-xl outline-none focus:ring-2 focus:ring-primary/20 transition-all font-bold text-sm text-gray-800 placeholder:text-gray-400 placeholder:font-normal"
              value={formData.address}
              onChange={(e) =>
                setFormData({
                  ...formData,
                  address: e.target.value,
                })
              }
              placeholder={t("erp_265")}
            />
          </div>

          {/* Footer buttons */}
          <div className="flex gap-3 pt-4 border-t border-border mt-6">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 py-2.5 border border-border rounded-xl font-bold text-xs text-gray-600 hover:bg-muted transition-colors"
            >
              {t("erp_71")}
            </button>
            <button
              type="submit"
              disabled={loading}
              className="flex-1 py-2.5 bg-primary text-white rounded-xl font-bold text-xs shadow-lg shadow-primary/20 hover:opacity-90 disabled:opacity-50 transition-all flex items-center justify-center gap-1.5"
            >
              <Save className="w-3.5 h-3.5" />
              {loading ? t("erp_72") : isCreate ? t("erp_180") : t("erp_266")}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
