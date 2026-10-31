import React, { useEffect, useState, useCallback } from 'react';
import { Download, RefreshCw, CheckCircle2, AlertCircle, ShieldCheck, ArrowUpCircle, ExternalLink } from 'lucide-react';
import { appUpdater } from '../../services/appUpdater.js';

export function AppUpdateCard({ className = '', onDismiss }) {
  const [loading, setLoading] = useState(false);
  const [updateInfo, setUpdateInfo] = useState(null);
  const [downloading, setDownloading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [downloadError, setDownloadError] = useState('');
  const [canInstall, setCanInstall] = useState(true);

  const checkUpdates = useCallback(async () => {
    if (!appUpdater.isSupported()) return;
    setLoading(true);
    setDownloadError('');

    try {
      const [info, allowed] = await Promise.all([
        appUpdater.checkForUpdates(),
        appUpdater.canInstallPackages()
      ]);
      setUpdateInfo(info);
      setCanInstall(allowed);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    checkUpdates();
  }, [checkUpdates]);

  const handleStartUpdate = async () => {
    if (!updateInfo?.latestVersion?.downloadUrl) return;

    if (!canInstall) {
      await appUpdater.openInstallPermissionSettings();
      const updatedPermission = await appUpdater.canInstallPackages();
      setCanInstall(updatedPermission);
      if (!updatedPermission) return;
    }

    setDownloading(true);
    setProgress(0);
    setDownloadError('');

    try {
      await appUpdater.downloadAndInstall(
        updateInfo.latestVersion.downloadUrl,
        (percent) => {
          if (typeof percent === 'number' && percent >= 0) {
            setProgress(percent);
          }
        }
      );
    } catch (err) {
      setDownloadError(err.message || 'Download failed. Please check network connectivity.');
    } finally {
      setDownloading(false);
    }
  };

  // Only render on supported Android native environments
  if (!appUpdater.isSupported()) {
    return null;
  }

  if (loading) {
    return (
      <div className={`rounded-xl border border-white/10 bg-[#09090b] p-4 text-xs font-mono text-zinc-400 flex items-center justify-between gap-3 ${className}`}>
        <div className="flex items-center gap-2">
          <RefreshCw size={14} className="animate-spin text-emerald-400" />
          <span>Checking for application updates...</span>
        </div>
      </div>
    );
  }

  if (!updateInfo?.updateAvailable) {
    return (
      <div className={`rounded-xl border border-white/10 bg-[#09090b] p-4 text-xs flex items-center justify-between gap-3 ${className}`}>
        <div className="flex items-center gap-2.5">
          <ShieldCheck size={16} className="text-emerald-400 shrink-0" />
          <div>
            <p className="font-semibold text-white">Application Up to Date</p>
            <p className="text-[11px] text-zinc-400 mt-0.5">
              Installed Version: v{updateInfo?.currentVersion?.versionName || '1.0.0'} (Build {updateInfo?.currentVersion?.versionCode || 1})
            </p>
          </div>
        </div>
        <button
          type="button"
          onClick={checkUpdates}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-white/10 bg-white/5 text-zinc-300 hover:text-white hover:bg-white/10 transition-colors text-xs font-medium cursor-pointer"
        >
          <RefreshCw size={12} />
          <span>Check Again</span>
        </button>
      </div>
    );
  }

  const latest = updateInfo.latestVersion;

  return (
    <div className={`rounded-xl border border-emerald-500/30 bg-zinc-950 p-4 sm:p-5 text-left shadow-2xl relative overflow-hidden ${className}`}>
      <div className="flex items-start justify-between gap-3 mb-3">
        <div className="flex items-center gap-2">
          <span className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-emerald-500/30 bg-emerald-500/10 text-emerald-400 shrink-0">
            <ArrowUpCircle size={16} />
          </span>
          <div>
            <h3 className="text-sm font-bold text-white tracking-tight">Native Update Available</h3>
            <p className="text-xs text-zinc-400 mt-0.5">
              Version v{latest.versionName} (Build {latest.versionCode}) is available for install.
            </p>
          </div>
        </div>

        <span className="text-[10px] font-mono font-semibold px-2 py-0.5 rounded-md border border-emerald-500/30 bg-emerald-500/15 text-emerald-300 shrink-0">
          Official Release
        </span>
      </div>

      {latest.releaseNotes && (
        <div className="mb-4 rounded-lg border border-white/5 bg-zinc-900/60 p-3 text-xs text-zinc-300 leading-relaxed">
          <p className="font-semibold text-zinc-200 mb-1">Release Highlights:</p>
          <p className="text-zinc-400 whitespace-pre-line">{latest.releaseNotes}</p>
        </div>
      )}

      {!canInstall && (
        <div className="mb-4 rounded-lg border border-amber-500/20 bg-amber-500/10 p-3 text-xs text-amber-200 flex items-start gap-2.5">
          <AlertCircle size={15} className="text-amber-400 shrink-0 mt-0.5" />
          <div className="flex-1">
            <p className="font-semibold text-white">Permission Required</p>
            <p className="text-[11px] text-zinc-300 mt-0.5">
              Android requires granting installation permission for WealthSync to apply upgrades.
            </p>
          </div>
          <button
            type="button"
            onClick={() => appUpdater.openInstallPermissionSettings()}
            className="px-2.5 py-1 rounded-md border border-amber-500/30 bg-amber-500/20 text-white text-xs font-medium hover:bg-amber-500/30 shrink-0 cursor-pointer"
          >
            Open Settings
          </button>
        </div>
      )}

      {downloadError && (
        <div className="mb-3 rounded-lg border border-red-500/20 bg-red-500/10 p-3 text-xs text-red-300 flex items-center gap-2">
          <AlertCircle size={14} className="text-red-400 shrink-0" />
          <span>{downloadError}</span>
        </div>
      )}

      {downloading && (
        <div className="space-y-2 mb-4">
          <div className="flex justify-between text-xs font-mono text-zinc-400">
            <span>Downloading native package...</span>
            <span className="text-emerald-400 font-bold">{progress}%</span>
          </div>
          <div className="h-2 w-full rounded-full bg-zinc-800 overflow-hidden">
            <div
              className="h-full bg-emerald-500 transition-all duration-200 ease-out"
              style={{ width: `${Math.max(progress, 5)}%` }}
            />
          </div>
        </div>
      )}

      <div className="flex items-center gap-2.5 pt-1">
        <button
          type="button"
          onClick={handleStartUpdate}
          disabled={downloading}
          className="inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg bg-emerald-500 hover:bg-emerald-400 text-zinc-950 font-bold text-xs shadow-lg shadow-emerald-500/20 active:scale-[0.98] transition-all cursor-pointer disabled:opacity-50"
        >
          {downloading ? (
            <>
              <RefreshCw size={13} className="animate-spin" />
              <span>Downloading ({progress}%)...</span>
            </>
          ) : (
            <>
              <Download size={14} />
              <span>Download & Install Update</span>
            </>
          )}
        </button>

        {onDismiss && (
          <button
            type="button"
            onClick={onDismiss}
            className="px-3 py-2.5 rounded-lg border border-white/10 bg-white/5 hover:bg-white/10 text-zinc-300 text-xs font-medium transition-colors cursor-pointer"
          >
            Later
          </button>
        )}
      </div>
    </div>
  );
}
