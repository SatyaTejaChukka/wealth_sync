import React, { useState, useEffect } from 'react';
import { Zap, Search, AlertCircle, CheckCircle2, ShieldCheck, Sparkles, Building2 } from 'lucide-react';
import { Modal } from '../ui/Modal.jsx';
import { Button } from '../ui/Button.jsx';
import { Input } from '../ui/Input.jsx';
import { Select } from '../ui/Select.jsx';
import { electricityService } from '../../services/electricity.js';
import { formatCurrency } from '../../lib/format';

export function LinkElectricityModal({ isOpen, onClose, onSuccess }) {
  const [providers, setProviders] = useState([]);
  const [selectedProvider, setSelectedProvider] = useState('APSPDCL');
  const [consumerNumber, setConsumerNumber] = useState('');
  const [registeredMobile, setRegisteredMobile] = useState('');
  const [nickname, setNickname] = useState('');
  
  const [previewing, setPreviewing] = useState(false);
  const [previewData, setPreviewData] = useState(null);
  const [previewError, setPreviewError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (isOpen) {
      loadProviders();
      setPreviewData(null);
      setPreviewError('');
      setConsumerNumber('');
      setNickname('');
    }
  }, [isOpen]);

  const loadProviders = async () => {
    try {
      const list = await electricityService.getProviders();
      setProviders(list);
      if (list.length > 0 && !selectedProvider) {
        setSelectedProvider(list[0].code);
      }
    } catch (err) {
      console.error('Failed to load providers', err);
    }
  };

  const currentProviderInfo = providers.find((p) => p.code === selectedProvider) || {
    name: 'Electricity Board',
    consumer_number_label: 'Service Number',
    help_text: 'Enter your 13-digit consumer service number',
    sample_consumer_number: '1311200045678',
  };

  const handlePreviewFetch = async () => {
    if (!consumerNumber.trim()) {
      setPreviewError('Please enter a service / consumer number');
      return;
    }

    setPreviewing(true);
    setPreviewError('');
    setPreviewData(null);

    try {
      const data = await electricityService.previewBill(
        selectedProvider,
        consumerNumber.trim(),
        registeredMobile.trim() || null
      );
      setPreviewData(data);
    } catch (err) {
      setPreviewError(err.response?.data?.detail || 'Could not fetch bill. Please verify your consumer number.');
    } finally {
      setPreviewing(false);
    }
  };

  const handleLinkSubmit = async (e) => {
    e.preventDefault();
    if (!consumerNumber.trim()) return;

    setSubmitting(true);
    try {
      await electricityService.createAccount({
        provider_code: selectedProvider,
        consumer_number: consumerNumber.trim(),
        registered_mobile: registeredMobile.trim() || null,
        nickname: nickname.trim() || null,
      });
      onSuccess();
      onClose();
    } catch (err) {
      setPreviewError(err.response?.data?.detail || 'Failed to link account. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Link Electricity Connection">
      <form onSubmit={handleLinkSubmit} className="space-y-4">
        {/* Provider Selector */}
        <div>
          <label className="block text-xs font-semibold text-zinc-400 mb-1.5 uppercase tracking-wider">
            Select Electricity Board / Provider
          </label>
          <div className="relative">
            <select
              value={selectedProvider}
              onChange={(e) => {
                setSelectedProvider(e.target.value);
                setPreviewData(null);
                setPreviewError('');
              }}
              className="w-full rounded-xl border border-white/10 bg-zinc-900/70 px-4 py-2.5 text-sm text-white focus:border-amber-500 focus:outline-none focus:ring-1 focus:ring-amber-500 transition-colors"
            >
              {providers.map((p) => (
                <option key={p.code} value={p.code} className="bg-zinc-900 text-white">
                  {p.name} ({p.state})
                </option>
              ))}
            </select>
          </div>
          <p className="text-[11px] text-zinc-500 mt-1 flex items-center gap-1">
            <Building2 size={12} className="text-amber-400" />
            Supports BBPS & direct state board bill polling
          </p>
        </div>

        {/* Consumer Number & Helper */}
        <div>
          <label className="block text-xs font-semibold text-zinc-400 mb-1.5 uppercase tracking-wider">
            {currentProviderInfo.consumer_number_label}
          </label>
          <div className="flex gap-2">
            <input
              type="text"
              placeholder={`e.g. ${currentProviderInfo.sample_consumer_number}`}
              value={consumerNumber}
              onChange={(e) => {
                setConsumerNumber(e.target.value);
                setPreviewData(null);
              }}
              className="flex-1 rounded-xl border border-white/10 bg-zinc-900/70 px-4 py-2 text-sm text-white font-mono placeholder:text-zinc-600 focus:border-amber-500 focus:outline-none focus:ring-1 focus:ring-amber-500"
              required
            />
            <Button
              type="button"
              variant="secondary"
              loading={previewing}
              onClick={handlePreviewFetch}
              className="bg-amber-500/20 text-amber-300 border border-amber-500/30 hover:bg-amber-500/30 text-xs font-bold shrink-0"
              icon={<Search size={14} />}
            >
              Verify & Fetch
            </Button>
          </div>
          <p className="text-[11px] text-zinc-500 mt-1">{currentProviderInfo.help_text}</p>
        </div>

        {/* Nickname & Mobile */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <label className="block text-xs font-semibold text-zinc-400 mb-1.5 uppercase tracking-wider">
              Connection Nickname (Optional)
            </label>
            <input
              type="text"
              placeholder="e.g. Home, Parent's House"
              value={nickname}
              onChange={(e) => setNickname(e.target.value)}
              className="w-full rounded-xl border border-white/10 bg-zinc-900/70 px-4 py-2 text-sm text-white placeholder:text-zinc-600 focus:border-amber-500 focus:outline-none focus:ring-1 focus:ring-amber-500"
            />
          </div>
          <div>
            <label className="block text-xs font-semibold text-zinc-400 mb-1.5 uppercase tracking-wider">
              Registered Mobile (Optional)
            </label>
            <input
              type="tel"
              placeholder="e.g. 9876543210"
              value={registeredMobile}
              onChange={(e) => setRegisteredMobile(e.target.value)}
              className="w-full rounded-xl border border-white/10 bg-zinc-900/70 px-4 py-2 text-sm text-white placeholder:text-zinc-600 focus:border-amber-500 focus:outline-none focus:ring-1 focus:ring-amber-500"
            />
          </div>
        </div>

        {/* Error notification if preview fails */}
        {previewError && (
          <div className="flex items-center gap-2 rounded-xl border border-rose-500/20 bg-rose-500/10 p-3 text-xs text-rose-300">
            <AlertCircle className="h-4 w-4 shrink-0 text-rose-400" />
            <span>{previewError}</span>
          </div>
        )}

        {/* Live Bill Preview Card */}
        {previewData && (
          <div className="rounded-xl border border-amber-500/30 bg-gradient-to-br from-amber-500/15 via-zinc-900/80 to-zinc-950 p-4 space-y-2 animate-in fade-in slide-in-from-top-2">
            <div className="flex items-center justify-between">
              <span className="flex items-center gap-1.5 text-xs font-bold text-amber-400">
                <Sparkles size={14} /> Bill Verified from {previewData.provider_code}
              </span>
              <span className="text-[11px] font-mono text-zinc-400">#{previewData.bill_number}</span>
            </div>
            
            <div className="flex items-baseline justify-between pt-1">
              <div>
                <p className="text-xs text-zinc-400">{previewData.consumer_name}</p>
                <p className="text-xs text-zinc-500">
                  Due: <strong className="text-white">{new Date(previewData.due_date).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}</strong>
                </p>
              </div>
              <div className="text-right">
                <span className="text-xs text-zinc-500">Amount Due</span>
                <p className="text-xl font-bold text-white tracking-tight">{formatCurrency(previewData.amount)}</p>
              </div>
            </div>

            {previewData.units_consumed && (
              <p className="text-[11px] text-amber-300/80 pt-1 border-t border-white/5">
                ⚡ Monthly Consumption: {previewData.units_consumed} kWh
              </p>
            )}
          </div>
        )}

        {/* Security badge */}
        <div className="flex items-center gap-2 text-[11px] text-zinc-500 px-1">
          <ShieldCheck className="h-4 w-4 text-emerald-400 shrink-0" />
          <span>WealthSync securely polls your connection without storing credentials.</span>
        </div>

        {/* Action Buttons */}
        <div className="flex justify-end gap-3 pt-3 border-t border-white/5">
          <Button type="button" variant="ghost" onClick={onClose} disabled={submitting}>
            Cancel
          </Button>
          <Button
            type="submit"
            variant="primary"
            loading={submitting}
            className="bg-amber-500 hover:bg-amber-400 text-zinc-950 font-bold border-none"
            icon={<Zap size={16} />}
          >
            Link Connection & Auto-Fetch
          </Button>
        </div>
      </form>
    </Modal>
  );
}
