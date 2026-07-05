import React, { useState } from "react";
import { Sparkles, Heart, HelpCircle, Loader, ArrowRight, Check } from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { Product, RecommendedProduct, Language, Currency } from "../types";

interface AIRecommendationsProps {
  lang: Language;
  currency: Currency;
  formatPrice: (amount: number) => string;
  onAddToCart: (productId: string, size: string, colorIndex: number) => void;
  products: Product[];
}

export default function AIRecommendations({
  lang, currency, formatPrice, onAddToCart, products
}: AIRecommendationsProps) {
  const [selectedPreference, setSelectedPreference] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [recommendations, setRecommendations] = useState<RecommendedProduct[]>([]);
  const [successAddId, setSuccessAddId] = useState<string | null>(null);

  const styleProfiles = [
    {
      id: "minimalist",
      labelVI: "Tối giản & Thanh lịch",
      labelEN: "Minimalist & Elegant",
      emoji: "🌸",
      descVI: "Bạn thích màu sắc trung tính, phom dáng cơ bản nhưng đứng dáng, sang trọng kín đáo.",
      descEN: "You prefer neutral colors, classic structured lines, and effortless quiet luxury."
    },
    {
      id: "streetwear",
      labelVI: "Streetwear Cá tính",
      labelEN: "Urban Streetwear",
      emoji: "🔥",
      descVI: "Bạn cá tính, thích đồ rộng oversize mộc mạc phong cách thành thị năng động.",
      descEN: "Bold, modern, oversized pieces suited for everyday high-energy urban environments."
    },
    {
      id: "formal",
      labelVI: "Trang trọng & Quý phái",
      labelEN: "Traditional & Formal",
      emoji: "👑",
      descVI: "Áo dài truyền thống gấm lụa cao cấp, thích hợp dự tiệc lớn hoặc lễ hội rực rỡ.",
      descEN: "Premium traditional Vietnamese Ao Dai and silk slip dresses for large banquets."
    },
    {
      id: "casual",
      labelVI: "Thoải mái Thường nhật",
      labelEN: "Casual & Breathable",
      emoji: "🌿",
      descVI: "Bạn ưu tiên chất vải Linen tự nhiên, tơ lanh thoáng khí mặc nhẹ tênh như không.",
      descEN: "Natural fibers like high-quality linen made for breezy, stress-free everyday comfort."
    },
    {
      id: "skincare",
      labelVI: "Dưỡng da Organics lành tính",
      labelEN: "Organic Skincare Glow",
      emoji: "🧴",
      descVI: "Bạn chú trọng cấp ẩm, hồi phục màng bảo vệ da với chiết xuất hoa hồng, rau má.",
      descEN: "Prioritizing skin recovery, natural hydrosols, B5 serums, and lightweight SPF."
    },
    {
      id: "makeup",
      labelVI: "Trang điểm tự nhiên Hàn Quốc",
      labelEN: "Effortless Clean Makeup",
      emoji: "💄",
      descVI: "Thích làn môi lì quyến rũ lâu trôi phối kem chống nắng nâng tông tự nhiên.",
      descEN: "Matte kissable lip stains paired with radiant Broad-Spectrum sun protection."
    }
  ];

  const handleFetchRecommendations = async (styleId: string) => {
    setSelectedPreference(styleId);
    setLoading(true);
    try {
      const response = await fetch("/api/recommendations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ stylePreference: styleId })
      });
      const data = await response.json();
      if (data.recommendedProducts) {
        setRecommendations(data.recommendedProducts);
      }
    } catch (err) {
      console.error("Failed to generate AI styling advice:", err);
    } finally {
      setLoading(false);
    }
  };

  const handleAddWithFeedback = (productId: string, size: string) => {
    onAddToCart(productId, size, 0);
    setSuccessAddId(productId);
    setTimeout(() => setSuccessAddId(null), 1500);
  };

  return (
    <div id="ai-recommendations-wrapper" className="bg-yellow-50/50 text-zinc-900 rounded-3xl p-6 md:p-8 max-w-7xl mx-auto font-sans relative overflow-hidden border border-amber-200 shadow-md">
      {/* Visual background details */}
      <div className="absolute top-0 right-0 w-64 h-64 bg-amber-400/10 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-0 left-0 w-64 h-64 bg-amber-100/20 rounded-full blur-3xl pointer-events-none" />

      {/* Header */}
      <div className="relative z-10 text-center max-w-2xl mx-auto mb-8">
        <div className="inline-flex items-center gap-2 bg-amber-100 border border-amber-300 text-amber-800 px-3.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-widest mb-3">
          <Sparkles className="w-3.5 h-3.5" />
          {lang === "vi" ? "Đề Xuất Cá Nhân Hóa Bằng AI" : "AI Personalized Recommendations"}
        </div>
        <h2 className="text-2xl md:text-3xl font-serif font-semibold text-amber-950">
          {lang === "vi" ? "Tìm Kiếm Phong Cách Riêng Của Bạn" : "Discover Your Personal Aesthetic"}
        </h2>
        <p className="text-xs text-amber-900/70 mt-2 leading-relaxed font-medium">
          {lang === "vi" 
            ? "Hãy chọn phong cách hoặc nhu cầu chăm sóc sắc đẹp hiện tại của bạn. Trí tuệ ảo Ốc Nguyễn (Gemini AI) sẽ đề xuất riêng những sản phẩm hoàn hảo nhất cho tủ đồ của bạn."
            : "Select your lifestyle aesthetic or skincare goal. Oc Nguyen's Gemini AI styling model will dynamically curate the absolute perfect matches for you."}
        </p>
      </div>

      {/* Style Profiles Grid Selector */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 relative z-10">
        {styleProfiles.map((profile) => {
          const isSelected = selectedPreference === profile.id;
          return (
            <button
              key={profile.id}
              id={`style-btn-${profile.id}`}
              onClick={() => handleFetchRecommendations(profile.id)}
              className={`p-5 rounded-2xl text-left border cursor-pointer transition-all flex flex-col justify-between h-[150px] ${
                isSelected
                  ? "bg-amber-400 text-amber-950 border-amber-300 shadow-md scale-[1.01] font-bold"
                  : "bg-white hover:bg-amber-100/30 text-zinc-800 border-amber-100/70 shadow-sm"
              }`}
            >
              <div>
                <span className="text-2xl block mb-1.5">{profile.emoji}</span>
                <h3 className="font-bold text-sm tracking-wide text-amber-950">
                  {lang === "vi" ? profile.labelVI : profile.labelEN}
                </h3>
                <p className={`text-[11px] leading-relaxed mt-1 line-clamp-2 ${
                  isSelected ? "text-amber-950/90" : "text-amber-900/60 font-medium"
                }`}>
                  {lang === "vi" ? profile.descVI : profile.descEN}
                </p>
              </div>

              <div className="flex items-center gap-1.5 text-[10px] uppercase tracking-wider font-bold mt-2 text-amber-800">
                {lang === "vi" ? "Tư vấn ngay" : "Style me"}
                <ArrowRight className="w-3 h-3" />
              </div>
            </button>
          );
        })}
      </div>

      {/* Loading & Recommendations Display Panel */}
      <AnimatePresence mode="wait">
        {selectedPreference && (
          <motion.div
            key={selectedPreference}
            className="mt-8 border-t border-amber-200 pt-8 relative z-10"
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -15 }}
          >
            {loading ? (
              <div className="flex flex-col items-center justify-center py-12 text-amber-800 text-xs font-semibold">
                <Loader className="w-7 h-7 text-amber-500 animate-spin mb-3" />
                <p>{lang === "vi" ? "Gemini AI đang phân tích dữ liệu phong cách..." : "Gemini AI is analyzing your aesthetic profile..."}</p>
              </div>
            ) : (
              <div className="space-y-6">
                <div className="flex items-center gap-2 mb-4">
                  <div className="w-1.5 h-4 bg-amber-500 rounded-full" />
                  <h3 className="text-xs uppercase tracking-wider font-bold text-amber-950">
                    {lang === "vi" ? "Sản phẩm đề xuất dành riêng cho bạn" : "Curated Matches For You"}
                  </h3>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {recommendations.map((rec) => {
                    const matchedProd = products.find(p => p.id === rec.id);
                    if (!matchedProd) return null;

                    const defaultSize = matchedProd.sizes[0] || "Standard";

                    return (
                      <div 
                        key={rec.id} 
                        className="bg-white border border-amber-100 rounded-2xl p-4 flex gap-4 hover:border-amber-400/60 hover:shadow-md transition-all duration-300"
                      >
                        {/* Product Image */}
                        <img 
                          src={matchedProd.imageUrl} 
                          alt={matchedProd.nameVI} 
                          className="w-24 h-24 md:w-28 md:h-28 object-cover rounded-xl shrink-0 shadow-sm border border-amber-100" 
                        />

                        {/* Recommendation content details */}
                        <div className="flex flex-col justify-between flex-1">
                          <div className="space-y-1">
                            <span className="text-[9px] text-amber-900 uppercase tracking-wider bg-amber-100 px-2 py-0.5 rounded font-mono font-bold">
                              {matchedProd.category === 'fashion' ? (lang === 'vi' ? 'Thời trang' : 'Fashion') : (lang === 'vi' ? 'Mỹ phẩm' : 'Cosmetics')}
                            </span>
                            <h4 className="text-xs md:text-sm font-bold text-amber-950 leading-snug line-clamp-1">
                              {lang === "vi" ? matchedProd.nameVI : matchedProd.nameEN}
                            </h4>
                            <p className="text-xs font-mono font-bold text-amber-600">
                              {formatPrice(matchedProd.priceVND)}
                            </p>
                            
                            {/* Gemini AI Custom Styling reason */}
                            <p className="text-[11px] text-amber-900/80 leading-relaxed italic pt-1 border-t border-amber-100/50 mt-2 font-medium">
                              " {lang === "vi" ? rec.reasonVI : rec.reasonEN} "
                            </p>
                          </div>

                          <button
                            id={`add-rec-to-cart-btn-${rec.id}`}
                            onClick={() => handleAddWithFeedback(matchedProd.id, defaultSize)}
                            className={`w-full mt-3 py-1.5 px-3 rounded-lg text-xs font-bold flex items-center justify-center gap-1.5 transition-all cursor-pointer shadow-sm ${
                              successAddId === matchedProd.id
                                ? "bg-emerald-600 text-white"
                                : "bg-amber-500 hover:bg-amber-600 text-amber-950"
                            }`}
                          >
                            {successAddId === matchedProd.id ? (
                              <>
                                <Check className="w-3.5 h-3.5" />
                                {lang === "vi" ? "Đã thêm" : "Added"}
                              </>
                            ) : (
                              <>
                                {lang === "vi" ? "Thêm vào giỏ hàng" : "Add to Cart"}
                              </>
                            )}
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
