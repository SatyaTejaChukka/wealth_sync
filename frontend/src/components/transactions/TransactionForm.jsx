import React, { useState, useEffect, useCallback } from 'react';
import { Input } from '../ui/Input.jsx';
import { Button } from '../ui/Button.jsx';
import { Select } from '../ui/Select.jsx';

import { categoryService } from '../../services/categories.js';
import { billService } from '../../services/bills.js';
import { subscriptionService } from '../../services/subscriptions.js';
import { Plus, Check } from 'lucide-react';
import { useToast } from '../ui/Toast.jsx';

function toDatetimeLocalValue(value) {
  if (!value) return '';
  const date = new Date(value);
  const tzAdjusted = new Date(date.getTime() - date.getTimezoneOffset() * 60000);
  return tzAdjusted.toISOString().slice(0, 16);
}

function getInitialLinkType(initialData) {
  if (initialData.bill_id) return 'bill';
  if (initialData.subscription_id) return 'subscription';
  return 'none';
}

function formatRecurringAmount(value) {
  const amount = Number(value);
  return Number.isFinite(amount) ? `$${amount.toFixed(2)}` : '$0.00';
}

export function TransactionForm({ onSubmit, onCancel, initialData = {} }) {
  const [formData, setFormData] = useState({
    description: initialData.description || '',
    amount: initialData.amount || '',
    type: initialData.type || 'EXPENSE',
    category_id: initialData.category_id || '',
    status: initialData.status || 'completed',
    bill_id: initialData.bill_id || '',
    subscription_id: initialData.subscription_id || '',
    occurred_at: initialData.occurred_at 
      ? toDatetimeLocalValue(initialData.occurred_at)
      : (() => {
          const now = new Date();
          now.setMinutes(now.getMinutes() - now.getTimezoneOffset());
          return now.toISOString().slice(0, 16);
        })()
  });
  const [linkType, setLinkType] = useState(() => getInitialLinkType(initialData));

  const [categories, setCategories] = useState([]);
  const [bills, setBills] = useState([]);
  const [subscriptions, setSubscriptions] = useState([]);
  const [isLoadingCategories, setIsLoadingCategories] = useState(true);
  const [isLoadingSources, setIsLoadingSources] = useState(true);
  const [newCategoryName, setNewCategoryName] = useState('');
  const [isCreatingCategory, setIsCreatingCategory] = useState(false);
  const toast = useToast();

  const loadFormOptions = useCallback(async () => {
    setIsLoadingCategories(true);
    setIsLoadingSources(true);

    const [categoryResult, billResult, subscriptionResult] = await Promise.allSettled([
      categoryService.getAll(),
      billService.getAll(),
      subscriptionService.getAll(),
    ]);

    if (categoryResult.status === 'fulfilled') {
      setCategories(categoryResult.value);
    } else {
      console.error('Failed to load categories', categoryResult.reason);
      setCategories([]);
    }

    if (billResult.status === 'fulfilled') {
      setBills(billResult.value);
    } else {
      console.error('Failed to load bills', billResult.reason);
      setBills([]);
    }

    if (subscriptionResult.status === 'fulfilled') {
      setSubscriptions(subscriptionResult.value);
    } else {
      console.error('Failed to load subscriptions', subscriptionResult.reason);
      setSubscriptions([]);
    }

    setIsLoadingCategories(false);
    setIsLoadingSources(false);
  }, []);

  useEffect(() => {
    const timer = setTimeout(() => {
      void loadFormOptions();
    }, 0);

    return () => clearTimeout(timer);
  }, [loadFormOptions]);

  const handleCreateCategory = async () => {
      const normalizedName = newCategoryName.trim();
      if (!normalizedName) return;
      const duplicateExists = categories.some(
        (category) => category?.name?.trim().toLowerCase() === normalizedName.toLowerCase()
      );
      if (duplicateExists) {
        toast.warning(`Category "${normalizedName}" already exists.`);
        return;
      }
      try {
          const newCat = await categoryService.create({ name: normalizedName, color: '#8b5cf6' });
          setCategories((prev) => [...prev, newCat]);
          setFormData((prev) => ({ ...prev, category_id: newCat.id }));
          setNewCategoryName('');
          setIsCreatingCategory(false);
          toast.success('Category created');
      } catch (error) {
          const detail = error?.response?.data?.detail;
          const message =
            typeof detail === 'string' && detail.trim()
              ? detail
              : 'Failed to create category';
          toast.error(message);
      }
  };

  const applyLinkedDefaults = (prev, source, amountKey) => {
    const next = {
      ...prev,
      type: 'EXPENSE',
    };

    if (!prev.description?.trim()) {
      next.description = source.name;
    }

    if (!prev.amount) {
      next.amount = source?.[amountKey] != null ? String(source[amountKey]) : prev.amount;
    }

    if (!prev.category_id && source?.category_id) {
      next.category_id = source.category_id;
    }

    return next;
  };

  const handleLinkTypeChange = (nextType) => {
    setLinkType(nextType);
    setFormData((prev) => ({
      ...prev,
      type: nextType === 'none' ? prev.type : 'EXPENSE',
      bill_id: nextType === 'bill' ? prev.bill_id : '',
      subscription_id: nextType === 'subscription' ? prev.subscription_id : '',
    }));
  };

  const handleBillChange = (billId) => {
    const selectedBill = bills.find((bill) => bill.id === billId);
    setFormData((prev) => {
      const base = {
        ...prev,
        bill_id: billId,
        subscription_id: '',
      };
      return selectedBill ? applyLinkedDefaults(base, selectedBill, 'amount_estimated') : base;
    });
  };

  const handleSubscriptionChange = (subscriptionId) => {
    const selectedSubscription = subscriptions.find((subscription) => subscription.id === subscriptionId);
    setFormData((prev) => {
      const base = {
        ...prev,
        subscription_id: subscriptionId,
        bill_id: '',
      };
      return selectedSubscription ? applyLinkedDefaults(base, selectedSubscription, 'amount') : base;
    });
  };

  const handleSubmit = (e) => {
    e.preventDefault();

    if (linkType === 'bill' && !formData.bill_id) {
      toast.warning('Select a bill to link this transaction.');
      return;
    }

    if (linkType === 'subscription' && !formData.subscription_id) {
      toast.warning('Select a subscription to link this transaction.');
      return;
    }

    const occurredAtIso = formData.occurred_at
      ? new Date(formData.occurred_at).toISOString()
      : null;

    if (
      formData.status === 'completed' &&
      occurredAtIso &&
      new Date(occurredAtIso).getTime() > Date.now() + 5000
    ) {
      toast.warning('Completed transactions cannot use a future date.');
      return;
    }

    onSubmit({
        ...formData,
        amount: parseFloat(formData.amount),
        type: linkType === 'none' ? formData.type : 'EXPENSE',
        occurred_at: occurredAtIso,
        category_id: formData.category_id || null,
        bill_id: linkType === 'bill' ? formData.bill_id || null : null,
        subscription_id: linkType === 'subscription' ? formData.subscription_id || null : null,
    });
  };

  const categoryOptions = categories.map(c => ({ value: c.id, label: c.name }));
  const billOptions = bills.map((bill) => ({
    value: bill.id,
    label: `${bill.name} | ${formatRecurringAmount(bill.amount_estimated)}`,
  }));
  const subscriptionOptions = subscriptions.map((subscription) => ({
    value: subscription.id,
    label: `${subscription.name} | ${formatRecurringAmount(subscription.amount)}`,
  }));
  const selectedBill = bills.find((bill) => bill.id === formData.bill_id);
  const selectedSubscription = subscriptions.find((subscription) => subscription.id === formData.subscription_id);
  const linkedSource = linkType === 'bill' ? selectedBill : selectedSubscription;

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="space-y-2">
        <label className="text-sm font-medium text-zinc-400">Description</label>
        <Input 
          required
          value={formData.description}
          onChange={(e) => setFormData({...formData, description: e.target.value})}
          placeholder="e.g. Grocery Store"
        />
      </div>

       <div className="space-y-2">
        <label className="text-sm font-medium text-zinc-400">Category</label>
        
        {!isCreatingCategory ? (
            <div className="flex gap-2">
                 <div className="flex-1">
                    <Select 
                        options={categoryOptions}
                        value={formData.category_id}
                        onChange={(val) => setFormData({...formData, category_id: val})}
                        placeholder={isLoadingCategories ? "Loading categories..." : "Select a category"}
                        searchable={true}
                    />
                 </div>
                 <Button 
                    type="button" 
                    variant="outline" 
                    className="border-dashed border-zinc-700 text-zinc-400 hover:text-white hover:border-zinc-500"
                    onClick={() => setIsCreatingCategory(true)}
                 >
                    <Plus size={16} />
                 </Button>
            </div>
        ) : (
             <div className="flex gap-2 animate-fade-in">
                <Input 
                    value={newCategoryName} 
                    onChange={(e) => setNewCategoryName(e.target.value)}
                    placeholder="New category name..."
                    autoFocus
                />
                <Button type="button" variant="gradient" onClick={handleCreateCategory}>
                   <Check size={16} />
                </Button>
                <Button type="button" variant="ghost" onClick={() => setIsCreatingCategory(false)}>
                   Cancel
                </Button>
            </div>
        )}
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        <div className="space-y-2">
          <label className="text-sm font-medium text-zinc-400">Status</label>
          <Select
            options={[
              { value: 'completed', label: 'Completed' },
              { value: 'pending', label: 'Pending' },
              { value: 'cancelled', label: 'Cancelled' }
            ]}
            value={formData.status}
            onChange={(val) => setFormData({ ...formData, status: val })}
          />
        </div>
        <div className="space-y-2">
          <label className="text-sm font-medium text-zinc-400">Linked Source</label>
          <Select
            options={[
              { value: 'none', label: 'None' },
              { value: 'bill', label: 'Bill' },
              { value: 'subscription', label: 'Subscription' }
            ]}
            value={linkType}
            onChange={handleLinkTypeChange}
          />
        </div>
      </div>

      {linkType !== 'none' && (
        <div className="space-y-3 rounded-2xl border border-white/5 bg-zinc-900/30 p-4">
          <div className="space-y-2">
            <label className="text-sm font-medium text-zinc-300">
              {linkType === 'bill' ? 'Select Bill' : 'Select Subscription'}
            </label>
            <Select
              options={linkType === 'bill' ? billOptions : subscriptionOptions}
              value={linkType === 'bill' ? formData.bill_id : formData.subscription_id}
              onChange={linkType === 'bill' ? handleBillChange : handleSubscriptionChange}
              placeholder={
                isLoadingSources
                  ? 'Loading recurring items...'
                  : linkType === 'bill'
                    ? 'Select a bill'
                    : 'Select a subscription'
              }
              searchable={true}
            />
          </div>

          {linkedSource ? (
            <div className="rounded-xl border border-white/5 bg-black/20 px-4 py-3">
              <p className="text-xs uppercase tracking-[0.18em] text-zinc-500">
                Linked {linkType === 'bill' ? 'Bill' : 'Subscription'}
              </p>
              <p className="mt-1 font-medium text-white">{linkedSource.name}</p>
              <p className="mt-1 text-xs text-zinc-400">
                {linkType === 'bill'
                  ? `Expected amount ${formatRecurringAmount(linkedSource.amount_estimated)} | Due day ${linkedSource.due_day}`
                  : `Recurring amount ${formatRecurringAmount(linkedSource.amount)}${linkedSource.next_billing_date ? ` | Next billing ${new Date(linkedSource.next_billing_date).toLocaleDateString()}` : ''}`}
              </p>
            </div>
          ) : !isLoadingSources ? (
            <p className="text-xs text-amber-400">
              {linkType === 'bill'
                ? 'No bills available yet. Create one in the Bills page to link it here.'
                : 'No subscriptions available yet. Create one in the Subscriptions page to link it here.'}
            </p>
          ) : null}

          <p className="text-xs text-zinc-500">
            Linked recurring items are always submitted as expense transactions, and only one source can be attached at a time.
          </p>
        </div>
      )}

      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
            <label className="text-sm font-medium text-zinc-400">Amount</label>
            <Input 
                required
                type="number"
                step="0.01"
                value={formData.amount}
                onChange={(e) => setFormData({...formData, amount: e.target.value})}
                placeholder="0.00"
            />
        </div>
        <div className="space-y-2">
            <label className="text-sm font-medium text-zinc-400">Type</label>
            {linkType === 'none' ? (
              <Select 
                  options={[
                      { value: 'EXPENSE', label: 'Expense' },
                      { value: 'INCOME', label: 'Income' }
                  ]}
                  value={formData.type}
                  onChange={(val) => setFormData({...formData, type: val})}
              />
            ) : (
              <div className="flex h-12 items-center justify-between rounded-xl border border-zinc-800 bg-zinc-950/50 px-4 text-sm text-white">
                <span>Expense</span>
                <span className="text-[11px] uppercase tracking-[0.18em] text-zinc-500">Linked</span>
              </div>
            )}
        </div>
      </div>

      <div className="space-y-2">
        <label className="text-sm font-medium text-zinc-400">Date & Time</label>
        <Input 
          type="datetime-local"
          value={formData.occurred_at}
          onChange={(e) => setFormData({...formData, occurred_at: e.target.value})}
        />
        {formData.status === 'pending' ? (
          <p className="text-xs text-zinc-500">
            Pending transactions can be scheduled into the future. Completed ones must use a current or past timestamp.
          </p>
        ) : null}
      </div>

      <div className="flex justify-end gap-3 pt-4">
        <Button type="button" variant="ghost" onClick={onCancel}>
          Cancel
        </Button>
        <Button type="submit" variant="gradient">
          Save Transaction
        </Button>
      </div>
    </form>
  );
}
