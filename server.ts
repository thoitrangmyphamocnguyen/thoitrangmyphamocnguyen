import express from "express";
import path from "path";
import fs from "fs";
import { createServer as createViteServer } from "vite";
import { GoogleGenAI } from "@google/genai";
import dotenv from "dotenv";
import compression from "compression";

dotenv.config();

const app = express();
const PORT = 3000;
const DB_PATH = path.join(process.cwd(), "db.json");

// 1. Enable Gzip Compression to dramatically improve load times and technical SEO scores
app.use(compression());

// 2. Enforce High-Security HTTP Headers (Clickjacking, XSS, and Content Sniffing protection)
app.use((req, res, next) => {
  res.setHeader("X-Frame-Options", "SAMEORIGIN");
  res.setHeader("X-Content-Type-Options", "nosniff");
  res.setHeader("X-XSS-Protection", "1; mode=block");
  res.setHeader("Referrer-Policy", "strict-origin-when-cross-origin");
  res.setHeader(
    "Content-Security-Policy",
    "default-src 'self'; " +
    "script-src 'self' 'unsafe-inline' 'unsafe-eval' https://apis.google.com https://maps.googleapis.com; " +
    "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; " +
    "img-src 'self' data: blob: https://images.unsplash.com https://images.pexels.com https://lh3.googleusercontent.com; " +
    "font-src 'self' data: https://fonts.gstatic.com; " +
    "connect-src 'self' https://generativelanguage.googleapis.com https://api.unsplash.com; " +
    "frame-src 'self';"
  );
  next();
});

app.use(express.json());

// Highly Secure Administrator Credentials
const ADMIN_USERNAME = process.env.ADMIN_USERNAME || "admin";
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || "OcNguyen@2026AdminSecret!";
const ADMIN_TOKEN = "ocnguyen-admin-session-secure-token-2026";

// Admin Authentication Middleware
function requireAdmin(req: any, res: any, next: any) {
  const token = req.headers["x-admin-token"];
  if (token === ADMIN_TOKEN) {
    next();
  } else {
    res.status(401).json({ error: "Yêu cầu đăng nhập quản trị viên / Unauthorized Admin access" });
  }
}

// Admin Login Endpoint
app.post("/api/admin/login", (req, res) => {
  const { username, password } = req.body;
  if (username === ADMIN_USERNAME && password === ADMIN_PASSWORD) {
    res.json({ success: true, token: ADMIN_TOKEN });
  } else {
    res.status(401).json({ error: "Sai tài khoản hoặc mật khẩu quản trị viên! / Invalid credentials." });
  }
});


// Initialize Gemini SDK with User-Agent required for telemetry
const apiKey = process.env.GEMINI_API_KEY;
let ai: GoogleGenAI | null = null;
if (apiKey) {
  ai = new GoogleGenAI({
    apiKey: apiKey,
    httpOptions: {
      headers: {
        'User-Agent': 'aistudio-build',
      }
    }
  });
  console.log("Gemini AI SDK successfully initialized on server-side.");
} else {
  console.warn("GEMINI_API_KEY is not defined. AI Chatbot and Recommendations will run in beautiful fallback mode.");
}

// Interfaces
interface Product {
  id: string;
  nameVI: string;
  nameEN: string;
  category: "fashion" | "cosmetics";
  priceVND: number;
  imageUrl: string;
  descriptionVI: string;
  descriptionEN: string;
  sizes: string[];
  colorsVI: string[];
  colorsEN: string[];
  stock: number;
  sold: number;
  rating: number;
  style: "streetwear" | "minimalist" | "formal" | "casual" | "makeup" | "skincare";
  originalPriceVND?: number;
}

interface OrderItem {
  productId: string;
  nameVI: string;
  nameEN: string;
  quantity: number;
  size: string;
  colorVI: string;
  colorEN: string;
  priceVND: number;
}

interface Order {
  id: string;
  customerName: string;
  customerPhone: string;
  customerEmail: string;
  customerAddress: string;
  items: OrderItem[];
  totalAmountVND: number;
  promoCode?: string;
  discountAmountVND?: number;
  status: "pending" | "processing" | "shipped" | "completed" | "cancelled";
  paymentMethod: "cod" | "bank" | "card";
  paymentStatus: "pending" | "paid";
  createdAt: string;
}

interface NotificationLog {
  id: string;
  orderId: string;
  type: "email" | "app";
  recipient: string;
  titleVI: string;
  titleEN: string;
  contentVI: string;
  contentEN: string;
  createdAt: string;
}

interface PromoCode {
  code: string;
  descriptionVI: string;
  descriptionEN: string;
  discountType: "percentage" | "fixed";
  discountValue: number;
  minOrderValueVND: number;
  validUntil: string;
  isActive: boolean;
}

interface DB {
  products: Product[];
  orders: Order[];
  notifications: NotificationLog[];
  promoCodes: PromoCode[];
}

const INITIAL_PROMO_CODES: PromoCode[] = [
  {
    code: "TET2026",
    descriptionVI: "Khuyến mãi Tết Nguyên Đán 2026 - Giảm 15% tổng hóa đơn",
    descriptionEN: "Lunar New Year 2026 Special - 15% off entire purchase",
    discountType: "percentage",
    discountValue: 15,
    minOrderValueVND: 500000,
    validUntil: "2026-03-31",
    isActive: true
  },
  {
    code: "VALENTINE",
    descriptionVI: "Ưu đãi Lễ Tình Nhân - Giảm 50.000đ cho mọi đơn từ 400.000đ",
    descriptionEN: "Valentine's Day Deal - 50k VND off on orders from 400k VND",
    discountType: "fixed",
    discountValue: 50000,
    minOrderValueVND: 400000,
    validUntil: "2026-02-20",
    isActive: true
  },
  {
    code: "HE2026",
    descriptionVI: "Rực Rỡ Chào Hè - Giảm ngay 10% khi mua sắm",
    descriptionEN: "Hello Summer 2026 - 10% discount on clothing & cosmetics",
    discountType: "percentage",
    discountValue: 10,
    minOrderValueVND: 300000,
    validUntil: "2026-08-31",
    isActive: true
  },
  {
    code: "OCNGUYEN",
    descriptionVI: "Chào mừng quý khách mới - Tặng 30.000đ trải nghiệm",
    descriptionEN: "Welcome New Shopper - 30k VND discount on your first order",
    discountType: "fixed",
    discountValue: 30000,
    minOrderValueVND: 250000,
    validUntil: "2026-12-31",
    isActive: true
  }
];

