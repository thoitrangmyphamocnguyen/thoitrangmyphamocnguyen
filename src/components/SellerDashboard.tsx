import React, { useState, useEffect } from "react";
import { 
  TrendingUp, ShoppingBag, Package, Bell, RefreshCw, AlertTriangle, Check, 
  X, CheckCircle, Truck, RefreshCw as LoopIcon, PieChart, Users, DollarSign,
  Lock, User, Eye, EyeOff, LogOut, ShieldAlert, ShieldCheck, Plus, Trash2, Tag, Percent
} from "lucide-react";
import { motion } from "motion/react";
import { AnalyticsData, Order, NotificationLog, Language, Currency, Product } from "../types";

interface SellerDashboardProps {
  lang: Language;
  currency: Currency;
  exchangeRate: number;
  formatPrice: (amount: number) => string;
  onRefreshProducts: () => void;
  products: Product[];
}

export default function SellerDashboard({ 
  lang, currency, exchangeRate, formatPrice, onRefreshProducts, products 
}: SellerDashboardProps) {
  // Highly Secure Admin Auth state
  const [token, setToken] = useState<string | null>(() => sessionStorage.getItem("oc_admin_token"));
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loginError, setLoginError] = useState("");
  const [failedAttempts, setFailedAttempts] = useState(0);
  const [lockoutSecs, setLockoutSecs] = useState(0);
  const [loginLoading, setLoginLoading] = useState(false);

  const [analytics, setAnalytics] = useState<AnalyticsData | null>(null);
  const [orders, setOrders] = useState<Order[]>([]);
  const [notifications, setNotifications] = useState<NotificationLog[]>([]);
  const [activeTab, setActiveTab] = useState<"analytics" | "orders" | "inventory" | "notifications" | "promos">("analytics");
  const [loading, setLoading] = useState(true);
  const [updatingId, setUpdatingId] = useState<string | null>(null);

  // Promo Code States
  const [promos, setPromos] = useState<any[]>([]);
  const [showPromoModal, setShowPromoModal] = useState(false);
  const [promoError, setPromoError] = useState("");
  const [promoCodeForm, setPromoCodeForm] = useState({
    code: "",
    descriptionVI: "",
    descriptionEN: "",
    discountType: "percentage" as "percentage" | "fixed",
    discountValue: 0,
    minOrderValueVND: 0,
    validUntil: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split("T")[0],
    isActive: true
  });

  // States for inventory manual updating
  const [editingStockId, setEditingStockId] = useState<string | null>(null);
  const [newStockValue, setNewStockValue] = useState<number>(0);

  // CRUD & Promotion States
  const [showProductModal, setShowProductModal] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null); // null means adding new

  const [formNameVI, setFormNameVI] = useState("");
  const [formNameEN, setFormNameEN] = useState("");
  const [formCategory, setFormCategory] = useState<"fashion" | "cosmetics">("fashion");
  const [formPriceVND, setFormPriceVND] = useState(0);
  const [formOriginalPriceVND, setFormOriginalPriceVND] = useState<number | "">("");
  const [formImageUrl, setFormImageUrl] = useState("");
  const [formDescriptionVI, setFormDescriptionVI] = useState("");
  const [formDescriptionEN, setFormDescriptionEN] = useState("");
  const [formSizes, setFormSizes] = useState(""); // comma-separated
  const [formColorsVI, setFormColorsVI] = useState(""); // comma-separated
  const [formColorsEN, setFormColorsEN] = useState(""); // comma-separated
  const [formStock, setFormStock] = useState(10);
  const [formStyle, setFormStyle] = useState("minimalist");

  const handleOpenAdd = () => {
    setEditingProduct(null);
    setFormNameVI("");
    setFormNameEN("");
    setFormCategory("fashion");
    setFormPriceVND(0);
    setFormOriginalPriceVND("");
    setFormImageUrl("");
    setFormDescriptionVI("");
    setFormDescriptionEN("");
    setFormSizes("S, M, L, XL");
    setFormColorsVI("Đen, Trắng, Nâu");
    setFormColorsEN("Black, White, Brown");
    setFormStock(20);
    setFormStyle("minimalist");
    setShowProductModal(true);
  };

  const handleOpenEdit = (p: Product) => {
    setEditingProduct(p);
    setFormNameVI(p.nameVI);
    setFormNameEN(p.nameEN);
    setFormCategory(p.category);
    setFormPriceVND(p.priceVND);
    setFormOriginalPriceVND(p.originalPriceVND || "");
    setFormImageUrl(p.imageUrl);
    setFormDescriptionVI(p.descriptionVI || "");
    setFormDescriptionEN(p.descriptionEN || "");
    setFormSizes(p.sizes ? p.sizes.join(", ") : "");
    setFormColorsVI(p.colorsVI ? p.colorsVI.join(", ") : "");
    setFormColorsEN(p.colorsEN ? p.colorsEN.join(", ") : "");
    setFormStock(p.stock);
    setFormStyle(p.style || "minimalist");
    setShowProductModal(true);
  };

  const handleSubmitProduct = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formNameVI || !formNameEN || !formImageUrl || formPriceVND <= 0) {
      alert(lang === "vi" ? "Vui lòng nhập đầy đủ các thông tin bắt buộc!" : "Please fill in all required fields!");
      return;
    }

    const payload = {
      nameVI: formNameVI,
      nameEN: formNameEN,
      category: formCategory,
      priceVND: Number(formPriceVND),
      originalPriceVND: formOriginalPriceVND ? Number(formOriginalPriceVND) : undefined,
      imageUrl: formImageUrl,
      descriptionVI: formDescriptionVI,
      descriptionEN: formDescriptionEN,
      sizes: formSizes.split(",").map(s => s.trim()).filter(Boolean),
      colorsVI: formColorsVI.split(",").map(c => c.trim()).filter(Boolean),
      colorsEN: formColorsEN.split(",").map(c => c.trim()).filter(Boolean),
      stock: Number(formStock),
      style: formStyle
    };

    const url = editingProduct ? `/api/products/${editingProduct.id}` : "/api/products";
    const method = editingProduct ? "PUT" : "POST";

    try {
      const res = await fetch(url, {
        method,
        headers: {
          "Content-Type": "application/json",
          "X-Admin-Token": token || ""
        },
        body: JSON.stringify(payload)
      });

      if (res.status === 401) {
        handleLogout();
        return;
      }

      if (res.ok) {
        setShowProductModal(false);
        onRefreshProducts();
        await fetchData();
        alert(lang === "vi" ? "Lưu sản phẩm thành công!" : "Product saved successfully!");
      } else {
        const err = await res.json();
        alert(lang === "vi" ? `Lỗi: ${err.error}` : `Error: ${err.error}`);
      }
    } catch (err) {
      console.error("Failed to save product:", err);
      alert(lang === "vi" ? "Lỗi kết nối máy chủ!" : "Server connection error!");
    }
  };

  const handleDeleteProduct = async (id: string, name: string) => {
    const confirmMsg = lang === "vi"
      ? `Bạn có chắc chắn muốn xoá sản phẩm "${name}" không? Thao tác này không thể hoàn tác!`
      : `Are you sure you want to delete product "${name}"? This action cannot be undone!`;

    if (window.confirm(confirmMsg)) {
      try {
        const res = await fetch(`/api/products/${id}`, {
          method: "DELETE",
          headers: {
            "X-Admin-Token": token || ""
          }
        });

        if (res.status === 401) {
          handleLogout();
          return;
        }

        if (res.ok) {
          onRefreshProducts();
          await fetchData();
          alert(lang === "vi" ? "Xoá sản phẩm thành công!" : "Product deleted successfully!");
        } else {
          const err = await res.json();
          alert(lang === "vi" ? `Lỗi: ${err.error}` : `Error: ${err.error}`);
        }
      } catch (err) {
        console.error("Failed to delete product:", err);
        alert(lang === "vi" ? "Lỗi kết nối máy chủ!" : "Server connection error!");
      }
    }
  };

  // Brute force lockout timer
  useEffect(() => {
    if (lockoutSecs > 0) {
      const timer = setTimeout(() => {
        setLockoutSecs(prev => prev - 1);
      }, 1000);
      return () => clearTimeout(timer);
    }
  }, [lockoutSecs]);

  const fetchData = async () => {
    if (!token) return;
    setLoading(true);
    try {
      const [resAnal, resOrd, resNotif, resPromos] = await Promise.all([
        fetch("/api/analytics", { headers: { "X-Admin-Token": token } }),
        fetch("/api/orders", { headers: { "X-Admin-Token": token } }),
        fetch("/api/notifications", { headers: { "X-Admin-Token": token } }),
        fetch("/api/promos")
      ]);
      
      if (resAnal.status === 401 || resOrd.status === 401 || resNotif.status === 401) {
        handleLogout();
        return;
      }

      const analData = await resAnal.json();
      const ordData = await resOrd.json();
      const notifData = await resNotif.json();
      const promosData = await resPromos.json();

      setAnalytics(analData);
      setOrders(ordData);
      setNotifications(notifData);
      setPromos(Array.isArray(promosData) ? promosData : []);
    } catch (err) {
      console.error("Error loading seller portal data:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (token) {
      fetchData();
    }
  }, [token]);

  const handleSavePromoCode = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!promoCodeForm.code.trim()) {
      setPromoError(lang === "vi" ? "Vui lòng nhập mã." : "Please enter a code.");
      return;
    }
    setPromoError("");
    try {
      const response = await fetch("/api/promos", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-Admin-Token": token || ""
        },
        body: JSON.stringify({
          ...promoCodeForm,
          code: promoCodeForm.code.toUpperCase().trim()
        })
      });

      const data = await response.json();
      if (response.ok && data.success) {
        setShowPromoModal(false);
        setPromoCodeForm({
          code: "",
          descriptionVI: "",
          descriptionEN: "",
          discountType: "percentage",
          discountValue: 0,
          minOrderValueVND: 0,
          validUntil: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split("T")[0],
          isActive: true
        });
        fetchData();
      } else {
        setPromoError(data.error || "Failed to save promo code.");
      }
    } catch (err) {
      console.error("Error saving promo code:", err);
      setPromoError("Server connection error.");
    }
  };

  const handleDeletePromoCode = async (code: string) => {
    if (!window.confirm(lang === "vi" ? `Bạn có chắc muốn xóa mã ${code}?` : `Are you sure you want to delete ${code}?`)) {
      return;
    }
    try {
      const response = await fetch(`/api/promos/${code}`, {
        method: "DELETE",
        headers: { "X-Admin-Token": token || "" }
      });
      const data = await response.json();
      if (response.ok && data.success) {
        fetchData();
      } else {
        alert(data.error || "Failed to delete promo code.");
      }
    } catch (err) {
      console.error("Error deleting promo code:", err);
    }
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (lockoutSecs > 0) return;
    setLoginError("");
    setLoginLoading(true);

    try {
      const res = await fetch("/api/admin/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username, password })
      });

      if (res.ok) {
        const data = await res.json();
        setToken(data.token);
        sessionStorage.setItem("oc_admin_token", data.token);
        setFailedAttempts(0);
        setLoginError("");
      } else {
        const data = await res.json();
        const nextFailed = failedAttempts + 1;
        setFailedAttempts(nextFailed);
        
        if (nextFailed >= 5) {
          setLockoutSecs(30);
          setLoginError(lang === "vi"
            ? "Đăng nhập thất bại 5 lần! Hệ thống tạm khóa 30 giây bảo mật."
            : "Too many failed attempts! locked for 30 seconds for safety."
          );
        } else {
          setLoginError(lang === "vi" 
            ? `Sai tài khoản hoặc mật khẩu! (Lần thứ ${nextFailed}/5)`
            : `Invalid credentials! (Attempt ${nextFailed}/5)`
          );
        }
      }
    } catch (err) {
      setLoginError(lang === "vi" ? "Lỗi kết nối máy chủ!" : "Server connection failure.");
    } finally {
      setLoginLoading(false);
    }
  };

  const handleLogout = () => {
    setToken(null);
    sessionStorage.removeItem("oc_admin_token");
    setAnalytics(null);
    setOrders([]);
    setNotifications([]);
  };

  const handleUpdateStatus = async (orderId: string, status: string, paymentStatus?: string) => {
    setUpdatingId(orderId);
    try {
      const payload: any = { status };
      if (paymentStatus) {
        payload.paymentStatus = paymentStatus;
      }

      const res = await fetch(`/api/orders/${orderId}/status`, {
        method: "PUT",
        headers: { 
          "Content-Type": "application/json",
          "X-Admin-Token": token || ""
        },
        body: JSON.stringify(payload)
      });

      if (res.status === 401) {
        handleLogout();
        return;
      }

      if (res.ok) {
        await fetchData(); 
        onRefreshProducts(); 
      }
    } catch (err) {
      console.error("Failed to update status:", err);
    } finally {
      setUpdatingId(null);
    }
  };

  const handleUpdateStock = async (productId: string, currentStock: number) => {
    try {
      const res = await fetch(`/api/products/${productId}/stock`, {
        method: "PUT",
        headers: { 
          "Content-Type": "application/json",
          "X-Admin-Token": token || ""
        },
        body: JSON.stringify({ stock: newStockValue })
      });

      if (res.status === 401) {
        handleLogout();
        return;
      }

      if (res.ok) {
        setEditingStockId(null);
        await fetchData();
        onRefreshProducts();
      }
    } catch (err) {
      console.error("Failed to update stock:", err);
    }
  };

  const statusBadges = {
    pending: { bg: "bg-amber-100 text-amber-800 border-amber-300", text: lang === "vi" ? "Chờ duyệt" : "Pending" },
    processing: { bg: "bg-yellow-100 text-yellow-800 border-yellow-300", text: lang === "vi" ? "Đóng gói" : "Processing" },
    shipped: { bg: "bg-orange-100 text-orange-800 border-orange-300", text: lang === "vi" ? "Đang giao" : "Shipped" },
    completed: { bg: "bg-emerald-100 text-emerald-800 border-emerald-300", text: lang === "vi" ? "Hoàn thành" : "Completed" },
    cancelled: { bg: "bg-rose-100 text-rose-800 border-rose-300", text: lang === "vi" ? "Đã Hủy" : "Cancelled" }
  };

  const payBadges = {
    pending: { bg: "bg-yellow-50 text-amber-700 border border-amber-200/50", text: lang === "vi" ? "Chưa thanh toán" : "Unpaid" },
    paid: { bg: "bg-emerald-50 text-emerald-800 border border-emerald-200/50", text: lang === "vi" ? "Đã trả tiền" : "Paid" }
  };

  // Secure Admin Gate Render
  if (!token) {
    return (
      <div id="admin-login-wrapper" className="max-w-md mx-auto my-12 p-1">
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-amber-50/70 backdrop-blur-md border border-amber-200/80 rounded-3xl p-8 shadow-xl text-zinc-900"
        >
          <div className="text-center space-y-3 mb-8">
            <div className="inline-flex p-3 bg-amber-400 text-amber-950 rounded-2xl shadow-md">
              <Lock className="w-6 h-6" />
            </div>
            <h2 className="text-xl font-serif font-semibold tracking-tight uppercase text-amber-950">
              {lang === "vi" ? "Đăng Nhập Quản Trị Viên" : "Administrator Portal"}
            </h2>
            <p className="text-xs text-amber-800 max-w-sm mx-auto">
              {lang === "vi"
                ? "Bảo mật cấp độ cao của Ốc Nguyễn. Vui lòng nhập thông tin xác thực để chỉnh sửa, quản lý hệ thống."
                : "Secure Oc Nguyen administrator credentials required to manage fashion catalog & automated warehouse orders."}
            </p>
          </div>

          <form onSubmit={handleLogin} className="space-y-5">
            {/* Username */}
            <div className="space-y-1.5">
              <label className="text-[10px] uppercase tracking-wider text-amber-900 font-bold block">
                {lang === "vi" ? "Tài khoản quản trị" : "Admin Username"}
              </label>
              <div className="relative">
                <input
                  type="text"
                  required
                  placeholder="admin"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  className="w-full bg-white border border-amber-200/60 rounded-xl pl-10 pr-4 py-2.5 text-xs text-zinc-900 focus:outline-none focus:ring-1 focus:ring-amber-500 shadow-sm"
                />
                <User className="w-4 h-4 text-amber-700 absolute left-3 top-3" />
              </div>
            </div>

            {/* Password */}
            <div className="space-y-1.5">
              <label className="text-[10px] uppercase tracking-wider text-amber-900 font-bold block">
                {lang === "vi" ? "Mật khẩu bảo mật" : "Admin Password"}
              </label>
              <div className="relative">
                <input
                  type={showPassword ? "text" : "password"}
                  required
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full bg-white border border-amber-200/60 rounded-xl pl-10 pr-10 py-2.5 text-xs text-zinc-900 focus:outline-none focus:ring-1 focus:ring-amber-500 shadow-sm"
                />
                <Lock className="w-4 h-4 text-amber-700 absolute left-3 top-3" />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-3 text-amber-700 hover:text-amber-900 focus:outline-none cursor-pointer"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            {/* Failed Attempts Alert or Lockout Message */}
            {loginError && (
              <div className="bg-rose-50 border border-rose-200 text-rose-800 rounded-xl p-3 text-xs flex gap-2 items-start shadow-sm">
                <ShieldAlert className="w-4 h-4 shrink-0 text-rose-600 mt-0.5" />
                <span>{loginError}</span>
              </div>
            )}

            {/* Lockout countdown overlay notice */}
            {lockoutSecs > 0 && (
              <div className="bg-amber-100/80 border border-amber-300 text-amber-900 rounded-xl p-3.5 text-xs font-semibold text-center animate-pulse">
                ⏳ {lang === "vi" 
                  ? `Bảo mật khóa tạm thời: thử lại sau ${lockoutSecs} giây` 
                  : `Secure cooldown active: retry in ${lockoutSecs} seconds`}
              </div>
            )}

            {/* Login button */}
            <button
              type="submit"
              disabled={loginLoading || lockoutSecs > 0}
              className={`w-full bg-amber-500 hover:bg-amber-600 text-amber-950 font-bold uppercase tracking-wider py-3 rounded-xl text-xs transition-all shadow-md flex justify-center items-center gap-2 cursor-pointer ${
                (loginLoading || lockoutSecs > 0) ? "opacity-50 cursor-not-allowed" : ""
              }`}
            >
              {loginLoading ? (
                <div className="w-4 h-4 border-2 border-amber-950 border-t-transparent rounded-full animate-spin" />
              ) : (
                <ShieldCheck className="w-4 h-4" />
              )}
              {lang === "vi" ? "Xác thực & Vào hệ thống" : "Authenticate & Access"}
            </button>
          </form>
        </motion.div>
      </div>
    );
  }

  return (
    <div id="seller-dashboard-container" className="bg-yellow-50/40 border border-amber-200/70 rounded-3xl p-4 md:p-8 max-w-7xl mx-auto font-sans shadow-inner">
      {/* Dashboard Top Navigation & Status */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-8 pb-6 border-b border-amber-200/80">
        <div>
          <div className="flex items-center gap-2 text-[10px] uppercase tracking-widest font-mono text-amber-800 font-bold">
            <span className="w-2.5 h-2.5 rounded-full bg-amber-500 animate-pulse" />
            {lang === "vi" ? "Hệ thống Quản Trị Độc Quyền Bảo Mật Cao" : "Highly Secure Exclusive Portal"}
          </div>
          <h2 className="text-2xl md:text-3xl font-serif text-amber-950 mt-1 font-semibold">
            {lang === "vi" ? "Ốc Nguyễn Admin" : "Oc Nguyen Management Office"}
          </h2>
        </div>

        <div className="flex flex-wrap gap-2">
          {/* Refresh Button */}
          <button 
            id="refresh-dashboard-btn"
            onClick={fetchData} 
            className="flex items-center gap-2 bg-white border border-amber-200/70 hover:bg-amber-50 text-amber-900 px-4 py-2 rounded-xl text-xs font-semibold cursor-pointer transition-colors shadow-sm"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? "animate-spin" : ""}`} />
            {lang === "vi" ? "Làm mới" : "Refresh"}
          </button>

          {/* Secure Logout Button */}
          <button 
            id="logout-dashboard-btn"
            onClick={handleLogout} 
            className="flex items-center gap-2 bg-amber-500 hover:bg-amber-600 text-amber-950 px-4 py-2 rounded-xl text-xs font-bold cursor-pointer transition-all shadow-md"
            title={lang === "vi" ? "Đăng xuất tài khoản an toàn" : "Secure logout session"}
          >
            <LogOut className="w-3.5 h-3.5" />
            {lang === "vi" ? "Đăng xuất" : "Logout"}
          </button>
        </div>
      </div>

      {/* Navigation Sub-Tabs */}
      <div className="flex border-b border-amber-200/60 mb-6 overflow-x-auto gap-1">
        {[
          { id: "analytics", labelVI: "Báo Cáo Analytics", labelEN: "Real-time Analytics", icon: TrendingUp },
          { id: "orders", labelVI: "Đơn Hàng Tự Động", labelEN: "Automated Orders", icon: ShoppingBag },
          { id: "inventory", labelVI: "Kho Hàng Thông Minh", labelEN: "Smart Inventory", icon: Package },
          { id: "promos", labelVI: "Mã Khuyến Mãi", labelEN: "Promo Codes", icon: Percent },
          { id: "notifications", labelVI: "Nhật Ký Thông Báo", labelEN: "Notification Logs", icon: Bell }
        ].map(tab => {
          const IconComp = tab.icon;
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              id={`tab-btn-${tab.id}`}
              onClick={() => setActiveTab(tab.id as any)}
              className={`flex items-center gap-2 px-4 py-3 border-b-2 text-xs font-semibold tracking-wide uppercase cursor-pointer whitespace-nowrap transition-all ${
                isActive 
                  ? "border-amber-600 text-amber-900 font-bold bg-amber-100/40 rounded-t-xl" 
                  : "border-transparent text-amber-800/70 hover:text-amber-950 hover:border-amber-300"
              }`}
            >
              <IconComp className="w-4 h-4 text-amber-600" />
              {lang === "vi" ? tab.labelVI : tab.labelEN}
            </button>
          );
        })}
      </div>

      {loading && !analytics ? (
        <div className="py-20 text-center text-amber-800 text-sm">
          <div className="animate-spin inline-block w-8 h-8 border-4 border-amber-500 border-t-transparent rounded-full mb-4"></div>
          <p>{lang === "vi" ? "Đang xác thực và tải dữ liệu..." : "Verifying & fetching logs..."}</p>
        </div>
      ) : (
        <>
          {/* Tab 1: REAL-TIME ANALYTICS */}
          {activeTab === "analytics" && analytics && (
            <div className="space-y-6">
              {/* Core Statistics Cards */}
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                <div className="bg-white p-5 rounded-2xl border border-amber-100 shadow-sm">
                  <span className="text-amber-800/80 text-[10px] uppercase font-mono tracking-wider block font-bold">
                    {lang === "vi" ? "Tổng Doanh Thu" : "Total Revenue"}
                  </span>
                  <div className="text-base md:text-2xl font-semibold text-amber-950 mt-1 flex items-center gap-1 font-mono">
                    <DollarSign className="w-5 h-5 text-emerald-600 hidden md:inline" />
                    {formatPrice(analytics.revenueVND)}
                  </div>
                  <span className="text-[10px] text-emerald-600 font-bold block mt-2">
                    ↑ 15.4% {lang === "vi" ? "so với tuần trước" : "vs last week"}
                  </span>
                </div>

                <div className="bg-white p-5 rounded-2xl border border-amber-100 shadow-sm">
                  <span className="text-amber-800/80 text-[10px] uppercase font-mono tracking-wider block font-bold">
                    {lang === "vi" ? "Tổng Đơn Hàng" : "Total Orders"}
                  </span>
                  <div className="text-lg md:text-2xl font-semibold text-amber-950 mt-1 font-mono">
                    {analytics.totalOrders}
                  </div>
                  <span className="text-[10px] text-amber-600 font-bold block mt-2">
                    {analytics.processingCount} {lang === "vi" ? "đơn chờ xử lý" : "pending delivery"}
                  </span>
                </div>

                <div className="bg-white p-5 rounded-2xl border border-amber-100 shadow-sm">
                  <span className="text-amber-800/80 text-[10px] uppercase font-mono tracking-wider block font-bold">
                    {lang === "vi" ? "Đơn Hoàn Thành" : "Completed Orders"}
                  </span>
                  <div className="text-lg md:text-2xl font-semibold text-emerald-700 mt-1 font-mono">
                    {analytics.completedCount}
                  </div>
                  <span className="text-[10px] text-zinc-500 block mt-2 font-medium">
                    {lang === "vi" ? "Đã giao nhận an toàn" : "Safely shipped & received"}
                  </span>
                </div>

                <div className="bg-white p-5 rounded-2xl border border-amber-100 shadow-sm">
                  <span className="text-amber-800/80 text-[10px] uppercase font-mono tracking-wider block font-bold">
                    {lang === "vi" ? "Cảnh Báo Cháy Hàng" : "Low Stock Alerts"}
                  </span>
                  <div className={`text-lg md:text-2xl font-semibold mt-1 font-mono ${analytics.lowStockCount > 0 ? "text-rose-600" : "text-emerald-700"}`}>
                    {analytics.lowStockCount}
                  </div>
                  <span className="text-[10px] text-rose-500 font-bold block mt-2">
                    {analytics.lowStockCount > 0 
                      ? (lang === "vi" ? "⚠️ Cần nhập thêm hàng ngay" : "⚠️ Needs urgent restock") 
                      : (lang === "vi" ? "✓ Kho hàng dồi dào" : "✓ Safe stock levels")}
                  </span>
                </div>
              </div>

              {/* Graphical representation / charts */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Revenue breakdown chart - custom responsive SVG styling */}
                <div className="bg-white p-6 rounded-2xl border border-amber-100 shadow-sm">
                  <h3 className="text-xs font-bold uppercase tracking-wider text-amber-950 mb-4">
                    {lang === "vi" ? "Phân tích Doanh thu theo Ngành hàng" : "Revenue by Product Category"}
                  </h3>
                  <div className="flex flex-col sm:flex-row items-center justify-around gap-6 py-6">
                    {/* SVG Pie Chart simulation */}
                    <div className="relative w-40 h-40">
                      <svg className="w-full h-full transform -rotate-90" viewBox="0 0 42 42">
                        <circle cx="21" cy="21" r="15.915" fill="transparent" stroke="#fef3c7" strokeWidth="6"></circle>
                        {/* Custom visual slice calculation */}
                        <circle 
                          cx="21" 
                          cy="21" 
                          r="15.915" 
                          fill="transparent" 
                          stroke="#d97706" 
                          strokeWidth="6" 
                          strokeDasharray="65 35" 
                          strokeDashoffset="0"
                        ></circle>
                        <circle 
                          cx="21" 
                          cy="21" 
                          r="15.915" 
                          fill="transparent" 
                          stroke="#f59e0b" 
                          strokeWidth="6" 
                          strokeDasharray="35 65" 
                          strokeDashoffset="-65"
                        ></circle>
                      </svg>
                      <div className="absolute inset-0 flex flex-col items-center justify-center font-sans">
                        <span className="text-[9px] text-amber-800 font-bold uppercase">{lang === "vi" ? "Tỉ lệ" : "Ratio"}</span>
                        <span className="text-xs font-bold text-amber-950 font-mono">65% / 35%</span>
                      </div>
                    </div>

                    <div className="space-y-4 w-full max-w-[200px]">
                      <div className="flex items-center justify-between border-b pb-2">
                        <div className="flex items-center gap-2">
                          <span className="w-3.5 h-3.5 bg-amber-600 rounded-full" />
                          <span className="text-xs font-semibold text-amber-950">{lang === "vi" ? "Thời trang" : "Fashion"}</span>
                        </div>
                        <span className="text-xs font-mono font-bold text-amber-950">{formatPrice(analytics.categorySales.fashion)}</span>
                      </div>
                      <div className="flex items-center justify-between border-b pb-2">
                        <div className="flex items-center gap-2">
                          <span className="w-3.5 h-3.5 bg-amber-400 rounded-full" />
                          <span className="text-xs font-semibold text-amber-950">{lang === "vi" ? "Mỹ phẩm" : "Cosmetics"}</span>
                        </div>
                        <span className="text-xs font-mono font-bold text-amber-950">{formatPrice(analytics.categorySales.cosmetics)}</span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Top Selling Products */}
                <div className="bg-white p-6 rounded-2xl border border-amber-100 shadow-sm flex flex-col">
                  <h3 className="text-xs font-bold uppercase tracking-wider text-amber-950 mb-4">
                    {lang === "vi" ? "Danh sách Bán chạy nhất" : "Top Selling Products Catalog"}
                  </h3>
                  <div className="flex-1 space-y-4">
                    {analytics.topProducts.map((p, index) => (
                      <div key={p.id} className="flex items-center justify-between border-b border-amber-50 pb-2">
                        <div className="flex items-center gap-3">
                          <span className="w-6 h-6 rounded-full bg-amber-100 flex items-center justify-center font-bold text-xs text-amber-800 border border-amber-200">
                            {index + 1}
                          </span>
                          <div>
                            <p className="text-xs font-semibold text-amber-950 line-clamp-1">{lang === "vi" ? p.nameVI : p.nameEN}</p>
                            <span className="text-[9px] uppercase tracking-wider bg-amber-50 text-amber-800 px-1.5 py-0.5 rounded font-mono font-bold">
                              {p.category}
                            </span>
                          </div>
                        </div>

                        <div className="text-right">
                          <span className="text-xs font-bold text-amber-950 block font-mono">
                            {p.sold} {lang === "vi" ? "đã bán" : "sold"}
                          </span>
                          <span className={`text-[9px] font-semibold ${p.stock <= 5 ? "text-rose-500" : "text-amber-800/70"}`}>
                            {lang === "vi" ? `Kho: ${p.stock}` : `Stock: ${p.stock}`}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Tab 2: AUTOMATED ORDER MANAGER */}
          {activeTab === "orders" && (
            <div className="space-y-4">
              <div className="bg-white border border-amber-100 rounded-2xl overflow-hidden shadow-sm">
                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="bg-amber-50/50 text-amber-900 text-[10px] uppercase font-mono tracking-wider border-b border-amber-100">
                        <th className="px-6 py-4">{lang === "vi" ? "Mã đơn" : "Order ID"}</th>
                        <th className="px-6 py-4">{lang === "vi" ? "Khách hàng" : "Customer"}</th>
                        <th className="px-6 py-4">{lang === "vi" ? "Sản phẩm mua" : "Ordered Items"}</th>
                        <th className="px-6 py-4">{lang === "vi" ? "Tổng tiền" : "Total"}</th>
                        <th className="px-6 py-4">{lang === "vi" ? "Thanh toán" : "Payment Status"}</th>
                        <th className="px-6 py-4">{lang === "vi" ? "Vận hành" : "Order Status"}</th>
                        <th className="px-6 py-4 text-center">{lang === "vi" ? "Xử lý nhanh" : "Actions"}</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-amber-50 text-xs">
                      {orders.length === 0 ? (
                        <tr>
                          <td colSpan={7} className="text-center py-12 text-amber-800/70">
                            {lang === "vi" ? "Chưa có đơn đặt hàng nào." : "No orders found."}
                          </td>
                        </tr>
                      ) : (
                        orders.map(order => (
                          <tr key={order.id} className="hover:bg-amber-50/20">
                            {/* Order ID & Date */}
                            <td className="px-6 py-4 font-mono font-bold text-amber-950">
                              #{order.id}
                              <span className="block text-[9px] font-normal text-amber-800/60 mt-1 font-sans">
                                {new Date(order.createdAt).toLocaleDateString(lang === "vi" ? "vi-VN" : "en-US", {
                                  hour: '2-digit', minute:'2-digit'
                                })}
                              </span>
                            </td>

                            {/* Customer Details */}
                            <td className="px-6 py-4">
                              <p className="font-semibold text-amber-950">{order.customerName}</p>
                              <p className="text-[10px] text-amber-800 font-semibold mt-0.5">{order.customerPhone}</p>
                              <p className="text-[9px] text-amber-800/60 truncate max-w-[150px] font-mono">{order.customerAddress}</p>
                            </td>

                            {/* Items list */}
                            <td className="px-6 py-4">
                              <div className="space-y-1 max-w-[200px]">
                                {order.items.map((item, idx) => (
                                  <div key={idx} className="flex justify-between text-[11px] text-amber-950">
                                    <span className="truncate mr-2 font-medium">
                                      {lang === "vi" ? item.nameVI : item.nameEN} ({item.size}/{lang === "vi" ? item.colorVI : item.colorEN})
                                    </span>
                                    <span className="text-amber-800 font-mono font-bold">x{item.quantity}</span>
                                  </div>
                                ))}
                              </div>
                            </td>

                            {/* Total amount */}
                            <td className="px-6 py-4 font-mono font-bold text-amber-950 text-sm">
                              {formatPrice(order.totalAmountVND)}
                            </td>

                            {/* Payment Method & status */}
                            <td className="px-6 py-4">
                              <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${payBadges[order.paymentStatus].bg} ${payBadges[order.paymentStatus].text}`}>
                                {payBadges[order.paymentStatus].text}
                              </span>
                              <span className="block text-[9px] text-amber-800/60 mt-1 uppercase font-mono tracking-wider font-semibold">
                                {order.paymentMethod === "cod" ? "COD" : order.paymentMethod === "bank" ? "Chuyển khoản" : "Thẻ Visa"}
                              </span>
                            </td>

                            {/* Status badge */}
                            <td className="px-6 py-4">
                              <span className={`px-2.5 py-1 rounded-full border text-[10px] font-bold ${statusBadges[order.status].bg} ${statusBadges[order.status].text}`}>
                                {statusBadges[order.status].text}
                              </span>
                            </td>

                            {/* Quick status processing controls */}
                            <td className="px-6 py-4">
                              <div className="flex justify-center gap-1">
                                {order.status === "pending" && (
                                  <button
                                    onClick={() => handleUpdateStatus(order.id, "processing")}
                                    className="bg-amber-500 hover:bg-amber-600 text-amber-950 px-2 py-1 rounded text-[10px] font-bold cursor-pointer transition-colors shadow-sm"
                                    disabled={updatingId === order.id}
                                  >
                                    {lang === "vi" ? "Duyệt đơn" : "Process"}
                                  </button>
                                )}
                                {order.status === "processing" && (
                                  <button
                                    onClick={() => handleUpdateStatus(order.id, "shipped")}
                                    className="bg-orange-500 hover:bg-orange-600 text-white px-2 py-1 rounded text-[10px] font-bold cursor-pointer transition-colors shadow-sm"
                                    disabled={updatingId === order.id}
                                  >
                                    {lang === "vi" ? "Giao hàng" : "Ship"}
                                  </button>
                                )}
                                {order.status === "shipped" && (
                                  <button
                                    onClick={() => handleUpdateStatus(order.id, "completed", "paid")}
                                    className="bg-emerald-600 hover:bg-emerald-700 text-white px-2 py-1 rounded text-[10px] font-bold cursor-pointer transition-colors shadow-sm"
                                    disabled={updatingId === order.id}
                                  >
                                    {lang === "vi" ? "Thành công" : "Complete"}
                                  </button>
                                )}
                                {order.status !== "completed" && order.status !== "cancelled" && (
                                  <button
                                    onClick={() => handleUpdateStatus(order.id, "cancelled")}
                                    className="border border-rose-200 hover:bg-rose-50 text-rose-600 px-2 py-1 rounded text-[10px] font-bold cursor-pointer transition-all"
                                    disabled={updatingId === order.id}
                                    title={lang === "vi" ? "Hủy đơn hàng" : "Cancel Order"}
                                  >
                                    {lang === "vi" ? "Hủy đơn" : "Cancel"}
                                  </button>
                                )}
                              </div>
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {/* Tab 3: SMART INVENTORY MANAGEMENT */}
          {activeTab === "inventory" && (
            <div className="space-y-6">
              {/* Alert list for low stocks */}
              {products.filter(p => p.stock <= 5).length > 0 && (
                <div className="bg-amber-100 border border-amber-300 rounded-2xl p-4 flex gap-3 shadow-sm">
                  <AlertTriangle className="w-5 h-5 text-amber-700 shrink-0 mt-0.5" />
                  <div>
                    <h4 className="font-bold text-amber-950 text-sm">
                      {lang === "vi" ? "Cảnh Báo Tồn Kho Thấp (< 5 sản phẩm)" : "Low Stock Alert Level (< 5 items)"}
                    </h4>
                    <p className="text-xs text-amber-900 mt-1">
                      {lang === "vi" 
                        ? "Hệ thống tự động phát hiện các sản phẩm sắp cháy hàng dưới đây. Vui lòng cập nhật bổ sung kho hàng để tối ưu quy trình kinh doanh." 
                        : "The system automatically alerts on near-depleted items below. Please replenish stock level to optimize store logistics."}
                    </p>
                    <div className="mt-2 flex flex-wrap gap-1.5">
                      {products.filter(p => p.stock <= 5).map(p => (
                        <span key={p.id} className="bg-rose-50 text-rose-700 border border-rose-200 px-2 py-0.5 rounded text-[10px] font-mono font-bold">
                          {lang === "vi" ? p.nameVI : p.nameEN} ({p.stock} sp)
                        </span>
                      ))}
                    </div>
                  </div>
                </div>
              )}

              {/* Editable Product stock table */}
              <div className="bg-white border border-amber-100 rounded-2xl overflow-hidden shadow-sm">
                <div className="p-4 bg-amber-50/40 border-b border-amber-100 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
                  <div>
                    <span className="text-xs font-bold text-amber-950 uppercase font-mono tracking-wider block">
                      {lang === "vi" ? "Hệ thống quản lý sản phẩm & Khuyến mãi" : "Product & Promotion Management"}
                    </span>
                    <span className="text-[10px] text-amber-800/70">
                      {lang === "vi" ? `Tổng số: ${products.length} sản phẩm` : `Total: ${products.length} products`}
                    </span>
                  </div>

                  <button
                    onClick={handleOpenAdd}
                    className="bg-amber-500 hover:bg-amber-600 text-amber-950 px-4 py-2 rounded-xl text-xs font-bold flex items-center gap-1.5 cursor-pointer shadow-sm transition-all"
                  >
                    <Plus className="w-4 h-4" />
                    {lang === "vi" ? "Thêm sản phẩm mới" : "Add New Product"}
                  </button>
                </div>

                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="bg-amber-50/50 text-amber-900 text-[10px] uppercase font-mono tracking-wider border-b border-amber-100">
                        <th className="px-6 py-4">{lang === "vi" ? "Sản phẩm" : "Product details"}</th>
                        <th className="px-6 py-4">{lang === "vi" ? "Danh mục / Style" : "Category / Style"}</th>
                        <th className="px-6 py-4">{lang === "vi" ? "Giá bán / Gốc (VND)" : "Price / Original (VND)"}</th>
                        <th className="px-6 py-4">{lang === "vi" ? "Đã bán" : "Sold"}</th>
                        <th className="px-6 py-4">{lang === "vi" ? "Kho" : "Stock"}</th>
                        <th className="px-6 py-4">{lang === "vi" ? "Khuyến mãi" : "Promotion"}</th>
                        <th className="px-6 py-4 text-right">{lang === "vi" ? "Thao tác" : "Actions"}</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-amber-50 text-xs text-amber-950">
                      {products.length === 0 ? (
                        <tr>
                          <td colSpan={7} className="text-center py-12 text-amber-800/70">
                            {lang === "vi" ? "Chưa có sản phẩm nào." : "No products found."}
                          </td>
                        </tr>
                      ) : (
                        products.map(p => {
                          const isLow = p.stock <= 5;
                          const hasPromo = p.originalPriceVND && p.originalPriceVND > p.priceVND;
                          const promoPct = hasPromo ? Math.round((1 - p.priceVND / p.originalPriceVND!) * 100) : 0;
                          return (
                            <tr key={p.id} className="hover:bg-amber-50/20">
                              {/* Product Info */}
                              <td className="px-6 py-4">
                                <div className="flex items-center gap-3">
                                  <img 
                                    src={p.imageUrl} 
                                    alt={lang === "vi" ? p.nameVI : p.nameEN} 
                                    className="w-10 h-10 object-cover rounded-lg border border-amber-200 bg-amber-50/40 shrink-0"
                                    onError={(e) => {
                                      (e.target as HTMLImageElement).src = "https://images.unsplash.com/photo-1434389677669-e08b4cac3105?auto=format&fit=crop&q=80&w=400";
                                    }}
                                  />
                                  <div>
                                    <span className="font-bold block text-amber-950 line-clamp-1">{lang === "vi" ? p.nameVI : p.nameEN}</span>
                                    <span className="text-[10px] text-amber-800/60 font-mono">ID: {p.id}</span>
                                  </div>
                                </div>
                              </td>

                              {/* Category & Style */}
                              <td className="px-6 py-4">
                                <span className="uppercase font-mono tracking-wider text-[9px] font-bold block text-amber-800">
                                  {p.category === "fashion" ? (lang === "vi" ? "Thời trang" : "Fashion") : (lang === "vi" ? "Mỹ phẩm" : "Cosmetics")}
                                </span>
                                <span className="text-[10px] text-amber-800/60 block font-medium">
                                  Style: {p.style || "minimalist"}
                                </span>
                              </td>

                              {/* Prices */}
                              <td className="px-6 py-4 font-mono font-bold text-amber-950">
                                <div className="space-y-0.5">
                                  {hasPromo && (
                                    <span className="text-[10px] text-zinc-400 line-through leading-none block">
                                      {formatPrice(p.originalPriceVND!)}
                                    </span>
                                  )}
                                  <span className="text-xs text-amber-950 block">
                                    {formatPrice(p.priceVND)}
                                  </span>
                                </div>
                              </td>

                              {/* Sold count */}
                              <td className="px-6 py-4 font-mono font-bold text-amber-900">
                                {p.sold || 0}
                              </td>

                              {/* Stock count */}
                              <td className="px-6 py-4">
                                {editingStockId === p.id ? (
                                  <input
                                    type="number"
                                    defaultValue={p.stock}
                                    onChange={(e) => setNewStockValue(Number(e.target.value))}
                                    className="w-16 border border-amber-300 rounded px-1.5 py-1 text-xs text-zinc-900 focus:outline-none focus:ring-1 focus:ring-amber-500 bg-white"
                                    min="0"
                                  />
                                ) : (
                                  <span className={`font-mono font-bold text-sm ${isLow ? "text-rose-600 animate-pulse" : "text-amber-950"}`}>
                                    {p.stock} {lang === "vi" ? "sp" : "items"}
                                  </span>
                                )}
                              </td>

                              {/* Promo Badges */}
                              <td className="px-6 py-4">
                                {hasPromo ? (
                                  <span className="bg-rose-50 text-rose-600 border border-rose-200 px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider animate-pulse inline-block">
                                    -{promoPct}% OFF
                                  </span>
                                ) : (
                                  <span className="text-[10px] text-zinc-400 font-medium">
                                    {lang === "vi" ? "Không có" : "No discount"}
                                  </span>
                                )}
                              </td>

                              {/* Actions */}
                              <td className="px-6 py-4 text-right">
                                <div className="flex justify-end items-center gap-1.5">
                                  {editingStockId === p.id ? (
                                    <div className="flex gap-1">
                                      <button
                                        onClick={() => handleUpdateStock(p.id, p.stock)}
                                        className="bg-amber-500 hover:bg-amber-600 text-amber-950 p-1 rounded cursor-pointer animate-pulse"
                                        title={lang === "vi" ? "Lưu" : "Save"}
                                      >
                                        <Check className="w-3.5 h-3.5" />
                                      </button>
                                      <button
                                        onClick={() => setEditingStockId(null)}
                                        className="bg-amber-100 text-amber-800 p-1 rounded hover:bg-amber-200 cursor-pointer"
                                        title={lang === "vi" ? "Hủy" : "Cancel"}
                                      >
                                        <X className="w-3.5 h-3.5" />
                                      </button>
                                    </div>
                                  ) : (
                                    <>
                                      <button
                                        onClick={() => {
                                          setEditingStockId(p.id);
                                          setNewStockValue(p.stock);
                                        }}
                                        className="bg-amber-50 hover:bg-amber-100 text-amber-900 text-[10px] font-semibold px-2 py-1 rounded border border-amber-200 cursor-pointer transition-colors"
                                        title={lang === "vi" ? "Sửa nhanh kho" : "Quick stock edit"}
                                      >
                                        {lang === "vi" ? "Kho" : "Stock"}
                                      </button>
                                      <button
                                        onClick={() => handleOpenEdit(p)}
                                        className="bg-white border border-amber-200 hover:bg-amber-50 text-amber-950 text-[10px] font-bold px-2 py-1 rounded cursor-pointer transition-colors shadow-sm"
                                      >
                                        {lang === "vi" ? "Sửa" : "Edit"}
                                      </button>
                                      <button
                                        onClick={() => handleDeleteProduct(p.id, p.nameVI)}
                                        className="border border-rose-200 hover:bg-rose-50 text-rose-600 text-[10px] font-bold px-2 py-1 rounded cursor-pointer transition-colors"
                                      >
                                        <Trash2 className="w-3 h-3 inline md:mr-1" />
                                        <span className="hidden md:inline">{lang === "vi" ? "Xoá" : "Delete"}</span>
                                      </button>
                                    </>
                                  )}
                                </div>
                              </td>
                            </tr>
                          );
                        })
                      )}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* PRODUCT MODAL (Add / Edit Form with Promotion input) */}
              {showProductModal && (
                <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 z-50 overflow-y-auto">
                  <motion.div 
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    className="bg-yellow-50 border border-amber-200 rounded-3xl p-6 md:p-8 max-w-2xl w-full shadow-2xl text-zinc-900 max-h-[90vh] overflow-y-auto"
                  >
                    <div className="flex justify-between items-center mb-6 border-b border-amber-200/60 pb-4">
                      <h3 className="text-lg font-serif font-bold text-amber-950 uppercase">
                        {editingProduct 
                          ? (lang === "vi" ? "Chỉnh sửa sản phẩm & Khuyến mãi" : "Edit Product & Promotions") 
                          : (lang === "vi" ? "Thêm sản phẩm mới" : "Add New Product")
                        }
                      </h3>
                      <button 
                        onClick={() => setShowProductModal(false)}
                        className="text-amber-800 hover:text-amber-950 bg-amber-100 p-1.5 rounded-full cursor-pointer transition-colors"
                      >
                        <X className="w-5 h-5" />
                      </button>
                    </div>

                    <form onSubmit={handleSubmitProduct} className="space-y-5">
                      {/* Bilingual Names */}
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="space-y-1.5">
                          <label className="text-[10px] uppercase tracking-wider text-amber-900 font-bold block">
                            {lang === "vi" ? "Tên sản phẩm (Tiếng Việt) *" : "Product Name (Vietnamese) *"}
                          </label>
                          <input 
                            type="text" 
                            required
                            value={formNameVI}
                            onChange={e => setFormNameVI(e.target.value)}
                            className="w-full bg-white border border-amber-200 rounded-xl px-3 py-2.5 text-xs focus:outline-none focus:ring-1 focus:ring-amber-500"
                            placeholder={lang === "vi" ? "Nhập tên Tiếng Việt..." : "Vietnamese name..."}
                          />
                        </div>
                        <div className="space-y-1.5">
                          <label className="text-[10px] uppercase tracking-wider text-amber-900 font-bold block">
                            {lang === "vi" ? "Tên sản phẩm (Tiếng Anh) *" : "Product Name (English) *"}
                          </label>
                          <input 
                            type="text" 
                            required
                            value={formNameEN}
                            onChange={e => setFormNameEN(e.target.value)}
                            className="w-full bg-white border border-amber-200 rounded-xl px-3 py-2.5 text-xs focus:outline-none focus:ring-1 focus:ring-amber-500"
                            placeholder={lang === "vi" ? "Nhập tên Tiếng Anh..." : "English name..."}
                          />
                        </div>
                      </div>

                      {/* Category & Style & Image URL */}
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <div className="space-y-1.5">
                          <label className="text-[10px] uppercase tracking-wider text-amber-900 font-bold block">
                            {lang === "vi" ? "Ngành hàng / Category *" : "Category *"}
                          </label>
                          <select 
                            value={formCategory}
                            onChange={e => setFormCategory(e.target.value as any)}
                            className="w-full bg-white border border-amber-200 rounded-xl px-3 py-2.5 text-xs focus:outline-none focus:ring-1 focus:ring-amber-500"
                          >
                            <option value="fashion">{lang === "vi" ? "Thời trang" : "Fashion"}</option>
                            <option value="cosmetics">{lang === "vi" ? "Mỹ phẩm" : "Cosmetics"}</option>
                          </select>
                        </div>
                        <div className="space-y-1.5">
                          <label className="text-[10px] uppercase tracking-wider text-amber-900 font-bold block">
                            {lang === "vi" ? "Phong cách / Style *" : "Style *"}
                          </label>
                          <input 
                            type="text" 
                            required
                            value={formStyle}
                            onChange={e => setFormStyle(e.target.value)}
                            className="w-full bg-white border border-amber-200 rounded-xl px-3 py-2.5 text-xs focus:outline-none focus:ring-1 focus:ring-amber-500"
                            placeholder="e.g. minimalist, streetwear, skincare..."
                          />
                        </div>
                        <div className="space-y-1.5">
                          <label className="text-[10px] uppercase tracking-wider text-amber-900 font-bold block">
                            {lang === "vi" ? "Số lượng tồn kho *" : "Stock Level *"}
                          </label>
                          <input 
                            type="number" 
                            required
                            min="0"
                            value={formStock}
                            onChange={e => setFormStock(Number(e.target.value))}
                            className="w-full bg-white border border-amber-200 rounded-xl px-3 py-2.5 text-xs focus:outline-none focus:ring-1 focus:ring-amber-500"
                          />
                        </div>
                      </div>

                      {/* Prices & Promotions */}
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 bg-amber-100/40 p-4 rounded-2xl border border-amber-200/50">
                        <div className="space-y-1.5">
                          <label className="text-[10px] uppercase tracking-wider text-amber-900 font-bold flex items-center gap-1">
                            <Percent className="w-3.5 h-3.5 text-amber-600" />
                            {lang === "vi" ? "Giá Bán Hiện Tại (VND) *" : "Active Selling Price (VND) *"}
                          </label>
                          <input 
                            type="number" 
                            required
                            min="1000"
                            value={formPriceVND}
                            onChange={e => setFormPriceVND(Number(e.target.value))}
                            className="w-full bg-white border border-amber-200 rounded-xl px-3 py-2.5 text-xs focus:outline-none focus:ring-1 focus:ring-amber-500 font-mono font-bold text-amber-950"
                            placeholder="e.g. 250000"
                          />
                        </div>
                        <div className="space-y-1.5">
                          <label className="text-[10px] uppercase tracking-wider text-amber-900 font-bold flex items-center gap-1">
                            <Tag className="w-3.5 h-3.5 text-zinc-500" />
                            {lang === "vi" ? "Giá Gốc trước giảm (VND) - Khuyến mãi" : "Original Price (VND) - Promo"}
                          </label>
                          <input 
                            type="number" 
                            min="1000"
                            value={formOriginalPriceVND}
                            onChange={e => setFormOriginalPriceVND(e.target.value === "" ? "" : Number(e.target.value))}
                            className="w-full bg-white border border-amber-200 rounded-xl px-3 py-2.5 text-xs focus:outline-none focus:ring-1 focus:ring-amber-500 font-mono text-zinc-600"
                            placeholder={lang === "vi" ? "Bỏ trống nếu không có KM..." : "Leave blank for no promo..."}
                          />
                          <span className="text-[9px] text-amber-800/80 block">
                            {lang === "vi" 
                              ? "Nếu đặt Giá Gốc lớn hơn Giá Bán, hệ thống tự động gắn nhãn SALE và tính % giảm giá." 
                              : "If Original Price is greater than Selling Price, the system auto-calculates discount percentage."}
                          </span>
                        </div>
                      </div>

                      {/* Image URL with quick thumbnail preview */}
                      <div className="space-y-1.5">
                        <label className="text-[10px] uppercase tracking-wider text-amber-900 font-bold block">
                          {lang === "vi" ? "Đường dẫn ảnh sản phẩm (URL) *" : "Product Image URL *"}
                        </label>
                        <div className="flex gap-2">
                          <input 
                            type="url" 
                            required
                            value={formImageUrl}
                            onChange={e => setFormImageUrl(e.target.value)}
                            className="flex-1 bg-white border border-amber-200 rounded-xl px-3 py-2.5 text-xs focus:outline-none focus:ring-1 focus:ring-amber-500"
                            placeholder="https://images.unsplash.com/..."
                          />
                          {formImageUrl && (
                            <img 
                              src={formImageUrl} 
                              alt="Form preview" 
                              className="w-10 h-10 object-cover rounded-xl border border-amber-200 shrink-0 bg-white"
                              onError={(e) => {
                                (e.target as HTMLImageElement).src = "https://images.unsplash.com/photo-1434389677669-e08b4cac3105?auto=format&fit=crop&q=80&w=400";
                              }}
                            />
                          )}
                        </div>
                      </div>

                      {/* Sizes & Colors Input */}
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <div className="space-y-1.5">
                          <label className="text-[10px] uppercase tracking-wider text-amber-900 font-bold block">
                            {lang === "vi" ? "Kích thước (Cách nhau bằng dấu phẩy) *" : "Sizes (Comma-separated) *"}
                          </label>
                          <input 
                            type="text" 
                            required
                            value={formSizes}
                            onChange={e => setFormSizes(e.target.value)}
                            className="w-full bg-white border border-amber-200 rounded-xl px-3 py-2.5 text-xs focus:outline-none focus:ring-1 focus:ring-amber-500"
                            placeholder="S, M, L, XL"
                          />
                        </div>
                        <div className="space-y-1.5">
                          <label className="text-[10px] uppercase tracking-wider text-amber-900 font-bold block">
                            {lang === "vi" ? "Màu sắc Tiếng Việt (Cách nhau bởi ',') *" : "Colors VI (Comma-separated) *"}
                          </label>
                          <input 
                            type="text" 
                            required
                            value={formColorsVI}
                            onChange={e => setFormColorsVI(e.target.value)}
                            className="w-full bg-white border border-amber-200 rounded-xl px-3 py-2.5 text-xs focus:outline-none focus:ring-1 focus:ring-amber-500"
                            placeholder="Đen, Trắng, Nâu"
                          />
                        </div>
                        <div className="space-y-1.5">
                          <label className="text-[10px] uppercase tracking-wider text-amber-900 font-bold block">
                            {lang === "vi" ? "Màu sắc Tiếng Anh (Cách nhau bởi ',') *" : "Colors EN (Comma-separated) *"}
                          </label>
                          <input 
                            type="text" 
                            required
                            value={formColorsEN}
                            onChange={e => setFormColorsEN(e.target.value)}
                            className="w-full bg-white border border-amber-200 rounded-xl px-3 py-2.5 text-xs focus:outline-none focus:ring-1 focus:ring-amber-500"
                            placeholder="Black, White, Brown"
                          />
                        </div>
                      </div>

                      {/* Descriptions */}
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="space-y-1.5">
                          <label className="text-[10px] uppercase tracking-wider text-amber-900 font-bold block">
                            {lang === "vi" ? "Mô tả (Tiếng Việt)" : "Description (Vietnamese)"}
                          </label>
                          <textarea 
                            rows={3}
                            value={formDescriptionVI}
                            onChange={e => setFormDescriptionVI(e.target.value)}
                            className="w-full bg-white border border-amber-200 rounded-xl px-3 py-2 text-xs focus:outline-none focus:ring-1 focus:ring-amber-500"
                            placeholder="Chất liệu lụa cao cấp, mát mịn..."
                          />
                        </div>
                        <div className="space-y-1.5">
                          <label className="text-[10px] uppercase tracking-wider text-amber-900 font-bold block">
                            {lang === "vi" ? "Mô tả (Tiếng Anh)" : "Description (English)"}
                          </label>
                          <textarea 
                            rows={3}
                            value={formDescriptionEN}
                            onChange={e => setFormDescriptionEN(e.target.value)}
                            className="w-full bg-white border border-amber-200 rounded-xl px-3 py-2 text-xs focus:outline-none focus:ring-1 focus:ring-amber-500"
                            placeholder="Premium silk fabric, smooth and cool feel..."
                          />
                        </div>
                      </div>

                      {/* Actions */}
                      <div className="flex justify-end gap-3 pt-4 border-t border-amber-200/60">
                        <button
                          type="button"
                          onClick={() => setShowProductModal(false)}
                          className="bg-amber-100 hover:bg-amber-200 text-amber-900 font-bold px-5 py-2.5 rounded-xl text-xs transition-colors cursor-pointer"
                        >
                          {lang === "vi" ? "Đóng / Hủy" : "Close / Cancel"}
                        </button>
                        <button
                          type="submit"
                          className="bg-amber-500 hover:bg-amber-600 text-amber-950 font-bold px-6 py-2.5 rounded-xl text-xs transition-all shadow-md cursor-pointer flex items-center gap-1.5"
                        >
                          <Check className="w-4 h-4" />
                          {lang === "vi" ? "Lưu sản phẩm" : "Save Product"}
                        </button>
                      </div>
                    </form>
                  </motion.div>
                </div>
              )}
            </div>
          )}

          {/* Tab 4: AUTOMATED NOTIFICATION LOGS */}
          {activeTab === "notifications" && (
            <div className="space-y-4">
              <div className="bg-white border border-amber-100 rounded-2xl p-4 flex gap-3 mb-4 shadow-sm">
                <Bell className="w-5 h-5 text-amber-700 shrink-0 mt-0.5" />
                <div>
                  <h4 className="font-bold text-amber-950 text-sm">
                    {lang === "vi" ? "Nhật ký Gửi thông báo Tự động Ốc Nguyễn" : "Automated Notification System Logs"}
                  </h4>
                  <p className="text-xs text-amber-800 mt-1">
                    {lang === "vi"
                      ? "Ốc Nguyễn tự động gửi email xác nhận đặt hàng, thanh toán trực tuyến bảo mật, và cập nhật tình trạng đóng gói, vận chuyển tức thời đến khách hàng. Dưới đây là nhật ký hoạt động thực tế của hệ thống."
                      : "Oc Nguyen sends automated emails for successful order placements, secure checkout receipts, and packaging/shipping status changes instantly. This is a real-time monitor log of notifications sent."}
                  </p>
                </div>
              </div>

              <div className="space-y-3">
                {notifications.length === 0 ? (
                  <div className="bg-white border border-amber-100 p-12 text-center text-amber-800/70 text-xs rounded-2xl">
                    {lang === "vi" ? "Chưa có nhật ký thông báo nào được lưu." : "No notification logs generated yet."}
                  </div>
                ) : (
                  notifications.map(notif => (
                    <div 
                      key={notif.id} 
                      className="bg-white border border-amber-100 p-4 rounded-xl shadow-sm flex flex-col md:flex-row gap-4 items-start md:items-center justify-between hover:bg-amber-50/20 transition-colors"
                    >
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <span className={`px-2 py-0.5 text-[9px] font-bold rounded-full uppercase font-mono tracking-wider ${
                            notif.type === 'email' ? 'bg-amber-100 text-amber-800' : 'bg-yellow-100 text-yellow-800'
                          }`}>
                            {notif.type === 'email' ? "Email" : "App Alert"}
                          </span>
                          <span className="text-[10px] text-amber-800/60 font-mono">ID: {notif.id}</span>
                        </div>
                        <h4 className="text-xs font-bold text-amber-950">
                          {lang === "vi" ? notif.titleVI : notif.titleEN}
                        </h4>
                        <p className="text-[11px] text-amber-950/80 leading-relaxed font-sans max-w-4xl italic whitespace-pre-wrap">
                          "{lang === "vi" ? notif.contentVI : notif.contentEN}"
                        </p>
                      </div>

                      <div className="text-right shrink-0">
                        <span className="text-[10px] text-amber-900 block font-bold">{notif.recipient}</span>
                        <span className="text-[9px] text-amber-800/60 font-mono block mt-0.5">
                          {new Date(notif.createdAt).toLocaleDateString(lang === "vi" ? "vi-VN" : "en-US", {
                            hour: '2-digit', minute:'2-digit', second:'2-digit'
                          })}
                        </span>
                        <span className="inline-flex items-center gap-1 text-[9px] text-emerald-600 font-bold uppercase tracking-wider mt-1.5 bg-emerald-50 px-1.5 py-0.5 rounded-full">
                          <CheckCircle className="w-2.5 h-2.5" /> Sent
                        </span>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          )}

          {/* Tab 5: PROMO CODES / EVENTS */}
          {activeTab === "promos" && (
            <div className="space-y-6">
              <div className="bg-white border border-amber-100 rounded-2xl p-5 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 shadow-sm animate-fadeIn">
                <div className="flex gap-3">
                  <Percent className="w-5 h-5 text-amber-700 shrink-0 mt-0.5" />
                  <div>
                    <h4 className="font-bold text-amber-950 text-sm">
                      {lang === "vi" ? "Hệ Thống Quản Lý Mã Khuyến Mãi & Voucher" : "Vouchers & Promotional Campaigns Engine"}
                    </h4>
                    <p className="text-xs text-amber-800 mt-1">
                      {lang === "vi"
                        ? "Tạo mã giảm giá theo chiến dịch, sự kiện, ngày lễ lớn trong năm để thu hút người mua và tăng tỉ lệ chuyển đổi."
                        : "Create custom-coded campaign discounts or holiday event coupons to increase conversions."}
                    </p>
                  </div>
                </div>
                
                <button
                  onClick={() => {
                    setPromoCodeForm({
                      code: "",
                      descriptionVI: "",
                      descriptionEN: "",
                      discountType: "percentage",
                      discountValue: 0,
                      minOrderValueVND: 0,
                      validUntil: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split("T")[0],
                      isActive: true
                    });
                    setPromoError("");
                    setShowPromoModal(true);
                  }}
                  className="bg-amber-950 text-amber-50 hover:bg-amber-900 px-4 py-2.5 rounded-xl text-xs font-bold cursor-pointer transition-colors shadow-md flex items-center gap-1.5 shrink-0"
                >
                  <Plus className="w-4 h-4" />
                  {lang === "vi" ? "Tạo Mã Mới" : "Create New Code"}
                </button>
              </div>

              {/* Promo Code Creation Modal */}
              {showPromoModal && (
                <div className="fixed inset-0 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4 z-50">
                  <motion.div 
                    initial={{ scale: 0.95, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    className="bg-white rounded-3xl p-6 border border-amber-200 shadow-2xl max-w-lg w-full max-h-[90vh] overflow-y-auto space-y-4 font-sans"
                  >
                    <div className="flex justify-between items-center pb-2 border-b border-amber-100">
                      <h3 className="font-serif font-extrabold text-amber-950 text-lg">
                        {lang === "vi" ? "Tạo Chiến Dịch Khuyến Mãi Mới" : "Create Promotional Voucher"}
                      </h3>
                      <button 
                        onClick={() => setShowPromoModal(false)}
                        className="text-zinc-400 hover:text-zinc-600 cursor-pointer p-1"
                      >
                        <X className="w-5 h-5" />
                      </button>
                    </div>

                    {promoError && (
                      <div className="bg-rose-50 border border-rose-200 text-rose-700 text-xs p-3 rounded-xl">
                        ⚠️ {promoError}
                      </div>
                    )}

                    <form onSubmit={handleSavePromoCode} className="space-y-4">
                      <div className="grid grid-cols-2 gap-3">
                        <div className="space-y-1">
                          <label className="text-[10px] uppercase tracking-wider text-amber-900 font-bold block">
                            {lang === "vi" ? "Mã Khuyến Mãi (In Hoa) *" : "Voucher Code (Uppercase) *"}
                          </label>
                          <input 
                            type="text"
                            required
                            placeholder="TET2026"
                            value={promoCodeForm.code}
                            onChange={e => setPromoCodeForm({ ...promoCodeForm, code: e.target.value.toUpperCase() })}
                            className="w-full bg-zinc-50 border border-zinc-200 rounded-xl px-3 py-2 text-xs focus:outline-none focus:ring-1 focus:ring-amber-500 font-mono uppercase font-bold text-zinc-800"
                          />
                        </div>

                        <div className="space-y-1">
                          <label className="text-[10px] uppercase tracking-wider text-amber-900 font-bold block">
                            {lang === "vi" ? "Hạn Sử Dụng *" : "Valid Until *"}
                          </label>
                          <input 
                            type="date"
                            required
                            value={promoCodeForm.validUntil}
                            onChange={e => setPromoCodeForm({ ...promoCodeForm, validUntil: e.target.value })}
                            className="w-full bg-zinc-50 border border-zinc-200 rounded-xl px-3 py-2 text-xs focus:outline-none focus:ring-1 focus:ring-amber-500 font-mono text-zinc-800"
                          />
                        </div>
                      </div>

                      <div className="grid grid-cols-2 gap-3">
                        <div className="space-y-1">
                          <label className="text-[10px] uppercase tracking-wider text-amber-900 font-bold block">
                            {lang === "vi" ? "Loại Giảm Giá *" : "Discount Type *"}
                          </label>
                          <select
                            value={promoCodeForm.discountType}
                            onChange={e => setPromoCodeForm({ ...promoCodeForm, discountType: e.target.value as any })}
                            className="w-full bg-zinc-50 border border-zinc-200 rounded-xl px-3 py-2 text-xs focus:outline-none focus:ring-1 focus:ring-amber-500 font-medium text-zinc-800"
                          >
                            <option value="percentage">{lang === "vi" ? "Phần Trăm (%)" : "Percentage (%)"}</option>
                            <option value="fixed">{lang === "vi" ? "Giá Trị Cố Định (đ)" : "Fixed VND"}</option>
                          </select>
                        </div>

                        <div className="space-y-1">
                          <label className="text-[10px] uppercase tracking-wider text-amber-900 font-bold block">
                            {lang === "vi" ? "Mức Giảm Giá *" : "Discount Value *"}
                          </label>
                          <input 
                            type="number"
                            required
                            min={1}
                            value={promoCodeForm.discountValue}
                            onChange={e => setPromoCodeForm({ ...promoCodeForm, discountValue: parseInt(e.target.value) || 0 })}
                            className="w-full bg-zinc-50 border border-zinc-200 rounded-xl px-3 py-2 text-xs focus:outline-none focus:ring-1 focus:ring-amber-500 font-mono font-bold text-zinc-800"
                          />
                        </div>
                      </div>

                      <div className="space-y-1">
                        <label className="text-[10px] uppercase tracking-wider text-amber-900 font-bold block">
                          {lang === "vi" ? "Giá Trị Đơn Hàng Tối Thiểu (đ) *" : "Min Order Value (VND) *"}
                        </label>
                        <input 
                          type="number"
                          required
                          min={0}
                          value={promoCodeForm.minOrderValueVND}
                          onChange={e => setPromoCodeForm({ ...promoCodeForm, minOrderValueVND: parseInt(e.target.value) || 0 })}
                          className="w-full bg-zinc-50 border border-zinc-200 rounded-xl px-3 py-2 text-xs focus:outline-none focus:ring-1 focus:ring-amber-500 font-mono text-zinc-800"
                        />
                      </div>

                      <div className="grid grid-cols-2 gap-3">
                        <div className="space-y-1">
                          <label className="text-[10px] uppercase tracking-wider text-amber-900 font-bold block">
                            {lang === "vi" ? "Mô tả Tiếng Việt *" : "Vietnamese Description *"}
                          </label>
                          <input 
                            type="text"
                            required
                            placeholder="Giảm 20% cho dịp tết"
                            value={promoCodeForm.descriptionVI}
                            onChange={e => setPromoCodeForm({ ...promoCodeForm, descriptionVI: e.target.value })}
                            className="w-full bg-zinc-50 border border-zinc-200 rounded-xl px-3 py-2 text-xs focus:outline-none focus:ring-1 focus:ring-amber-500 text-zinc-800"
                          />
                        </div>

                        <div className="space-y-1">
                          <label className="text-[10px] uppercase tracking-wider text-amber-900 font-bold block">
                            {lang === "vi" ? "Mô tả Tiếng Anh *" : "English Description *"}
                          </label>
                          <input 
                            type="text"
                            required
                            placeholder="20% discount for New Year"
                            value={promoCodeForm.descriptionEN}
                            onChange={e => setPromoCodeForm({ ...promoCodeForm, descriptionEN: e.target.value })}
                            className="w-full bg-zinc-50 border border-zinc-200 rounded-xl px-3 py-2 text-xs focus:outline-none focus:ring-1 focus:ring-amber-500 text-zinc-800"
                          />
                        </div>
                      </div>

                      <div className="flex items-center gap-2 py-1">
                        <input 
                          type="checkbox"
                          id="promo-active-chk"
                          checked={promoCodeForm.isActive}
                          onChange={e => setPromoCodeForm({ ...promoCodeForm, isActive: e.target.checked })}
                          className="w-4 h-4 text-amber-600 border-zinc-300 rounded focus:ring-amber-500 cursor-pointer"
                        />
                        <label htmlFor="promo-active-chk" className="text-xs font-bold text-amber-950 cursor-pointer select-none">
                          {lang === "vi" ? "Kích hoạt mã khuyến mãi ngay lập tức" : "Activate coupon instantly"}
                        </label>
                      </div>

                      <div className="flex justify-end gap-3 pt-3 border-t">
                        <button
                          type="button"
                          onClick={() => setShowPromoModal(false)}
                          className="bg-zinc-100 hover:bg-zinc-200 text-zinc-800 px-4 py-2 rounded-xl text-xs font-bold transition-colors cursor-pointer"
                        >
                          {lang === "vi" ? "Đóng" : "Close"}
                        </button>
                        <button
                          type="submit"
                          className="bg-amber-500 hover:bg-amber-600 text-amber-950 px-5 py-2 rounded-xl text-xs font-bold transition-all shadow-md cursor-pointer flex items-center gap-1"
                        >
                          <Check className="w-4 h-4" />
                          {lang === "vi" ? "Lưu Mã" : "Save Code"}
                        </button>
                      </div>
                    </form>
                  </motion.div>
                </div>
              )}

              {/* Promo code list grid */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {promos.length === 0 ? (
                  <div className="col-span-full bg-white border border-amber-100 p-12 text-center text-amber-800/70 text-xs rounded-2xl">
                    {lang === "vi" ? "Không tìm thấy mã khuyến mãi nào." : "No promo codes active."}
                  </div>
                ) : (
                  promos.map(promo => (
                    <div 
                      key={promo.code}
                      className={`bg-white border rounded-2xl p-4 shadow-sm flex flex-col justify-between space-y-4 hover:shadow-md transition-shadow relative overflow-hidden ${
                        !promo.isActive ? "opacity-60 border-zinc-200" : "border-amber-100"
                      }`}
                    >
                      {/* Status indicator tag */}
                      <span className={`absolute top-0 right-0 px-2.5 py-1 text-[8px] font-bold tracking-wider uppercase font-mono rounded-bl-xl ${
                        promo.isActive ? "bg-emerald-50 text-emerald-700 border-l border-b border-emerald-100" : "bg-zinc-100 text-zinc-600"
                      }`}>
                        {promo.isActive ? (lang === "vi" ? "Đang hoạt động" : "Active") : (lang === "vi" ? "Nháp" : "Inactive")}
                      </span>

                      <div className="space-y-2">
                        <div className="flex items-center gap-2">
                          <div className="bg-amber-50 text-amber-950 font-mono font-black border border-dashed border-amber-400 px-3 py-1.5 rounded-lg text-sm tracking-widest uppercase select-all">
                            {promo.code}
                          </div>
                          <span className="text-[10px] text-zinc-500 font-mono">
                            {promo.discountType === "percentage" ? `${promo.discountValue}% Off` : `-${promo.discountValue.toLocaleString()}đ`}
                          </span>
                        </div>

                        <p className="text-xs font-bold text-zinc-800">
                          {lang === "vi" ? promo.descriptionVI : promo.descriptionEN}
                        </p>

                        <div className="space-y-1 text-[11px] text-zinc-500 leading-none">
                          <p>
                            <span className="font-semibold">{lang === "vi" ? "Đơn tối thiểu:" : "Min Order:"}</span>{" "}
                            <span className="font-mono text-zinc-800 font-bold">{promo.minOrderValueVND.toLocaleString()} đ</span>
                          </p>
                          <p>
                            <span className="font-semibold">{lang === "vi" ? "Hạn sử dụng:" : "Valid Until:"}</span>{" "}
                            <span className="font-mono text-zinc-800 font-bold">{promo.validUntil || "∞"}</span>
                          </p>
                        </div>
                      </div>

                      <div className="flex justify-end gap-2 border-t pt-3">
                        <button
                          onClick={() => {
                            setPromoCodeForm({
                              code: promo.code,
                              descriptionVI: promo.descriptionVI,
                              descriptionEN: promo.descriptionEN,
                              discountType: promo.discountType,
                              discountValue: promo.discountValue,
                              minOrderValueVND: promo.minOrderValueVND,
                              validUntil: promo.validUntil || "",
                              isActive: promo.isActive
                            });
                            setPromoError("");
                            setShowPromoModal(true);
                          }}
                          className="bg-amber-50 hover:bg-amber-100 text-amber-950 px-3 py-1.5 rounded-xl text-[10px] font-bold cursor-pointer transition-colors"
                        >
                          {lang === "vi" ? "Chỉnh Sửa" : "Edit"}
                        </button>
                        <button
                          onClick={() => handleDeletePromoCode(promo.code)}
                          className="bg-rose-50 hover:bg-rose-100 text-rose-600 px-3 py-1.5 rounded-xl text-[10px] font-bold cursor-pointer transition-colors"
                        >
                          {lang === "vi" ? "Xóa" : "Delete"}
                        </button>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
