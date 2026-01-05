import React, { useState, useEffect } from 'react';
import { Transaction, TransactionType, Category, Account } from '../types';
import { IconRenderer } from './Icons';

interface Props {
  initialData?: Transaction | null;
  categories: Category[];
  accounts: Account[];
  onSave: (transaction: Omit<Transaction, 'id'>) => void;
  onCancel: () => void;
  onManageAccounts: () => void; // New prop to jump to tag management
}

export const TransactionForm: React.FC<Props> = ({ initialData, categories, accounts, onSave, onCancel, onManageAccounts }) => {
  const [amount, setAmount] = useState('');
  const [type, setType] = useState<TransactionType>('expense');
  const [categoryId, setCategoryId] = useState('');
  const [accountId, setAccountId] = useState('');
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [note, setNote] = useState('');

  useEffect(() => {
    if (initialData) {
      setAmount(initialData.amount.toString());
      setType(initialData.type);
      setCategoryId(initialData.categoryId);
      setAccountId(initialData.accountId);
      setDate(initialData.date.split('T')[0]);
      setNote(initialData.note);
    } else {
        // Defaults
        const firstCat = categories.find(c => c.type === type);
        if (firstCat) setCategoryId(firstCat.id);
        if (accounts.length > 0) setAccountId(accounts[0].id);
    }
  }, [initialData, type, categories, accounts]);

  // Sync category when type changes (if not editing or if type manually changed)
  useEffect(() => {
      if (!initialData || initialData.type !== type) {
          const firstCat = categories.find(c => c.type === type);
          if (firstCat) setCategoryId(firstCat.id);
      }
  }, [type, categories, initialData]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const numAmount = parseFloat(amount);
    if (!amount || numAmount <= 0) {
      alert('请输入有效的金额');
      return;
    }
    if (!categoryId) {
      alert('请选择收支分类');
      return;
    }
    if (!accountId) {
      alert('请选择支付方式');
      return;
    }

    onSave({
      amount: numAmount,
      type,
      categoryId,
      accountId,
      note,
      date: new Date(date).toISOString(),
    });
  };

  const quickAmounts = [5, 10, 20, 50, 100];
  const currentCategories = categories.filter(c => c.type === type);

  return (
    <div className="bg-white rounded-t-2xl sm:rounded-2xl shadow-xl h-[92vh] sm:h-auto flex flex-col overflow-hidden">
      {/* Header */}
      <div className="flex justify-between items-center p-4 bg-gray-50 border-b">
        <button onClick={onCancel} className="text-gray-500 text-sm px-2">取消</button>
        <div className="flex bg-gray-200 p-1 rounded-lg">
           <button
              className={`px-6 py-1.5 rounded-md text-sm font-medium transition-all ${type === 'expense' ? 'bg-white text-red-500 shadow-sm' : 'text-gray-500'}`}
              onClick={() => setType('expense')}
            >
              支出
            </button>
            <button
              className={`px-6 py-1.5 rounded-md text-sm font-medium transition-all ${type === 'income' ? 'bg-white text-green-500 shadow-sm' : 'text-gray-500'}`}
              onClick={() => setType('income')}
            >
              收入
            </button>
        </div>
        <button onClick={handleSubmit} className="text-blue-600 font-bold text-sm px-2">保存</button>
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-6">
        
        {/* Amount */}
        <div>
          <label className="block text-xs text-gray-400 mb-1">金额 <span className="text-red-400">*</span></label>
          <div className="relative border-b-2 border-gray-100 focus-within:border-blue-500 transition-colors">
            <span className="absolute left-0 top-1/2 -translate-y-1/2 text-2xl font-bold text-gray-700">¥</span>
            <input
              type="number"
              step="0.01"
              value={amount}
              onChange={(e) => {
                  const val = e.target.value;
                  if (parseFloat(val) < 0) return; 
                  setAmount(val);
              }}
              className="w-full pl-6 py-3 text-3xl font-bold outline-none bg-transparent"
              placeholder="0.00"
              autoFocus={!initialData}
            />
          </div>
          <div className="flex gap-2 mt-3 overflow-x-auto no-scrollbar pb-1">
            {quickAmounts.map(amt => (
              <button
                key={amt}
                type="button"
                onClick={() => setAmount(amt.toString())}
                className="flex-shrink-0 px-4 py-1.5 text-xs bg-gray-50 text-gray-600 rounded-full border border-gray-200 active:bg-blue-50 active:border-blue-200 active:text-blue-600 transition-colors"
              >
                ¥{amt}
              </button>
            ))}
          </div>
        </div>

        {/* Categories */}
        <div>
          <label className="block text-xs text-gray-400 mb-2">分类 <span className="text-red-400">*</span></label>
          <div className="grid grid-cols-5 gap-3">
            {currentCategories.map(cat => (
              <button
                key={cat.id}
                type="button"
                onClick={() => setCategoryId(cat.id)}
                className="flex flex-col items-center gap-1 group"
              >
                <div className={`w-12 h-12 rounded-full flex items-center justify-center transition-all ${categoryId === cat.id ? (type === 'expense' ? 'bg-red-50 text-red-600 ring-2 ring-red-500 ring-offset-1' : 'bg-green-50 text-green-600 ring-2 ring-green-500 ring-offset-1') : 'bg-gray-50 text-gray-400 group-hover:bg-gray-100'}`}>
                    <IconRenderer name={cat.icon} size={20} />
                </div>
                <span className={`text-[10px] truncate w-full text-center ${categoryId === cat.id ? 'text-gray-800 font-bold' : 'text-gray-400'}`}>
                    {cat.name}
                </span>
              </button>
            ))}
          </div>
        </div>

        {/* Account & Date */}
        <div className="grid grid-cols-2 gap-4">
            <div>
                 <label className="block text-xs text-gray-400 mb-2">支付方式 (标签)</label>
                 <div className="relative">
                    <select 
                        value={accountId}
                        onChange={(e) => setAccountId(e.target.value)}
                        className="w-full p-2.5 bg-gray-50 rounded-lg text-sm border-r-[8px] border-transparent outline-none appearance-none"
                    >
                        {accounts.map(acc => (
                            <option key={acc.id} value={acc.id}>{acc.name}</option>
                        ))}
                    </select>
                 </div>
                 {/* Quick Link to Add Account */}
                 <button type="button" onClick={onManageAccounts} className="text-[10px] text-blue-500 mt-1 pl-1">
                    + 管理标签
                 </button>
            </div>
            <div>
                <label className="block text-xs text-gray-400 mb-2">日期</label>
                <input
                    type="date"
                    value={date}
                    onChange={(e) => setDate(e.target.value)}
                    className="w-full p-2.5 bg-gray-50 rounded-lg text-sm outline-none"
                />
            </div>
        </div>

        {/* Note */}
        <div>
            <label className="block text-xs text-gray-400 mb-2">备注 (选填)</label>
            <input
                type="text"
                value={note}
                onChange={(e) => setNote(e.target.value)}
                placeholder="例如：午餐-公司楼下"
                maxLength={50}
                className="w-full p-3 bg-gray-50 rounded-lg text-sm outline-none"
            />
        </div>
      </div>
    </div>
  );
};
