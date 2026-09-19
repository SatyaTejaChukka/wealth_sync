import React, { useState, useEffect } from 'react';
import { cn } from '../../lib/utils';

import { Button } from '../../components/ui/Button.jsx';
import { Modal } from '../../components/ui/Modal.jsx';
import { Input } from '../../components/ui/Input.jsx';
import { Select } from '../../components/ui/Select.jsx';
import { ConfirmDialog } from '../../components/ui/ConfirmDialog.jsx';
import { Plus, Trash2, CheckCircle, CircleX, Calendar, Zap, Sparkles } from 'lucide-react';
import { billService } from '../../services/bills.js';
import { electricityService } from '../../services/electricity.js';
import { categoryService } from '../../services/categories.js';
import { useToast } from '../../components/ui/Toast.jsx';
import { ElectricityCard } from '../../components/bills/ElectricityCard.jsx';
import { LinkElectricityModal } from '../../components/bills/LinkElectricityModal.jsx';

export default function Bills() {
  const [bills, setBills] = useState([]);
  const [electricityAccounts, setElectricityAccounts] = useState([]);
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadingElectricity, setLoadingElectricity] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [showElectricityModal, setShowElectricityModal] = useState(false);
  const [editingBill, setEditingBill] = useState(null);
  const [pendingDeleteBillId, setPendingDeleteBillId] = useState(null);
  const [formData, setFormData] = useState({
    name: '',
    amount: '',
    due_day: '',
    category_id: '',
    autopay_enabled: false
  });
  const toast = useToast();

  useEffect(() => {
    loadBills();
    loadElectricityAccounts();
    loadCategories();
  }, []);

  const loadBills = async () => {
    try {
      const data = await billService.getAll();
      setBills(data);
    } catch (err) {
      console.error('Failed to load bills', err);
    } finally {
      setLoading(false);
    }
  };

  const loadElectricityAccounts = async () => {
    try {
      setLoadingElectricity(true);
      const data = await electricityService.getAccounts();
      setElectricityAccounts(data);
    } catch (err) {
      console.error('Failed to load electricity accounts', err);
    } finally {
      setLoadingElectricity(false);
    }
  };

  const handleFetchElectricityBill = async (accountId) => {
    try {
      await electricityService.fetchBill(accountId);
      toast.success('Latest electricity bill fetched!');
      loadElectricityAccounts();
    } catch (err) {
      console.error('Failed to fetch bill', err);
      toast.error('Could not fetch latest bill from provider');
    }
  };

  const handlePayElectricityBill = async (billId) => {
    try {
      await electricityService.payBill(billId);
      toast.success('Electricity bill payment recorded & logged as expense!');
      loadElectricityAccounts();
    } catch (err) {
      console.error('Failed to pay bill', err);
      toast.error('Failed to record payment');
    }
  };

  const handleDeleteElectricityAccount = async (accountId) => {
    if (!window.confirm('Are you sure you want to unlink this electricity connection?')) return;
    try {
      await electricityService.deleteAccount(accountId);
      toast.success('Electricity connection unlinked');
      loadElectricityAccounts();
    } catch (err) {
      console.error('Failed to delete account', err);
      toast.error('Failed to unlink account');
    }
  };

  const loadCategories = async () => {
    try {
      const data = await categoryService.getAll();
      setCategories(data);
    } catch (err) {
      console.error('Failed to load categories', err);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const data = {
        name: formData.name,
        amount_estimated: parseFloat(formData.amount),
        due_day: parseInt(formData.due_day),
        category_id: formData.category_id || null,
        autopay_enabled: formData.autopay_enabled
      };
      
      if (editingBill) {
        await billService.update(editingBill.id, data);
      } else {
        await billService.create(data);
      }
      
      setShowModal(false);
      setEditingBill(null);
      setFormData({ name: '', amount: '', due_day: '', category_id: '', autopay_enabled: false });
      loadBills();
      toast.success(editingBill ? 'Bill updated successfully' : 'Bill created successfully');
    } catch (err) {
      console.error('Failed to save bill', err);
      toast.error('Failed to save bill. Please try again.');
    }
  };

  const handleEdit = (bill) => {
    setEditingBill(bill);
    setFormData({
      name: bill.name,
      amount: bill.amount_estimated.toString(),
      due_day: bill.due_day.toString(),
      category_id: bill.category_id || '',
      autopay_enabled: bill.autopay_enabled
    });
    setShowModal(true);
  };

  const handleDelete = async (id) => {
    // Confirmed via the in-app dialog.
      // Optimistic update — remove from UI immediately
      setBills((prev) => prev.filter((bill) => bill.id !== id));
      try {
        await billService.delete(id);
        toast.success('Bill deleted successfully');
      } catch (err) {
        console.error('Failed to delete bill', err);
        toast.error('Failed to delete bill. Reverting...');
        loadBills();
      }
    //
  };
  const handleTogglePaid = async (bill) => {
    const currentlyPaid = Boolean(bill.last_paid_at);

    // Optimistic update first so the UI reacts instantly.
    setBills((prev) =>
      prev.map((item) =>
        item.id === bill.id
          ? { ...item, last_paid_at: currentlyPaid ? null : new Date().toISOString() }
          : item
      )
    );

    try {
      if (currentlyPaid) {
        await billService.markUnpaid(bill.id);
        toast.error('Bill is marked as unpaid');
      } else {
        await billService.markPaid(bill.id);
        toast.success('Bill is marked as paid');
      }
    } catch (err) {
      console.error('Failed to toggle bill payment status', err);
      toast.error('Failed to update bill status');
      loadBills();
    }
  };

  const pendingDeleteBill = pendingDeleteBillId
    ? bills.find((bill) => bill.id === pendingDeleteBillId)
    : null;

  return (
    <div className="space-y-8 animate-slide-up">
      {/* Header with dual actions */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold text-white">Bills & Utilities</h1>
          <p className="text-zinc-400 mt-1">Manage recurring bills & live electricity connections</p>
        </div>
        <div className="flex items-center gap-3 w-full sm:w-auto">
          <Button
            onClick={() => setShowElectricityModal(true)}
            className="w-full sm:w-auto bg-gradient-to-r from-amber-500 to-yellow-500 hover:from-amber-400 hover:to-yellow-400 text-zinc-950 font-bold border-none shadow-lg shadow-amber-500/20"
            icon={<Zap size={18} className="fill-zinc-950" />}
          >
            Link Electricity Bill
          </Button>
          <Button
            onClick={() => {
              setEditingBill(null);
              setFormData({ name: '', amount: '', due_day: '', category_id: '', autopay_enabled: false });
              setShowModal(true);
            }}
            variant="gradient"
            icon={<Plus size={18} />}
            className="w-full sm:w-auto"
          >
            Add Manual Bill
          </Button>
        </div>
      </div>

      {/* Section 1: Linked Electricity Connections (Live Auto-Fetch) */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-amber-500/20 text-amber-400 border border-amber-500/30">
              <Zap className="h-4 w-4 fill-amber-400/40" />
            </div>
            <h2 className="text-lg font-semibold text-white tracking-tight">Linked Electricity Connections</h2>
            <span className="text-xs bg-amber-400/10 text-amber-300 border border-amber-400/20 px-2 py-0.5 rounded-full font-medium">
              Live Auto-Fetch
            </span>
          </div>
        </div>

        {loadingElectricity ? (
          <div className="p-8 text-center text-zinc-500 rounded-2xl border border-white/5 bg-zinc-900/30">
            Checking electricity connections...
          </div>
        ) : electricityAccounts.length === 0 ? (
          <div className="relative overflow-hidden rounded-2xl border border-amber-500/20 bg-gradient-to-r from-amber-500/10 via-zinc-900/40 to-zinc-900/20 p-6 backdrop-blur-md">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
              <div className="space-y-1">
                <h3 className="font-semibold text-white flex items-center gap-2">
                  <Sparkles className="h-4 w-4 text-amber-400" />
                  Auto-fetch your real monthly electricity bill
                </h3>
                <p className="text-xs text-zinc-400 max-w-xl">
                  Link your APSPDCL, BESCOM, or state electricity connection once with your Service Number. WealthSync will automatically poll generated bills, track units consumed, and alert you before due dates.
                </p>
              </div>
              <Button
                size="sm"
                onClick={() => setShowElectricityModal(true)}
                className="bg-amber-500 hover:bg-amber-400 text-zinc-950 font-bold border-none shrink-0"
                icon={<Zap size={14} />}
              >
                Connect Provider
              </Button>
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {electricityAccounts.map((account) => (
              <ElectricityCard
                key={account.id}
                account={account}
                onFetch={handleFetchElectricityBill}
                onPay={handlePayElectricityBill}
                onDelete={handleDeleteElectricityAccount}
              />
            ))}
          </div>
        )}
      </div>

      {/* Section 2: Recurring / Manual Bills */}
      <div className="space-y-4 pt-2">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold text-white tracking-tight">Recurring Bills & Subscriptions</h2>
          <span className="text-xs text-zinc-500 font-medium">{bills.length} total</span>
        </div>

        {/* Mobile Card View */}
        <div className="md:hidden space-y-3">
          {loading ? (
            <div className="p-8 text-center text-zinc-500">Loading bills...</div>
          ) : bills.length === 0 ? (
            <div className="p-8 text-center text-zinc-500">No manual bills found. Add your first bill!</div>
          ) : (
          bills.map((bill) => (
            <div
              key={bill.id}
              role="button"
              tabIndex={0}
              onClick={() => handleEdit(bill)}
              onKeyDown={(event) => {
                if (event.key === 'Enter' || event.key === ' ') {
                  event.preventDefault();
                  handleEdit(bill);
                }
              }}
              className="rounded-xl border border-white/5 bg-zinc-900/30 p-4 backdrop-blur-md space-y-3 cursor-pointer"
            >
              <div className="flex items-start justify-between">
                <div>
                  <h3 className="font-medium text-white">{bill.name}</h3>
                  <p className="text-xs text-zinc-500 mt-0.5 flex items-center gap-1">
                    <Calendar size={12} />
                    Due day {bill.due_day}
                  </p>
                </div>
                <span className="text-lg font-bold text-white">${parseFloat(bill.amount_estimated).toFixed(2)}</span>
              </div>
              <div className="flex items-center gap-3 flex-wrap">
                {bill.category && (
                  <div className="flex items-center gap-1.5 text-xs text-zinc-300">
                    <span className="w-2 h-2 rounded-full" style={{ backgroundColor: bill.category.color }} />
                    {bill.category.name}
                  </div>
                )}
                {bill.autopay_enabled ? (
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                    <CheckCircle size={10} /> Autopay
                  </span>
                ) : null}
                <span className="text-xs text-zinc-500">
                  {bill.last_paid_at ? `Paid ${new Date(bill.last_paid_at).toLocaleDateString()}` : 'Never paid'}
                </span>
              </div>
              <div className="flex items-center gap-2 pt-1 border-t border-white/5">
                <Button
                  variant="ghost"
                  size="sm"
                  className={cn(
                    "h-8 px-3 flex-1 font-bold",
                    bill.last_paid_at
                      ? 'text-emerald-400 hover:bg-emerald-500/10'
                      : 'text-rose-400 hover:bg-rose-500/10'
                  )}
                  icon={bill.last_paid_at ? <CheckCircle size={14} /> : <CircleX size={14} />}
                  iconPosition="left"
                  onClick={(event) => {
                    event.stopPropagation();
                    handleTogglePaid(bill);
                  }}
                >
                  {bill.last_paid_at ? 'Paid' : 'Unpaid'}
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8 text-zinc-500 hover:text-red-400"
                  onClick={(event) => {
                    event.stopPropagation();
                    setPendingDeleteBillId(bill.id);
                  }}
                >
                  <Trash2 size={16} />
                </Button>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Desktop Table View */}
      <div className="hidden md:block rounded-2xl border border-white/5 bg-zinc-900/30 overflow-hidden backdrop-blur-md">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="bg-white/5 border-b border-white/5 text-zinc-400">
              <tr>
                <th className="h-12 px-6 font-medium">Bill Name</th>
                <th className="h-12 px-6 font-medium">Amount</th>
                <th className="h-12 px-6 font-medium">Due Day</th>
                <th className="h-12 px-6 font-medium">Category</th>
                <th className="h-12 px-6 font-medium">Last Paid</th>
                <th className="h-12 px-6 font-medium">Autopay</th>
                <th className="h-12 px-6 font-medium"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {loading ? (
                <tr><td colSpan="7" className="p-8 text-center text-zinc-500">Loading bills...</td></tr>
              ) : bills.length === 0 ? (
                <tr><td colSpan="7" className="p-8 text-center text-zinc-500">No bills found. Add your first bill!</td></tr>
              ) : (
                bills.map((bill) => (
                  <tr
                    key={bill.id}
                    role="button"
                    tabIndex={0}
                    onClick={() => handleEdit(bill)}
                    onKeyDown={(event) => {
                      if (event.key === 'Enter' || event.key === ' ') {
                        event.preventDefault();
                        handleEdit(bill);
                      }
                    }}
                    className="hover:bg-white/5 transition-colors cursor-pointer"
                  >
                    <td className="p-6 font-medium text-white">{bill.name}</td>
                    <td className="p-6 text-white font-bold">${parseFloat(bill.amount_estimated).toFixed(2)}</td>
                    <td className="p-6 text-zinc-300">
                      <div className="flex items-center gap-2">
                        <Calendar size={16} className="text-zinc-500" />
                        Day {bill.due_day}
                      </div>
                    </td>
                    <td className="p-6">
                      {bill.category ? (
                        <div className="flex items-center gap-2">
                          <span className="w-2 h-2 rounded-full" style={{ backgroundColor: bill.category.color }} />
                          <span className="text-zinc-300">{bill.category.name}</span>
                        </div>
                      ) : (
                        <span className="text-zinc-500">-</span>
                      )}
                    </td>
                    <td className="p-6 text-zinc-400">
                      {bill.last_paid_at
                        ? new Date(bill.last_paid_at).toLocaleDateString()
                        : 'Never'}
                    </td>
                    <td className="p-6">
                      {bill.autopay_enabled ? (
                        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                          <CheckCircle size={12} />
                          Enabled
                        </span>
                      ) : (
                        <span className="text-zinc-500 text-xs">Disabled</span>
                      )}
                    </td>
                    <td className="p-6 text-right whitespace-nowrap">
                      <Button
                        variant="ghost"
                        size="sm"
                        className={cn(
                          "h-8 px-3 mr-2 font-bold",
                          bill.last_paid_at
                            ? 'text-emerald-400 hover:bg-emerald-500/10'
                            : 'text-rose-400 hover:bg-rose-500/10'
                        )}
                        icon={bill.last_paid_at ? <CheckCircle size={14} /> : <CircleX size={14} />}
                        iconPosition="left"
                        onClick={(event) => {
                          event.stopPropagation();
                          handleTogglePaid(bill);
                        }}
                      >
                        {bill.last_paid_at ? 'Paid' : 'Unpaid'}
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 text-zinc-500 hover:text-red-400"
                        onClick={(event) => {
                          event.stopPropagation();
                          setPendingDeleteBillId(bill.id);
                        }}
                      >
                        <Trash2 size={16} />
                      </Button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>

      <Modal
        isOpen={showModal}
        onClose={() => {
          setShowModal(false);
          setEditingBill(null);
        }}
        title={editingBill ? 'Edit Bill' : 'Add Bill'}
      >
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-semibold text-zinc-300 mb-2">Bill Name</label>
            <Input
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              placeholder="e.g., Electricity"
              required
              className="bg-zinc-800 border-zinc-700 text-white"
            />
          </div>

          <div>
            <label className="block text-sm font-semibold text-zinc-300 mb-2">Amount</label>
            <Input
              type="number"
              step="0.01"
              value={formData.amount}
              onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
              placeholder="0.00"
              required
              className="bg-zinc-800 border-zinc-700 text-white"
            />
          </div>

          <div>
            <label className="block text-sm font-semibold text-zinc-300 mb-2">Due Day (1-31)</label>
            <Input
              type="number"
              min="1"
              max="31"
              value={formData.due_day}
              onChange={(e) => setFormData({ ...formData, due_day: e.target.value })}
              placeholder="15"
              required
              className="bg-zinc-800 border-zinc-700 text-white"
            />
          </div>

          <div>
            <label className="block text-sm font-semibold text-zinc-300 mb-2">Category</label>
            <Select
              options={[
                { value: '', label: 'Select category' },
                ...categories.map(cat => ({ value: cat.id, label: cat.name }))
              ]}
              value={formData.category_id}
              onChange={(value) => setFormData({ ...formData, category_id: value })}
            />
          </div>

          <div className="flex items-center gap-3">
            <input
              type="checkbox"
              id="autopay"
              checked={formData.autopay_enabled}
              onChange={(e) => setFormData({ ...formData, autopay_enabled: e.target.checked })}
              className="w-4 h-4 rounded border-zinc-700 bg-zinc-800 text-violet-600 focus:ring-violet-500 focus:ring-offset-0"
            />
            <label htmlFor="autopay" className="text-sm text-zinc-300 cursor-pointer">
              Enable autopay (automatic tracking)
            </label>
          </div>

          <div className="flex gap-3 pt-4">
            <Button type="submit" className="flex-1 bg-linear-to-r from-violet-600 to-indigo-600">
              {editingBill ? 'Update' : 'Create'} Bill
            </Button>
            <Button
              type="button"
              variant="outline"
              onClick={() => {
                setShowModal(false);
                setEditingBill(null);
              }}
              className="flex-1"
            >
              Cancel
            </Button>
          </div>
        </form>
      </Modal>

      <ConfirmDialog
        isOpen={Boolean(pendingDeleteBillId)}
        title="Delete Bill"
        description={
          pendingDeleteBill
            ? `Delete "${pendingDeleteBill.name}"? This cannot be undone.`
            : 'Delete this bill? This cannot be undone.'
        }
        confirmText="Delete Bill"
        cancelText="Cancel"
        variant="destructive"
        onCancel={() => setPendingDeleteBillId(null)}
        onConfirm={async () => {
          const id = pendingDeleteBillId;
          if (!id) return;
          setPendingDeleteBillId(null);
          await handleDelete(id);
        }}
      />

      <LinkElectricityModal
        isOpen={showElectricityModal}
        onClose={() => setShowElectricityModal(false)}
        onSuccess={() => {
          toast.success('Electricity connection linked & verified successfully!');
          loadElectricityAccounts();
        }}
      />
    </div>
  );
}