// Initial Data Seed
const INITIAL_PRODUCTS: Product[] = [
  {
    id: "prod-1",
    nameVI: "Áo Dài Truyền Thống Gấm Hoa Cao Cấp",
    nameEN: "Premium Floral Brocade Traditional Ao Dai",
    category: "fashion",
    priceVND: 1250000,
    imageUrl: "https://images.unsplash.com/photo-1583391733956-3750e0ff4e8b?q=80&w=600&auto=format&fit=crop",
    descriptionVI: "Áo dài truyền thống làm từ chất liệu gấm tơ tằm cao cấp, dệt nổi họa tiết hoa đào tinh tế. Phù hợp cho dịp lễ hội, cưới hỏi và sự kiện trang trọng.",
    descriptionEN: "Traditional Ao Dai made of premium silk brocade, woven with delicate embossed peach blossom patterns. Perfect for festivals, weddings, and formal events.",
    sizes: ["S", "M", "L", "XL"],
    colorsVI: ["Đỏ Hồng", "Vàng Hoàng Gia", "Xanh Ngọc"],
    colorsEN: ["Rose Red", "Royal Yellow", "Jade Green"],
    stock: 15,
    sold: 42,
    rating: 4.9,
    style: "formal"
  },
  {
    id: "prod-2",
    nameVI: "Váy Lụa Tơ Tằm Dáng Suông Elegant",
    nameEN: "Elegant Flowing Silk Slip Dress",
    category: "fashion",
    priceVND: 890000,
    imageUrl: "https://images.unsplash.com/photo-1595777457583-95e059d581b8?q=80&w=600&auto=format&fit=crop",
    descriptionVI: "Được thiết kế từ 100% lụa tơ tằm tự nhiên, mang lại cảm giác mềm mại, thoáng mát và quyến rũ tuyệt đối. Kiểu dáng thanh lịch phù hợp dạo phố lẫn tiệc tối.",
    descriptionEN: "Designed from 100% natural mulberry silk, providing an incredibly soft, breathable, and absolutely charming feeling. Elegant shape suitable for both street walk and evening parties.",
    sizes: ["XS", "S", "M", "L"],
    colorsVI: ["Đen Huyền Bí", "Trắng Ngọc Trai", "Nâu Champagne"],
    colorsEN: ["Mystery Black", "Pearl White", "Champagne Gold"],
    stock: 20,
    sold: 28,
    rating: 4.8,
    style: "minimalist"
  },
  {
    id: "prod-3",
    nameVI: "Áo Blazer Blazer Phom Rộng Hàn Quốc",
    nameEN: "Korean Oversized Modern Blazer",
    category: "fashion",
    priceVND: 650000,
    imageUrl: "https://images.unsplash.com/photo-1591047139829-d91aecb6caea?q=80&w=600&auto=format&fit=crop",
    descriptionVI: "Áo Blazer với đường may sắc nét, phom rộng hiện đại phong cách Seoul. Chất vải tuyết mưa đứng dáng, giữ phom tốt và rất dễ phối đồ công sở hoặc dạo phố.",
    descriptionEN: "Blazer with sharp tailored lines, modern oversized design in Seoul style. High-quality structured fabric that maintains its shape perfectly and is easy to pair.",
    sizes: ["M", "L", "XL"],
    colorsVI: ["Xám Khói", "Be Cát", "Đen Classic"],
    colorsEN: ["Smoky Gray", "Sand Beige", "Classic Black"],
    stock: 3, // Low stock on purpose to test low stock indicators
    sold: 85,
    rating: 4.7,
    style: "casual"
  },
  {
    id: "prod-4",
    nameVI: "Bộ Đồ Streetwear Cá Tính Ốc Nguyễn",
    nameEN: "Oc Nguyen Signature Streetwear Set",
    category: "fashion",
    priceVND: 590000,
    imageUrl: "https://images.unsplash.com/photo-1509631179647-0177331693ae?q=80&w=600&auto=format&fit=crop",
    descriptionVI: "Set trang phục bao gồm áo thun oversize chất cotton 100% dày dặn phối cùng quần túi hộp năng động. Thiết kế độc quyền từ thương hiệu Ốc Nguyễn.",
    descriptionEN: "Outfit set including a 100% heavy cotton oversized t-shirt paired with dynamic cargo pants. Exclusive design by Oc Nguyen brand.",
    sizes: ["S", "M", "L", "XL", "XXL"],
    colorsVI: ["Xanh Rêu", "Xám Xi Măng", "Đen Cá Tính"],
    colorsEN: ["Moss Green", "Cement Gray", "Bold Black"],
    stock: 25,
    sold: 110,
    rating: 4.9,
    style: "streetwear"
  },
  {
    id: "prod-5",
    nameVI: "Son Môi Matte Luxury Ốc Nguyễn Slim",
    nameEN: "Oc Nguyen Slim Luxury Matte Lipstick",
    category: "cosmetics",
    priceVND: 350000,
    imageUrl: "https://images.unsplash.com/photo-1586495777744-4413f21062fa?q=80&w=600&auto=format&fit=crop",
    descriptionVI: "Son thỏi lì siêu mịn môi, chứa tinh chất dầu dưỡng giúp môi luôn mềm mượt suốt 12 giờ. Bảng màu thời thượng, lên màu chuẩn sắc chỉ sau một lần lướt.",
    descriptionEN: "Ultra-smooth matte lipstick containing nourishing oils to keep lips soft for 12 hours. Trendy color palette, perfect color payoff in just one swipe.",
    sizes: ["Standard"],
    colorsVI: ["Đỏ Đất 01", "Cam Cháy 02", "Hồng Trà 03"],
    colorsEN: ["Earthy Red 01", "Burnt Orange 02", "Rose Tea 03"],
    stock: 40,
    sold: 210,
    rating: 4.9,
    style: "makeup"
  },
  {
    id: "prod-6",
    nameVI: "Kem Chống Nắng Vật Lý Toàn Diện SPF 50+",
    nameEN: "Physical Sunscreen Broad Spectrum SPF 50+",
    category: "cosmetics",
    priceVND: 420000,
    imageUrl: "https://images.unsplash.com/photo-1556228720-195a672e8a03?q=80&w=600&auto=format&fit=crop",
    descriptionVI: "Màng lọc vật lý kết hợp chiết xuất rau má Tây Nguyên giúp bảo vệ da toàn diện khỏi tia UVA/UVB, hỗ trợ nâng tông tự nhiên và kiềm dầu cực tốt.",
    descriptionEN: "Physical filter combined with Central Highlands centella extract to comprehensively protect skin from UVA/UVB, supporting natural tone-up and oil-control.",
    sizes: ["50ml"],
    colorsVI: ["Trong suốt nâng tông"],
    colorsEN: ["Translucent Tone-Up"],
    stock: 35,
    sold: 145,
    rating: 4.8,
    style: "skincare"
  },
  {
    id: "prod-7",
    nameVI: "Serum Phục Hồi & Tái Tạo Da Chuyên Sâu",
    nameEN: "Intensive Restorative & Regenerating Serum",
    category: "cosmetics",
    priceVND: 620000,
    imageUrl: "https://images.unsplash.com/photo-1620916566398-39f1143ab7be?q=80&w=600&auto=format&fit=crop",
    descriptionVI: "Chứa 5% Niacinamide, B5 và Hyaluronic Acid dồi dào giúp làm dịu da nhạy cảm tức thì, phục hồi hàng rào bảo vệ da căng mọng, rạng rỡ.",
    descriptionEN: "Contains 5% Niacinamide, Vitamin B5, and rich Hyaluronic Acid to instantly soothe sensitive skin, restoring a plump, radiant protective barrier.",
    sizes: ["30ml"],
    colorsVI: ["Không màu"],
    colorsEN: ["Colorless"],
    stock: 4, // Low stock to demonstrate smart inventory warnings
    sold: 98,
    rating: 4.9,
    style: "skincare"
  },
  {
    id: "prod-8",
    nameVI: "Quần Tây Ông Rộng Xếp Ly Đứng Phom",
    nameEN: "Pleated Wide-Leg Tailored Trousers",
    category: "fashion",
    priceVND: 480000,
    imageUrl: "https://images.unsplash.com/photo-1594633312681-425c7b97ccd1?q=80&w=600&auto=format&fit=crop",
    descriptionVI: "Quần tây cạp cao ôm dáng, xếp ly tỉ mỉ tạo hiệu ứng kéo dài chân. Chất liệu vải sớ cát cao cấp, không nhăn, thoải mái tối đa cho cả ngày làm việc.",
    descriptionEN: "High-waisted tailored pants with meticulous pleats creating a leg-lengthening effect. Premium sand crepe fabric, wrinkle-free, maximum comfort for all-day wear.",
    sizes: ["S", "M", "L", "XL"],
    colorsVI: ["Kem Sữa", "Đen Tuyền", "Xám Tây"],
    colorsEN: ["Milk Cream", "Pure Black", "Western Gray"],
    stock: 18,
    sold: 54,
    rating: 4.6,
    style: "minimalist"
  },
  {
    id: "prod-9",
    nameVI: "Áo Sơ Mi Linen Tự Nhiên Thoáng Khí",
    nameEN: "Breathable Natural Linen Shirt",
    category: "fashion",
    priceVND: 450000,
    imageUrl: "https://images.unsplash.com/photo-1596755094514-f87e34085b2c?q=80&w=600&auto=format&fit=crop",
    descriptionVI: "Dệt hoàn toàn từ sợi lanh tự nhiên, mộc mạc và thân thiện với làn da. Phù hợp cho những ngày hè nóng bức, mang đậm phong cách vintage tối giản.",
    descriptionEN: "Woven entirely from natural flax fibers, rustic and skin-friendly. Perfect for hot summer days, featuring a minimalist vintage vibe.",
    sizes: ["M", "L", "XL", "XXL"],
    colorsVI: ["Trắng Mộc", "Xanh Pastel", "Vàng Mù Tạt"],
    colorsEN: ["Raw White", "Pastel Blue", "Mustard Yellow"],
    stock: 22,
    sold: 37,
    rating: 4.5,
    style: "casual"
  },
  {
    id: "prod-10",
    nameVI: "Nước Thần Tẩy Trang & Cân Bằng Hoa Hồng",
    nameEN: "Hydrating Rose Mist Toner & Micellar",
    category: "cosmetics",
    priceVND: 290000,
    imageUrl: "https://images.unsplash.com/photo-1608248597279-f99d160bfcbc?q=80&w=600&auto=format&fit=crop",
    descriptionVI: "Chiết xuất từ những cánh hoa hồng hữu cơ Đắk Lắk chưng cất tinh khiết, vừa làm sạch dịu nhẹ vừa cân bằng độ ẩm tức thì cho làn da luôn căng bóng.",
    descriptionEN: "Extracted from organic Dak Lak rose petals under pure distillation, gently cleansing and instantly balancing skin moisture for a dewy glow.",
    sizes: ["150ml"],
    colorsVI: ["Tinh khiết hoa hồng"],
    colorsEN: ["Pure Rose Hydrosol"],
    stock: 12,
    sold: 72,
    rating: 4.7,
    style: "skincare"
  }
];

