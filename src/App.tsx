import React, { useState, useEffect } from "react";
import { 
  ShoppingBag, Search, SlidersHorizontal, Eye, Plus, Minus, X, Trash2, 
  Check, CreditCard, Send, Sparkles, MapPin, Phone, Mail, Globe, 
  ChevronRight, ArrowLeftRight, Heart, Star, LayoutDashboard, ShieldCheck, 
  Award, RefreshCw, AlertCircle, Truck
} from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { Product, CartItem, Language, Currency, Order } from "./types";
import AIChatbot from "./components/AIChatbot";
import AIRecommendations from "./components/AIRecommendations";
import SellerDashboard from "./components/SellerDashboard";

export default function App() {
  // Locale & Currency States
  const [lang, setLang] = useState<Language>("vi");
  const [currency, setCurrency] = useState<Currency>("VND");
  const exchangeRate = 25000; // 1 USD = 25,000 VND

  // App mode: client storefront or seller dashboard portal
  const [portalMode, setPortalMode] = useState<"client" | "seller">("client");

  // Catalog & Filter States
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<"all" | "fashion" | "cosmetics">("all");
  const [selectedStyle, setSelectedStyle] = useState<string>("all");
  const [priceRange, setPriceRange] = useState<number>(1500000); // Max price slider in VND
  const [inStockOnly, setInStockOnly] = useState(false);

  // Cart States
  const [cart, setCart] = useState<CartItem[]>([]);
  const [isCartOpen, setIsCartOpen] = useState(false);

  // Detail modal state
  const [selectedDetailProduct, setSelectedDetailProduct] = useState<Product | null>(null);

  // Checkout States
  const [checkoutStep, setCheckoutStep] = useState<"cart" | "info" | "success">("cart");
  const [checkoutName, setCheckoutName] = useState("");
  const [checkoutPhone, setCheckoutPhone] = useState("");
  const [checkoutEmail, setCheckoutEmail] = useState("");
  const [checkoutAddress, setCheckoutAddress] = useState("");
  const [paymentMethod, setPaymentMethod] = useState<"cod" | "bank" | "card">("cod");
  const [completedOrder, setCompletedOrder] = useState<Order | null>(null);
  const [checkoutError, setCheckoutError] = useState("");
  const [checkoutLoading, setCheckoutLoading] = useState(false);

  // Promo Code States
  const [couponCode, setCouponCode] = useState("");
  const [appliedCoupon, setAppliedCoupon] = useState<any | null>(null);
  const [couponError, setCouponError] = useState("");
  const [couponLoading, setCouponLoading] = useState(false);

  // Secret Admin Portal Toggle States (Ctrl + M + K)
  const [showAdminToggle, setShowAdminToggle] = useState(false);
  const [shortcutToast, setShortcutToast] = useState<{ show: boolean; message: string } | null>(null);

  // Handle auto-hide of shortcut toast
  useEffect(() => {
    if (shortcutToast?.show) {
      const timer = setTimeout(() => {
        setShortcutToast(null);
      }, 3500);
      return () => clearTimeout(timer);
    }
  }, [shortcutToast]);

  // Keyboard shortcut listener for Ctrl + M + K
  useEffect(() => {
    const activeKeys = new Set<string>();

    const handleKeyDown = (e: KeyboardEvent) => {
      const key = e.key.toLowerCase();
      activeKeys.add(key);

      const hasCtrl = e.ctrlKey || activeKeys.has("control");
      const hasM = activeKeys.has("m");
      const hasK = activeKeys.has("k");

      if (hasCtrl && hasM && hasK) {
        e.preventDefault();
        setShowAdminToggle(prev => {
          const nextState = !prev;
          setShortcutToast({
            show: true,
            message: lang === "vi"
              ? (nextState ? "🔓 Đã hiện nút Đăng nhập Quản trị!" : "🔒 Đã ẩn nút Đăng nhập Quản trị!")
              : (nextState ? "🔓 Admin Login Button is now visible!" : "🔒 Admin Login Button is now hidden!")
          });
          return nextState;
        });
        activeKeys.clear();
      }
    };

    const handleKeyUp = (e: KeyboardEvent) => {
      activeKeys.delete(e.key.toLowerCase());
    };

    const handleBlur = () => {
      activeKeys.clear();
    };

    window.addEventListener("keydown", handleKeyDown);
    window.addEventListener("keyup", handleKeyUp);
    window.addEventListener("blur", handleBlur);

    return () => {
      window.removeEventListener("keydown", handleKeyDown);
      window.removeEventListener("keyup", handleKeyUp);
      window.removeEventListener("blur", handleBlur);
    };
  }, [lang]);

  // Fetch Products Catalog
  const loadProducts = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/products");
      const data = await res.json();
      setProducts(data);
    } catch (err) {
      console.error("Error loading products:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadProducts();
  }, []);

  // Support Deep-linking and indexing for SEO (category & product params)
  useEffect(() => {
    if (products.length > 0) {
      const params = new URLSearchParams(window.location.search);
      const catParam = params.get("category");
      const prodParam = params.get("product");

      if (catParam === "fashion" || catParam === "cosmetics") {
        setSelectedCategory(catParam);
      }
      if (prodParam) {
        const prod = products.find(p => p.id === prodParam);
        if (prod) {
          setSelectedDetailProduct(prod);
        }
      }
    }
  }, [products]);

  // Price formatter helper
  const formatPrice = (amount: number) => {
    if (currency === "USD") {
      const usdAmount = amount / exchangeRate;
      return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(usdAmount);
    }
    return new Intl.NumberFormat("vi-VN", { style: "currency", currency: "VND" }).format(amount);
  };

  // Filter Logic
  const filteredProducts = products.filter(p => {
    const matchesSearch = 
      p.nameVI.toLowerCase().includes(searchTerm.toLowerCase()) ||
      p.nameEN.toLowerCase().includes(searchTerm.toLowerCase()) ||
      p.descriptionVI.toLowerCase().includes(searchTerm.toLowerCase()) ||
      p.descriptionEN.toLowerCase().includes(searchTerm.toLowerCase());

    const matchesCategory = selectedCategory === "all" || p.category === selectedCategory;
    const matchesStyle = selectedStyle === "all" || p.style === selectedStyle;
    const matchesPrice = p.priceVND <= priceRange;
    const matchesStock = !inStockOnly || p.stock > 0;

    return matchesSearch && matchesCategory && matchesStyle && matchesPrice && matchesStock;
  });

  // Cart Logic
  const handleAddToCart = (productId: string, size: string, colorIndex: number) => {
    const matchedProd = products.find(p => p.id === productId);
    if (!matchedProd) return;

    if (matchedProd.stock <= 0) {
      alert(lang === "vi" ? "Sản phẩm đã hết hàng!" : "Product is out of stock!");
      return;
    }

    const selectedColorVI = matchedProd.colorsVI[colorIndex] || matchedProd.colorsVI[0] || "Tiêu chuẩn";
    const selectedColorEN = matchedProd.colorsEN[colorIndex] || matchedProd.colorsEN[0] || "Standard";

    setCart(prevCart => {
      const existingItemIndex = prevCart.findIndex(
        item => item.product.id === productId && 
                item.selectedSize === size && 
                item.selectedColorVI === selectedColorVI
      );

      if (existingItemIndex > -1) {
        const updated = [...prevCart];
        updated[existingItemIndex].quantity += 1;
        return updated;
      } else {
        return [...prevCart, {
          product: matchedProd,
          quantity: 1,
          selectedSize: size,
          selectedColorVI,
          selectedColorEN
        }];
      }
    });

    // Animate open cart for great feedback
    setIsCartOpen(true);
  };

  const updateCartQuantity = (index: number, delta: number) => {
    setCart(prevCart => {
      const item = prevCart[index];
      const newQty = item.quantity + delta;
      
      if (newQty <= 0) {
        return prevCart.filter((_, idx) => idx !== index);
      }
      
      // Prevent ordering above available stock level
      if (newQty > item.product.stock) {
        alert(lang === "vi" 
          ? `Xin lỗi, trong kho chỉ còn ${item.product.stock} sản phẩm.` 
          : `Sorry, only ${item.product.stock} items are available in stock.`);
        return prevCart;
      }

      const updated = [...prevCart];
      updated[index].quantity = newQty;
      return updated;
    });
  };

  const removeFromCart = (index: number) => {
    setCart(prevCart => prevCart.filter((_, idx) => idx !== index));
  };

  // Cart math helper
  const cartSubtotal = cart.reduce((sum, item) => sum + item.product.priceVND * item.quantity, 0);
  
  // Coupon discount computation
  let couponDiscountAmount = 0;
  if (appliedCoupon) {
    if (appliedCoupon.discountType === "percentage") {
      couponDiscountAmount = Math.round(cartSubtotal * (appliedCoupon.discountValue / 100));
    } else {
      couponDiscountAmount = appliedCoupon.discountValue;
    }
    couponDiscountAmount = Math.min(couponDiscountAmount, cartSubtotal);
  }

  // Smart Cart Discount: Apply 10% discount on order above 1,000,000 VND if NO coupon is active
  const discountThreshold = 1000000;
  const discountRate = 0.1;
  const appliedDiscount = (!appliedCoupon && cartSubtotal >= discountThreshold) ? cartSubtotal * discountRate : 0;
  
  // Free Shipping above 500,000 VND
  const shippingFee = cartSubtotal >= 500000 || cartSubtotal === 0 ? 0 : 35000;
  const cartTotal = Math.max(0, cartSubtotal - appliedDiscount - couponDiscountAmount + shippingFee);

  // Auto-remove coupon if cart drops below required minimum order value
  useEffect(() => {
    if (appliedCoupon && cartSubtotal < appliedCoupon.minOrderValueVND) {
      setAppliedCoupon(null);
      setCouponError(lang === "vi"
        ? `Mã ${appliedCoupon.code} đã tự động gỡ do tổng đơn thấp hơn ${appliedCoupon.minOrderValueVND.toLocaleString("vi-VN")} đ`
        : `Code ${appliedCoupon.code} removed as subtotal is below minimum order value.`);
    }
  }, [cartSubtotal, appliedCoupon]);

  // Handle coupon application
  const handleApplyCoupon = async () => {
    if (!couponCode.trim()) {
      setCouponError(lang === "vi" ? "Vui lòng nhập mã khuyến mãi." : "Please enter a coupon code.");
      return;
    }
    setCouponLoading(true);
    setCouponError("");
    try {
      const response = await fetch("/api/promos/validate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code: couponCode, orderValue: cartSubtotal })
      });
      const data = await response.json();
      if (response.ok && data.success) {
        setAppliedCoupon(data);
        setCouponError("");
      } else {
        setCouponError(data.error || (lang === "vi" ? "Mã khuyến mãi không hợp lệ." : "Invalid promo code."));
        setAppliedCoupon(null);
      }
    } catch (err) {
      console.error("Coupon validation error:", err);
      setCouponError(lang === "vi" ? "Lỗi máy chủ khi xác thực mã." : "Server error validating promo code.");
    } finally {
      setCouponLoading(false);
    }
  };

  const handleRemoveCoupon = () => {
    setAppliedCoupon(null);
    setCouponCode("");
    setCouponError("");
  };

  // Checkout submission
  const handleCheckoutSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!checkoutName || !checkoutPhone || !checkoutEmail || !checkoutAddress) {
      setCheckoutError(lang === "vi" ? "Vui lòng nhập đầy đủ thông tin giao hàng." : "Please fill out all shipping details.");
      return;
    }

    setCheckoutLoading(true);
    setCheckoutError("");

    const orderItems = cart.map(item => ({
      productId: item.product.id,
      quantity: item.quantity,
      size: item.selectedSize,
      colorVI: item.selectedColorVI,
      colorEN: item.selectedColorEN
    }));

    try {
      const response = await fetch("/api/orders", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          customerName: checkoutName,
          customerPhone: checkoutPhone,
          customerEmail: checkoutEmail,
          customerAddress: checkoutAddress,
          items: orderItems,
          paymentMethod,
          promoCode: appliedCoupon?.code
        })
      });

      const data = await response.json();
      if (response.ok && data.success) {
        setCompletedOrder(data.order);
        setCheckoutStep("success");
        setCart([]); // Reset Cart
        setAppliedCoupon(null); // Reset coupon states
        setCouponCode("");
        setCouponError("");
        loadProducts(); // Sync inventory
      } else {
        setCheckoutError(data.error || (lang === "vi" ? "Đã có lỗi xảy ra. Vui lòng thử lại." : "Checkout failed. Please try again."));
      }
    } catch (err) {
      console.error("Checkout submission failed:", err);
      setCheckoutError(lang === "vi" ? "Mất kết nối server. Vui lòng thử lại." : "Server connection lost. Please try again.");
    } finally {
      setCheckoutLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#fefdf5] font-sans text-amber-950 flex flex-col justify-between selection:bg-amber-100 selection:text-amber-900">
      {/* Toast Notification for Secret Shortcut */}
      <AnimatePresence>
        {shortcutToast && shortcutToast.show && (
          <motion.div
            initial={{ opacity: 0, y: -50, scale: 0.9 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -20, scale: 0.9 }}
            className="fixed top-24 left-1/2 -translate-x-1/2 z-50 bg-amber-950 text-amber-50 border border-amber-300/30 px-5 py-3 rounded-2xl shadow-xl flex items-center gap-2 text-xs font-bold font-sans"
          >
            <ShieldCheck className="w-4 h-4 text-amber-400 shrink-0 animate-pulse" />
            <span>{shortcutToast.message}</span>
          </motion.div>
        )}
      </AnimatePresence>

      {/* 24/7 Intelligent Customer Support AI Chatbot Floating widget */}
      <AIChatbot 
        lang={lang} 
        onAddToCart={handleAddToCart} 
        products={products} 
      />

      {/* Global Brand Header / Navigation */}
      <header className="sticky top-0 z-40 bg-[#fffefc]/95 backdrop-blur-md border-b border-amber-100 shadow-sm transition-all duration-300">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-20 flex items-center justify-between">
          {/* Brand Logo & Slogan */}
          <div 
            onClick={() => setPortalMode("client")} 
            className="flex items-center gap-2.5 cursor-pointer hover:opacity-90 transition-opacity shrink-0"
          >
            <div className="relative w-11 h-11 rounded-full bg-gradient-to-br from-amber-600 via-amber-500 to-yellow-400 flex items-center justify-center shadow-md group overflow-hidden border border-amber-300 transition-transform duration-300 hover:scale-105">
              {/* Inner deep ring */}
              <span className="absolute inset-[2.5px] rounded-full bg-amber-950 flex items-center justify-center border border-amber-400/35">
                <span className="text-transparent bg-clip-text bg-gradient-to-r from-yellow-200 via-amber-300 to-yellow-100 font-serif font-black text-sm tracking-wide relative z-10 select-none">
                  ON
                </span>
              </span>
              {/* Glass sheen effect */}
              <div className="absolute inset-0 bg-gradient-to-tr from-transparent via-white/20 to-transparent translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-1000" />
            </div>
            <div>
              <h1 className="text-lg sm:text-xl font-serif font-extrabold text-amber-950 tracking-wider">
                ỐC NGUYỄN
              </h1>
              <p className="text-[9px] uppercase tracking-widest text-zinc-500 font-bold font-mono">
                {lang === "vi" ? "Thời Trang & Mỹ Phẩm" : "Fashion & Cosmetics"}
              </p>
            </div>
          </div>

          {/* Nav Controls - Bilingual, Currency, Seller Portal & Cart */}
          <div className="flex items-center gap-1.5 sm:gap-4">
            {/* Lang toggle */}
            <button 
              id="lang-toggle-btn"
              onClick={() => setLang(lang === "vi" ? "en" : "vi")}
              className="flex items-center gap-1 bg-amber-100/55 hover:bg-amber-100 text-amber-900 px-3 py-2 rounded-xl text-xs font-semibold cursor-pointer transition-colors"
              title={lang === "vi" ? "Switch to English" : "Chuyển sang Tiếng Việt"}
            >
              <Globe className="w-3.5 h-3.5" />
              <span className="uppercase">{lang === "vi" ? "EN" : "VI"}</span>
            </button>

            {/* Currency toggle */}
            <button 
              id="currency-toggle-btn"
              onClick={() => setCurrency(currency === "VND" ? "USD" : "VND")}
              className="flex items-center gap-1 bg-amber-100/55 hover:bg-amber-100 text-amber-900 px-3 py-2 rounded-xl text-xs font-mono font-bold cursor-pointer transition-colors"
              title={lang === "vi" ? "Thay đổi tiền tệ" : "Change currency"}
            >
              <ArrowLeftRight className="w-3.5 h-3.5" />
              <span>{currency}</span>
            </button>

            {/* Seller Portal Toggle Switcher */}
            {(showAdminToggle || portalMode === "seller") && (
              <button
                id="portal-toggle-btn"
                onClick={() => {
                  setPortalMode(portalMode === "client" ? "seller" : "client");
                }}
                className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-bold uppercase tracking-wider cursor-pointer transition-all border ${
                  portalMode === "seller"
                    ? "bg-amber-500 text-amber-950 border-amber-300 shadow-md font-bold"
                    : "bg-amber-950 text-white hover:bg-amber-900 border-transparent shadow-sm"
                }`}
              >
                <LayoutDashboard className="w-4 h-4" />
                <span className="hidden md:inline">
                  {portalMode === "seller" 
                    ? (lang === "vi" ? "Cửa Hàng" : "Go Storefront") 
                    : (lang === "vi" ? "Kênh Người Bán" : "Seller Portal")}
                </span>
              </button>
            )}

            {/* Smart Cart Toggle */}
            <button
              id="cart-trigger-btn"
              onClick={() => {
                setCheckoutStep("cart");
                setIsCartOpen(true);
              }}
              className="relative bg-amber-100/55 hover:bg-amber-100 text-amber-900 p-2.5 rounded-xl cursor-pointer transition-colors"
            >
              <ShoppingBag className="w-5 h-5" />
              {cart.length > 0 && (
                <span className="absolute -top-1.5 -right-1.5 bg-amber-500 text-amber-950 text-[10px] font-mono font-extrabold w-5.5 h-5.5 rounded-full flex items-center justify-center border-2 border-amber-300 shadow-md animate-bounce">
                  {cart.reduce((s, i) => s + i.quantity, 0)}
                </span>
              )}
            </button>
          </div>
        </div>
      </header>

      {/* Main Content Arena */}
      <main className="flex-grow">
        <AnimatePresence mode="wait">
          {portalMode === "seller" ? (
            /* SELLER CONTROLS DASHBOARD */
            <motion.div
              key="seller-portal"
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -15 }}
              transition={{ duration: 0.3 }}
              className="px-4 py-8"
            >
              <SellerDashboard 
                lang={lang}
                currency={currency}
                exchangeRate={exchangeRate}
                formatPrice={formatPrice}
                onRefreshProducts={loadProducts}
                products={products}
              />
            </motion.div>
          ) : (
            /* CLIENT BUYER STOREFRONT */
            <motion.div
              key="client-store"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.3 }}
            >
              {/* Premium Luxury Editorial Hero Showcase */}
              <section className="bg-gradient-to-br from-amber-50 to-yellow-100/60 text-amber-950 py-16 md:py-24 relative overflow-hidden border-b border-amber-200/50">
                <div className="absolute inset-0 bg-cover bg-center opacity-5 bg-[url('https://images.unsplash.com/photo-1490481651871-ab68de25d43d?q=80&w=1500')]" />
                <div className="absolute top-0 left-1/4 w-80 h-80 bg-amber-400/20 rounded-full blur-3xl" />
                
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10 flex flex-col md:flex-row items-center gap-12">
                  <div className="flex-1 space-y-6 text-center md:text-left">
                    <div className="inline-flex items-center gap-2 bg-amber-200 border border-amber-300 text-amber-900 px-4 py-1 rounded-full text-[10px] font-mono font-bold uppercase tracking-widest shadow-sm">
                      <Sparkles className="w-3.5 h-3.5" />
                      {lang === "vi" ? "Bộ sưu tập mùa hè Đắk Lắk 2026" : "Dak Lak Summer Collection 2026"}
                    </div>
                    <h2 className="text-4xl sm:text-5xl lg:text-6xl font-serif font-light leading-none tracking-tight text-amber-950">
                      {lang === "vi" ? "Kiến Tạo" : "We Craft"}{" "}
                      <span className="font-semibold text-amber-600 italic">
                        {lang === "vi" ? "Sự Kiêu Sa" : "Timeless Elegance"}
                      </span>
                    </h2>
                    <p className="text-amber-900/80 text-xs sm:text-sm leading-relaxed max-w-xl font-medium">
                      {lang === "vi" 
                        ? "Khám phá tủ đồ tinh tế độc quyền của Ốc Nguyễn. Nơi lụa tơ tằm dệt tay giao hòa cùng tinh dầu mỹ phẩm hữu cơ lành tính, thăng hoa nhan sắc tự nhiên bền vững." 
                        : "Discover Oc Nguyen's exquisite premium collection. Where artisan hand-woven mulberry silk meets botanical skincare essences, highlighting your natural beauty."}
                    </p>
                    
                    {/* Trust badges */}
                    <div className="flex flex-wrap justify-center md:justify-start gap-4 pt-4 text-xs font-semibold text-amber-900">
                      <span className="flex items-center gap-1 bg-white border border-amber-200 px-3 py-1.5 rounded-full shadow-sm">
                        <ShieldCheck className="w-3.5 h-3.5 text-amber-600" />
                        {lang === "vi" ? "Thanh toán bảo mật tuyệt đối" : "100% Secure Checkout"}
                      </span>
                      <span className="flex items-center gap-1 bg-white border border-amber-200 px-3 py-1.5 rounded-full shadow-sm">
                        <Award className="w-3.5 h-3.5 text-amber-600" />
                        {lang === "vi" ? "Thương hiệu Đắk Lắk uy tín" : "Dak Lak Prestigious Brand"}
                      </span>
                    </div>
                  </div>

                  {/* Featured Banner image collage */}
                  <div className="flex-1 w-full max-w-md md:max-w-none grid grid-cols-2 gap-4">
                    <img 
                      src="https://images.unsplash.com/photo-1583391733956-3750e0ff4e8b?q=80&w=400&auto=format&fit=crop" 
                      alt="Fashion banner" 
                      className="w-full h-48 md:h-64 object-cover rounded-2xl border border-amber-200/50 shadow-xl hover:scale-[1.02] transition-transform duration-300"
                    />
                    <img 
                      src="https://images.unsplash.com/photo-1586495777744-4413f21062fa?q=80&w=400&auto=format&fit=crop" 
                      alt="Cosmetics banner" 
                      className="w-full h-48 md:h-64 object-cover rounded-2xl border border-amber-200/50 shadow-xl translate-y-6 hover:scale-[1.02] transition-transform duration-300"
                    />
                  </div>
                </div>
              </section>

              {/* AI Recommendations Embed section */}
              <section className="py-12 bg-yellow-50/10">
                <AIRecommendations 
                  lang={lang}
                  currency={currency}
                  formatPrice={formatPrice}
                  onAddToCart={handleAddToCart}
                  products={products}
                />
              </section>

              {/* Catalog Section with Advanced Filter */}
              <section id="catalog-section" className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
                <div className="flex flex-col lg:flex-row gap-8 items-start">
                  
                  {/* Left Advanced Filter Sidebar */}
                  <aside className="w-full lg:w-[280px] bg-[#fffdf6] p-6 rounded-3xl border border-amber-200 shadow-sm space-y-6 shrink-0 lg:sticky lg:top-24">
                    <div className="flex items-center justify-between pb-3 border-b">
                      <h3 className="text-xs font-bold uppercase tracking-wider text-zinc-800 flex items-center gap-2">
                        <SlidersHorizontal className="w-4 h-4 text-amber-600" />
                        {lang === "vi" ? "Bộ lọc nâng cao" : "Advanced Filters"}
                      </h3>
                      {(searchTerm || selectedCategory !== "all" || selectedStyle !== "all" || priceRange !== 1500000 || inStockOnly) && (
                        <button 
                          onClick={() => {
                            setSearchTerm("");
                            setSelectedCategory("all");
                            setSelectedStyle("all");
                            setPriceRange(1500000);
                            setInStockOnly(false);
                          }}
                          className="text-[10px] text-zinc-400 hover:text-zinc-800 underline font-medium cursor-pointer"
                        >
                          {lang === "vi" ? "Thiết lập lại" : "Reset all"}
                        </button>
                      )}
                    </div>

                    {/* Search query input */}
                    <div className="space-y-1.5">
                      <label className="text-[10px] uppercase tracking-wider text-amber-900 font-bold">{lang === "vi" ? "Từ khóa tìm kiếm" : "Search Query"}</label>
                      <div className="relative">
                        <input
                          type="text"
                          value={searchTerm}
                          onChange={(e) => setSearchTerm(e.target.value)}
                          placeholder={lang === "vi" ? "Váy, đầm, son môi, serum..." : "Dress, blazer, serum..."}
                          className="w-full bg-amber-50/20 border border-amber-200/60 rounded-xl pl-9 pr-3 py-2 text-xs focus:outline-none focus:ring-1 focus:ring-amber-500 text-amber-950 focus:bg-white"
                        />
                        <Search className="w-3.5 h-3.5 text-amber-700/60 absolute left-3 top-2.5" />
                      </div>
                    </div>

                    {/* Category selectors */}
                    <div className="space-y-2">
                      <label className="text-[10px] uppercase tracking-wider text-amber-900 font-bold">{lang === "vi" ? "Phân loại sản phẩm" : "Product Category"}</label>
                      <div className="flex flex-col gap-1 text-xs">
                        {[
                          { id: "all", labelVI: "Tất cả sản phẩm", labelEN: "All Products" },
                          { id: "fashion", labelVI: "Thời Trang Thiết Kế", labelEN: "Designer Fashion" },
                          { id: "cosmetics", labelVI: "Mỹ Phẩm Hữu Cơ", labelEN: "Organic Cosmetics" }
                        ].map(cat => (
                          <button
                            key={cat.id}
                            onClick={() => setSelectedCategory(cat.id as any)}
                            className={`w-full text-left px-3 py-1.5 rounded-lg transition-colors cursor-pointer ${
                              selectedCategory === cat.id
                                ? "bg-amber-400 text-amber-950 font-bold border border-amber-300"
                                : "hover:bg-amber-100/30 text-amber-900/80 font-medium"
                            }`}
                          >
                            {lang === "vi" ? cat.labelVI : cat.labelEN}
                          </button>
                        ))}
                      </div>
                    </div>

                    {/* Style Profile Filter */}
                    <div className="space-y-2">
                      <label className="text-[10px] uppercase tracking-wider text-amber-900 font-bold">{lang === "vi" ? "Phong cách thiết kế" : "Design Aesthetic"}</label>
                      <select
                        value={selectedStyle}
                        onChange={(e) => setSelectedStyle(e.target.value)}
                        className="w-full bg-amber-50/20 border border-amber-200 rounded-xl px-3 py-2 text-xs focus:outline-none text-amber-950 focus:bg-white font-medium"
                      >
                        <option value="all">{lang === "vi" ? "Tất cả phong cách" : "All Aesthetics"}</option>
                        <option value="minimalist">{lang === "vi" ? "Tối giản (Minimalist)" : "Minimalist"}</option>
                        <option value="streetwear">{lang === "vi" ? "Cá tính (Streetwear)" : "Streetwear"}</option>
                        <option value="formal">{lang === "vi" ? "Sang trọng (Formal/Traditional)" : "Formal/Traditional"}</option>
                        <option value="casual">{lang === "vi" ? "Thường nhật (Casual)" : "Casual"}</option>
                        <option value="makeup">{lang === "vi" ? "Mỹ phẩm Trang điểm" : "Cosmetics Makeup"}</option>
                        <option value="skincare">{lang === "vi" ? "Mỹ phẩm Dưỡng da" : "Skincare Routine"}</option>
                      </select>
                    </div>

                    {/* Price Range Slider */}
                    <div className="space-y-2">
                      <div className="flex justify-between items-center text-[10px] uppercase tracking-wider text-amber-900 font-bold">
                        <span>{lang === "vi" ? "Giá tối đa" : "Max Price"}</span>
                        <span className="font-mono font-bold text-amber-950">{formatPrice(priceRange)}</span>
                      </div>
                      <input
                        type="range"
                        min="100000"
                        max="1500000"
                        step="50000"
                        value={priceRange}
                        onChange={(e) => setPriceRange(Number(e.target.value))}
                        className="w-full accent-amber-500 cursor-pointer"
                      />
                    </div>

                    {/* Stock checkbox */}
                    <label className="flex items-center gap-2 cursor-pointer pt-2 text-xs text-amber-900 font-semibold">
                      <input
                        type="checkbox"
                        checked={inStockOnly}
                        onChange={(e) => setInStockOnly(e.target.checked)}
                        className="rounded border-amber-300 accent-amber-500 text-amber-600"
                      />
                      <span>{lang === "vi" ? "Chỉ hiển thị sản phẩm còn hàng" : "In-stock items only"}</span>
                    </label>
                  </aside>

                  {/* Right Product Grid Catalog */}
                  <div className="flex-1 w-full space-y-6">
                    <div className="flex justify-between items-center text-xs text-zinc-500 border-b pb-3">
                      <span>
                        {lang === "vi" 
                          ? `Tìm thấy ${filteredProducts.length} sản phẩm tương thích` 
                          : `Found ${filteredProducts.length} matching products`}
                      </span>
                    </div>

                    {loading ? (
                      <div className="py-24 text-center text-zinc-400 text-sm flex flex-col items-center">
                        <RefreshCw className="w-6 h-6 animate-spin text-zinc-800 mb-2" />
                        <p>{lang === "vi" ? "Đang sắp xếp kệ hàng..." : "Restocking catalog shelves..."}</p>
                      </div>
                    ) : filteredProducts.length === 0 ? (
                      <div className="py-24 text-center text-zinc-400 text-sm bg-white border border-dashed rounded-3xl p-8">
                        <p>{lang === "vi" ? "Không có sản phẩm nào phù hợp với bộ lọc tìm kiếm nâng cao." : "No items match your advanced filters query."}</p>
                        <button 
                          onClick={() => {
                            setSearchTerm("");
                            setSelectedCategory("all");
                            setSelectedStyle("all");
                            setPriceRange(1500000);
                            setInStockOnly(false);
                          }}
                          className="mt-4 bg-zinc-900 hover:bg-zinc-800 text-white text-xs font-semibold px-4 py-2 rounded-xl transition-all cursor-pointer shadow-sm"
                        >
                          {lang === "vi" ? "Xóa bộ lọc" : "Clear Filters"}
                        </button>
                      </div>
                    ) : (
                      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-6">
                        {filteredProducts.map((prod) => {
                          const isLowStock = prod.stock > 0 && prod.stock <= 5;
                          const isOutOfStock = prod.stock === 0;

                          return (
                            <motion.div
                              key={prod.id}
                              id={`product-card-${prod.id}`}
                              className="bg-white rounded-2xl overflow-hidden border border-amber-100 shadow-sm flex flex-col justify-between group hover:shadow-md transition-shadow"
                              whileHover={{ y: -3 }}
                            >
                              {/* Product Thumbnail & Quick view overlay */}
                              <div className="relative overflow-hidden aspect-square shrink-0 bg-zinc-50">
                                <img 
                                  src={prod.imageUrl} 
                                  alt={lang === "vi" ? prod.nameVI : prod.nameEN} 
                                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                                />
                                
                                {/* Absolute badges */}
                                {isOutOfStock ? (
                                  <span className="absolute top-3 left-3 bg-rose-600 text-white text-[9px] font-bold uppercase tracking-widest px-2.5 py-1 rounded shadow-md">
                                    {lang === "vi" ? "Cháy hàng" : "Out of stock"}
                                  </span>
                                ) : isLowStock ? (
                                  <span className="absolute top-3 left-3 bg-amber-500 text-zinc-950 text-[9px] font-bold uppercase tracking-widest px-2.5 py-1 rounded shadow-md animate-pulse">
                                    {lang === "vi" ? `Chỉ còn ${prod.stock}` : `Only ${prod.stock} left`}
                                  </span>
                                ) : prod.originalPriceVND && prod.originalPriceVND > prod.priceVND ? (
                                  <span className="absolute top-3 left-3 bg-red-600 text-white text-[9px] font-bold uppercase tracking-widest px-2.5 py-1 rounded shadow-md animate-pulse">
                                    {lang === "vi" ? `GIẢM -${Math.round((1 - prod.priceVND / prod.originalPriceVND) * 100)}%` : `SALE -${Math.round((1 - prod.priceVND / prod.originalPriceVND) * 100)}%`}
                                  </span>
                                ) : null}

                                <span className="absolute top-3 right-3 bg-white/95 text-amber-950 text-[10px] font-mono font-bold px-2 py-0.5 rounded shadow flex items-center gap-1 border border-amber-100">
                                  <Star className="w-3 h-3 text-amber-500 fill-amber-500" />
                                  {prod.rating.toFixed(1)}
                                </span>

                                {/* Hover Eye view overlay */}
                                <div className="absolute inset-0 bg-amber-950/20 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                                  <button
                                    id={`view-detail-${prod.id}`}
                                    onClick={() => setSelectedDetailProduct(prod)}
                                    className="bg-white text-amber-950 px-4 py-2 rounded-xl text-xs font-bold flex items-center gap-1.5 cursor-pointer shadow-lg hover:bg-amber-50 transition-colors border border-amber-100"
                                  >
                                    <Eye className="w-3.5 h-3.5" />
                                    {lang === "vi" ? "Xem chi tiết" : "Quick View"}
                                  </button>
                                </div>
                              </div>

                              {/* Text info and buy buttons */}
                              <div className="p-4 space-y-2 flex-grow flex flex-col justify-between">
                                <div className="space-y-1">
                                  <span className="text-[9px] uppercase tracking-wider text-zinc-400 font-bold block">
                                    {prod.category === 'fashion' ? (lang === 'vi' ? 'Thời trang thiết kế' : 'Designer Fashion') : (lang === 'vi' ? 'Mỹ phẩm hữu cơ' : 'Organic Cosmetics')}
                                  </span>
                                  <h4 className="text-sm font-bold text-zinc-900 line-clamp-1 group-hover:text-amber-600 transition-colors">
                                    {lang === "vi" ? prod.nameVI : prod.nameEN}
                                  </h4>
                                  <p className="text-xs text-zinc-500 line-clamp-2 leading-relaxed h-8">
                                    {lang === "vi" ? prod.descriptionVI : prod.descriptionEN}
                                  </p>
                                </div>

                                <div className="pt-3 border-t border-zinc-100 flex items-center justify-between gap-2 mt-auto">
                                  <span className="text-sm font-extrabold text-zinc-950 font-mono">
                                    {formatPrice(prod.priceVND)}
                                  </span>

                                  <button
                                    id={`buy-btn-${prod.id}`}
                                    onClick={() => handleAddToCart(prod.id, prod.sizes[0] || "Standard", 0)}
                                    disabled={isOutOfStock}
                                    className={`px-3 py-1.5 rounded-xl text-xs font-bold tracking-wider transition-all shadow-sm cursor-pointer ${
                                      isOutOfStock 
                                        ? "bg-amber-100/40 text-amber-900/40 cursor-not-allowed" 
                                        : "bg-amber-500 text-amber-950 hover:bg-amber-600"
                                    }`}
                                  >
                                    {isOutOfStock ? (lang === "vi" ? "Hết hàng" : "Sold out") : (lang === "vi" ? "Thêm" : "Add")}
                                  </button>
                                </div>
                              </div>
                            </motion.div>
                          );
                        })}
                      </div>
                    )}
                  </div>

                </div>
              </section>
            </motion.div>
          )}
        </AnimatePresence>
      </main>

      {/* Global Bottom Footer with contact information requested */}
      <footer className="bg-[#fffefb] text-amber-950/80 border-t border-amber-200 pt-16 pb-8 font-sans">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 grid grid-cols-1 md:grid-cols-3 gap-12 pb-12 border-b border-amber-100">
          
          {/* Brand block */}
          <div className="space-y-4">
            <div className="flex items-center gap-3 text-amber-950">
              <div className="bg-amber-500 text-amber-950 font-mono font-black w-9 h-9 rounded-xl flex items-center justify-center text-sm shadow-sm">
                ỐN
              </div>
              <h2 className="text-lg font-serif font-extrabold uppercase tracking-widest text-amber-950">ỐC NGUYỄN</h2>
            </div>
            <p className="text-xs leading-relaxed text-amber-900/70 font-medium">
              {lang === "vi" 
                ? "Thương hiệu thời trang lụa tơ tằm gấm hoa và mỹ phẩm hữu cơ cao cấp Đắk Lắk. Mang phong cách thanh lịch hiện đại và tư vấn chuyên nghiệp tối ưu." 
                : "A premium Dak Lak lifestyle house curating hand-woven mulberry silk and botanical cosmetics. Dedicated to quiet modern elegance."}
            </p>
          </div>

          {/* Quick links */}
          <div className="space-y-4">
            <h3 className="text-amber-950 font-bold font-mono text-xs font-bold uppercase tracking-wider">{lang === "vi" ? "Chính sách & An toàn" : "Policies & Trust"}</h3>
            <ul className="text-xs space-y-2.5 font-medium text-amber-900/80">
              <li>✓ {lang === "vi" ? "Thanh toán bảo mật SSL 256-bit" : "Secure 256-bit SSL Gateway"}</li>
              <li>✓ {lang === "vi" ? "Miễn phí vận chuyển toàn quốc từ 500.000đ" : "Free shipping nationwide from 500,000 VND"}</li>
              <li>✓ {lang === "vi" ? "Hỗ trợ khách hàng 24/7 bằng Trí tuệ ảo AI" : "24/7 automated support powered by AI"}</li>
            </ul>
          </div>

          {/* Contact Details requested */}
          <div className="space-y-4">
            <h3 className="text-amber-950 font-bold font-mono text-xs font-bold uppercase tracking-wider">{lang === "vi" ? "Liên hệ Ốc Nguyễn" : "Contact Information"}</h3>
            <ul className="text-xs space-y-3 font-medium text-amber-900/80">
              <li className="flex items-center gap-2.5">
                <Phone className="w-4 h-4 text-amber-600 shrink-0" />
                <span>0367.408.875</span>
              </li>
              <li className="flex items-center gap-2.5">
                <Mail className="w-4 h-4 text-amber-600 shrink-0" />
                <span className="truncate">thoitrangmyphamocnguyen@gmail.com</span>
              </li>
              <li className="flex items-center gap-2.5 items-start">
                <MapPin className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                <span className="leading-normal">Phường An Lạc, thị xã Buôn Hồ, tỉnh Đắk Lắk, Việt Nam</span>
              </li>
            </ul>
          </div>

        </div>

        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-8 flex flex-col sm:flex-row items-center justify-between gap-4 text-[10px] text-amber-800/60 font-mono">
          <p>© 2026 Ốc Nguyễn Brand. All rights reserved. Crafted beautifully.</p>
          <div className="flex gap-4">
            <span>Powered by Gemini 3.5-flash AI Model</span>
            <span>Security verified</span>
          </div>
        </div>
      </footer>

      {/* Product Detail Quick View Modal */}
      <AnimatePresence>
        {selectedDetailProduct && (
          <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <motion.div
              className="bg-white rounded-3xl overflow-hidden max-w-2xl w-full border border-zinc-200 shadow-2xl relative flex flex-col md:flex-row h-auto md:h-[420px]"
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
            >
              {/* Close Button */}
              <button
                id="close-modal-btn"
                onClick={() => setSelectedDetailProduct(null)}
                className="absolute top-4 right-4 z-10 bg-black/60 hover:bg-black text-white p-1.5 rounded-full cursor-pointer transition-colors"
              >
                <X className="w-4 h-4" />
              </button>

              <img 
                src={selectedDetailProduct.imageUrl} 
                alt={selectedDetailProduct.nameVI} 
                className="w-full md:w-1/2 h-48 md:h-full object-cover shrink-0" 
              />

              <div className="p-6 md:p-8 flex flex-col justify-between flex-1">
                <div className="space-y-3">
                  <span className="text-[9px] uppercase tracking-wider text-zinc-400 font-bold block">
                    {selectedDetailProduct.category}
                  </span>
                  <h3 className="text-xl font-serif font-bold text-zinc-950">
                    {lang === "vi" ? selectedDetailProduct.nameVI : selectedDetailProduct.nameEN}
                  </h3>
                  <p className="text-sm font-mono font-extrabold text-zinc-800">
                    {formatPrice(selectedDetailProduct.priceVND)}
                  </p>
                  <p className="text-xs text-zinc-500 leading-relaxed max-h-36 overflow-y-auto pr-1">
                    {lang === "vi" ? selectedDetailProduct.descriptionVI : selectedDetailProduct.descriptionEN}
                  </p>
                </div>

                <div className="pt-4 border-t border-zinc-100 flex gap-2">
                  <button
                    id="add-from-modal-btn"
                    onClick={() => {
                      handleAddToCart(selectedDetailProduct.id, selectedDetailProduct.sizes[0] || "Standard", 0);
                      setSelectedDetailProduct(null);
                    }}
                    className="flex-1 bg-amber-500 text-amber-950 hover:bg-amber-600 py-3 rounded-xl text-xs font-bold tracking-wider transition-colors cursor-pointer"
                  >
                    {lang === "vi" ? "Thêm Vào Giỏ Hàng" : "Add to Cart"}
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Smart Shopping Cart Slider Panel */}
      <AnimatePresence>
        {isCartOpen && (
          <div className="fixed inset-0 z-50 flex justify-end">
            {/* Backdrop */}
            <div 
              className="absolute inset-0 bg-black/50 backdrop-blur-xs" 
              onClick={() => setIsCartOpen(false)}
            />

            {/* Slide-out drawer body */}
            <motion.div
              id="shopping-cart-drawer"
              className="relative w-full sm:w-[480px] h-full bg-white shadow-3xl z-10 flex flex-col justify-between font-sans"
              initial={{ x: "100%" }}
              animate={{ x: 0 }}
              exit={{ x: "100%" }}
              transition={{ type: "tween", duration: 0.3 }}
            >
              {/* Header */}
              <div className="p-6 border-b border-amber-200 flex items-center justify-between bg-amber-500 text-amber-950">
                <div className="flex items-center gap-2">
                  <ShoppingBag className="w-5 h-5 text-amber-950" />
                  <h3 className="font-serif font-extrabold text-base tracking-wider text-amber-950">
                    {lang === "vi" ? "GIỎ HÀNG THÔNG MINH" : "SMART SHOPPING BAG"}
                  </h3>
                </div>
                <button
                  id="close-cart-btn"
                  onClick={() => setIsCartOpen(false)}
                  className="text-amber-900 hover:text-amber-950 transition-colors cursor-pointer p-1"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Steps panel handler (cart -> checkout details -> success receipt) */}
              {checkoutStep === "cart" && (
                <div className="flex-grow flex flex-col justify-between overflow-hidden">
                  {/* Cart items scroll list */}
                  <div className="flex-grow overflow-y-auto p-6 space-y-4">
                    {cart.length === 0 ? (
                      <div className="text-center py-20 text-zinc-400 text-xs">
                        <ShoppingBag className="w-12 h-12 text-zinc-200 mx-auto mb-3" />
                        <p>{lang === "vi" ? "Chưa có sản phẩm trong giỏ hàng." : "Your shopping cart is currently empty."}</p>
                      </div>
                    ) : (
                      cart.map((item, index) => (
                        <div key={index} className="flex gap-4 border-b border-zinc-100 pb-4">
                          <img 
                            src={item.product.imageUrl} 
                            alt={item.product.nameVI} 
                            className="w-16 h-16 object-cover rounded-xl" 
                          />
                          <div className="flex-grow space-y-1">
                            <div className="flex justify-between items-start gap-2">
                              <h4 className="text-xs font-bold text-zinc-900 line-clamp-1">
                                {lang === "vi" ? item.product.nameVI : item.product.nameEN}
                              </h4>
                              <button 
                                onClick={() => removeFromCart(index)}
                                className="text-zinc-400 hover:text-rose-600 transition-colors cursor-pointer shrink-0"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </div>
                            
                            <p className="text-[10px] text-zinc-500 font-semibold font-mono tracking-wider">
                              Size: {item.selectedSize} | {lang === "vi" ? `Màu: ${item.selectedColorVI}` : `Color: ${item.selectedColorEN}`}
                            </p>

                            <div className="flex justify-between items-center pt-1">
                              {/* Quantity selectors with minimum 44px hit-targets */}
                              <div className="flex items-center border rounded-lg bg-zinc-50">
                                <button
                                  onClick={() => updateCartQuantity(index, -1)}
                                  className="p-1.5 hover:bg-zinc-200 rounded-l-lg transition-colors cursor-pointer text-zinc-600"
                                >
                                  <Minus className="w-3 h-3" />
                                </button>
                                <span className="px-3 font-mono text-xs font-bold text-zinc-800">
                                  {item.quantity}
                                </span>
                                <button
                                  onClick={() => updateCartQuantity(index, 1)}
                                  className="p-1.5 hover:bg-zinc-200 rounded-r-lg transition-colors cursor-pointer text-zinc-600"
                                >
                                  <Plus className="w-3 h-3" />
                                </button>
                              </div>

                              <span className="text-xs font-bold font-mono text-zinc-950">
                                {formatPrice(item.product.priceVND * item.quantity)}
                              </span>
                            </div>
                          </div>
                        </div>
                      ))
                    )}
                  </div>

                  {/* Summary math & action footer */}
                  {cart.length > 0 && (
                    <div className="p-6 bg-zinc-50 border-t border-zinc-100 space-y-3 shrink-0">
                      {/* Coupon Promo Code Input Box */}
                      <div className="space-y-2 border-b border-zinc-200 pb-3">
                        <label className="text-[10px] uppercase tracking-wider text-amber-900 font-extrabold flex items-center gap-1">
                          <Award className="w-3.5 h-3.5" />
                          {lang === "vi" ? "Mã Khuyến Mãi / Sự Kiện" : "Promo Code / Event Voucher"}
                        </label>
                        
                        {!appliedCoupon ? (
                          <div className="flex gap-2">
                            <input
                              type="text"
                              value={couponCode}
                              onChange={(e) => {
                                setCouponCode(e.target.value);
                                setCouponError("");
                              }}
                              placeholder={lang === "vi" ? "Nhập mã (TET2026, HE2026...)" : "Enter code (TET2026, HE2026...)"}
                              className="flex-grow bg-white border border-zinc-200 rounded-xl px-3 py-2 text-xs focus:outline-none focus:ring-1 focus:ring-amber-500 uppercase font-mono text-zinc-800"
                              disabled={couponLoading}
                            />
                            <button
                              type="button"
                              onClick={handleApplyCoupon}
                              disabled={couponLoading || !couponCode.trim()}
                              className="bg-amber-950 text-white px-4 py-2 rounded-xl text-xs font-bold hover:bg-amber-900 cursor-pointer transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                              {couponLoading ? (
                                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                              ) : (
                                lang === "vi" ? "Áp dụng" : "Apply"
                              )}
                            </button>
                          </div>
                        ) : (
                          <div className="flex items-center justify-between bg-amber-50 border border-amber-200 p-2.5 rounded-xl">
                            <div className="flex flex-col">
                              <span className="text-xs font-bold text-amber-950 flex items-center gap-1 font-mono">
                                <Check className="w-3.5 h-3.5 text-emerald-600" />
                                {appliedCoupon.code}
                              </span>
                              <span className="text-[9px] text-amber-900/80 leading-tight">
                                {lang === "vi" ? appliedCoupon.descriptionVI : appliedCoupon.descriptionEN}
                              </span>
                            </div>
                            <button
                              type="button"
                              onClick={handleRemoveCoupon}
                              className="text-rose-500 hover:text-rose-700 font-bold text-xs p-1 transition-colors cursor-pointer"
                            >
                              {lang === "vi" ? "Gỡ" : "Remove"}
                            </button>
                          </div>
                        )}
                        
                        {couponError && (
                          <p className="text-[10px] text-rose-600 font-semibold animate-pulse">
                            ⚠️ {couponError}
                          </p>
                        )}
                      </div>

                      <div className="flex justify-between text-xs text-zinc-600">
                        <span>{lang === "vi" ? "Tạm tính" : "Subtotal"}</span>
                        <span className="font-mono">{formatPrice(cartSubtotal)}</span>
                      </div>

                      {/* Coupon discount indicator */}
                      {couponDiscountAmount > 0 && appliedCoupon && (
                        <div className="flex justify-between text-xs text-emerald-600 font-semibold bg-emerald-50 px-3 py-1.5 rounded-xl border border-emerald-100 items-center">
                          <span className="flex items-center gap-1">
                            <Award className="w-3.5 h-3.5 text-emerald-600" />
                            <span>{lang === "vi" ? `Giảm giá mã: ${appliedCoupon.code}` : `Promo Code: ${appliedCoupon.code}`}</span>
                          </span>
                          <span className="font-mono">-{formatPrice(couponDiscountAmount)}</span>
                        </div>
                      )}

                      {/* AI applied smart discount indicator */}
                      {appliedDiscount > 0 && (
                        <div className="flex justify-between text-xs text-emerald-600 font-semibold bg-emerald-50 px-3 py-1.5 rounded-xl border border-emerald-100 items-center">
                          <span className="flex items-center gap-1">
                            <Sparkles className="w-3.5 h-3.5" />
                            {lang === "vi" ? "Ưu đãi thông minh Ốc Nguyễn (10%)" : "Smart discount tier 10%"}
                          </span>
                          <span className="font-mono">-{formatPrice(appliedDiscount)}</span>
                        </div>
                      )}

                      <div className="flex justify-between text-xs text-zinc-600">
                        <span>{lang === "vi" ? "Phí vận chuyển" : "Delivery"}</span>
                        <span className="font-mono">
                          {shippingFee === 0 
                            ? (lang === "vi" ? "Miễn phí" : "Free") 
                            : formatPrice(shippingFee)}
                        </span>
                      </div>

                      <div className="flex justify-between text-sm font-bold text-zinc-950 pt-2 border-t">
                        <span>{lang === "vi" ? "Tổng cộng" : "Total Amount"}</span>
                        <span className="font-mono text-base">{formatPrice(cartTotal)}</span>
                      </div>

                      <button
                        id="go-to-info-btn"
                        onClick={() => setCheckoutStep("info")}
                        className="w-full bg-amber-500 hover:bg-amber-600 text-amber-950 py-3.5 rounded-xl text-xs font-bold tracking-wider uppercase transition-colors shadow-md mt-2 cursor-pointer text-center"
                      >
                        {lang === "vi" ? "Tiến Hành Đặt Hàng" : "Proceed to Checkout"}
                      </button>
                    </div>
                  )}
                </div>
              )}

              {/* Step 2: SECURE SHIPPING INFO & SIMULATED PAYMENTS */}
              {checkoutStep === "info" && (
                <form onSubmit={handleCheckoutSubmit} className="flex-grow flex flex-col justify-between overflow-hidden">
                  <div className="flex-grow overflow-y-auto p-6 space-y-5">
                    <div className="flex items-center gap-2 border-b pb-2 mb-2">
                      <button 
                        type="button" 
                        onClick={() => setCheckoutStep("cart")}
                        className="text-zinc-500 hover:text-zinc-800 text-xs font-bold flex items-center gap-1 cursor-pointer"
                      >
                        ← {lang === "vi" ? "Quay lại" : "Back"}
                      </button>
                    </div>

                    <h4 className="text-xs font-bold uppercase tracking-widest text-zinc-500 font-mono">
                      {lang === "vi" ? "Thông tin người nhận" : "Shipping recipient information"}
                    </h4>

                    {checkoutError && (
                      <div className="bg-rose-50 border border-rose-200 text-rose-700 text-xs p-3.5 rounded-xl flex items-center gap-2">
                        <AlertCircle className="w-4 h-4 shrink-0" />
                        <span>{checkoutError}</span>
                      </div>
                    )}

                    <div className="space-y-3.5">
                      <div>
                        <label className="text-[10px] uppercase tracking-wider text-zinc-500 font-bold block mb-1">
                          {lang === "vi" ? "Họ & Tên khách hàng" : "Full Name"} *
                        </label>
                        <input
                          type="text"
                          required
                          value={checkoutName}
                          onChange={(e) => setCheckoutName(e.target.value)}
                          placeholder={lang === "vi" ? "Ví dụ: Nguyễn Văn A" : "e.g. John Doe"}
                          className="w-full bg-zinc-50 border border-zinc-200 rounded-xl px-3.5 py-2.5 text-xs focus:outline-none focus:ring-1 focus:ring-black text-zinc-800"
                        />
                      </div>

                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <label className="text-[10px] uppercase tracking-wider text-zinc-500 font-bold block mb-1">
                            {lang === "vi" ? "Số Điện Thoại" : "Phone Number"} *
                          </label>
                          <input
                            type="tel"
                            required
                            value={checkoutPhone}
                            onChange={(e) => setCheckoutPhone(e.target.value)}
                            placeholder="0367xxxxxx"
                            className="w-full bg-zinc-50 border border-zinc-200 rounded-xl px-3.5 py-2.5 text-xs focus:outline-none focus:ring-1 focus:ring-black text-zinc-800"
                          />
                        </div>
                        <div>
                          <label className="text-[10px] uppercase tracking-wider text-zinc-500 font-bold block mb-1">
                            {lang === "vi" ? "Địa chỉ Email" : "Email Address"} *
                          </label>
                          <input
                            type="email"
                            required
                            value={checkoutEmail}
                            onChange={(e) => setCheckoutEmail(e.target.value)}
                            placeholder="username@gmail.com"
                            className="w-full bg-zinc-50 border border-zinc-200 rounded-xl px-3.5 py-2.5 text-xs focus:outline-none focus:ring-1 focus:ring-black text-zinc-800"
                          />
                        </div>
                      </div>

                      <div>
                        <label className="text-[10px] uppercase tracking-wider text-zinc-500 font-bold block mb-1">
                          {lang === "vi" ? "Địa chỉ nhận hàng (Đầy đủ)" : "Delivery Address (Full)"} *
                        </label>
                        <textarea
                          required
                          value={checkoutAddress}
                          onChange={(e) => setCheckoutAddress(e.target.value)}
                          placeholder={lang === "vi" ? "Địa chỉ nhà, tên đường, Phường/Xã, Quận/Huyện, Tỉnh..." : "Apartment/House, Street, District, City..."}
                          rows={2}
                          className="w-full bg-zinc-50 border border-zinc-200 rounded-xl px-3.5 py-2.5 text-xs focus:outline-none focus:ring-1 focus:ring-black text-zinc-800"
                        />
                      </div>
                    </div>

                    {/* Payment methods section requested */}
                    <div className="space-y-3 pt-4 border-t border-zinc-100">
                      <h4 className="text-xs font-bold uppercase tracking-widest text-zinc-500 font-mono">
                        {lang === "vi" ? "Thanh toán trực tuyến bảo mật" : "Secure Payment Integration"}
                      </h4>

                      <div className="grid grid-cols-3 gap-2">
                        {[
                          { id: "cod", labelVI: "Nhận hàng COD", labelEN: "Cash COD", icon: Truck },
                          { id: "bank", labelVI: "Chuyển khoản QR", labelEN: "Bank QR", icon: LayoutDashboard },
                          { id: "card", labelVI: "Thẻ Visa/Master", labelEN: "Credit Card", icon: CreditCard }
                        ].map(method => {
                          const IconComp = method.icon;
                          const isSelected = paymentMethod === method.id;
                          return (
                            <button
                              key={method.id}
                              type="button"
                              onClick={() => setPaymentMethod(method.id as any)}
                              className={`p-3 rounded-xl border flex flex-col items-center gap-1.5 cursor-pointer text-center transition-all ${
                                isSelected
                                  ? "bg-amber-500 text-amber-950 border-amber-400 shadow-md scale-[1.02] font-extrabold"
                                  : "bg-white text-zinc-600 hover:bg-zinc-50 border-zinc-200"
                              }`}
                            >
                              <IconComp className="w-4 h-4" />
                              <span className="text-[10px] tracking-tight leading-none">
                                {lang === "vi" ? method.labelVI : method.labelEN}
                              </span>
                            </button>
                          );
                        })}
                      </div>

                      {/* Display specific payment simulations */}
                      <AnimatePresence mode="wait">
                        {paymentMethod === "bank" && (
                          <motion.div 
                            className="bg-zinc-50 border p-4 rounded-2xl flex flex-col items-center gap-3"
                            initial={{ opacity: 0, height: 0 }}
                            animate={{ opacity: 1, height: "auto" }}
                            exit={{ opacity: 0, height: 0 }}
                          >
                            <div className="w-24 h-24 bg-white border border-zinc-200 rounded-xl p-1 flex items-center justify-center relative shadow-sm">
                              {/* Standard VietQR template simulation */}
                              <div className="w-full h-full bg-[url('https://images.unsplash.com/photo-1543269865-cbf427effbad?q=80&w=200')] bg-cover opacity-10" />
                              <div className="absolute inset-0 flex flex-col items-center justify-center p-2 text-center text-[8px] font-mono leading-tight font-extrabold text-zinc-800">
                                <span>ỐC NGUYỄN VIETQR</span>
                                <span className="bg-black text-white px-1.5 py-0.5 rounded text-[7px] mt-1 uppercase">Scan QR</span>
                              </div>
                            </div>
                            <div className="text-center text-[10px] text-zinc-500 space-y-0.5 leading-relaxed">
                              <p className="font-bold text-zinc-800">Ngân hàng MB Bank (Quân Đội)</p>
                              <p>Số tài khoản VIP: <span className="font-mono font-bold text-zinc-950">0367408875</span></p>
                              <p>Chủ tài khoản: <span className="font-bold text-zinc-950">NGUYỄN THỊ ỐC</span></p>
                              <p>{lang === "vi" ? "Nội dung chuyển khoản: Tên của bạn + SĐT" : "Note: Your Name + Phone"}</p>
                            </div>
                          </motion.div>
                        )}

                        {paymentMethod === "card" && (
                          <motion.div 
                            className="bg-zinc-950 text-white p-4 rounded-2xl space-y-3 shadow-md"
                            initial={{ opacity: 0, height: 0 }}
                            animate={{ opacity: 1, height: "auto" }}
                            exit={{ opacity: 0, height: 0 }}
                          >
                            <div className="flex justify-between items-center text-[10px] font-mono tracking-widest text-zinc-400">
                              <span>VISA GOLD CUSTOMER</span>
                              <CreditCard className="w-4 h-4 text-amber-400" />
                            </div>
                            <div className="space-y-2">
                              <div className="relative">
                                <input
                                  type="text"
                                  placeholder="4111 2222 3333 4444"
                                  maxLength={19}
                                  className="w-full bg-zinc-900 border border-zinc-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-amber-400 font-mono placeholder:text-zinc-700"
                                />
                              </div>
                              <div className="grid grid-cols-2 gap-2">
                                <input
                                  type="text"
                                  placeholder="MM/YY"
                                  maxLength={5}
                                  className="w-full bg-zinc-900 border border-zinc-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-amber-400 font-mono placeholder:text-zinc-700"
                                />
                                <input
                                  type="password"
                                  placeholder="CVV"
                                  maxLength={3}
                                  className="w-full bg-zinc-900 border border-zinc-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-amber-400 font-mono placeholder:text-zinc-700"
                                />
                              </div>
                            </div>
                            <p className="text-[9px] text-zinc-500 text-center leading-normal">
                              🛡️ {lang === "vi" ? "Thông tin thẻ tín dụng của bạn được mã hóa SSL an toàn." : "Your credit card details are encrypted with bank-level security."}
                            </p>
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </div>

                  </div>

                  {/* Submission triggers */}
                  <div className="p-6 bg-zinc-50 border-t border-zinc-100 shrink-0 space-y-2">
                    <div className="flex justify-between text-xs text-zinc-600">
                      <span>{lang === "vi" ? "Tổng cộng phải trả" : "Total Payment"}</span>
                      <span className="font-mono font-bold text-zinc-900">{formatPrice(cartTotal)}</span>
                    </div>

                    <button
                      id="submit-checkout-btn"
                      type="submit"
                      disabled={checkoutLoading}
                      className="w-full bg-amber-500 hover:bg-amber-600 text-amber-950 py-3.5 rounded-xl text-xs font-bold tracking-wider uppercase transition-all shadow-md mt-2 flex items-center justify-center gap-2 cursor-pointer"
                    >
                      {checkoutLoading ? (
                        <>
                          <RefreshCw className="w-4 h-4 animate-spin" />
                          {lang === "vi" ? "ĐANG XỬ LÝ THANH TOÁN..." : "SECURING PAYMENT TRANSACTION..."}
                        </>
                      ) : (
                        <>
                          <ShieldCheck className="w-4 h-4" />
                          {lang === "vi" ? "XÁC NHẬN ĐẶT HÀNG AN TOÀN" : "SECURE CONFIRM ORDER"}
                        </>
                      )}
                    </button>
                  </div>
                </form>
              )}

              {/* Step 3: SUCCESS CONFIRMATION RECEIPT */}
              {checkoutStep === "success" && completedOrder && (
                <div className="flex-grow flex flex-col justify-between overflow-hidden">
                  <div className="flex-grow overflow-y-auto p-6 space-y-6 text-center flex flex-col items-center justify-center">
                    <div className="w-16 h-16 bg-emerald-50 text-emerald-600 rounded-full flex items-center justify-center border border-emerald-200 shadow-sm mb-2 animate-bounce">
                      <Check className="w-8 h-8" />
                    </div>

                    <div className="space-y-2 max-w-sm">
                      <h4 className="text-lg font-serif font-bold text-zinc-900">
                        {lang === "vi" ? "Đặt hàng thành công!" : "Order Placed Successfully!"}
                      </h4>
                      <p className="text-xs text-zinc-500 leading-relaxed">
                        {lang === "vi" 
                          ? `Cảm ơn quý khách ${completedOrder.customerName}. Đơn hàng #${completedOrder.id} đã được tiếp nhận an toàn.` 
                          : `Thank you, Mr/Ms ${completedOrder.customerName}. Your order #${completedOrder.id} has been recorded successfully.`}
                      </p>
                    </div>

                    {/* Simulation receipt detail */}
                    <div className="bg-zinc-50 border border-zinc-100 p-4 rounded-2xl w-full text-left space-y-3 text-xs">
                      <div className="flex justify-between border-b pb-2 font-mono">
                        <span className="text-zinc-400">{lang === "vi" ? "Mã đơn hàng" : "Order reference"}</span>
                        <span className="font-bold text-zinc-800">#{completedOrder.id}</span>
                      </div>
                      <div className="flex justify-between border-b pb-2">
                        <span className="text-zinc-400">Email</span>
                        <span className="font-medium truncate text-zinc-800 max-w-[200px]">{completedOrder.customerEmail}</span>
                      </div>
                      <div className="flex justify-between border-b pb-2">
                        <span className="text-zinc-400">{lang === "vi" ? "Phương thức" : "Payment"}</span>
                        <span className="font-medium text-zinc-800 uppercase font-mono">{completedOrder.paymentMethod}</span>
                      </div>
                      <div className="flex justify-between pt-1 font-mono font-bold text-zinc-950 text-sm">
                        <span>{lang === "vi" ? "Tổng cộng" : "Amount Paid"}</span>
                        <span>{formatPrice(completedOrder.totalAmountVND)}</span>
                      </div>
                    </div>

                    {/* Automatic notification alert confirmation details */}
                    <div className="bg-amber-50/60 border border-amber-200/50 p-4 rounded-xl text-left w-full text-[11px] text-amber-800 space-y-1 leading-relaxed">
                      <p className="font-bold flex items-center gap-1.5">
                        <Sparkles className="w-3.5 h-3.5 text-amber-600" />
                        {lang === "vi" ? "Hệ thống email tự động đã gửi:" : "Automated confirmation sent:"}
                      </p>
                      <p>
                        {lang === "vi"
                          ? `Hệ thống Ốc Nguyễn đã gửi 1 email hóa đơn tự động cùng mã theo dõi bưu phẩm về hộp thư của bạn: ${completedOrder.customerEmail}.`
                          : `Oc Nguyen has dispatched an automated receipt with tracking numbers to: ${completedOrder.customerEmail}.`}
                      </p>
                    </div>
                  </div>

                  <div className="p-6 shrink-0">
                    <button
                      id="finish-checkout-btn"
                      onClick={() => {
                        setIsCartOpen(false);
                        setCheckoutStep("cart");
                      }}
                      className="w-full bg-zinc-950 hover:bg-zinc-800 text-white py-3.5 rounded-xl text-xs font-bold tracking-wider uppercase transition-colors shadow-md cursor-pointer text-center"
                    >
                      {lang === "vi" ? "Tiếp tục mua sắm" : "Continue Shopping"}
                    </button>
                  </div>
                </div>
              )}

            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
