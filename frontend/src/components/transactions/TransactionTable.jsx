import React, { useState, useEffect, useCallback } from 'react';
import { Input } from '../ui/Input.jsx';
import { Button } from '../ui/Button.jsx';
import { Select } from '../ui/Select.jsx';
import { Search, Trash2, Edit, CheckCircle, Clock, Ban } from 'lucide-react';
import { cn } from '../../lib/utils';
import { transactionService } from '../../services/transactions.js';
import { billService } from '../../services/bills.js';
import { subscriptionService } from '../../services/subscriptions.js';
import { Modal } from '../ui/Modal.jsx';
import { ConfirmDialog } from '../ui/ConfirmDialog.jsx';
import { TransactionForm } from './TransactionForm.jsx';
import { useToast } from '../ui/Toast.jsx';

const STATUS_META = {
  pending: {
    label: 'Pending',
    className: 'bg-amber-500/10 text-amber-400 border-amber-500/20',
    icon: Clock,
  },
  completed: {
    label: 'Completed',
    className: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20',
    icon: CheckCircle,
  },
  cancelled: {
    label: 'Cancelled',
    className: 'bg-zinc-500/10 text-zinc-300 border-zinc-500/20',
    icon: Ban,
  },
};

function getStatusMeta(status) {
  return STATUS_META[status] || STATUS_META.completed;
}

function TransactionStatusBadge({ status, compact = false }) {
  const meta = getStatusMeta(status);
  const Icon = meta.icon;

  return (
    <span
      className={cn(
        'inline-flex items-center gap-1 rounded-full font-medium border',
        compact ? 'px-2 py-0.5 text-[10px]' : 'px-2.5 py-0.5 text-xs',
        meta.className
      )}
    >
      <Icon size={compact ? 10 : 12} />
      {meta.label}
    </span>
  );
}

function getLinkedSource(transaction, billMap, subscriptionMap) {
  if (transaction.bill_id) {
    const bill = billMap.get(transaction.bill_id);
    return {
      type: 'Bill',
      name: bill?.name || 'Linked bill',
      detail: bill?.due_day ? `Due day ${bill.due_day}` : 'Recurring bill',
    };
  }

  if (transaction.subscription_id) {
    const subscription = subscriptionMap.get(transaction.subscription_id);
    return {
      type: 'Subscription',
      name: subscription?.name || 'Linked subscription',
      detail: subscription?.next_billing_date
        ? `Next billing ${new Date(subscription.next_billing_date).toLocaleDateString()}`
        : 'Recurring subscription',
    };
  }

  return null;
}