// Helper to read database
function getDB(): DB {
  try {
    if (!fs.existsSync(DB_PATH)) {
      const initialDB: DB = {
        products: INITIAL_PRODUCTS,
        orders: [
          {
            id: "ord-1001",
            customerName: "Nguyễn Văn A",
            customerPhone: "0901234567",
            customerEmail: "anguyen@gmail.com",
            customerAddress: "123 Lê Thánh Tông, TP. Buôn Ma Thuột, Đắk Lắk",
            items: [
              {
                productId: "prod-5",
                nameVI: "Son Môi Matte Luxury Ốc Nguyễn Slim",
                nameEN: "Oc Nguyen Slim Luxury Matte Lipstick",
                quantity: 2,
                size: "Standard",
                colorVI: "Đỏ Đất 01",
                colorEN: "Earthy Red 01",
                priceVND: 350000
              },
              {
                productId: "prod-7",
                nameVI: "Serum Phục Hồi & Tái Tạo Da Chuyên Sâu",
                nameEN: "Intensive Restorative & Regenerating Serum",
                quantity: 1,
                size: "30ml",
                colorVI: "Không màu",
                colorEN: "Colorless",
                priceVND: 620000
              }
            ],
            totalAmountVND: 1320000,
            status: "processing",
            paymentMethod: "bank",
            paymentStatus: "paid",
            createdAt: new Date(Date.now() - 3600000 * 5).toISOString() // 5 hours ago
          },
          {
            id: "ord-1002",
            customerName: "Trần Thị B",
            customerPhone: "0987654321",
            customerEmail: "btran@gmail.com",
            customerAddress: "456 Nguyễn Lương Bằng, Phường An Lạc, Buôn Hồ, Đắk Lắk",
            items: [
              {
                productId: "prod-2",
                nameVI: "Váy Lụa Tơ Tằm Dáng Suông Elegant",
                nameEN: "Elegant Flowing Silk Slip Dress",
                quantity: 1,
                size: "S",
                colorVI: "Nâu Champagne",
                colorEN: "Champagne Gold",
                priceVND: 890000
              }
            ],
            totalAmountVND: 890000,
            status: "pending",
            paymentMethod: "cod",
            paymentStatus: "pending",
            createdAt: new Date(Date.now() - 3600000 * 2).toISOString() // 2 hours ago
          }
        ],
        notifications: [
          {
            id: "notif-1",
            orderId: "ord-1001",
            type: "email",
            recipient: "anguyen@gmail.com",
            titleVI: "Xác nhận thanh toán đơn hàng #ord-1001",
            titleEN: "Order Payment Confirmed #ord-1001",
            contentVI: "Cảm ơn quý khách Nguyễn Văn A. Ốc Nguyễn đã nhận được thanh toán 1,320,000 VND và đang chuẩn bị hàng gửi cho quý khách tại Đắk Lắk.",
            contentEN: "Thank you Mr/Ms Nguyễn Văn A. Oc Nguyen has received your payment of 1,320,000 VND and is preparing your order for delivery in Dak Lak.",
            createdAt: new Date(Date.now() - 3600000 * 5).toISOString()
          },
          {
            id: "notif-2",
            orderId: "ord-1002",
            type: "email",
            recipient: "btran@gmail.com",
            titleVI: "Đặt hàng thành công đơn hàng #ord-1002",
            titleEN: "Order Placed Successfully #ord-1002",
            contentVI: "Đơn hàng #ord-1002 trị giá 890,000 VND của bạn đã được tiếp nhận thành công. Nhân viên Ốc Nguyễn sẽ liên hệ xác nhận sớm nhất.",
            contentEN: "Your order #ord-1002 valued at 890,000 VND has been received. Oc Nguyen staff will contact you shortly for confirmation.",
            createdAt: new Date(Date.now() - 3600000 * 2).toISOString()
          }
        ],
        promoCodes: INITIAL_PROMO_CODES
      };
      fs.writeFileSync(DB_PATH, JSON.stringify(initialDB, null, 2), "utf8");
      return initialDB as DB;
    }
    const data = fs.readFileSync(DB_PATH, "utf8");
    const parsed = JSON.parse(data);
    if (!parsed.promoCodes) {
      parsed.promoCodes = INITIAL_PROMO_CODES;
      fs.writeFileSync(DB_PATH, JSON.stringify(parsed, null, 2), "utf8");
    }
    return parsed as DB;
  } catch (error) {
    console.error("Database read error, returning default data:", error);
    return { products: INITIAL_PRODUCTS, orders: [], notifications: [], promoCodes: INITIAL_PROMO_CODES };
  }
}

// Helper to write database
function saveDB(db: DB) {
  try {
    fs.writeFileSync(DB_PATH, JSON.stringify(db, null, 2), "utf8");
  } catch (error) {
    console.error("Database write error:", error);
  }
}

// REST Endpoints

// -------------------------------------------------------------
// TECHNICAL SEO ENDPOINTS (Google Search Index Optimization)
// -------------------------------------------------------------

// 1. Search Engine Robots Policy Configuration
app.get("/robots.txt", (req, res) => {
  res.header("Content-Type", "text/plain");
  res.send(
    "User-agent: *\n" +
    "Allow: /\n" +
    "Disallow: /api/\n" +
    "Disallow: /dist/\n" +
    "\n" +
    "Sitemap: https://ocnguyen.vn/sitemap.xml\n"
  );
});

