export interface Product {
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

export interface CartItem {
  product: Product;
  quantity: number;
  selectedSize: string;
  selectedColorVI: string;
  selectedColorEN: string;
}

export interface OrderItem {
  productId: string;
  nameVI: string;
  nameEN: string;
  quantity: number;
  size: string;
  colorVI: string;
  colorEN: string;
  priceVND: number;
}

export interface Order {
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

export interface PromoCode {
  code: string;
  descriptionVI: string;
  descriptionEN: string;
  discountType: "percentage" | "fixed";
  discountValue: number;
  minOrderValueVND: number;
  validUntil: string;
  isActive: boolean;
}

export interface NotificationLog {
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

export interface AnalyticsData {
  revenueVND: number;
  totalOrders: number;
  completedCount: number;
  cancelledCount: number;
  processingCount: number;
  lowStockCount: number;
  lowStockList: { id: string; nameVI: string; nameEN: string; stock: number }[];
  categorySales: {
    fashion: number;
    cosmetics: number;
  };
  topProducts: {
    id: string;
    nameVI: string;
    nameEN: string;
    sold: number;
    stock: number;
    category: string;
  }[];
}

export type Language = "vi" | "en";
export type Currency = "VND" | "USD";

export interface ChatMessage {
  role: "user" | "model";
  text: string;
}

export interface RecommendedProduct {
  id: string;
  reasonVI: string;
  reasonEN: string;
}
