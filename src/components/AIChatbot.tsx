import React, { useState, useRef, useEffect } from "react";
import { MessageSquare, Send, X, Bot, Sparkles, Phone, MapPin, User, ArrowRight } from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { ChatMessage, Language } from "../types";

interface AIChatbotProps {
  lang: Language;
  onAddToCart: (productId: string, size: string, colorIndex: number) => void;
  products: any[];
}

export default function AIChatbot({ lang, onAddToCart, products }: AIChatbotProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      role: "model",
      text: lang === "vi" 
        ? "Dạ, Ốc Nguyễn xin kính chào quý khách ạ! Em là Trợ lý ảo AI hoạt động 24/7. Em có thể giúp gì cho chị/anh hôm nay ạ? 🌸" 
        : "Hello! Welcome to Oc Nguyen Fashion & Cosmetics. I am your 24/7 AI stylist assistant. How can I help you today? ✨"
    }
  ]);
  const [inputValue, setInputValue] = useState("");
  const [isTyping, setIsTyping] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const quickPrompts = lang === "vi" 
    ? [
        { label: "💄 Son môi Matte", query: "Tư vấn cho mình son môi Matte Luxury Ốc Nguyễn" },
        { label: "👗 Váy lụa sang trọng", query: "Gợi ý váy lụa hoặc áo dài gấm tơ tằm thiết kế" },
        { label: "📍 Địa chỉ cửa hàng", query: "Địa chỉ showroom và số điện thoại của Ốc Nguyễn ở đâu?" },
        { label: "📦 Chính sách vận chuyển", query: "Phí ship và chính sách đổi trả hàng như thế nào?" }
      ]
    : [
        { label: "💄 Matte Lipsticks", query: "Recommend me the luxury matte lipsticks" },
        { label: "👗 Silk & Brocade", query: "Show me silk dresses or traditional brocade Ao Dai" },
        { label: "📍 Store Location", query: "What is your showroom address and phone number?" },
        { label: "📦 Delivery Policy", query: "What are your shipping and return policies?" }
      ];

  // Auto scroll to bottom
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, isTyping]);

  const handleSendMessage = async (textToSend: string) => {
    if (!textToSend.trim()) return;
    
    const userMsg: ChatMessage = { role: "user", text: textToSend };
    setMessages(prev => [...prev, userMsg]);
    setInputValue("");
    setIsTyping(true);

    try {
      const response = await fetch("/api/chatbot", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          message: textToSend,
          history: messages
        })
      });

      const data = await response.json();
      if (data.reply) {
        setMessages(prev => [...prev, { role: "model", text: data.reply }]);
      } else {
        throw new Error("No response content");
      }
    } catch (error) {
      console.error("Chat error:", error);
      setMessages(prev => [
        ...prev,
        {
          role: "model",
          text: lang === "vi"
            ? "Dạ Ốc Nguyễn rất tiếc, kết nối của em đang bị gián đoạn một chút. Chị yêu có thể liên hệ trực tiếp hotline 0367408875 để bên em phục vụ tức thì nhé ạ! 💖"
            : "I am really sorry, my connection is experiencing a tiny issue. Please call our hotline 0367408875 for instant support! 💖"
        }
      ]);
    } finally {
      setIsTyping(false);
    }
  };

  const handleQuickPromptClick = (query: string) => {
    handleSendMessage(query);
  };

  // Helper to parse potential links in chatbot responses and render inline add to cart buttons
  const renderMessageContent = (text: string) => {
    // Look for product IDs like prod-1, prod-2 inside the response
    const parts = text.split(/(\bprod-\d+\b)/g);
    
    return (
      <div className="space-y-2 whitespace-pre-wrap leading-relaxed text-sm">
        <p>
          {parts.map((part, index) => {
            if (part.match(/^prod-\d+$/)) {
              const matchedProd = products.find(p => p.id === part);
              if (matchedProd) {
                return (
                  <span 
                    key={index} 
                    className="inline-flex items-center gap-1 font-bold text-amber-800 bg-amber-100 px-1.5 py-0.5 rounded cursor-pointer hover:bg-amber-200 transition-colors"
                    onClick={() => {
                      const size = matchedProd.sizes[0] || "Standard";
                      onAddToCart(matchedProd.id, size, 0);
                    }}
                  >
                    <Sparkles className="w-3.5 h-3.5 text-amber-600" />
                    {lang === "vi" ? matchedProd.nameVI : matchedProd.nameEN}
                  </span>
                );
              }
            }
            return part;
          })}
        </p>
      </div>
    );
  };

  return (
    <>
      {/* Floating Action Button */}
      <motion.button
        id="chatbot-trigger-btn"
        className="fixed bottom-6 right-6 z-50 bg-amber-500 text-amber-950 p-4 rounded-full shadow-2xl flex items-center gap-2 hover:bg-amber-600 transition-all cursor-pointer border border-amber-300"
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.95 }}
        onClick={() => setIsOpen(!isOpen)}
      >
        <div className="relative text-amber-950">
          <MessageSquare className="w-6 h-6" />
          <span className="absolute -top-1 -right-1 w-2.5 h-2.5 bg-amber-700 rounded-full animate-ping" />
          <span className="absolute -top-1 -right-1 w-2.5 h-2.5 bg-amber-700 rounded-full" />
        </div>
        <span className="hidden md:inline font-sans text-xs font-bold tracking-wider uppercase text-amber-950">
          AI Assist 24/7
        </span>
      </motion.button>

      {/* Chat Window Panel */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            id="chatbot-panel"
            className="fixed bottom-24 right-4 md:right-6 w-[92vw] sm:w-[440px] h-[600px] bg-white rounded-2xl shadow-3xl z-50 overflow-hidden border border-amber-200 flex flex-col font-sans"
            initial={{ opacity: 0, y: 50, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 50, scale: 0.95 }}
            transition={{ duration: 0.25, ease: "easeOut" }}
          >
            {/* Header */}
            <div className="bg-amber-500 text-amber-950 p-4 flex items-center justify-between border-b border-amber-300 shadow-sm">
              <div className="flex items-center gap-3">
                <div className="bg-amber-600 text-white p-2 rounded-xl">
                  <Bot className="w-5 h-5" />
                </div>
                <div>
                  <h4 className="font-bold text-sm tracking-wide text-amber-950">ỐC NGUYỄN AI ASSISTANT</h4>
                  <div className="flex items-center gap-1.5">
                    <span className="w-1.5 h-1.5 bg-emerald-600 rounded-full animate-pulse" />
                    <span className="text-[10px] text-amber-900 font-mono tracking-wider uppercase font-bold">Active 24/7 Support</span>
                  </div>
                </div>
              </div>
              <button 
                id="close-chatbot-btn"
                onClick={() => setIsOpen(false)} 
                className="text-amber-900 hover:text-amber-950 transition-colors p-1 rounded-lg hover:bg-amber-400/50 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Quick Contacts Banner */}
            <div className="bg-amber-50/40 px-4 py-2 border-b border-amber-100 flex items-center justify-between text-[11px] text-amber-900 font-medium">
              <span className="flex items-center gap-1">
                <Phone className="w-3 h-3 text-amber-700" /> 0367.408.875
              </span>
              <span className="flex items-center gap-1 truncate max-w-[200px]">
                <MapPin className="w-3 h-3 text-amber-700" /> An Lạc, Đắk Lắk, VN
              </span>
            </div>

            {/* Messages Body */}
            <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-yellow-50/10">
              {messages.map((msg, index) => {
                const isUser = msg.role === "user";
                return (
                  <div
                    key={index}
                    className={`flex gap-2.5 ${isUser ? "justify-end" : "justify-start"}`}
                  >
                    {!isUser && (
                      <div className="w-8 h-8 rounded-full bg-amber-500 flex items-center justify-center text-amber-950 text-xs font-bold shrink-0 self-start shadow-sm">
                        ỐN
                      </div>
                    )}
                    <div
                      className={`max-w-[80%] rounded-2xl p-3.5 shadow-sm ${
                        isUser
                          ? "bg-amber-500 text-amber-950 font-semibold rounded-tr-none"
                          : "bg-white text-zinc-800 rounded-tl-none border border-amber-100"
                      }`}
                    >
                      {renderMessageContent(msg.text)}
                    </div>
                  </div>
                );
              })}

              {/* Typing indicator */}
              {isTyping && (
                <div className="flex gap-2.5 justify-start">
                  <div className="w-8 h-8 rounded-full bg-amber-500 flex items-center justify-center text-amber-950 text-xs font-bold shrink-0 shadow-sm animate-pulse">
                    ỐN
                  </div>
                  <div className="bg-white text-zinc-500 rounded-2xl rounded-tl-none p-3.5 border border-amber-100 shadow-sm flex items-center gap-1.5">
                    <span className="w-1.5 h-1.5 bg-amber-400 rounded-full animate-bounce" style={{ animationDelay: "0ms" }} />
                    <span className="w-1.5 h-1.5 bg-amber-400 rounded-full animate-bounce" style={{ animationDelay: "150ms" }} />
                    <span className="w-1.5 h-1.5 bg-amber-400 rounded-full animate-bounce" style={{ animationDelay: "300ms" }} />
                  </div>
                </div>
              )}
              <div ref={messagesEndRef} />
            </div>

            {/* Quick Prompts Panel */}
            <div className="p-2 bg-white border-t border-amber-100 flex flex-wrap gap-1.5 overflow-x-auto">
              {quickPrompts.map((p, idx) => (
                <button
                  key={idx}
                  id={`quick-prompt-btn-${idx}`}
                  onClick={() => handleQuickPromptClick(p.query)}
                  className="text-xs bg-amber-50/50 hover:bg-amber-100 text-amber-900 px-2.5 py-1 rounded-full border border-amber-200/60 transition-all text-left truncate cursor-pointer font-semibold"
                >
                  {p.label}
                </button>
              ))}
            </div>

            {/* Input Form Footer */}
            <form
              id="chatbot-form"
              onSubmit={(e) => {
                e.preventDefault();
                handleSendMessage(inputValue);
              }}
              className="p-3 bg-white border-t border-amber-100 flex gap-2 items-center"
            >
              <input
                id="chatbot-input-field"
                type="text"
                value={inputValue}
                onChange={(e) => setInputValue(e.target.value)}
                placeholder={lang === "vi" ? "Nhập câu hỏi của bạn..." : "Ask me anything..."}
                className="flex-1 bg-amber-50/20 border border-amber-100 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-1 focus:ring-amber-500 focus:bg-white transition-all text-zinc-800 font-medium"
              />
              <button
                id="send-chat-btn"
                type="submit"
                className="bg-amber-500 hover:bg-amber-600 text-amber-950 p-2.5 rounded-xl transition-all shrink-0 cursor-pointer shadow-md"
              >
                <Send className="w-4 h-4" />
              </button>
            </form>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
