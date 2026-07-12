import { useState, useEffect } from "react";
import { api } from "../lib/api";
import { PackageOpen, Truck } from "lucide-react";
import { confirm } from "../lib/confirm";
import { toast } from "react-hot-toast";

export default function Requisitions() {
  const [requisitions, setRequisitions] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchRequisitions();
  }, []);

  const fetchRequisitions = async () => {
    try {
      const res = await api.get<{ data: any[] }>("/requisitions");
      setRequisitions(res.data.data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleShip = async (id: string) => {
    if (!await confirm("確定要出貨此叫貨單嗎？這將扣除總倉庫存。")) return;
    try {
      await api.post(`/requisitions/${id}/ship`, {});
      fetchRequisitions();
      toast.success("已成功出貨！");
    } catch (err: any) {
      toast.error("出貨失敗：" + (err.response?.data?.error || err.message));
    }
  };

  return (
    <div className="flex flex-col gap-8">
      <header className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">分店叫貨管理</h2>
          <p className="text-muted-foreground mt-1">管理各分店的叫貨單與出貨狀態</p>
        </div>
      </header>

      <div className="bg-white rounded-[2rem] border border-border shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="bg-muted/30 text-muted-foreground text-sm border-b border-border">
                <th className="p-5 font-semibold">叫貨單號</th>
                <th className="p-5 font-semibold">分店</th>
                <th className="p-5 font-semibold">日期</th>
                <th className="p-5 font-semibold">狀態</th>
                <th className="p-5 font-semibold text-center">品項數量</th>
                <th className="p-5 font-semibold text-right">操作</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/50">
              {loading ? (
                <tr>
                  <td colSpan={6} className="py-20 text-center">
                    <div className="w-10 h-10 border-4 border-primary/20 border-t-primary rounded-full animate-spin mx-auto mb-4" />
                    <span className="text-sm font-medium text-muted-foreground">載入中...</span>
                  </td>
                </tr>
              ) : requisitions.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-20 text-center text-muted-foreground bg-white/50">
                    <PackageOpen className="w-12 h-12 mx-auto mb-4 opacity-20" />
                    <p className="font-medium text-base">尚無叫貨單</p>
                  </td>
                </tr>
              ) : (
                requisitions.map((req) => (
                  <tr key={req.id} className="hover:bg-muted/10 transition-colors">
                    <td className="p-5 font-mono text-xs text-muted-foreground">{req.id.slice(-8).toUpperCase()}</td>
                    <td className="p-5 font-medium">{req.location?.name || "未知分店"}</td>
                    <td className="p-5 text-sm">{new Date(req.createdAt).toLocaleDateString()}</td>
                    <td className="p-5">
                      {req.status === "PENDING" && (
                        <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium bg-amber-100 text-amber-800 border border-amber-200">待處理</span>
                      )}
                      {req.status === "SHIPPED" && (
                        <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800 border border-blue-200">已出貨</span>
                      )}
                      {req.status === "RECEIVED" && (
                        <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium bg-emerald-100 text-emerald-800 border border-emerald-200">已收貨</span>
                      )}
                    </td>
                    <td className="p-5 text-center text-sm font-medium">{req.items?.length || 0}</td>
                    <td className="p-5 text-right">
                      {req.status === "PENDING" ? (
                        <button
                          onClick={() => handleShip(req.id)}
                          className="inline-flex items-center gap-1.5 px-4 py-2 bg-primary text-white rounded-xl text-xs font-bold hover:bg-primary/90 transition-colors shadow-sm"
                        >
                          <Truck size={14} /> 出貨
                        </button>
                      ) : (
                        <span className="text-muted-foreground text-xs">—</span>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
