export type TransactionType = 'expense' | 'income';

export interface Category {
  id: string;
  name: string;
  type: TransactionType;
  icon: string;
  color: string;
}

export interface Account {
  id: string;
  name: string;
  type: string; // 'tag' - purely for labelling
}

export interface Transaction {
  id: string;
  amount: number;
  type: TransactionType;
  categoryId: string;
  accountId: string;
  note: string;
  date: string; // ISO string
}

export interface BudgetConfig {
  daily: number;
  weekly: number;
  monthly: number;
  enableAlerts: boolean;
}

// Updated to "Payment Methods" as tags
export const DEFAULT_ACCOUNTS: Account[] = [
  { id: 'pay_1', name: '现金', type: 'tag' },
  { id: 'pay_2', name: '微信', type: 'tag' },
  { id: 'pay_3', name: '支付宝', type: 'tag' },
  { id: 'pay_4', name: '银行卡', type: 'tag' },
];

export const DEFAULT_CATEGORIES: Category[] = [
  // Expense
  { id: 'exp_1', name: '日常饮食', type: 'expense', icon: 'Utensils', color: '#FF8042' },
  { id: 'exp_2', name: '交通出行', type: 'expense', icon: 'Bus', color: '#00C49F' },
  { id: 'exp_3', name: '居住生活', type: 'expense', icon: 'Home', color: '#0088FE' },
  { id: 'exp_4', name: '购物消费', type: 'expense', icon: 'ShoppingBag', color: '#FFBB28' },
  { id: 'exp_5', name: '休闲娱乐', type: 'expense', icon: 'Gamepad2', color: '#8884d8' },
  { id: 'exp_6', name: '医疗健康', type: 'expense', icon: 'HeartPulse', color: '#ff7373' },
  { id: 'exp_7', name: '教育学习', type: 'expense', icon: 'BookOpen', color: '#82ca9d' },
  { id: 'exp_8', name: '人情往来', type: 'expense', icon: 'Gift', color: '#ffc658' },
  { id: 'exp_9', name: '理财支出', type: 'expense', icon: 'TrendingDown', color: '#607D8B' },
  { id: 'exp_10', name: '其他支出', type: 'expense', icon: 'MoreHorizontal', color: '#9E9E9E' },
  // Income
  { id: 'inc_1', name: '薪资收入', type: 'income', icon: 'Briefcase', color: '#4CAF50' },
  { id: 'inc_2', name: '理财收入', type: 'income', icon: 'TrendingUp', color: '#F44336' },
  { id: 'inc_3', name: '被动收入', type: 'income', icon: 'Percent', color: '#2196F3' },
  { id: 'inc_4', name: '其他收入', type: 'income', icon: 'Award', color: '#FF9800' },
];

export const COLORS = ['#FF8042', '#00C49F', '#FFBB28', '#0088FE', '#8884d8', '#82ca9d', '#ffc658', '#ff7373', '#4CAF50', '#2196F3'];
