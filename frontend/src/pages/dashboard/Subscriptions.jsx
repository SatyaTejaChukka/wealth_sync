import React, { useState, useEffect } from 'react';
import { Button } from '../../components/ui/Button.jsx';
import { Modal } from '../../components/ui/Modal.jsx';
import { Input } from '../../components/ui/Input.jsx';
import { Select } from '../../components/ui/Select.jsx';
import { Switch } from '../../components/ui/Switch.jsx';
import { ConfirmDialog } from '../../components/ui/ConfirmDialog.jsx';
import { Plus, Trash2, Calendar, CheckCircle } from 'lucide-react';
import { subscriptionService } from '../../services/subscriptions.js';
import { categoryService } from '../../services/categories.js';
import { cn } from '../../lib/utils';
import { useToast } from '../../components/ui/Toast.jsx';

export default function Subscriptions() {
  const [subscriptions, setSubscriptions] = useState([]);
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingSub, setEditingSub] = useState(null);
  const [togglingSubscriptionId, setTogglingSubscriptionId] = useState(null);
  const [loggingUsageSubscriptionId, setLoggingUsageSubscriptionId] = useState(null);
  const [pendingDeleteSubscriptionId, setPendingDeleteSubscriptionId] = useState(null);
  const [formData, setFormData] = useState({
    name: '',
    amount: '',
    billing_cycle: 'monthly',
    is_active: true,
    category_id: ''
  });
  const toast = useToast();

  useEffect(() => {
    loadSubscriptions();
    loadCategories();
  }, []);

  const loadSubscriptions = async () => {
    try {
      const data = await subscriptionService.getAll();
      setSubscriptions(data);
    } catch (err) {
      console.error('Failed to load subscriptions', err);
    } finally {
      setLoading(false);
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
        amount: parseFloat(formData.amount),
        billing_cycle: formData.billing_cycle,
        is_active: formData.is_active,
        category_id: formData.category_id || null
      };
      
      if (editingSub) {
        await subscriptionService.update(editingSub.id, data);
      } else {
        await subscriptionService.create(data);
      }
      
      setShowModal(false);
      setEditingSub(null);
      setFormData({ name: '', amount: '', billing_cycle: 'monthly', is_active: true, category_id: '' });
      loadSubscriptions();
      toast.success(editingSub ? 'Subscription updated' : 'Subscription added');
    } catch (err) {
      console.error('Failed to save subscription', err);
      toast.error('Failed to save subscription');
    }
  };

  const handleEdit = (sub) => {
    setEditingSub(sub);
    setFormData({
      name: sub.name,
      amount: sub.amount.toString(),
      billing_cycle: sub.billing_cycle,
      is_active: Boolean(sub.is_active),
      category_id: sub.category_id || ''
    });
    setShowModal(true);
  };

  const handleToggleActive = async (sub) => {
    if (!sub?.id) {
      return;
    }

    setTogglingSubscriptionId(sub.id);
    try {
      const updated = await subscriptionService.update(sub.id, {
        is_active: !sub.is_active,
      });
      setSubscriptions((prev) => prev.map((item) => (item.id === updated.id ? updated : item)));
      toast.success(updated.is_active ? 'Subscription activated' : 'Subscription paused');
    } catch (err) {
      console.error('Failed to toggle subscription status', err);
      toast.error('Failed to update subscription status');
    } finally {
      setTogglingSubscriptionId(null);
    }
  };

  const handleLogUsage = async (sub) => {
    if (!sub?.id) {
      return;
    }

    setLoggingUsageSubscriptionId(sub.id);
    try {
      const updated = await subscriptionService.logUsage(sub.id);
      setSubscriptions((prev) => prev.map((item) => (item.id === updated.id ? updated : item)));
      toast.success(`Usage logged for ${updated.name}`);
    } catch (err) {
      console.error('Failed to log subscription usage', err);
      toast.error('Failed to log usage');
    } finally {
      setLoggingUsageSubscriptionId(null);
    }
  };

  const handleDelete = async (id) => {
    setSubscriptions((prev) => prev.filter((s) => s.id !== id));
    try {
      await subscriptionService.delete(id);
      toast.success('Subscription deleted');
    } catch (err) {
      console.error('Failed to delete subscription', err);
      toast.error('Failed to delete subscription. Reverting...');
      loadSubscriptions();
    }
  };

  const pendingDeleteSubscription = pendingDeleteSubscriptionId
    ? subscriptions.find((sub) => sub.id === pendingDeleteSubscriptionId)
    : null;

  return (
    <div className="space-y-6 animate-slide-up">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold text-white">Subscriptions</h1>
          <p className="text-zinc-400 mt-1">Manage your recurring subscriptions</p>
        </div>
        <Button
          onClick={() => {
            setEditingSub(null);
            setFormData({ name: '', amount: '', billing_cycle: 'monthly', is_active: true, category_id: '' });
            setShowModal(true);
          }}
          variant="gradient"
          icon={<Plus size={18} />}
          className="w-full sm:w-auto"
        >
          Add Subscription
        </Button>
      </div>

      {/* Mobile Card View */}
      <div className="md:hidden space-y-3">
        {loading ? (
          <div className="p-8 text-center text-zinc-500">Loading subscriptions...</div>
        ) : subscriptions.length === 0 ? (
          <div className="p-8 text-center text-zinc-500">No subscriptions found. Add your first subscription!</div>
        ) : (
          subscriptions.map((sub) => (
            <div
              key={sub.id}
              role="button"
              tabIndex={0}
              onClick={() => handleEdit(sub)}
              onKeyDown={(event) => {
                if (event.key === 'Enter' || event.key === ' ') {
                  event.preventDefault();
                  handleEdit(sub);
                }
              }}
              className="rounded-xl border border-white/5 bg-zinc-900/30 p-4 backdrop-blur-md space-y-3 cursor-pointer"
            >
              <div className="flex items-start justify-between">
                <div>
                  <h3 className="font-medium text-white">{sub.name}</h3>
                  <div className="flex items-center gap-2 mt-1">
                    <span className={cn(
                      "inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-medium border",
                      sub.billing_cycle === 'monthly'
                        ? "bg-blue-500/10 text-blue-400 border-blue-500/20"
                        : "bg-purple-500/10 text-purple-400 border-purple-500/20"
                    )}>
                      {sub.billing_cycle === 'monthly' ? 'Monthly' : 'Yearly'}
                    </span>
                    {sub.is_active ? (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                        <CheckCircle size={10} /> Active
                      </span>
                    ) : (
                      <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-medium bg-zinc-500/10 text-zinc-400 border border-zinc-500/20">
                        Inactive
                      </span>
                    )}
                  </div>
                </div>
                <span className="text-lg font-bold text-white">${parseFloat(sub.amount).toFixed(2)}</span>
              </div>
              <div className="flex items-center gap-3 flex-wrap text-xs">
                {sub.category && (
                  <div className="flex items-center gap-1.5 text-zinc-300">
                    <span className="w-2 h-2 rounded-full" style={{ backgroundColor: sub.category.color }} />
                    {sub.category.name}
                  </div>
                )}
                {sub.next_billing_date && (
                  <span className="text-zinc-500 flex items-center gap-1">
                    <Calendar size={12} />
                    Next: {new Date(sub.next_billing_date).toLocaleDateString()}
                  </span>
                )}
                <span className="text-zinc-500">
                  Usage: {sub.usage_count ?? 0}
                </span>
                <span className="text-zinc-500">
                  {sub.usage_count > 0
                    ? `$${(Number(sub.amount) / Number(sub.usage_count)).toFixed(2)} per use`
                    : 'No usage logged'}
                </span>
              </div>
              <div className="flex items-center justify-between gap-3 pt-1 border-t border-white/5">
                <div
                  className="flex items-center gap-2"
                  onClick={(event) => event.stopPropagation()}
                >
                  <Switch
                    checked={Boolean(sub.is_active)}
                    onCheckedChange={() => void handleToggleActive(sub)}
                    disabled={togglingSubscriptionId === sub.id}
                  />
                  <span className="text-xs text-zinc-400">
                    {sub.is_active ? 'Active' : 'Inactive'}
                  </span>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  className="h-8 border-zinc-700 text-zinc-200 hover:bg-zinc-800 font-bold"
                  isLoading={loggingUsageSubscriptionId === sub.id}
                  icon={<CheckCircle size={14} />}
                  iconPosition="left"
                  onClick={(event) => {
                    event.stopPropagation();
                    void handleLogUsage(sub);
                  }}
                >
                  Log Usage
                </Button>
              </div>
              <div className="flex items-center gap-2 justify-end">
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8 text-zinc-500 hover:text-red-400"
                  onClick={(event) => {
                    event.stopPropagation();
                    setPendingDeleteSubscriptionId(sub.id);
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
                <th className="h-12 px-6 font-medium">Subscription</th>
                <th className="h-12 px-6 font-medium">Amount</th>
                <th className="h-12 px-6 font-medium">Billing Cycle</th>
                <th className="h-12 px-6 font-medium">Category</th>
                <th className="h-12 px-6 font-medium">Next Billing</th>
                <th className="h-12 px-6 font-medium">Usage</th>
                <th className="h-12 px-6 font-medium">Status</th>
                <th className="h-12 px-6 font-medium"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {loading ? (
                <tr><td colSpan="8" className="p-8 text-center text-zinc-500">Loading subscriptions...</td></tr>
              ) : subscriptions.length === 0 ? (
                <tr><td colSpan="8" className="p-8 text-center text-zinc-500">No subscriptions found. Add your first subscription!</td></tr>
              ) : (
                subscriptions.map((sub) => (
                  <tr
                    key={sub.id}
                    role="button"
                    tabIndex={0}
                    onClick={() => handleEdit(sub)}
                    onKeyDown={(event) => {
                      if (event.key === 'Enter' || event.key === ' ') {
                        event.preventDefault();
                        handleEdit(sub);
                      }
                    }}
                    className="hover:bg-white/5 transition-colors cursor-pointer"
                  >
                    <td className="p-6 font-medium text-white">{sub.name}</td>
                    <td className="p-6 text-white font-bold">${parseFloat(sub.amount).toFixed(2)}</td>
                    <td className="p-6">
                      <span className={cn(
                        "inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border",
                        sub.billing_cycle === 'monthly'
                          ? "bg-blue-500/10 text-blue-400 border-blue-500/20"
                          : "bg-purple-500/10 text-purple-400 border-purple-500/20"
                      )}>
                        {sub.billing_cycle === 'monthly' ? 'Monthly' : 'Yearly'}
                      </span>
                    </td>
                    <td className="p-6">
                      {sub.category ? (
                        <div className="flex items-center gap-2">
                          <span className="w-2 h-2 rounded-full" style={{ backgroundColor: sub.category.color }} />
                          <span className="text-zinc-300">{sub.category.name}</span>
                        </div>
                      ) : (
                        <span className="text-zinc-500">-</span>
                      )}
                    </td>
                    <td className="p-6 text-zinc-400">
                      {sub.next_billing_date ? (
                        <div className="flex items-center gap-2">
                          <Calendar size={16} className="text-zinc-500" />
                          {new Date(sub.next_billing_date).toLocaleDateString()}
                        </div>
                      ) : (
                        <span className="text-zinc-500">Not set</span>
                      )}
                    </td>
                    <td className="p-6">
                      <div className="text-zinc-300 font-medium">{sub.usage_count ?? 0} uses</div>
                      <div className="text-xs text-zinc-500 mt-1">
                        {sub.usage_count > 0
                          ? `$${(Number(sub.amount) / Number(sub.usage_count)).toFixed(2)} per use`
                          : 'No usage logged'}
                      </div>
                    </td>
                    <td className="p-6">
                      <div
                        className="flex items-center gap-3"
                        onClick={(event) => event.stopPropagation()}
                      >
                        <Switch
                          checked={Boolean(sub.is_active)}
                          onCheckedChange={() => void handleToggleActive(sub)}
                          disabled={togglingSubscriptionId === sub.id}
                        />
                        {sub.is_active ? (
                          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                            <CheckCircle size={12} />
                            Active
                          </span>
                        ) : (
                          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-zinc-500/10 text-zinc-400 border border-zinc-500/20">
                            Inactive
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="p-6 text-right whitespace-nowrap">
                      <Button
                        variant="outline"
                        size="sm"
                        className="h-8 border-zinc-700 text-zinc-200 hover:bg-zinc-800 mr-2 font-bold"
                        isLoading={loggingUsageSubscriptionId === sub.id}
                        icon={<CheckCircle size={14} />}
                        iconPosition="left"
                        onClick={(event) => {
                          event.stopPropagation();
                          void handleLogUsage(sub);
                        }}
                      >
                        Log Usage
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 text-zinc-500 hover:text-red-400"
                        onClick={(event) => {
                          event.stopPropagation();
                          setPendingDeleteSubscriptionId(sub.id);
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

      <Modal
        isOpen={showModal}
        onClose={() => {
          setShowModal(false);
          setEditingSub(null);
        }}
        title={editingSub ? 'Edit Subscription' : 'Add Subscription'}
      >
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-semibold text-zinc-300 mb-2">Subscription Name</label>
            <Input
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              placeholder="e.g., Netflix, Spotify"
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
            <label className="block text-sm font-semibold text-zinc-300 mb-2">Billing Cycle</label>
            <Select
              options={[
                { value: 'monthly', label: 'Monthly' },
                { value: 'yearly', label: 'Yearly' }
              ]}
              value={formData.billing_cycle}
              onChange={(value) => setFormData({ ...formData, billing_cycle: value })}
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

          <div className="rounded-xl border border-zinc-800 bg-zinc-900/50 px-4 py-3 flex items-center justify-between">
            <div>
              <p className="text-sm font-semibold text-zinc-300">Active Subscription</p>
              <p className="text-xs text-zinc-500">Inactive subscriptions stay in history but won&apos;t be treated as currently active.</p>
            </div>
            <Switch
              checked={Boolean(formData.is_active)}
              onCheckedChange={(checked) => setFormData({ ...formData, is_active: checked })}
            />
          </div>

          <div className="flex gap-3 pt-4">
            <Button type="submit" className="flex-1 bg-linear-to-r from-violet-600 to-indigo-600">
              {editingSub ? 'Update' : 'Create'} Subscription
            </Button>
            <Button
              type="button"
              variant="outline"
              onClick={() => {
                setShowModal(false);
                setEditingSub(null);
              }}
              className="flex-1"
            >
              Cancel
            </Button>
          </div>
        </form>
      </Modal>

      <ConfirmDialog
        isOpen={Boolean(pendingDeleteSubscriptionId)}
        title="Delete Subscription"
        description={
          pendingDeleteSubscription
            ? `Delete "${pendingDeleteSubscription.name}"? This cannot be undone.`
            : 'Delete this subscription? This cannot be undone.'
        }
        confirmText="Delete Subscription"
        cancelText="Cancel"
        variant="destructive"
        onCancel={() => setPendingDeleteSubscriptionId(null)}
        onConfirm={async () => {
          const id = pendingDeleteSubscriptionId;
          if (!id) return;
          setPendingDeleteSubscriptionId(null);
          await handleDelete(id);
        }}
      />
    </div>
  );
}
