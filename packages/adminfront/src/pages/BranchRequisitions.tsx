import { useState, useEffect } from "react";
import { api } from "../lib/api";
import { Truck, Plus, PackageCheck, Save, Trash, X } from "lucide-react";
import toast from "react-hot-toast";

export default function BranchRequisitions() {
  const [requisitions, setRequisitions] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [inventory, setInventory] = useState<any[]>([]);
  const locationId = "cm5nv3t9v000108mh35f4c5vw"; // For demo purposes

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [availableIngredients, setAvailableIngredients] = useState<any[]>([]);
  const [formItems, setFormItems] = useState<{ ingredientId: string; quantity: string }[]>([
    { ingredientId: "", quantity: "1" }
  ]);
  const [expectedDate, setExpectedDate] = useState("");
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const locRes = await api.get<{ data: any[] }>("/locations");
      const locId = locRes.data?.[0]?.id;
      
      if (!locId) {
        setLoading(false);
        return;
      }

      const [reqRes, invRes] = await Promise.all([
        api.get<any[]>(`/requisitions?locationId=${locId}`),
        api.get<any[]>(`/requisitions/inventory?locationId=${locId}`)
      ]);
      setRequisitions(reqRes);
      setInventory(invRes);
    } catch (err) {
      console.error(err);
      toast.error("載入失敗");
    } finally {
      setLoading(false);
    }
  };

  const handleReceive = async (id: string) => {
    if (!confirm("確定要收貨嗎？這將會更新門市庫存！")) return;
    try {
      await api.post(`/requisitions/${id}/receive`, {});
      toast.success("收貨成功，庫存已更新");
      fetchData();
    } catch (err: any) {
      toast.error(err.response?.data?.error || "收貨失敗");
    }
  };

  const openModal = async () => {
    try {
      const res = await api.get<any[]>("/requisitions/ingredients");
      setAvailableIngredients(res);
      setFormItems([{ ingredientId: "", quantity: "1" }]);
      setExpectedDate("");
      setIsModalOpen(true);
    } catch (err) {
      console.error(err);
      toast.error("無法載入食材清單");
    }
  };

  const handleAddItem = () => {
    setFormItems([...formItems, { ingredientId: "", quantity: "1" }]);
  };

  const handleRemoveItem = (index: number) => {
    setFormItems(formItems.filter((_, i) => i !== index));
  };

  const handleItemChange = (index: number, field: "ingredientId" | "quantity", value: string) => {
    const newItems = [...formItems];
    newItems[index][field] = value;
    setFormItems(newItems);
  };

  const handleSubmit = async () => {
    try {
      const locRes = await api.get<{ data: any[] }>("/locations");
      const locId = locRes.data?.[0]?.id || locationId;

      const validItems = formItems.filter(i => i.ingredientId && Number(i.quantity) > 0);
      if (validItems.length === 0) {
        return toast.error("請至少新增一項有效品項");
      }

      setSubmitting(true);
      await api.post("/requisitions", {
        locationId: locId,
        expectedDate: expectedDate ? new Date(expectedDate).toISOString() : undefined,
        items: validItems
      });

      toast.success("叫貨單已送出");
      setIsModalOpen(false);
      fetchData();
    } catch (err: any) {
      console.error(err);
      toast.error(err.response?.data?.error || "送出失敗");
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) return <div>載入中...</div>;

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-black text-gray-800">門市叫貨管理</h1>
          <p className="text-gray-500 mt-2">向中央廚房發起叫貨單，並追蹤出貨進度</p>
        </div>
        <button
          onClick={openModal}
          className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-2.5 rounded-xl font-bold flex items-center gap-2"
        >
          <Plus size={20} /> 新增叫貨單
        </button>
      </div>

      <div className="bg-white rounded-3xl shadow-sm border border-gray-100 p-6">
        <h2 className="text-xl font-bold mb-4">歷史叫貨紀錄</h2>
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="bg-gray-50 text-gray-500 text-sm">
                <th className="p-4 font-bold rounded-l-xl">單號</th>
                <th className="p-4 font-bold">日期</th>
                <th className="p-4 font-bold">狀態</th>
                <th className="p-4 font-bold rounded-r-xl">操作</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {requisitions.map((req) => (
                <tr key={req.id}>
                  <td className="p-4 font-mono text-sm">{req.id.slice(-8)}</td>
                  <td className="p-4">{new Date(req.createdAt).toLocaleDateString()}</td>
                  <td className="p-4">
                    {req.status === "PENDING" && <span className="text-yellow-600 bg-yellow-50 px-2 py-1 rounded-md text-xs font-bold">待總部審核</span>}
                    {req.status === "SHIPPED" && <span className="text-blue-600 bg-blue-50 px-2 py-1 rounded-md text-xs font-bold">總部已出貨</span>}
                    {req.status === "RECEIVED" && <span className="text-green-600 bg-green-50 px-2 py-1 rounded-md text-xs font-bold">已收貨入庫</span>}
                  </td>
                  <td className="p-4">
                    {req.status === "SHIPPED" && (
                      <button
                        onClick={() => handleReceive(req.id)}
                        className="text-white bg-green-600 hover:bg-green-700 px-4 py-2 rounded-xl text-sm font-bold shadow-sm"
                      >
                        確認收貨
                      </button>
                    )}
                  </td>
                </tr>
              ))}
              {requisitions.length === 0 && (
                <tr>
                  <td colSpan={4} className="p-8 text-center text-gray-400">
                    <Truck size={48} className="mx-auto mb-4 opacity-20" />
                    目前沒有叫貨紀錄
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      <div className="bg-white rounded-3xl shadow-sm border border-gray-100 p-6 mt-6">
        <h2 className="text-xl font-bold mb-4">門市現有庫存</h2>
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
          {inventory.map((inv) => (
            <div key={inv.id} className="p-4 border border-gray-100 rounded-2xl bg-gray-50 flex flex-col items-center text-center">
              <PackageCheck className="text-gray-400 mb-2" size={32} />
              <span className="font-bold text-gray-800">{inv.ingredient.name}</span>
              <span className="text-lg font-black text-blue-600 mt-1">
                {inv.currentStock} {inv.ingredient.unit}
              </span>
            </div>
          ))}
          {inventory.length === 0 && (
            <div className="col-span-full p-8 text-center text-gray-400">
              分店庫存目前為空，請發起叫貨以補足庫存。
            </div>
          )}
        </div>
      </div>

      {/* 新增叫貨單 Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-3xl p-6 w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-2xl font-black text-gray-800">新增叫貨單</h2>
              <button onClick={() => setIsModalOpen(false)} className="text-gray-400 hover:text-gray-600">
                <X size={24} />
              </button>
            </div>

            <div className="space-y-4 mb-6">
              <div>
                <label className="block text-sm font-bold text-gray-700 mb-1">期望到貨日期</label>
                <input
                  type="date"
                  className="w-full border border-gray-300 rounded-xl px-4 py-2 focus:ring-2 focus:ring-blue-500 outline-none"
                  value={expectedDate}
                  onChange={(e) => setExpectedDate(e.target.value)}
                />
              </div>

              <div>
                <label className="block text-sm font-bold text-gray-700 mb-2">叫貨品項</label>
                <div className="space-y-3">
                  {formItems.map((item, index) => (
                    <div key={index} className="flex gap-3 items-center">
                      <select
                        className="flex-1 border border-gray-300 rounded-xl px-4 py-2 focus:ring-2 focus:ring-blue-500 outline-none"
                        value={item.ingredientId}
                        onChange={(e) => handleItemChange(index, "ingredientId", e.target.value)}
                      >
                        <option value="">選擇品項...</option>
                        {availableIngredients.map((ing) => (
                          <option key={ing.id} value={ing.id}>
                            {ing.name} ({ing.unit})
                          </option>
                        ))}
                      </select>
                      <input
                        type="number"
                        min="1"
                        placeholder="數量"
                        className="w-24 border border-gray-300 rounded-xl px-4 py-2 focus:ring-2 focus:ring-blue-500 outline-none"
                        value={item.quantity}
                        onChange={(e) => handleItemChange(index, "quantity", e.target.value)}
                      />
                      {formItems.length > 1 && (
                        <button
                          onClick={() => handleRemoveItem(index)}
                          className="p-2 text-red-500 hover:bg-red-50 rounded-xl"
                        >
                          <Trash size={20} />
                        </button>
                      )}
                    </div>
                  ))}
                </div>
                <button
                  onClick={handleAddItem}
                  className="mt-3 text-blue-600 font-bold text-sm flex items-center gap-1 hover:text-blue-700"
                >
                  <Plus size={16} /> 新增品項
                </button>
              </div>
            </div>

            <div className="flex justify-end gap-3 pt-4 border-t border-gray-100">
              <button
                onClick={() => setIsModalOpen(false)}
                className="px-6 py-2.5 rounded-xl font-bold text-gray-500 hover:bg-gray-100"
              >
                取消
              </button>
              <button
                onClick={handleSubmit}
                disabled={submitting}
                className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-2.5 rounded-xl font-bold flex items-center gap-2 disabled:opacity-50"
              >
                <Save size={20} />
                {submitting ? "送出中..." : "送出叫貨單"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