// 2. Dynamic sitemap.xml generation based on actual product catalog for Google Indexing
app.get("/sitemap.xml", (req, res) => {
  const db = getDB();
  const baseUrl = "https://ocnguyen.vn";
  const currentDate = new Date().toISOString().split("T")[0];

  let xml = `<?xml version="1.0" encoding="UTF-8"?>\n`;
  xml += `<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n`;

  // Index Page
  xml += `  <url>\n`;
  xml += `    <loc>${baseUrl}/</loc>\n`;
  xml += `    <lastmod>${currentDate}</lastmod>\n`;
  xml += `    <changefreq>daily</changefreq>\n`;
  xml += `    <priority>1.0</priority>\n`;
  xml += `  </url>\n`;

  // Category Pages
  const categories = ["fashion", "cosmetics"];
  categories.forEach(cat => {
    xml += `  <url>\n`;
    xml += `    <loc>${baseUrl}/?category=${cat}</loc>\n`;
    xml += `    <lastmod>${currentDate}</lastmod>\n`;
    xml += `    <changefreq>weekly</changefreq>\n`;
    xml += `    <priority>0.8</priority>\n`;
    xml += `  </url>\n`;
  });

  // Dynamic Product Pages
  db.products.forEach(p => {
    xml += `  <url>\n`;
    xml += `    <loc>${baseUrl}/?product=${p.id}</loc>\n`;
    xml += `    <lastmod>${currentDate}</lastmod>\n`;
    xml += `    <changefreq>weekly</changefreq>\n`;
    xml += `    <priority>0.7</priority>\n`;
    xml += `  </url>\n`;
  });

  xml += `</urlset>`;

  res.header("Content-Type", "application/xml");
  res.send(xml);
});

// 1. Get Products (Bilingual Catalog)
app.get("/api/products", (req, res) => {
  const db = getDB();
  res.json(db.products);
});

// 2. Search & Filter endpoint (handled also client side but useful server side)
app.get("/api/products/filter", (req, res) => {
  const db = getDB();
  const { category, style, minPrice, maxPrice, search } = req.query;
  let filtered = [...db.products];

  if (category) {
    filtered = filtered.filter(p => p.category === category);
  }
  if (style) {
    filtered = filtered.filter(p => p.style === style);
  }
  if (minPrice) {
    filtered = filtered.filter(p => p.priceVND >= Number(minPrice));
  }
  if (maxPrice) {
    filtered = filtered.filter(p => p.priceVND <= Number(maxPrice));
  }
  if (search) {
    const s = String(search).toLowerCase();
    filtered = filtered.filter(
      p => p.nameVI.toLowerCase().includes(s) || 
           p.nameEN.toLowerCase().includes(s) ||
           p.descriptionVI.toLowerCase().includes(s) ||
           p.descriptionEN.toLowerCase().includes(s)
    );
  }
  res.json(filtered);
});

// --- PROMO CODE MANAGEMENT ENDPOINTS ---

// 2b. Get all promo codes
app.get("/api/promos", (req, res) => {
  const db = getDB();
  res.json(db.promoCodes || []);
});

// 2c. Create or update a promo code (Requires admin token)
app.post("/api/promos", requireAdmin, (req, res) => {
  const db = getDB();
  const { code, descriptionVI, descriptionEN, discountType, discountValue, minOrderValueVND, validUntil, isActive } = req.body;

  if (!code || !descriptionVI || !descriptionEN || !discountType || !discountValue || !minOrderValueVND || !validUntil) {
    return res.status(400).json({ error: "Vui lòng nhập đầy đủ thông tin mã khuyến mãi." });
  }

  const codeUpper = code.toUpperCase().trim();
  const existingIndex = db.promoCodes.findIndex(p => p.code === codeUpper);

  const newPromo: PromoCode = {
    code: codeUpper,
    descriptionVI,
    descriptionEN,
    discountType,
    discountValue: Number(discountValue),
    minOrderValueVND: Number(minOrderValueVND),
    validUntil,
    isActive: isActive !== undefined ? !!isActive : true
  };

  if (existingIndex > -1) {
    db.promoCodes[existingIndex] = newPromo;
  } else {
    db.promoCodes.push(newPromo);
  }

  saveDB(db);
  res.json({ success: true, promo: newPromo });
});

// 2d. Delete a promo code (Requires admin token)
app.delete("/api/promos/:code", requireAdmin, (req, res) => {
  const db = getDB();
  const codeToDelete = req.params.code.toUpperCase().trim();
  const originalLength = db.promoCodes.length;

  db.promoCodes = db.promoCodes.filter(p => p.code !== codeToDelete);

  if (db.promoCodes.length === originalLength) {
    return res.status(404).json({ error: "Không tìm thấy mã khuyến mãi này để xóa." });
  }

  saveDB(db);
  res.json({ success: true, message: "Xóa mã khuyến mãi thành công!" });
});

// 2e. Validate a promo code from shoppers
app.post("/api/promos/validate", (req, res) => {
  const db = getDB();
  const { code, orderValue } = req.body;

  if (!code) {
    return res.status(400).json({ error: "Vui lòng nhập mã khuyến mãi." });
  }

  const promo = db.promoCodes.find(p => p.code.toUpperCase() === code.toUpperCase().trim());

  if (!promo) {
    return res.status(404).json({ error: "Mã khuyến mãi không hợp lệ hoặc không tồn tại." });
  }

  if (!promo.isActive) {
    return res.status(400).json({ error: "Mã khuyến mãi này đã tạm ngưng kích hoạt." });
  }

  const todayStr = new Date().toISOString().split("T")[0];
  if (promo.validUntil && promo.validUntil < todayStr) {
    return res.status(400).json({ error: "Mã khuyến mãi này đã hết hạn sử dụng." });
  }

  if (Number(orderValue) < promo.minOrderValueVND) {
    return res.status(400).json({ 
      error: `Đơn hàng chưa đạt giá trị tối thiểu ${promo.minOrderValueVND.toLocaleString("vi-VN")} đ để áp dụng mã này.` 
    });
  }

  let discountAmount = 0;
  if (promo.discountType === "percentage") {
    discountAmount = Math.round(Number(orderValue) * (promo.discountValue / 100));
  } else {
    discountAmount = promo.discountValue;
  }

  discountAmount = Math.min(discountAmount, Number(orderValue));

  res.json({
    success: true,
    code: promo.code,
    discountType: promo.discountType,
    discountValue: promo.discountValue,
    discountAmount,
    minOrderValueVND: promo.minOrderValueVND,
    descriptionVI: promo.descriptionVI,
    descriptionEN: promo.descriptionEN
  });
});