export function TransactionTable({ refreshTrigger }) {
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [billMap, setBillMap] = useState(() => new Map());
  const [subscriptionMap, setSubscriptionMap] = useState(() => new Map());

  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [typeFilter, setTypeFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');
  const [editingTransaction, setEditingTransaction] = useState(null);
  const [viewingTransaction, setViewingTransaction] = useState(null);
  const [pendingDeleteTransaction, setPendingDeleteTransaction] = useState(null);
  const [deletingTransactionId, setDeletingTransactionId] = useState(null);
  const toast = useToast();

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(search);
      setPage(1);
    }, 500);
    return () => clearTimeout(timer);
  }, [search]);

  useEffect(() => {
    setPage(1);
  }, [typeFilter, statusFilter]);

  const loadReferences = useCallback(async () => {
    const [billResult, subscriptionResult] = await Promise.allSettled([
      billService.getAll(),
      subscriptionService.getAll(),
    ]);

    if (billResult.status === 'fulfilled') {
      setBillMap(new Map(billResult.value.map((bill) => [bill.id, bill])));
    } else {
      console.error('Failed to load bills for transaction context', billResult.reason);
      setBillMap(new Map());
    }

    if (subscriptionResult.status === 'fulfilled') {
      setSubscriptionMap(
        new Map(subscriptionResult.value.map((subscription) => [subscription.id, subscription]))
      );
    } else {
      console.error('Failed to load subscriptions for transaction context', subscriptionResult.reason);
      setSubscriptionMap(new Map());
    }
  }, []);

  const loadTransactions = useCallback(async () => {
    setLoading(true);
    try {
      const params = {
        skip: (page - 1) * 10,
        limit: 10,
        ...(debouncedSearch && { search: debouncedSearch }),
        ...(typeFilter !== 'all' && { type: typeFilter.toUpperCase() }),
        ...(statusFilter !== 'all' && { status: statusFilter }),
      };
      const res = await transactionService.getAll(params);
      setHasMore(res.length >= 10);
      setData(res);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, [page, debouncedSearch, typeFilter, statusFilter]);

  useEffect(() => {
    void loadTransactions();
  }, [loadTransactions, refreshTrigger]);

  useEffect(() => {
    void loadReferences();
  }, [loadReferences]);

  const handleUpdate = async (payload) => {
    try {
      await transactionService.update(editingTransaction.id, payload);
      setEditingTransaction(null);
      await loadTransactions();
      toast.success('Transaction updated');
    } catch (err) {
      console.error('Failed to update transaction', err);
      toast.error('Failed to update transaction');
    }
  };

  const handleDelete = async (transaction) => {
    if (!transaction?.id) {
      return false;
    }

    setDeletingTransactionId(transaction.id);
    try {
      await transactionService.delete(transaction.id);
      await loadTransactions();
      toast.success('Transaction deleted');
      return true;
    } catch (err) {
      console.error('Failed to delete transaction', err);
      toast.error('Failed to delete transaction');
    } finally {
      setDeletingTransactionId(null);
    }
    return false;
  };

  const handleMarkAsPaid = async (id, event) => {
    event?.stopPropagation?.();
    try {
      await transactionService.complete(id);
      await loadTransactions();
      toast.success('Transaction marked as paid');
      return true;
    } catch (err) {
      console.error('Failed to mark as paid', err);
      toast.error('Failed to mark transaction as paid');
    }
    return false;
  };

  const linkedViewingSource = viewingTransaction
    ? getLinkedSource(viewingTransaction, billMap, subscriptionMap)
    : null;

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 sm:gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500" size={18} />
          <Input
            placeholder="Search description..."
            className="pl-10"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <div className="flex gap-3">
          <div className="flex-1 sm:w-40">
            <Select
              options={[
                { value: 'all', label: 'All Types' },
                { value: 'income', label: 'Income' },
                { value: 'expense', label: 'Expense' },
              ]}
              value={typeFilter}
              onChange={setTypeFilter}
            />
          </div>
          <div className="flex-1 sm:w-40">
            <Select
              options={[
                { value: 'all', label: 'All Status' },
                { value: 'pending', label: 'Pending' },
                { value: 'completed', label: 'Completed' },
                { value: 'cancelled', label: 'Cancelled' },
              ]}
              value={statusFilter}
              onChange={setStatusFilter}
            />
          </div>
        </div>
      </div>

      <div className="md:hidden space-y-3">
        {loading ? (
          <div className="p-8 text-center text-zinc-500">Loading transactions...</div>
        ) : data.length === 0 ? (
          <div className="p-8 text-center text-zinc-500">No transactions found.</div>
        ) : (
          data.map((transaction) => {
            const linkedSource = getLinkedSource(transaction, billMap, subscriptionMap);
            return (
              <div
                key={transaction.id}
                className="rounded-xl border border-white/5 bg-zinc-900/30 p-4 backdrop-blur-md space-y-3 cursor-pointer active:bg-white/5 transition-colors"
                onClick={() => setViewingTransaction(transaction)}
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-white truncate">
                      {transaction.description || 'Untitled Transaction'}
                    </p>
                    <p className="text-xs text-zinc-500 mt-0.5">
                      {new Date(transaction.occurred_at).toLocaleDateString()}
                    </p>
                  </div>
                  <span
                    className={cn(
                      'text-base font-bold whitespace-nowrap',
                      transaction.type === 'INCOME' ? 'text-emerald-400' : 'text-white'
                    )}
                  >
                    {transaction.type === 'INCOME' ? '+' : ''}${parseFloat(transaction.amount).toFixed(2)}
                  </span>
                </div>

                <div className="flex items-center gap-2 flex-wrap">
                  <span
                    className={cn(
                      'inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium border',
                      transaction.type === 'INCOME'
                        ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
                        : 'bg-rose-500/10 text-rose-400 border-rose-500/20'
                    )}
                  >
                    {transaction.type}
                  </span>
                  <TransactionStatusBadge status={transaction.status} compact />
                  {transaction.category && (
                    <div className="flex items-center gap-1 text-[10px] text-zinc-400">
                      <span
                        className="w-1.5 h-1.5 rounded-full"
                        style={{ backgroundColor: transaction.category.color || '#71717a' }}
                      />
                      {transaction.category.name}
                    </div>
                  )}
                  {linkedSource && (
                    <div className="rounded-full border border-white/5 bg-black/20 px-2 py-0.5 text-[10px] text-zinc-400">
                      {linkedSource.type}: {linkedSource.name}
                    </div>
                  )}
                </div>

                <div className="flex items-center gap-2 pt-1 border-t border-white/5 justify-end">
                  {transaction.status === 'pending' && (
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-7 px-2 text-xs text-emerald-400 hover:bg-emerald-500/10"
                      onClick={(event) => handleMarkAsPaid(transaction.id, event)}
                    >
                      <CheckCircle size={12} className="mr-1" /> Paid
                    </Button>
                  )}
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-7 w-7 text-zinc-500 hover:text-white"
                    onClick={(event) => {
                      event.stopPropagation();
                      setEditingTransaction(transaction);
                    }}
                  >
                    <Edit size={14} />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-7 w-7 text-zinc-500 hover:text-red-400"
                    onClick={(event) => {
                      event.stopPropagation();
                      setPendingDeleteTransaction(transaction);
                    }}
                  >
                    <Trash2 size={14} />
                  </Button>
                </div>
              </div>
            );
          })
        )}
      </div>

      <div className="hidden md:block rounded-2xl border border-white/5 bg-zinc-900/30 overflow-hidden backdrop-blur-md">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="bg-white/5 border-b border-white/5 text-zinc-400">
              <tr>
                <th className="h-12 px-6 font-medium">Date</th>
                <th className="h-12 px-6 font-medium">Description</th>
                <th className="h-12 px-6 font-medium">Status</th>
                <th className="h-12 px-6 font-medium">Type</th>
                <th className="h-12 px-6 font-medium text-right">Amount</th>
                <th className="h-12 px-6 font-medium"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {loading ? (
                <tr>
                  <td colSpan="6" className="p-8 text-center text-zinc-500">
                    Loading transactions...
                  </td>
                </tr>
              ) : data.length === 0 ? (
                <tr>
                  <td colSpan="6" className="p-8 text-center text-zinc-500">
                    No transactions found.
                  </td>
                </tr>
              ) : (
                data.map((transaction) => {
                  const linkedSource = getLinkedSource(transaction, billMap, subscriptionMap);
                  return (
                    <tr
                      key={transaction.id}
                      className="hover:bg-white/5 transition-colors group cursor-pointer"
                      onClick={() => setViewingTransaction(transaction)}
                    >
                      <td className="p-6 text-zinc-300">
                        {new Date(transaction.occurred_at).toLocaleDateString()}
                      </td>
                      <td className="p-6 font-medium text-white">
                        <div>{transaction.description || 'Untitled Transaction'}</div>
                        <div className="mt-1 flex flex-wrap items-center gap-2 text-xs font-normal text-zinc-500">
                          {transaction.category && (
                            <div className="flex items-center gap-1">
                              <span
                                className="w-2 h-2 rounded-full"
                                style={{ backgroundColor: transaction.category.color || '#71717a' }}
                              />
                              {transaction.category.name}
                            </div>
                          )}
                          {linkedSource && (
                            <div className="rounded-full border border-white/5 bg-black/20 px-2 py-0.5 text-[11px] text-zinc-400">
                              {linkedSource.type}: {linkedSource.name}
                            </div>
                          )}
                        </div>
                      </td>
                      <td className="p-6">
                        <TransactionStatusBadge status={transaction.status} />
                      </td>
                      <td className="p-6">
                        <span
                          className={cn(
                            'inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border',
                            transaction.type === 'INCOME'
                              ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
                              : 'bg-rose-500/10 text-rose-400 border-rose-500/20'
                          )}
                        >
                          {transaction.type}
                        </span>
                      </td>
                      <td
                        className={cn(
                          'p-6 text-right font-bold',
                          transaction.type === 'INCOME' ? 'text-emerald-400' : 'text-white'
                        )}
                      >
                        {transaction.type === 'INCOME' ? '+' : ''}${parseFloat(transaction.amount).toFixed(2)}
                      </td>
                      <td className="p-6 text-right whitespace-nowrap">
                        {transaction.status === 'pending' && (
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-8 px-3 text-emerald-400 hover:text-emerald-300 hover:bg-emerald-500/10 mr-2"
                            onClick={(event) => handleMarkAsPaid(transaction.id, event)}
                          >
                            <CheckCircle size={14} className="mr-1" />
                            Mark Paid
                          </Button>
                        )}
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 text-zinc-500 hover:text-white mr-2"
                          onClick={(event) => {
                            event.stopPropagation();
                            setEditingTransaction(transaction);
                          }}
                        >
                          <Edit size={16} />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 text-zinc-500 hover:text-red-400"
                          onClick={(event) => {
                            event.stopPropagation();
                            setPendingDeleteTransaction(transaction);
                          }}
                        >
                          <Trash2 size={16} />
                        </Button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      <div className="flex justify-between items-center px-2">
        <span className="text-xs text-zinc-500">Page {page}</span>
        <div className="flex gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setPage((current) => Math.max(1, current - 1))}
            disabled={page === 1}
          >
            Prev
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setPage((current) => current + 1)}
            disabled={!hasMore}
          >
            Next
          </Button>
        </div>
      </div>

      <Modal
        isOpen={!!editingTransaction}
        onClose={() => setEditingTransaction(null)}
        title="Edit Transaction"
      >
        {editingTransaction && (
          <TransactionForm
            initialData={editingTransaction}
            onSubmit={handleUpdate}
            onCancel={() => setEditingTransaction(null)}
          />
        )}
      </Modal>

      <Modal
        isOpen={!!viewingTransaction}
        onClose={() => setViewingTransaction(null)}
        title="Transaction Details"
      >
        {viewingTransaction && (
          <div className="space-y-6">
            <div className="flex justify-between items-start gap-4">
              <div>
                <h3 className="text-xl font-bold text-white">
                  {viewingTransaction.description || 'Untitled Transaction'}
                </h3>
                <p className="text-zinc-400 text-sm">
                  {new Date(viewingTransaction.occurred_at).toLocaleString()}
                </p>
              </div>
              <div className="flex flex-wrap justify-end gap-2">
                <div
                  className={cn(
                    'px-3 py-1 rounded-full text-xs font-bold border',
                    viewingTransaction.type === 'INCOME'
                      ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
                      : 'bg-rose-500/10 text-rose-400 border-rose-500/20'
                  )}
                >
                  {viewingTransaction.type}
                </div>
                <TransactionStatusBadge status={viewingTransaction.status} />
              </div>
            </div>

            <div className="bg-zinc-900/50 p-6 rounded-xl border border-zinc-800 flex flex-col items-center">
              <span className="text-zinc-500 text-sm mb-1">Amount</span>
              <span
                className={cn(
                  'text-4xl font-bold',
                  viewingTransaction.type === 'INCOME' ? 'text-emerald-400' : 'text-white'
                )}
              >
                ${parseFloat(viewingTransaction.amount).toFixed(2)}
              </span>
            </div>

            {viewingTransaction.category && (
              <div className="flex items-center gap-3 p-4 bg-zinc-900/30 rounded-lg border border-white/5">
                <div
                  className="w-10 h-10 rounded-full flex items-center justify-center font-bold text-white"
                  style={{ backgroundColor: viewingTransaction.category.color }}
                >
                  {viewingTransaction.category.name[0]}
                </div>
                <div>
                  <p className="text-xs text-zinc-500 uppercase tracking-wider">Category</p>
                  <p className="font-medium text-white">{viewingTransaction.category.name}</p>
                </div>
              </div>
            )}

            {linkedViewingSource && (
              <div className="flex items-center gap-3 p-4 bg-zinc-900/30 rounded-lg border border-white/5">
                <div className="w-10 h-10 rounded-full bg-zinc-800 flex items-center justify-center font-bold text-zinc-200">
                  {linkedViewingSource.type[0]}
                </div>
                <div>
                  <p className="text-xs text-zinc-500 uppercase tracking-wider">
                    {linkedViewingSource.type}
                  </p>
                  <p className="font-medium text-white">{linkedViewingSource.name}</p>
                  <p className="text-xs text-zinc-500 mt-0.5">{linkedViewingSource.detail}</p>
                </div>
              </div>
            )}

            <div className="flex flex-wrap gap-3 pt-4">
              {viewingTransaction.status === 'pending' && (
                <Button
                  variant="gradient"
                  className="flex-1 min-w-[140px]"
                  onClick={async () => {
                    const didMarkPaid = await handleMarkAsPaid(viewingTransaction.id);
                    if (didMarkPaid) {
                      setViewingTransaction(null);
                    }
                  }}
                >
                  <CheckCircle size={16} className="mr-2" /> Mark Paid
                </Button>
              )}
              <Button
                variant="outline"
                className="flex-1 min-w-[140px]"
                onClick={() => {
                  setEditingTransaction(viewingTransaction);
                  setViewingTransaction(null);
                }}
              >
                <Edit size={16} className="mr-2" /> Edit
              </Button>
              <Button
                variant="ghost"
                className="flex-1 min-w-[140px] text-red-400 hover:text-red-300 hover:bg-red-400/10"
                onClick={() => {
                  setPendingDeleteTransaction(viewingTransaction);
                  setViewingTransaction(null);
                }}
              >
                <Trash2 size={16} className="mr-2" /> Delete
              </Button>
            </div>
          </div>
        )}
      </Modal>

      <ConfirmDialog
        isOpen={Boolean(pendingDeleteTransaction)}
        title="Delete Transaction"
        description={
          pendingDeleteTransaction
            ? `Delete "${pendingDeleteTransaction.description || 'Untitled Transaction'}"? This action cannot be undone.`
            : ''
        }
        confirmText="Delete Transaction"
        cancelText="Cancel"
        variant="destructive"
        isConfirming={Boolean(
          pendingDeleteTransaction && deletingTransactionId === pendingDeleteTransaction.id
        )}
        onCancel={() => {
          if (pendingDeleteTransaction && deletingTransactionId === pendingDeleteTransaction.id) {
            return;
          }
          setPendingDeleteTransaction(null);
        }}
        onConfirm={async () => {
          const transaction = pendingDeleteTransaction;
          if (!transaction) return;
          await handleDelete(transaction);
          setPendingDeleteTransaction(null);
        }}
      />
    </div>
  );
}
