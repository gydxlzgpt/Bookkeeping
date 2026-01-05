import { Transaction, BudgetConfig, Account, Category, DEFAULT_ACCOUNTS, DEFAULT_CATEGORIES } from '../types';

const KEYS = {
  TRANSACTIONS: 'lifeledger_transactions_v2',
  BUDGET: 'lifeledger_budget_v2',
  CATEGORIES: 'lifeledger_categories_v2',
  ACCOUNTS: 'lifeledger_accounts_v2'
};

export const StorageService = {
  getTransactions: (): Transaction[] => {
    try {
      const data = localStorage.getItem(KEYS.TRANSACTIONS);
      return data ? JSON.parse(data) : [];
    } catch (e) {
      console.error('Failed to load transactions', e);
      return [];
    }
  },

  saveTransactions: (data: Transaction[]) => {
    localStorage.setItem(KEYS.TRANSACTIONS, JSON.stringify(data));
  },

  getBudget: (): BudgetConfig => {
    try {
      const data = localStorage.getItem(KEYS.BUDGET);
      return data ? JSON.parse(data) : { daily: 0, weekly: 0, monthly: 0, enableAlerts: true };
    } catch (e) {
      return { daily: 0, weekly: 0, monthly: 0, enableAlerts: true };
    }
  },

  saveBudget: (config: BudgetConfig) => {
    localStorage.setItem(KEYS.BUDGET, JSON.stringify(config));
  },

  getCategories: (): Category[] => {
    try {
      const data = localStorage.getItem(KEYS.CATEGORIES);
      return data ? JSON.parse(data) : DEFAULT_CATEGORIES;
    } catch (e) {
      return DEFAULT_CATEGORIES;
    }
  },

  saveCategories: (data: Category[]) => {
    localStorage.setItem(KEYS.CATEGORIES, JSON.stringify(data));
  },

  getAccounts: (): Account[] => {
    try {
      const data = localStorage.getItem(KEYS.ACCOUNTS);
      return data ? JSON.parse(data) : DEFAULT_ACCOUNTS;
    } catch (e) {
      return DEFAULT_ACCOUNTS;
    }
  },

  saveAccounts: (data: Account[]) => {
    localStorage.setItem(KEYS.ACCOUNTS, JSON.stringify(data));
  },

  clearAllData: () => {
    localStorage.removeItem(KEYS.TRANSACTIONS);
    localStorage.removeItem(KEYS.BUDGET);
    localStorage.removeItem(KEYS.CATEGORIES);
    localStorage.removeItem(KEYS.ACCOUNTS);
  },
  
  exportData: (): string => {
      const data = {
          transactions: StorageService.getTransactions(),
          budget: StorageService.getBudget(),
          categories: StorageService.getCategories(),
          accounts: StorageService.getAccounts()
      };
      return JSON.stringify(data, null, 2);
  },
  
  importData: (jsonString: string): boolean => {
      try {
          const data = JSON.parse(jsonString);
          if (data.transactions) StorageService.saveTransactions(data.transactions);
          if (data.budget) StorageService.saveBudget(data.budget);
          if (data.categories) StorageService.saveCategories(data.categories);
          if (data.accounts) StorageService.saveAccounts(data.accounts);
          return true;
      } catch (e) {
          return false;
      }
  }
};