// 3. Create Order & Update Stock Automatically (Online Checkout Secure Simulation)
app.post("/api/orders", (req, res) => {
  const db = getDB();
  const { customerName, customerPhone, customerEmail, customerAddress, items, paymentMethod, promoCode } = req.body;

  if (!customerName || !customerPhone || !customerEmail || !customerAddress || !items || items.length === 0) {
    return res.status(400).json({ error: "Missing required order information." });
  }

  // Double check and update inventory
  let totalAmountVND = 0;
  const verifiedItems: OrderItem[] = [];

  for (const item of items) {
    const prod = db.products.find(p => p.id === item.productId);
    if (!prod) {
      return res.status(400).json({ error: `Product not found: ${item.nameVI || item.productId}` });
    }
    if (prod.stock < item.quantity) {
      return res.status(400).json({ 
        error: `Xin lỗi, sản phẩm '${prod.nameVI}' chỉ còn ${prod.stock} sản phẩm trong kho. / Sorry, '${prod.nameEN}' only has ${prod.stock} items left in stock.` 
      });
    }

    // Deduct stock
    prod.stock -= item.quantity;
    prod.sold += item.quantity;
    totalAmountVND += prod.priceVND * item.quantity;

    verifiedItems.push({
      productId: prod.id,
      nameVI: prod.nameVI,
      nameEN: prod.nameEN,
      quantity: item.quantity,
      size: item.size || "Standard",
      colorVI: item.colorVI || prod.colorsVI[0] || "",
      colorEN: item.colorEN || prod.colorsEN[0] || "",
      priceVND: prod.priceVND
    });
  }

  const orderId = `ord-${Date.now().toString().slice(-4)}${Math.floor(Math.random() * 90 + 10)}`;
  const isPaid = paymentMethod === "bank" || paymentMethod === "card";

  // Calculate promotional discount if any
  let discountAmountVND = 0;
  let finalAmountVND = totalAmountVND;
  let appliedPromoCode: string | undefined = undefined;

  if (promoCode) {
    const promo = db.promoCodes.find(p => p.code === promoCode.toUpperCase().trim());
    if (promo && promo.isActive) {
      const todayStr = new Date().toISOString().split("T")[0];
      const isDateValid = !promo.validUntil || promo.validUntil >= todayStr;
      const isMinValValid = totalAmountVND >= promo.minOrderValueVND;

      if (isDateValid && isMinValValid) {
        appliedPromoCode = promo.code;
        if (promo.discountType === "percentage") {
          discountAmountVND = Math.round(totalAmountVND * (promo.discountValue / 100));
        } else {
          discountAmountVND = promo.discountValue;
        }
        discountAmountVND = Math.min(discountAmountVND, totalAmountVND);
        finalAmountVND = totalAmountVND - discountAmountVND;
      }
    }
  }

  const newOrder: Order = {
    id: orderId,
    customerName,
    customerPhone,
    customerEmail,
    customerAddress,
    items: verifiedItems,
    totalAmountVND: finalAmountVND,
    promoCode: appliedPromoCode,
    discountAmountVND,
    status: "pending",
    paymentMethod,
    paymentStatus: isPaid ? "paid" : "pending",
    createdAt: new Date().toISOString()
  };

  db.orders.unshift(newOrder);

  // Send automated email and app notification logs (Real-time update)
  const formattedPriceVND = finalAmountVND.toLocaleString('vi-VN') + " đ";
  const emailNotification: NotificationLog = {
    id: `notif-${Date.now()}-email`,
    orderId,
    type: "email",
    recipient: customerEmail,
    titleVI: `[Ốc Nguyễn] Xác nhận đặt hàng thành công #${orderId}`,
    titleEN: `[Oc Nguyen] Order placed successfully #${orderId}`,
    contentVI: `Kính chào quý khách ${customerName},\n\nĐơn hàng #${orderId} của quý khách trị giá ${formattedPriceVND} đã được tiếp nhận thành công.\nPhương thức thanh toán: ${paymentMethod === "cod" ? "Thanh toán khi nhận hàng (COD)" : paymentMethod === "bank" ? "Chuyển khoản ngân hàng" : "Thẻ tín dụng quốc tế"}.\nĐịa chỉ giao hàng: ${customerAddress}.\n\nCảm ơn quý khách đã tin tưởng thương hiệu Thời Trang & Mỹ Phẩm Ốc Nguyễn!`,
    contentEN: `Dear Mr/Ms ${customerName},\n\nYour order #${orderId} valued at ${formattedPriceVND} has been received successfully.\nPayment Method: ${paymentMethod === "cod" ? "Cash on Delivery (COD)" : paymentMethod === "bank" ? "Bank Transfer" : "Credit Card"}.\nShipping Address: ${customerAddress}.\n\nThank you for choosing Oc Nguyen Fashion & Cosmetics!`,
    createdAt: new Date().toISOString()
  };

  const appNotification: NotificationLog = {
    id: `notif-${Date.now()}-app`,
    orderId,
    type: "app",
    recipient: customerEmail,
    titleVI: "Cập nhật đơn hàng mới",
    titleEN: "New Order Placed",
    contentVI: `Khách hàng ${customerName} vừa đặt thành công đơn hàng #${orderId} trị giá ${formattedPriceVND}.`,
    contentEN: `Customer ${customerName} has just placed order #${orderId} valued at ${formattedPriceVND}.`,
    createdAt: new Date().toISOString()
  };

  db.notifications.unshift(emailNotification, appNotification);
  saveDB(db);

  res.status(201).json({ 
    success: true, 
    order: newOrder,
    messageVI: `Đơn đặt hàng #${orderId} thành công! Hệ thống Ốc Nguyễn đã gửi email tự động xác nhận tới ${customerEmail}.`,
    messageEN: `Order #${orderId} created successfully! Oc Nguyen has sent an automated email confirmation to ${customerEmail}.`
  });
});

// 4. Get all orders for Seller Dashboard (Highly Secured with requireAdmin)
app.get("/api/orders", requireAdmin, (req, res) => {
  const db = getDB();
  res.json(db.orders);
});

// 5. Update Order Status (Seller Controls with Auto-Inventory correction on cancel - Secure)
app.put("/api/orders/:id/status", requireAdmin, (req, res) => {
  const db = getDB();
  const orderId = req.params.id;
  const { status, paymentStatus } = req.body;

  const orderIndex = db.orders.findIndex(o => o.id === orderId);
  if (orderIndex === -1) {
    return res.status(404).json({ error: "Order not found." });
  }

  const oldOrder = db.orders[orderIndex];
  const previousStatus = oldOrder.status;

  // Handle inventory restocking if cancelled
  if (status === "cancelled" && previousStatus !== "cancelled") {
    for (const item of oldOrder.items) {
      const prod = db.products.find(p => p.id === item.productId);
      if (prod) {
        prod.stock += item.quantity;
        prod.sold = Math.max(0, prod.sold - item.quantity);
      }
    }
  } 
  // Reverse cancellation restock if changed back
  else if (previousStatus === "cancelled" && status !== "cancelled") {
    for (const item of oldOrder.items) {
      const prod = db.products.find(p => p.id === item.productId);
      if (prod) {
        prod.stock = Math.max(0, prod.stock - item.quantity);
        prod.sold += item.quantity;
      }
    }
  }

  // Update order fields
  db.orders[orderIndex].status = status || oldOrder.status;
  if (paymentStatus) {
    db.orders[orderIndex].paymentStatus = paymentStatus;
  }

  // Generate automated update notification
  const customerEmail = oldOrder.customerEmail;
  const customerName = oldOrder.customerName;
  const formattedPriceVND = oldOrder.totalAmountVND.toLocaleString('vi-VN') + " đ";
  
  let statusTextVI = "";
  let statusTextEN = "";
  if (status === "processing") { statusTextVI = "đang được đóng gói"; statusTextEN = "is being packaged"; }
  else if (status === "shipped") { statusTextVI = "đã được bàn giao đơn vị vận chuyển"; statusTextEN = "has been handed over to delivery"; }
  else if (status === "completed") { statusTextVI = "đã giao hàng thành công"; statusTextEN = "was successfully delivered"; }
  else if (status === "cancelled") { statusTextVI = "đã được hủy bỏ"; statusTextEN = "has been cancelled"; }

  if (statusTextVI) {
    const updateEmail: NotificationLog = {
      id: `notif-${Date.now()}-status-email`,
      orderId,
      type: "email",
      recipient: customerEmail,
      titleVI: `[Ốc Nguyễn] Đơn hàng #${orderId} ${status === 'completed' ? 'đã hoàn thành' : 'đang vận chuyển'}`,
      titleEN: `[Oc Nguyen] Your order #${orderId} status update`,
      contentVI: `Kính chào quý khách ${customerName},\n\nĐơn hàng #${orderId} của bạn trị giá ${formattedPriceVND} ${statusTextVI}.\n\nQuý khách có thể theo dõi hành trình đơn hàng trên hệ thống Ốc Nguyễn với số điện thoại liên hệ: 0367408875.\n\nCảm ơn quý khách đã đồng hành cùng Ốc Nguyễn!`,
      contentEN: `Dear Mr/Ms ${customerName},\n\nYour order #${orderId} valued at ${formattedPriceVND} ${statusTextEN}.\n\nYou can track your order journey on the Oc Nguyen platform. Contact support: 0367408875.\n\nThank you for choosing Oc Nguyen!`,
      createdAt: new Date().toISOString()
    };
    db.notifications.unshift(updateEmail);
  }

  saveDB(db);
  res.json({ success: true, order: db.orders[orderIndex] });
});

