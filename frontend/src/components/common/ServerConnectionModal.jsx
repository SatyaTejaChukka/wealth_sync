import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { Modal } from '../ui/Modal.jsx';
import { Button } from '../ui/Button.jsx';
import { Input } from '../ui/Input.jsx';
import { Server, Wifi, CheckCircle2, AlertCircle, RefreshCw } from 'lucide-react';
import { API_BASE_URL } from '../../lib/api.js';

export function ServerConnectionModal({ isOpen, onClose }) {
  const defaultUrl = API_BASE_URL || 'https://wealth-sync.onrender.com/api/v1';
  const [url, setUrl] = useState(defaultUrl);
  const [testing, setTesting] = useState(false);
  const [testResult, setTestResult] = useState(null); // { success: boolean, message: string }

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const stored = localStorage.getItem('custom_api_base_url');
      setUrl(stored || API_BASE_URL || defaultUrl);
    }
  }, [isOpen]);

  const handleTestConnection = async () => {
    setTesting(true);
    setTestResult(null);

    const testTarget = url.trim().replace(/\/+$/, '');
    const primaryHealthUrl = testTarget.endsWith('/health') ? testTarget : `${testTarget}/health`;
    const fallbackHealthUrl = `${testTarget.replace(/\/api\/v1\/?$/, '')}/health`;

    try {
      let res;
      try {
        res = await axios.get(primaryHealthUrl, { timeout: 4000 });
      } catch (firstErr) {
        if (firstErr?.response?.status === 404 && fallbackHealthUrl !== primaryHealthUrl) {
          res = await axios.get(fallbackHealthUrl, { timeout: 4000 });
        } else {
          throw firstErr;
        }
      }

      if (res.status === 200) {
        setTestResult({
          success: true,
          message: `Connected successfully! Server status: ${res.data?.status || 'OK'}`
        });
      } else {
        setTestResult({
          success: false,
          message: `Server returned HTTP status ${res.status}`
        });
      }
    } catch (err) {
      setTestResult({
        success: false,
        message: err.code === 'ECONNABORTED' 
          ? 'Connection timed out. Check your internet connection.'
          : (err.message || 'Failed to connect. Make sure server is running and awake.')
      });
    } finally {
      setTesting(false);
    }
  };

  const handleSave = () => {
    const formatted = url.trim().replace(/\/+$/, '');
    localStorage.setItem('custom_api_base_url', formatted);
    onClose();
    window.location.reload();
  };

  const handleResetDefault = () => {
    setUrl(defaultUrl);
    localStorage.removeItem('custom_api_base_url');
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Backend Server Connection">
      <div className="space-y-4 text-sm text-zinc-300">
        <p className="text-xs text-zinc-400">
          Both the website and mobile app connect to the same central database.
        </p>

        <div>
          <label className="block text-xs font-semibold text-zinc-300 mb-1.5 flex items-center gap-1.5">
            <Server size={14} className="text-emerald-400" />
            Backend API Base URL
          </label>
          <Input
            value={url}
            onChange={(e) => {
              setUrl(e.target.value);
              setTestResult(null);
            }}
            placeholder={defaultUrl}
            className="bg-zinc-800 border-zinc-700 text-white font-mono text-xs"
          />
        </div>

        {/* Quick Presets */}
        <div className="flex gap-2 flex-wrap">
          {defaultUrl && (
            <button
              type="button"
              onClick={() => setUrl(defaultUrl)}
              className="text-[11px] px-2.5 py-1 rounded-md bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 flex items-center gap-1 cursor-pointer"
            >
              <Server size={12} className="text-emerald-400" />
              Configured Server ({defaultUrl})
            </button>
          )}
          <button
            type="button"
            onClick={() => setUrl('http://192.168.1.5:8000/api/v1')}
            className="text-[11px] px-2.5 py-1 rounded-md bg-zinc-800 hover:bg-zinc-700 text-zinc-300 border border-zinc-700 flex items-center gap-1 cursor-pointer"
          >
            <Wifi size={12} className="text-emerald-400" />
            Local PC Wi-Fi (192.168.1.5)
          </button>
          <button
            type="button"
            onClick={() => setUrl('http://localhost:8000/api/v1')}
            className="text-[11px] px-2.5 py-1 rounded-md bg-zinc-800 hover:bg-zinc-700 text-zinc-300 border border-zinc-700 cursor-pointer"
          >
            Emulator / Localhost
          </button>
        </div>

        {/* Connection Test Result */}
        {testResult && (
          <div
            className={`p-3 rounded-xl border text-xs flex items-start gap-2.5 ${
              testResult.success
                ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-300'
                : 'bg-rose-500/10 border-rose-500/20 text-rose-300'
            }`}
          >
            {testResult.success ? (
              <CheckCircle2 size={16} className="text-emerald-400 shrink-0 mt-0.5" />
            ) : (
              <AlertCircle size={16} className="text-rose-400 shrink-0 mt-0.5" />
            )}
            <div>
              <p className="font-semibold">{testResult.success ? 'Success' : 'Connection Error'}</p>
              <p className="text-[11px] opacity-90 mt-0.5">{testResult.message}</p>
            </div>
          </div>
        )}

        <div className="flex gap-2 pt-2">
          <Button
            type="button"
            variant="outline"
            onClick={handleTestConnection}
            disabled={testing}
            className="border-zinc-700 text-zinc-300 hover:text-white flex items-center gap-1.5"
          >
            <RefreshCw size={14} className={testing ? 'animate-spin' : ''} />
            {testing ? 'Testing...' : 'Test Connection'}
          </Button>

          <Button
            type="button"
            onClick={handleSave}
            className="flex-1 bg-emerald-600 hover:bg-emerald-500 text-white font-semibold"
          >
            Save & Connect
          </Button>
        </div>
      </div>
    </Modal>
  );
}
