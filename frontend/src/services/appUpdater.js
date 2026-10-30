import { Capacitor, registerPlugin } from '@capacitor/core';
import axios from 'axios';

// Register the custom native UpdateManager bridge
const UpdateManager = registerPlugin('UpdateManager');

const LATEST_RELEASE_METADATA_URL = 'https://raw.githubusercontent.com/SatyaTejaChukka/wealth_sync/main/release/latest.json';

export const appUpdater = {
  isSupported() {
    return Capacitor.isNativePlatform() && Capacitor.getPlatform() === 'android';
  },

  async getInstalledVersion() {
    if (!this.isSupported()) {
      return { versionCode: 1, versionName: '1.0.0', packageName: 'com.wealthsync.app' };
    }
    try {
      return await UpdateManager.getAppVersion();
    } catch {
      return { versionCode: 1, versionName: '1.0.0', packageName: 'com.wealthsync.app' };
    }
  },

  async canInstallPackages() {
    if (!this.isSupported()) return true;
    try {
      const res = await UpdateManager.canInstallPackages();
      return !!res.canInstall;
    } catch {
      return true;
    }
  },

  async openInstallPermissionSettings() {
    if (!this.isSupported()) return;
    try {
      await UpdateManager.openInstallPermissionSettings();
    } catch (e) {
      console.warn('Failed to open install permission settings:', e);
    }
  },

  async checkForUpdates() {
    if (!this.isSupported()) {
      return { updateAvailable: false, reason: 'unsupported_platform' };
    }

    try {
      const [installed, remoteRes] = await Promise.all([
        this.getInstalledVersion(),
        axios.get(LATEST_RELEASE_METADATA_URL, { timeout: 8000 })
      ]);

      const remote = remoteRes.data;
      if (!remote || typeof remote.versionCode !== 'number') {
        return { updateAvailable: false, reason: 'invalid_metadata' };
      }

      const updateAvailable = remote.versionCode > installed.versionCode;

      return {
        updateAvailable,
        currentVersion: installed,
        latestVersion: {
          versionCode: remote.versionCode,
          versionName: remote.versionName,
          downloadUrl: remote.downloadUrl,
          fileSizeBytes: remote.fileSizeBytes,
          sha256: remote.sha256,
          releaseNotes: remote.releaseNotes,
          publishedAt: remote.publishedAt
        }
      };
    } catch (err) {
      console.warn('Update check failed:', err.message);
      return { updateAvailable: false, error: err.message };
    }
  },

  async downloadAndInstall(downloadUrl, onProgress) {
    if (!this.isSupported()) {
      throw new Error('Native APK installation is only supported on Android devices.');
    }

    let progressListener = null;

    try {
      if (typeof onProgress === 'function') {
        progressListener = await UpdateManager.addListener('downloadProgress', (data) => {
          onProgress(data.percent, data.bytesDownloaded, data.totalBytes);
        });
      }

      const result = await UpdateManager.downloadAndInstall({ downloadUrl });
      return result;
    } finally {
      if (progressListener) {
        progressListener.remove();
      }
    }
  }
};