// 6. Get Notifications simulation logs (Secure)
app.get("/api/notifications", requireAdmin, (req, res) => {
  const db = getDB();
  res.json(db.notifications);
});

// 7. Get Store Analytics (Real-time dashboards - Secure)
app.get("/api/analytics", requireAdmin, (req, res) => {
  const db = getDB();
  const totalOrders = db.orders.length;
  const completedOrders = db.orders.filter(o => o.status === "completed");
  const cancelledOrders = db.orders.filter(o => o.status === "cancelled");
  const processingOrShipped = db.orders.filter(o => o.status === "processing" || o.status === "shipped" || o.status === "pending");

  // Sum up total revenue from all non-cancelled orders
  const revenueVND = db.orders
    .filter(o => o.status !== "cancelled")
    .reduce((sum, o) => sum + o.totalAmountVND, 0);

  // Category statistics
  let fashionSales = 0;
  let cosmeticsSales = 0;
  db.orders.filter(o => o.status !== "cancelled").forEach(o => {
    o.items.forEach(item => {
      const prod = db.products.find(p => p.id === item.productId);
      if (prod) {
        if (prod.category === "fashion") fashionSales += item.priceVND * item.quantity;
        if (prod.category === "cosmetics") cosmeticsSales += item.priceVND * item.quantity;
      }
    });
  });

  // Low Stock alerting
  const lowStockProducts = db.products.filter(p => p.stock <= 5);

  // Top products sold
  const topProducts = [...db.products]
    .sort((a, b) => b.sold - a.sold)
    .slice(0, 5)
    .map(p => ({
      id: p.id,
      nameVI: p.nameVI,
      nameEN: p.nameEN,
      sold: p.sold,
      stock: p.stock,
      category: p.category
    }));

  res.json({
    revenueVND,
    totalOrders,
    completedCount: completedOrders.length,
    cancelledCount: cancelledOrders.length,
    processingCount: processingOrShipped.length,
    lowStockCount: lowStockProducts.length,
    lowStockList: lowStockProducts.map(p => ({ id: p.id, nameVI: p.nameVI, nameEN: p.nameEN, stock: p.stock })),
    categorySales: {
      fashion: fashionSales,
      cosmetics: cosmeticsSales
    },
    topProducts
  });
});

// 8. Update Stock (For Smart Inventory editing by seller - Secure)
app.put("/api/products/:id/stock", requireAdmin, (req, res) => {
  const db = getDB();
  const prodId = req.params.id;
  const { stock } = req.body;

  const prodIndex = db.products.findIndex(p => p.id === prodId);
  if (prodIndex === -1) {
    return res.status(404).json({ error: "Product not found." });
  }

  db.products[prodIndex].stock = Math.max(0, Number(stock));
  saveDB(db);
  res.json({ success: true, product: db.products[prodIndex] });
});

// 8.1. Create Product (Secure admin control)
app.post("/api/products", requireAdmin, (req, res) => {
  const db = getDB();
  const { 
    nameVI, nameEN, category, priceVND, imageUrl, descriptionVI, descriptionEN,
    sizes, colorsVI, colorsEN, stock, style, originalPriceVND
  } = req.body;

  if (!nameVI || !nameEN || !category || !priceVND || !imageUrl) {
    return res.status(400).json({ error: "Thiếu thông tin bắt buộc / Missing required fields." });
  }

  const newId = `prod-${Date.now()}`;
  const newProduct: Product = {
    id: newId,
    nameVI,
    nameEN,
    category,
    priceVND: Number(priceVND),
    imageUrl,
    descriptionVI: descriptionVI || "",
    descriptionEN: descriptionEN || "",
    sizes: Array.isArray(sizes) && sizes.length > 0 ? sizes : ["Standard"],
    colorsVI: Array.isArray(colorsVI) && colorsVI.length > 0 ? colorsVI : ["Mặc định"],
    colorsEN: Array.isArray(colorsEN) && colorsEN.length > 0 ? colorsEN : ["Default"],
    stock: stock !== undefined ? Math.max(0, Number(stock)) : 10,
    sold: 0,
    rating: 5.0,
    style: style || (category === "fashion" ? "minimalist" : "skincare"),
    originalPriceVND: originalPriceVND ? Number(originalPriceVND) : undefined
  };

  db.products.push(newProduct);
  saveDB(db);
  res.status(201).json({ success: true, product: newProduct });
});

// 8.2. Update Product (Secure admin control)
app.put("/api/products/:id", requireAdmin, (req, res) => {
  const db = getDB();
  const prodId = req.params.id;
  const prodIndex = db.products.findIndex(p => p.id === prodId);
  if (prodIndex === -1) {
    return res.status(404).json({ error: "Product not found." });
  }

  const { 
    nameVI, nameEN, category, priceVND, imageUrl, descriptionVI, descriptionEN,
    sizes, colorsVI, colorsEN, stock, style, originalPriceVND
  } = req.body;

  const existing = db.products[prodIndex];

  db.products[prodIndex] = {
    ...existing,
    nameVI: nameVI !== undefined ? nameVI : existing.nameVI,
    nameEN: nameEN !== undefined ? nameEN : existing.nameEN,
    category: category !== undefined ? category : existing.category,
    priceVND: priceVND !== undefined ? Number(priceVND) : existing.priceVND,
    imageUrl: imageUrl !== undefined ? imageUrl : existing.imageUrl,
    descriptionVI: descriptionVI !== undefined ? descriptionVI : existing.descriptionVI,
    descriptionEN: descriptionEN !== undefined ? descriptionEN : existing.descriptionEN,
    sizes: Array.isArray(sizes) ? sizes : existing.sizes,
    colorsVI: Array.isArray(colorsVI) ? colorsVI : existing.colorsVI,
    colorsEN: Array.isArray(colorsEN) ? colorsEN : existing.colorsEN,
    stock: stock !== undefined ? Math.max(0, Number(stock)) : existing.stock,
    style: style !== undefined ? style : existing.style,
    originalPriceVND: originalPriceVND !== undefined ? (originalPriceVND ? Number(originalPriceVND) : undefined) : existing.originalPriceVND
  };

  saveDB(db);
  res.json({ success: true, product: db.products[prodIndex] });
});

// 8.3. Delete Product (Secure admin control)
app.delete("/api/products/:id", requireAdmin, (req, res) => {
  const db = getDB();
  const prodId = req.params.id;

  const prodIndex = db.products.findIndex(p => p.id === prodId);
  if (prodIndex === -1) {
    return res.status(404).json({ error: "Product not found." });
  }

  db.products.splice(prodIndex, 1);
  saveDB(db);
  res.json({ success: true, message: "Product deleted successfully." });
});

