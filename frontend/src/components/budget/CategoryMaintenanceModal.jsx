import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { AlertTriangle, FolderOpen } from 'lucide-react';

import { Modal } from '../ui/Modal.jsx';
import { Button } from '../ui/Button.jsx';
import { ConfirmDialog } from '../ui/ConfirmDialog.jsx';
import { useToast } from '../ui/Toast.jsx';
import { categoryService } from '../../services/categories.js';

export function CategoryMaintenanceModal({
  isOpen,
  onClose,
  rules = [],
  onCategoriesChanged,
}) {
  const [categories, setCategories] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [deletingId, setDeletingId] = useState(null);
  const [pendingDeleteCategory, setPendingDeleteCategory] = useState(null);
  const toast = useToast();

  const ruleCounts = useMemo(() => {
    return rules.reduce((acc, rule) => {
      if (!rule?.category_id) {
        return acc;
      }
      acc[rule.category_id] = (acc[rule.category_id] || 0) + 1;
      return acc;
    }, {});
  }, [rules]);

  const loadCategories = useCallback(async () => {
    setIsLoading(true);
    try {
      const data = await categoryService.getAll();
      const ordered = [...data].sort((left, right) => left.name.localeCompare(right.name));
      setCategories(ordered);
    } catch (error) {
      console.error('Failed to load categories', error);
      toast.error('Failed to load categories');
      setCategories([]);
    } finally {
      setIsLoading(false);
    }
  }, [toast]);

  useEffect(() => {
    if (!isOpen) {
      return;
    }
    loadCategories();
  }, [isOpen, loadCategories]);

  const handleDeleteCategory = async (category) => {
    setDeletingId(category.id);
    try {
      await categoryService.delete(category.id);
      setCategories((prev) => prev.filter((item) => item.id !== category.id));
      toast.success('Category deleted');
      onCategoriesChanged?.();
    } catch (error) {
      console.error('Failed to delete category', error);
      const detail = error?.response?.data?.detail;
      const message =
        typeof detail === 'string' && detail.trim()
          ? detail
          : 'Failed to delete category';
      toast.warning(message, 'Category Still Active');
    } finally {
      setDeletingId(null);
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Manage Categories">
      <div className="space-y-5">
        <div className="rounded-2xl border border-amber-500/20 bg-amber-500/10 p-4">
          <div className="flex items-start gap-3">
            <AlertTriangle className="mt-0.5 h-4 w-4 text-amber-300" />
            <div className="space-y-1">
              <p className="text-sm font-medium text-amber-100">Category deletion is permanent.</p>
              <p className="text-sm text-amber-200/80">
                A category can only be deleted when it is no longer actively used. If there are linked bills, subscriptions, pending transactions, budget rules, or active autopilot payments, deletion will be blocked.
              </p>
            </div>
          </div>
        </div>

        {isLoading ? (
          <div className="flex min-h-[220px] items-center justify-center">
            <div className="flex items-center gap-3 text-zinc-400">
              <div className="h-5 w-5 rounded-full border-2 border-zinc-700 border-t-violet-600 animate-spin" />
              <span className="text-sm font-medium">Loading categories...</span>
            </div>
          </div>
        ) : categories.length === 0 ? (
          <div className="flex min-h-[220px] flex-col items-center justify-center rounded-2xl border border-dashed border-zinc-800 bg-zinc-900/30 px-6 text-center">
            <div className="mb-4 rounded-full bg-zinc-800 p-3 text-zinc-400">
              <FolderOpen size={22} />
            </div>
            <h3 className="text-base font-semibold text-white">No categories to maintain</h3>
            <p className="mt-2 max-w-sm text-sm text-zinc-500">
              Create categories from your transaction or budget rule forms, and they will show up here for cleanup later.
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {categories.map((category) => {
              const attachedRuleCount = ruleCounts[category.id] || 0;

              return (
                <div
                  key={category.id}
                  className="flex items-center justify-between gap-4 rounded-2xl border border-white/10 bg-zinc-900/40 px-4 py-3"
                >
                  <div className="min-w-0">
                    <div className="flex items-center gap-3">
                      <span
                        className="h-3 w-3 shrink-0 rounded-full border border-white/20"
                        style={{ backgroundColor: category.color || '#71717a' }}
                      />
                      <p className="truncate text-sm font-semibold text-white">{category.name}</p>
                    </div>
                    <p className="mt-1 text-xs text-zinc-500">
                      {attachedRuleCount} budget rule{attachedRuleCount === 1 ? '' : 's'} currently attached
                    </p>
                  </div>

                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    isLoading={deletingId === category.id}
                    disabled={Boolean(deletingId)}
                    className="text-rose-300 hover:bg-rose-500/10 hover:text-rose-200"
                    onClick={() => setPendingDeleteCategory(category)}
                  >
                    {deletingId === category.id ? 'Deleting...' : 'Delete'}
                  </Button>
                </div>
              );
            })}
          </div>
        )}

        <div className="flex justify-end">
          <Button type="button" variant="outline" onClick={onClose} className="border-zinc-700 text-white hover:bg-zinc-800">
            Close
          </Button>
        </div>
      </div>

      <ConfirmDialog
        isOpen={Boolean(pendingDeleteCategory)}
        title="Delete Category"
        description={
          pendingDeleteCategory
            ? `Delete "${pendingDeleteCategory.name}"? Deletion is only allowed when it has no linked bills, subscriptions, pending transactions, budget rules, or active autopilot payments.`
            : ''
        }
        confirmText="Delete Category"
        cancelText="Cancel"
        variant="destructive"
        isConfirming={Boolean(pendingDeleteCategory && deletingId === pendingDeleteCategory.id)}
        onCancel={() => {
          if (pendingDeleteCategory && deletingId === pendingDeleteCategory.id) {
            return;
          }
          setPendingDeleteCategory(null);
        }}
        onConfirm={async () => {
          const category = pendingDeleteCategory;
          if (!category) return;
          await handleDeleteCategory(category);
          setPendingDeleteCategory(null);
        }}
      />
    </Modal>
  );
}
