import React, { useState, useEffect, useMemo } from 'react';
import { Transaction, BudgetConfig, TransactionType, Category, Account, COLORS } from './types';
import { StorageService } from './services/storage';
import { Icons, IconRenderer } from './components/Icons';
import { TransactionForm } from './components/TransactionForm';
import { Toast } from './components/Toast';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip as RechartsTooltip, BarChart, Bar, XAxis, YAxis, LineChart, Line, CartesianGrid } from 'recharts';

type View = 'home' | 'stats' | 'add' | 'settings';
type Period = 'day' | 'week' | 'month';

export default function App() {
  const [view, setView] = useState<View>('home');
  const [period, setPeriod] = useState<Period>('day');
  
  // Data State
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [budget, setBudget] = useState<BudgetConfig>({ daily: 0, weekly: 0, monthly: 0, enableAlerts: true });
  
  // UI State
  const [editingTx, setEditingTx] = useState<Transaction | null>(null);
  const [toast, setToast] = useState<{msg: string, type: 'success'|'error'|'info'} | null>(null);
  const [showFilter, setShowFilter] = useState(false);
  
  // Management State (for Settings Modal)
  const [manageMode, setManageMode] = useState<'none' | 'categories' | 'accounts'>('none');
  const [newItemName, setNewItemName] = useState('');

  // Filters
  const [filterType, setFilterType] = useState<'all' | TransactionType>('all');
  const [filterAccountId, setFilterAccountId] = useState<string>('all');
  const [filterDateStart, setFilterDateStart] = useState('');
  const [filterDateEnd, setFilterDateEnd] = useState('');

  // Initialize Data
  useEffect(() => {
    setTransactions(StorageService.getTransactions());
    setBudget(StorageService.getBudget());
    setCategories(StorageService.getCategories());
    setAccounts(StorageService.getAccounts());
  }, []);

  const showToast = (msg: string, type: 'success'|'error'|'info' = 'success') => {
      setToast({ msg, type });
  };

  // --- Logic Helpers ---

  const getPeriodDates = (p: Period, d: Date) => {
    const start = new Date(d);
    const end = new Date(d);
    start.setHours(0,0,0,0);
    end.setHours(23,59,59,999);

    if (p === 'week') {
      const day = start.getDay();
      const diff = start.getDate() - day + (day === 0 ? -6 : 1);
      start.setDate(diff);
      const endWeek = new Date(start);
      endWeek.setDate(start.getDate() + 6);
      endWeek.setHours(23,59,59,999);
      return { start, end: endWeek };
    } else if (p === 'month') {
      start.setDate(1);
      const endMonth = new Date(start.getFullYear(), start.getMonth() + 1, 0);
      endMonth.setHours(23,59,59,999);
      return { start, end: endMonth };
    }
    return { start, end }; // day
  };

  const stats = useMemo(() => {
    const now = new Date();
    const { start, end } = getPeriodDates(period, now);
    
    // 1. Time Filter
    let filtered = transactions.filter(t => {
      const tDate = new Date(t.date);
      return tDate >= start && tDate <= end;
    });

    // 2. Global Filter (if filters active in Filter Bar)
    let displayList = transactions.filter(t => {
        let match = true;
        const tDateStr = t.date.split('T')[0];
        
        // Date Range
        if (filterDateStart && tDateStr < filterDateStart) match = false;
        if (filterDateEnd && tDateStr > filterDateEnd) match = false;
        
        // Type
        if (filterType !== 'all' && t.type !== filterType) match = false;
        
        // Account
        if (filterAccountId !== 'all' && t.accountId !== filterAccountId) match = false;

        return match;
    });
    
    // Override displayList to match the *current period* if no custom filters are interfering.
    if (!filterDateStart && !filterDateEnd && filterAccountId === 'all' && filterType === 'all') {
        displayList = filtered; // Show period data
    }

    displayList.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

    const income = filtered.filter(t => t.type === 'income').reduce((acc, t) => acc + t.amount, 0);
    const expense = filtered.filter(t => t.type === 'expense').reduce((acc, t) => acc + t.amount, 0);
    const net = income - expense;
    
    let currentBudget = 0;
    if (period === 'day') currentBudget = budget.daily;
    if (period === 'week') currentBudget = budget.weekly;
    if (period === 'month') currentBudget = budget.monthly;

    const remaining = currentBudget > 0 ? currentBudget - expense : null;
    const isOverBudget = remaining !== null && remaining < 0;
    const isWarning = remaining !== null && !isOverBudget && (expense / currentBudget) >= 0.9;

    // Charts Data
    const catMap = new Map<string, number>();
    filtered.filter(t => t.type === 'expense').forEach(t => {
      const catName = categories.find(c => c.id === t.categoryId)?.name || '未知';
      catMap.set(catName, (catMap.get(catName) || 0) + t.amount);
    });
    const pieData = Array.from(catMap.entries()).map(([name, value]) => ({ name, value }));

    const trendMap = new Map<string, number>();
    // Last 7 days trend
    const trendStart = new Date();
    trendStart.setDate(trendStart.getDate() - 6);
    transactions.filter(t => new Date(t.date) >= trendStart).forEach(t => {
         const dKey = new Date(t.date).toLocaleDateString('zh-CN', {month:'numeric', day:'numeric'});
         const val = t.type === 'income' ? t.amount : -t.amount;
         trendMap.set(dKey, (trendMap.get(dKey) || 0) + val);
    });
    const lineData = Array.from(trendMap.entries()).map(([name, value]) => ({ name, value })); // Simplified sort

    return { income, expense, net, remaining, isOverBudget, isWarning, displayList, pieData, lineData, currentBudget };
  }, [transactions, period, budget, categories, filterType, filterAccountId, filterDateStart, filterDateEnd]);

  // --- Handlers ---

  const handleSaveTransaction = (txData: Omit<Transaction, 'id'>) => {
    let newTxList;
    if (editingTx) {
      newTxList = transactions.map(t => t.id === editingTx.id ? { ...txData, id: editingTx.id } : t);
      showToast('记录修改成功');
    } else {
      const newTx: Transaction = { ...txData, id: crypto.randomUUID() };
      newTxList = [newTx, ...transactions];
      showToast(`${txData.type === 'income' ? '收入' : '支出'}记录保存成功`);
    }
    setTransactions(newTxList);
    StorageService.saveTransactions(newTxList);
    setEditingTx(null);
    setView('home');
  };

  const handleDelete = (id: string) => {
    if (window.confirm('确定要删除这条记录吗？删除后不可恢复。')) {
      const newTxList = transactions.filter(t => t.id !== id);
      setTransactions(newTxList);
      StorageService.saveTransactions(newTxList);
      showToast('记录已删除', 'info');
    }
  };

  const saveBudgetSettings = (newBudget: BudgetConfig) => {
      setBudget(newBudget);
      StorageService.saveBudget(newBudget);
      showToast('预算设置已更新');
  };

  // Management Handlers
  const handleAddItem = () => {
      if (!newItemName.trim()) return;
      if (manageMode === 'categories') {
          const newCat: Category = {
              id: `custom_${Date.now()}`,
              name: newItemName,
              type: 'expense', // Default to expense, maybe add UI to toggle
              icon: 'Tag',
              color: '#9E9E9E'
          };
          const newCats = [...categories, newCat];
          setCategories(newCats);
          StorageService.saveCategories(newCats);
      } else if (manageMode === 'accounts') {
          const newAcc: Account = {
              id: `tag_${Date.now()}`,
              name: newItemName,
              type: 'tag'
          };
          const newAccs = [...accounts, newAcc];
          setAccounts(newAccs);
          StorageService.saveAccounts(newAccs);
      }
      setNewItemName('');
      showToast('添加成功');
  };

  const handleDeleteItem = (id: string) => {
      if (manageMode === 'categories') {
          const newCats = categories.filter(c => c.id !== id);
          setCategories(newCats);
          StorageService.saveCategories(newCats);
      } else if (manageMode === 'accounts') {
          const newAccs = accounts.filter(c => c.id !== id);
          setAccounts(newAccs);
          StorageService.saveAccounts(newAccs);
      }
  };

  // --- Renderers ---

  const getCategory = (id: string) => categories.find(c => c.id === id);
  const getAccount = (id: string) => accounts.find(a => a.id === id);

  return (
    <div className="max-w-md mx-auto min-h-screen relative font-sans text-gray-900 bg-[#f3f4f6]">
      {toast && <Toast message={toast.msg} type={toast.type} onClose={() => setToast(null)} />}
      
      {/* Top Bar */}
      <div className="sticky top-0 z-10 bg-[#f3f4f6]/95 backdrop-blur-sm px-4 py-3 flex justify-between items-center border-b border-gray-100">
        <h1 className="text-xl font-extrabold text-gray-900 tracking-tight flex items-center gap-2">
            <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center text-white">
                <Icons.Wallet size={18} />
            </div>
            LZ·震财录
        </h1>
        <div className="text-xs font-medium text-gray-500 bg-white px-3 py-1.5 rounded-full shadow-sm border border-gray-100">
            {new Date().toLocaleDateString('zh-CN', { month: 'long', day: 'numeric' })}
        </div>
      </div>

      <main className="pb-24">
        {/* VIEW: HOME */}
        {view === 'home' && (
            <div className="space-y-4">
                {/* Period Tabs */}
                <div className="flex bg-gray-200 p-1 rounded-xl mx-4 mt-4">
                    {(['day', 'week', 'month'] as Period[]).map(p => (
                        <button 
                            key={p}
                            onClick={() => setPeriod(p)}
                            className={`flex-1 py-2 text-xs font-bold rounded-lg transition-all ${period === p ? 'bg-white text-blue-600 shadow-sm' : 'text-gray-500'}`}
                        >
                            {p === 'day' ? '今日' : p === 'week' ? '本周' : '本月'}
                        </button>
                    ))}
                </div>

                {/* Dashboard Card */}
                <div className={`mx-4 p-6 rounded-2xl shadow-lg relative overflow-hidden transition-colors duration-500 ${stats.isOverBudget ? 'bg-gradient-to-r from-red-500 to-orange-600' : 'bg-gradient-to-r from-blue-600 to-indigo-600'} text-white`}>
                    <div className="flex justify-between items-start mb-6">
                        <div>
                            <p className="text-white/80 text-xs mb-1">
                                {stats.currentBudget > 0 ? (period === 'day' ? '今日剩余预算' : period === 'week' ? '本周剩余预算' : '本月剩余预算') : '本期净收支'}
                            </p>
                            <p className="text-3xl font-bold tracking-tight">
                                ¥{stats.remaining !== null ? stats.remaining.toFixed(2) : stats.net.toFixed(2)}
                            </p>
                        </div>
                        {stats.isWarning && !stats.isOverBudget && (
                            <div className="bg-yellow-400/20 px-2 py-1 rounded text-xs font-bold text-yellow-100 flex items-center gap-1 animate-pulse">
                                <Icons.Alert size={12} /> 预算告急
                            </div>
                        )}
                        {stats.isOverBudget && (
                            <div className="bg-white/20 px-2 py-1 rounded text-xs font-bold text-white flex items-center gap-1">
                                <Icons.Alert size={12} /> 已超支
                            </div>
                        )}
                    </div>
                    
                    <div className="grid grid-cols-2 gap-4 border-t border-white/10 pt-4">
                        <div>
                            <div className="flex items-center gap-1 text-white/70 text-xs mb-1">
                                <Icons.TrendingUp size={12} className="text-green-300"/> 总收入
                            </div>
                            <p className="font-semibold text-lg">+ {stats.income.toFixed(2)}</p>
                        </div>
                        <div>
                            <div className="flex items-center gap-1 text-white/70 text-xs mb-1">
                                <Icons.TrendingDown size={12} className="text-red-300"/> 总支出
                            </div>
                            <p className="font-semibold text-lg">- {stats.expense.toFixed(2)}</p>
                        </div>
                    </div>
                </div>

                {/* Filter & List Header */}
                <div className="px-4 flex justify-between items-center pt-2">
                    <h3 className="font-bold text-gray-800">
                        收支明细 <span className="text-xs font-normal text-gray-400 ml-1">({stats.displayList.length})</span>
                    </h3>
                    <button 
                        onClick={() => setShowFilter(!showFilter)} 
                        className={`p-2 rounded-lg transition-colors ${showFilter ? 'bg-blue-100 text-blue-600' : 'bg-white text-gray-400 border border-gray-100'}`}
                    >
                        <Icons.Filter size={16} />
                    </button>
                </div>

                {/* Filter Panel */}
                {showFilter && (
                    <div className="mx-4 mb-2 p-4 bg-white rounded-xl shadow-sm border border-gray-100 animate-in fade-in slide-in-from-top-2">
                        <div className="space-y-3">
                            <div className="flex items-center gap-2 overflow-x-auto no-scrollbar">
                                <span className="text-xs font-bold text-gray-500 whitespace-nowrap">类型:</span>
                                <button onClick={() => setFilterType('all')} className={`px-2 py-1 rounded text-xs border ${filterType === 'all' ? 'bg-blue-50 border-blue-200 text-blue-600' : 'border-gray-200'}`}>全部</button>
                                <button onClick={() => setFilterType('expense')} className={`px-2 py-1 rounded text-xs border ${filterType === 'expense' ? 'bg-blue-50 border-blue-200 text-blue-600' : 'border-gray-200'}`}>支出</button>
                                <button onClick={() => setFilterType('income')} className={`px-2 py-1 rounded text-xs border ${filterType === 'income' ? 'bg-blue-50 border-blue-200 text-blue-600' : 'border-gray-200'}`}>收入</button>
                            </div>
                            <div className="flex items-center gap-2">
                                <span className="text-xs font-bold text-gray-500 whitespace-nowrap">日期:</span>
                                <input type="date" value={filterDateStart} onChange={e => setFilterDateStart(e.target.value)} className="w-24 text-xs border rounded p-1" />
                                <span className="text-gray-300">-</span>
                                <input type="date" value={filterDateEnd} onChange={e => setFilterDateEnd(e.target.value)} className="w-24 text-xs border rounded p-1" />
                            </div>
                            <div className="flex items-center gap-2">
                                <span className="text-xs font-bold text-gray-500 whitespace-nowrap">标签:</span>
                                <select value={filterAccountId} onChange={e => setFilterAccountId(e.target.value)} className="text-xs border rounded p-1 bg-white">
                                    <option value="all">全部标签</option>
                                    {accounts.map(acc => <option key={acc.id} value={acc.id}>{acc.name}</option>)}
                                </select>
                            </div>
                            {(filterType !== 'all' || filterAccountId !== 'all' || filterDateStart || filterDateEnd) && (
                                <div className="pt-2 border-t border-dashed">
                                    <button onClick={() => {
                                        setFilterType('all');
                                        setFilterAccountId('all');
                                        setFilterDateStart('');
                                        setFilterDateEnd('');
                                    }} className="text-xs text-red-500 w-full text-center">清除筛选</button>
                                </div>
                            )}
                        </div>
                    </div>
                )}

                {/* Transactions List */}
                <div className="space-y-3 px-2">
                    {stats.displayList.length === 0 ? (
                        <div className="flex flex-col items-center justify-center py-12 text-gray-400">
                            <div className="bg-white p-4 rounded-full mb-3 shadow-sm">
                                <Icons.Calendar size={32} className="opacity-20 text-gray-500" />
                            </div>
                            <p className="text-sm">暂无记录</p>
                        </div>
                    ) : (
                        stats.displayList.map(tx => {
                            const cat = getCategory(tx.categoryId);
                            const acc = getAccount(tx.accountId);
                            return (
                                <div key={tx.id} className="bg-white p-4 mx-2 rounded-xl shadow-sm border border-gray-50 flex justify-between items-center active:scale-[0.99] transition-transform">
                                    <div className="flex gap-3 items-center">
                                        <div className={`w-10 h-10 rounded-full flex items-center justify-center shrink-0 ${tx.type === 'income' ? 'bg-green-100 text-green-600' : 'bg-red-100 text-red-600'}`}>
                                            <IconRenderer name={cat?.icon || 'HelpCircle'} size={20} />
                                        </div>
                                        <div className="overflow-hidden">
                                            <div className="flex items-center gap-2">
                                                <p className="font-bold text-gray-800 text-sm truncate">{cat?.name}</p>
                                                {acc && <span className="text-[10px] bg-gray-100 text-gray-500 px-1.5 py-0.5 rounded-md truncate max-w-[80px]">{acc.name}</span>}
                                            </div>
                                            <p className="text-xs text-gray-400 mt-0.5 truncate">{tx.date.split('T')[0]} {tx.note && `· ${tx.note}`}</p>
                                        </div>
                                    </div>
                                    <div className="text-right shrink-0 ml-2">
                                        <p className={`font-bold text-base ${tx.type === 'income' ? 'text-green-600' : 'text-gray-900'}`}>
                                            {tx.type === 'income' ? '+' : '-'} {tx.amount.toFixed(2)}
                                        </p>
                                        <div className="flex gap-3 justify-end mt-1">
                                            <button onClick={() => { setEditingTx(tx); setView('add'); }} className="text-gray-400 hover:text-blue-500 p-1"><Icons.Edit size={14} /></button>
                                            <button onClick={() => handleDelete(tx.id)} className="text-gray-400 hover:text-red-500 p-1"><Icons.Trash size={14} /></button>
                                        </div>
                                    </div>
                                </div>
                            )
                        })
                    )}
                </div>
            </div>
        )}

        {/* VIEW: STATS */}
        {view === 'stats' && (
             <div className="space-y-6 pt-4">
                <div className="px-4 flex justify-between items-center">
                    <h2 className="text-xl font-bold">统计分析</h2>
                    <div className="bg-gray-100 rounded-lg p-0.5 flex text-xs">
                        <button onClick={() => setPeriod('week')} className={`px-3 py-1 rounded-md ${period === 'week' ? 'bg-white shadow-sm font-bold' : 'text-gray-500'}`}>周</button>
                        <button onClick={() => setPeriod('month')} className={`px-3 py-1 rounded-md ${period === 'month' ? 'bg-white shadow-sm font-bold' : 'text-gray-500'}`}>月</button>
                    </div>
                </div>
                
                <div className="bg-white mx-4 p-4 rounded-xl shadow-sm border border-gray-100">
                    <h3 className="font-semibold text-gray-700 mb-4 text-sm flex items-center gap-2">
                        <Icons.PieChart size={16} className="text-blue-500"/> 支出分类占比
                    </h3>
                    <div className="h-64 relative">
                        <ResponsiveContainer width="100%" height="100%">
                            <PieChart>
                            <Pie
                                data={stats.pieData}
                                innerRadius={60}
                                outerRadius={80}
                                paddingAngle={2}
                                dataKey="value"
                            >
                                {stats.pieData.map((entry, index) => (
                                <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                                ))}
                            </Pie>
                            <RechartsTooltip />
                            </PieChart>
                        </ResponsiveContainer>
                        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 text-center pointer-events-none">
                            <p className="text-xs text-gray-400">总支出</p>
                            <p className="text-xl font-bold text-gray-800">¥{stats.expense.toFixed(0)}</p>
                        </div>
                    </div>
                    <div className="grid grid-cols-2 gap-2 mt-4">
                        {stats.pieData.sort((a,b) => b.value - a.value).slice(0,6).map((entry, index) => (
                            <div key={index} className="flex items-center gap-2 text-xs">
                                <div className="w-2 h-2 rounded-full" style={{backgroundColor: COLORS[index % COLORS.length]}}></div>
                                <span className="flex-1 truncate text-gray-600">{entry.name}</span>
                                <span className="font-mono font-medium">{((entry.value / stats.expense) * 100).toFixed(0)}%</span>
                            </div>
                        ))}
                    </div>
                </div>

                <div className="bg-white mx-4 p-4 rounded-xl shadow-sm border border-gray-100">
                    <h3 className="font-semibold text-gray-700 mb-4 text-sm flex items-center gap-2">
                        <Icons.TrendingUp size={16} className="text-blue-500"/> 近7天收支趋势
                    </h3>
                    <div className="h-52">
                        <ResponsiveContainer width="100%" height="100%">
                            <LineChart data={stats.lineData}>
                                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f0f0f0" />
                                <XAxis dataKey="name" fontSize={10} tickLine={false} axisLine={false} tick={{fill: '#9ca3af'}} />
                                <YAxis fontSize={10} tickLine={false} axisLine={false} tick={{fill: '#9ca3af'}} />
                                <RechartsTooltip contentStyle={{borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)'}} />
                                <Line type="monotone" dataKey="value" stroke="#3b82f6" strokeWidth={2} dot={{fill: '#3b82f6', r: 3}} />
                            </LineChart>
                        </ResponsiveContainer>
                    </div>
                </div>
            </div>
        )}

        {/* VIEW: SETTINGS */}
        {view === 'settings' && (
             <div className="space-y-6 pt-4">
                <h2 className="text-xl font-bold px-4">我的设置</h2>
                
                <div className="bg-white mx-4 p-5 rounded-xl shadow-sm border border-gray-100 space-y-5">
                    <h3 className="font-bold text-gray-800 border-b pb-3 text-sm flex items-center gap-2">
                        <Icons.Settings size={16} className="text-blue-600"/> 预算设置
                    </h3>
                    <div className="grid grid-cols-3 gap-3">
                        {['daily', 'weekly', 'monthly'].map((type) => (
                            <div key={type}>
                                <label className="block text-[10px] text-gray-500 mb-1.5 text-center uppercase tracking-wider">
                                    {type === 'daily' ? '每日' : type === 'weekly' ? '每周' : '每月'}
                                </label>
                                <input 
                                    type="number" 
                                    value={(budget as any)[type] || ''} 
                                    onChange={e => setBudget({...budget, [type]: parseFloat(e.target.value) || 0})}
                                    className="w-full p-2 bg-gray-50 rounded border text-center text-sm font-medium focus:border-blue-500 outline-none"
                                    placeholder="0"
                                />
                            </div>
                        ))}
                    </div>
                    <button onClick={() => saveBudgetSettings(budget)} className="w-full py-2.5 bg-gray-900 text-white rounded-lg font-medium text-sm hover:bg-gray-800 transition-colors">
                        保存预算
                    </button>
                </div>

                <div className="bg-white mx-4 p-5 rounded-xl shadow-sm border border-gray-100 space-y-4">
                    <h3 className="font-bold text-gray-800 border-b pb-3 text-sm flex items-center gap-2">
                        <Icons.Tag size={16} className="text-blue-600"/> 管理配置
                    </h3>
                    <div className="space-y-2">
                        <button onClick={() => setManageMode('categories')} className="w-full flex justify-between items-center p-3 bg-gray-50 rounded-lg hover:bg-gray-100">
                            <span className="text-sm font-medium text-gray-700">收支分类管理</span>
                            <Icons.ChevronRight size={16} className="text-gray-400" />
                        </button>
                        <button onClick={() => setManageMode('accounts')} className="w-full flex justify-between items-center p-3 bg-gray-50 rounded-lg hover:bg-gray-100">
                            <span className="text-sm font-medium text-gray-700">支付标签管理</span>
                            <Icons.ChevronRight size={16} className="text-gray-400" />
                        </button>
                    </div>
                </div>

                <div className="bg-white mx-4 p-5 rounded-xl shadow-sm border border-gray-100 space-y-4">
                    <h3 className="font-bold text-gray-800 border-b pb-3 text-sm flex items-center gap-2">
                        <Icons.Download size={16} className="text-blue-600"/> 数据备份
                    </h3>
                    <button onClick={() => {
                        const dataStr = StorageService.exportData();
                        const blob = new Blob([dataStr], { type: 'application/json' });
                        const url = URL.createObjectURL(blob);
                        const a = document.createElement('a');
                        a.href = url;
                        a.download = `lifeledger_backup_${new Date().toISOString().split('T')[0]}.json`;
                        a.click();
                        showToast('备份文件已生成');
                    }} className="w-full py-3 bg-blue-50 text-blue-700 rounded-lg font-medium text-sm hover:bg-blue-100 transition-colors">
                        导出本地数据 (JSON)
                    </button>
                    <button onClick={() => {
                        if(window.confirm('警告：此操作将清空所有数据且不可恢复！')) {
                            StorageService.clearAllData();
                            window.location.reload();
                        }
                    }} className="w-full py-3 bg-red-50 text-red-600 rounded-lg font-medium text-sm hover:bg-red-100 transition-colors">
                        清空所有数据
                    </button>
                </div>
                
                 <div className="text-center text-xs text-gray-400 pb-4">
                    <p>LZ·震财录 v3.0</p>
                    <p>纯本地 · 无联网 · 极简版</p>
                </div>
            </div>
        )}
      </main>

      {/* Floating Add Button */}
      {view !== 'add' && view !== 'settings' && (
           <button 
              onClick={() => {
                  setEditingTx(null);
                  setView('add');
              }}
              className="fixed bottom-24 right-6 w-14 h-14 bg-gray-900 rounded-full text-white shadow-xl shadow-gray-400/50 flex items-center justify-center active:scale-95 transition-transform z-30"
          >
              <Icons.Plus size={28} />
          </button>
      )}

      {/* MODAL: Transaction Form */}
      {view === 'add' && (
        <div className="fixed inset-0 z-50 bg-gray-900/60 flex items-end sm:items-center justify-center p-0 sm:p-4 backdrop-blur-sm animate-in fade-in duration-200">
            <div className="w-full max-w-md h-auto">
                    <TransactionForm 
                    initialData={editingTx}
                    categories={categories}
                    accounts={accounts}
                    onSave={handleSaveTransaction} 
                    onCancel={() => {
                        setEditingTx(null);
                        setView('home');
                    }} 
                    onManageAccounts={() => setManageMode('accounts')}
                />
            </div>
        </div>
      )}

      {/* MODAL: Management */}
      {manageMode !== 'none' && (
          <div className="fixed inset-0 z-[60] bg-white flex flex-col animate-in slide-in-from-bottom-10 duration-200">
              <div className="flex justify-between items-center p-4 border-b bg-gray-50">
                  <h3 className="font-bold text-lg">{manageMode === 'categories' ? '分类管理' : '标签管理'}</h3>
                  <button onClick={() => setManageMode('none')} className="p-2 bg-gray-200 rounded-full"><Icons.X size={18} /></button>
              </div>
              <div className="flex-1 overflow-y-auto p-4 space-y-2">
                  {(manageMode === 'categories' ? categories : accounts).map((item) => (
                      <div key={item.id} className="flex justify-between items-center p-3 bg-gray-50 rounded-lg border border-gray-100">
                          <div className="flex items-center gap-3">
                              {manageMode === 'categories' && (
                                  <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center text-blue-600">
                                      <IconRenderer name={(item as Category).icon} size={16} />
                                  </div>
                              )}
                              <span className="font-medium">{item.name}</span>
                          </div>
                          <button onClick={() => handleDeleteItem(item.id)} className="text-red-400 p-2"><Icons.Trash size={16} /></button>
                      </div>
                  ))}
              </div>
              <div className="p-4 border-t bg-gray-50 pb-safe-area">
                  <div className="flex gap-2">
                      <input 
                        type="text" 
                        value={newItemName} 
                        onChange={e => setNewItemName(e.target.value)} 
                        placeholder={manageMode === 'categories' ? "输入新分类名称..." : "输入新标签名称..."}
                        className="flex-1 p-3 rounded-lg border outline-none focus:border-blue-500"
                      />
                      <button onClick={handleAddItem} className="bg-blue-600 text-white px-6 rounded-lg font-bold">添加</button>
                  </div>
              </div>
          </div>
      )}

      {/* Bottom Nav */}
      <nav className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 pb-safe-area z-40">
        <div className="max-w-md mx-auto flex justify-around items-center h-16 relative">
          <button 
            onClick={() => setView('home')} 
            className={`flex flex-col items-center gap-1 w-16 transition-colors ${view === 'home' ? 'text-blue-600' : 'text-gray-400'}`}
          >
            <Icons.Home size={22} strokeWidth={view === 'home' ? 2.5 : 2} />
            <span className="text-[10px] font-medium">首页</span>
          </button>
          
          <button 
            onClick={() => setView('stats')} 
            className={`flex flex-col items-center gap-1 w-16 transition-colors ${view === 'stats' ? 'text-blue-600' : 'text-gray-400'}`}
          >
            <Icons.PieChart size={22} strokeWidth={view === 'stats' ? 2.5 : 2} />
            <span className="text-[10px] font-medium">统计</span>
          </button>

          <button 
            onClick={() => setView('settings')} 
            className={`flex flex-col items-center gap-1 w-16 transition-colors ${view === 'settings' ? 'text-blue-600' : 'text-gray-400'}`}
          >
            <Icons.Settings size={22} strokeWidth={view === 'settings' ? 2.5 : 2} />
            <span className="text-[10px] font-medium">我的</span>
          </button>
        </div>
      </nav>
    </div>
  );
}