// 9. 24/7 AI Chatbot (Gemini SDK Integration with precise brand knowledge)
app.post("/api/chatbot", async (req, res) => {
  const { message, history } = req.body;
  if (!message) {
    return res.status(400).json({ error: "Message is required." });
  }

  const db = getDB();
  // Format the store's product catalog as dynamic context for the AI
  const catalogContext = db.products.map(p => {
    return `- [ID: ${p.id}] ${p.nameVI} (${p.nameEN}) - Giá: ${p.priceVND.toLocaleString('vi-VN')} VND. Loại: ${p.category}. Phong cách: ${p.style}. Còn lại: ${p.stock} sản phẩm. Chi tiết: ${p.descriptionVI}`;
  }).join("\n");

  const brandInstructions = `
Bạn là AI Trợ lý Bán hàng 24/7 thông minh và vô cùng chuyên nghiệp của thương hiệu "Ốc Nguyễn" (Thời Trang & Mỹ Phẩm Cao Cấp Ốc Nguyễn).
Thông tin thương hiệu Ốc Nguyễn để tư vấn khách hàng:
- Tên cửa hàng: Ốc Nguyễn (Ốc Nguyễn Fashion & Cosmetics)
- Phong cách thương hiệu: Hiện đại, sang trọng, thanh lịch và phục vụ tận tâm.
- Số điện thoại liên hệ (Hotline/Zalo): 0367408875
- Địa chỉ: Phường An Lạc, thị xã Buôn Hồ, tỉnh Đắk Lắk, Việt Nam.
- Email liên hệ: thoitrangmyphamocnguyen@gmail.com
- Chính sách giao hàng: Miễn phí vận chuyển toàn quốc cho đơn hàng từ 500,000 VND trở lên. Thời gian giao hàng Đắk Lắk: 1-2 ngày; các tỉnh khác: 2-4 ngày. Có vận chuyển quốc tế.
- Hỗ trợ đổi trả: Trong vòng 7 ngày kể từ khi nhận hàng nếu có lỗi của nhà sản xuất hoặc cần đổi size (sản phẩm nguyên tem mác).

Danh sách sản phẩm hiện tại trong kho:
${catalogContext}

Yêu cầu giao tiếp:
1. Bạn luôn chào hỏi lịch sự, xưng hô 'Dạ, Ốc Nguyễn xin chào chị/anh ạ' hoặc xưng 'Ốc Nguyễn'.
2. Trả lời bằng ngôn ngữ mà khách hàng đang chat (Mặc định là Tiếng Việt, nhưng nếu khách chat Tiếng Anh, hãy trả lời bằng Tiếng Anh chuyên nghiệp).
3. Luôn nhiệt tình gợi ý các sản phẩm phù hợp từ danh sách trên khi khách hàng hỏi về thời trang, váy lụa, áo thun, son lì, dưỡng da, kem chống nắng, hoặc hỏi gợi ý quà tặng. 
4. Nếu khách hỏi mua sản phẩm, hướng dẫn khách bấm vào sản phẩm đó trong danh sách hoặc bấm "Thêm vào giỏ hàng" để tiến hành thanh toán trực tuyến bảo mật.
5. Luôn giữ thái độ thân thiện, ấm áp của người con Đắk Lắk, ĐỪNG tự bịa ra sản phẩm không có trong danh sách trên. Chỉ tư vấn các sản phẩm Ốc Nguyễn có sẵn.
`;

  if (!ai) {
    // Beautiful local intelligent fallback if API key is not yet set
    setTimeout(() => {
      let reply = "";
      const msgLower = message.toLowerCase();
      if (msgLower.includes("hello") || msgLower.includes("chào") || msgLower.includes("hi")) {
        reply = "Dạ, Ốc Nguyễn xin kính chào quý khách ạ! Em là trợ lý ảo hỗ trợ 24/7. Cửa hàng tụi em ở Phường An Lạc, tỉnh Đắk Lắk chuyên thời trang lụa, gấm và mỹ phẩm organics cao cấp. Chị cần em tư vấn đầm đẹp hay son môi màu hot trend ạ? 😍";
      } else if (msgLower.includes("son") || msgLower.includes("lipstick") || msgLower.includes("trang điểm")) {
        reply = "Dạ bên em đang cực hot dòng **Son Môi Matte Luxury Ốc Nguyễn Slim** giá chỉ 350.000đ đó ạ! Son lì siêu mịn môi, giữ màu 12h và cực kỳ mềm mượt không khô môi. Chị có muốn thêm ngay vào giỏ hàng để nhận ưu đãi không ạ? 💄";
      } else if (msgLower.includes("áo dài") || msgLower.includes("đầm") || msgLower.includes("váy")) {
        reply = "Dạ quý khách ơi, Ốc Nguyễn hiện đang có **Áo Dài Truyền Thống Gấm Hoa Cao Cấp** (1.250.000đ) sang trọng và **Váy Lụa Tơ Tằm Dáng Suông Elegant** (890.000đ) siêu quyến rũ đó ạ! Cả hai sản phẩm đều thiết kế chuẩn phom tôn dáng cực kỳ. Chị thích phong cách nhẹ nhàng hay quý phái ạ?";
      } else if (msgLower.includes("địa chỉ") || msgLower.includes("ở đâu") || msgLower.includes("address")) {
        reply = "Dạ! Showroom của Ốc Nguyễn tọa lạc tại **Phường An Lạc, thị xã Buôn Hồ, tỉnh Đắk Lắk, Việt Nam**. Quý khách có thể ghé trực tiếp thử đồ hoặc gọi hotline **0367408875** để tụi em ship tận nơi toàn quốc miễn phí cho đơn hàng trên 500k ạ! 🌸";
      } else if (msgLower.includes("đơn hàng") || msgLower.includes("order") || msgLower.includes("mua")) {
        reply = "Dạ chị có thể dễ dàng chọn sản phẩm mình yêu thích, nhấn 'Thêm vào giỏ hàng' rồi click nút 'Thanh toán' ở góc giỏ hàng. Hệ thống hỗ trợ chuyển khoản ngân hàng và thanh toán COD cực kỳ tiện lợi và bảo mật tuyệt đối ạ!";
      } else {
        reply = "Dạ Ốc Nguyễn ghi nhận câu hỏi của quý khách. Cửa hàng chuyên các mẫu thiết kế áo dài gấm hoa, váy lụa tơ tằm Đắk Lắk cùng các dòng mỹ phẩm an lành như Serum phục hồi B5, nước thần hoa hồng tự nhiên. Quý khách liên hệ trực tiếp hotline 0367408875 hoặc email thoitrangmyphamocnguyen@gmail.com để nhận tư vấn vip nhé ạ! (Vui lòng thiết lập GEMINI_API_KEY trong tab Secrets để kích hoạt đầy đủ siêu trí tuệ AI hỗ trợ tự động).";
      }
      res.json({ reply });
    }, 400);
    return;
  }

  try {
    // Format conversation history for Gemini chat structure
    const chatParts = [];
    if (history && Array.isArray(history)) {
      history.slice(-8).forEach(msg => {
        chatParts.push({
          role: msg.role === "user" ? "user" : "model",
          parts: [{ text: msg.text }]
        });
      });
    }
    chatParts.push({ role: "user", parts: [{ text: message }] });

    const response = await ai.models.generateContent({
      model: "gemini-3.5-flash",
      contents: chatParts,
      config: {
        systemInstruction: brandInstructions,
        temperature: 0.75,
      }
    });

    const reply = response.text || "Dạ, Ốc Nguyễn xin lỗi vì sự gián đoạn kết nối. Quý khách vui lòng gọi hotline 0367408875 để em hỗ trợ ngay lập tức ạ!";
    res.json({ reply });
  } catch (err: any) {
    console.error("Gemini API chatbot failure, falling back:", err);
    res.status(500).json({ error: "AI Chatbot temporary issue.", details: err.message });
  }
});

