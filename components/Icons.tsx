import React from 'react';
import { 
  Home, PieChart, PlusCircle, Settings, Trash2, Edit2, 
  ArrowUpCircle, ArrowDownCircle, Search, Download, Upload, AlertCircle,
  Utensils, Bus, ShoppingBag, Film, HeartPulse, GraduationCap, Gift, 
  Briefcase, TrendingUp, TrendingDown, Clock, MoreHorizontal,
  Wallet, CreditCard, Banknote, Smartphone, ChevronRight, Filter, X,
  Gamepad2, BookOpen, Percent, Award, Tag, Check, Calendar
} from 'lucide-react';

export const Icons = {
  Home,
  PieChart,
  Plus: PlusCircle,
  Settings,
  Trash: Trash2,
  Edit: Edit2,
  Income: ArrowUpCircle,
  Expense: ArrowDownCircle,
  Search,
  Download,
  Upload,
  Alert: AlertCircle,
  Utensils,
  Bus,
  ShoppingBag,
  Film,
  HeartPulse,
  GraduationCap,
  Gift,
  Briefcase,
  TrendingUp,
  TrendingDown,
  Clock,
  MoreHorizontal,
  Wallet,
  CreditCard,
  Banknote,
  Smartphone,
  ChevronRight,
  Filter,
  X,
  Gamepad2,
  BookOpen,
  Percent,
  Award,
  Tag,
  Check,
  Calendar
};

export type IconName = keyof typeof Icons;

export const IconRenderer = ({ name, size = 20, className = "" }: { name: string; size?: number; className?: string }) => {
  const IconComponent = (Icons as any)[name] || Icons.MoreHorizontal;
  return <IconComponent size={size} className={className} />;
};