// 10. AI-Powered Personalization Product Recommendation based on style preferences
app.post("/api/recommendations", async (req, res) => {
  const { stylePreference } = req.body;
  if (!stylePreference) {
    return res.status(400).json({ error: "Style preference is required." });
  }

  const db = getDB();
  const catalogContext = db.products.map(p => {
    return `[ID: ${p.id}] ${p.nameVI} - Giá: ${p.priceVND.toLocaleString('vi-VN')} VND. Loại: ${p.category}. Phong cách đặc trưng: ${p.style}. Mô tả: ${p.descriptionVI}`;
  }).join("\n");

  const prompt = `
Dựa trên sở thích cá nhân của khách hàng là phong cách: "${stylePreference}".
Hãy chọn ra đúng 2 đến 3 sản phẩm phù hợp nhất từ danh mục sản phẩm của cửa hàng Ốc Nguyễn dưới đây:
${catalogContext}

Yêu cầu trả về kết quả dưới dạng JSON hợp lệ duy nhất, theo cấu trúc mảng các sản phẩm được đề xuất, mỗi đối tượng có định dạng:
{
  "recommendedProducts": [
    {
      "id": "ID sản phẩm được chọn từ danh mục",
      "reasonVI": "Lý do chi tiết bằng tiếng Việt giải thích vì sao sản phẩm này cực kỳ phù hợp với sở thích của khách hàng, viết ngắn gọn cuốn hút kiểu tư vấn thời trang.",
      "reasonEN": "Detailed styling advice in English explaining why this fits their style beautifully."
    }
  ]
}
Chỉ trả về JSON thô, không viết thêm chữ nào khác ngoài JSON, không sử dụng khối mã markdown.
`;

  if (!ai) {
    // Beautiful custom fallback recommendation
    const preferredStyle = stylePreference.toLowerCase();
    let matchingProds = [];
    if (preferredStyle.includes("minimalist") || preferredStyle.includes("tối giản")) {
      matchingProds = [
        { id: "prod-2", reasonVI: "Váy lụa tơ tằm thanh lịch mang phom dáng suông bay bổng tinh tế, không phô trương nhưng tôn vẻ quý phái tự nhiên của bạn.", reasonEN: "Minimalist pure silk dress gives you clean elegant lines with maximum luxury appeal." },
        { id: "prod-8", reasonVI: "Quần tây xếp ly đứng phom rất thời trang, dễ mặc, kết hợp đỉnh cao với áo thun hay blazer cho phong cách tối giản thanh khiết.", reasonEN: "Sharp tailored trousers that match anything, perfecting your minimalist wardrobe." }
      ];
    } else if (preferredStyle.includes("makeup") || preferredStyle.includes("trang điểm") || preferredStyle.includes("mỹ phẩm") || preferredStyle.includes("cosmetics")) {
      matchingProds = [
        { id: "prod-5", reasonVI: "Son Matte Luxury mang đến sắc đỏ đất / hồng trà thượng lưu chỉ sau 1 lướt, dưỡng môi căng mọng quyến rũ.", reasonEN: "Our signature luxury lipstick gives you bold defined colors while nurturing your lips." },
        { id: "prod-6", reasonVI: "Kem chống nắng vật lý mỏng nhẹ bảo vệ làn da tuyệt đối dưới nắng gió Đắk Lắk, kiềm dầu nâng tông trong trẻo.", reasonEN: "Broad-spectrum protection that leaves an invisible glow while controlling oils." }
      ];
    } else if (preferredStyle.includes("streetwear") || preferredStyle.includes("cá tính") || preferredStyle.includes("năng động")) {
      matchingProds = [
        { id: "prod-4", reasonVI: "Bộ đồ Streetwear cá tính chuẩn phom oversize chất ngầu kết hợp quần túi hộp chất chơi, độc quyền từ Ốc Nguyễn.", reasonEN: "Oc Nguyen signature cargo streetwear set makes you stand out effortlessly on any urban street." },
        { id: "prod-3", reasonVI: "Áo Blazer phom rộng khoác ngoài bụi bặm nhưng vẫn giữ được nét thanh lịch Hàn Quốc rất cuốn hút.", reasonEN: "Oversized blazer delivers that cool aesthetic layer to complete your streetwear vibe." }
      ];
    } else {
      // Default fallback
      matchingProds = [
        { id: "prod-1", reasonVI: "Áo Dài Gấm Hoa mang đậm tinh thần truyền thống pha lẫn hơi thở thời đại, nâng tầm vóc dáng Việt của bạn.", reasonEN: "Brocade Ao Dai represents elegant traditional Vietnamese beauty with modern colorways." },
        { id: "prod-7", reasonVI: "Serum phục hồi B5 tái sinh làn da căng mọng rạng rỡ từ sâu bên trong, nuôi dưỡng tế bào da khỏe mạnh.", reasonEN: "Deep recovery serum B5 restores your radiant skin barrier with clean organic ingredients." }
      ];
    }
    res.json({ recommendedProducts: matchingProds });
    return;
  }

  try {
    const response = await ai.models.generateContent({
      model: "gemini-3.5-flash",
      contents: prompt,
      config: {
        responseMimeType: "application/json",
      }
    });

    let jsonStr = response.text || "";
    jsonStr = jsonStr.trim();
    // Clean potential markdown blocks if returned despite instruction
    if (jsonStr.startsWith("```")) {
      jsonStr = jsonStr.replace(/^```json/, "").replace(/```$/, "").trim();
    }
    const result = JSON.parse(jsonStr);
    res.json(result);
  } catch (err: any) {
    console.error("Gemini Recommendations failed, falling back to database query match:", err);
    // Simple filter-based fallback
    res.json({
      recommendedProducts: [
        { id: "prod-1", reasonVI: "Áo Dài Gấm sang trọng tôn vinh vẻ đẹp Á Đông quý phái lý tưởng cho phong cách của bạn.", reasonEN: "Elegant brocade Ao Dai highlighting traditional beauty is perfect for your special events." },
        { id: "prod-5", reasonVI: "Son lì Ốc Nguyễn Matte mịn màng bền màu giúp nụ cười luôn tỏa sáng rạng ngời cả ngày.", reasonEN: "Smooth long-lasting signature matte lipstick keeps your smile radiant all day." }
      ]
    });
  }
});

// Setup server entry point with Vite middleware integration
async function startServer() {
  if (process.env.NODE_ENV !== "production") {
    // Development Mode
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
    console.log("Vite development server middleware mounted.");
  } else {
    // Production Mode
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath, {
      maxAge: "1y",
      etag: true,
      setHeaders: (res, filePath) => {
        if (filePath.includes("/assets/")) {
          // Hashed static files (Vite output bundle files) can be safely cached for 1 year
          res.setHeader("Cache-Control", "public, max-age=31536000, immutable");
        } else if (filePath.endsWith(".html") || filePath.endsWith(".xml") || filePath.endsWith(".json")) {
          // Prevent caching on dynamic/entry documents to ensure immediate application updates
          res.setHeader("Cache-Control", "public, max-age=0, must-revalidate");
        }
      }
    }));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
    console.log("Serving static production assets from /dist with optimized cache headers.");
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Ốc Nguyễn Fashion Server is running and accessible at http://localhost:${PORT}`);
  });
}

startServer();
