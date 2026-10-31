import { Capacitor } from '@capacitor/core';
import { Haptics, ImpactStyle, NotificationType } from '@capacitor/haptics';

/**
 * Native Haptic Feedback Engine
 * Delivers micro-tactile pulses on mobile devices with graceful no-op on desktop browsers.
 */
class HapticsService {
  constructor() {
    this.isSupported = Capacitor.isNativePlatform();
  }

  /**
   * Subtle tick for tab switches, filter pills, and navigation items
   */
  async impactLight() {
    if (!this.isSupported) return;
    try {
      await Haptics.impact({ style: ImpactStyle.Light });
    } catch (_err) {
      // Graceful fallback on unsupported web/hardware
    }
  }

  /**
   * Medium click for pull-to-refresh snaps, drawer dismissals, modal triggers
   */
  async impactMedium() {
    if (!this.isSupported) return;
    try {
      await Haptics.impact({ style: ImpactStyle.Medium });
    } catch (_err) {
      // Graceful fallback on unsupported web/hardware
    }
  }

  /**
   * Confirmatory pulse for saved transactions, paid bills, or successful actions
   */
  async notificationSuccess() {
    if (!this.isSupported) return;
    try {
      await Haptics.notification({ type: NotificationType.Success });
    } catch (_err) {
      // Graceful fallback on unsupported web/hardware
    }
  }

  /**
   * Warning vibration for network errors or destructive prompts
   */
  async notificationWarning() {
    if (!this.isSupported) return;
    try {
      await Haptics.notification({ type: NotificationType.Warning });
    } catch (_err) {
      // Graceful fallback on unsupported web/hardware
    }
  }

  /**
   * Light selection tap for picker scrolling or stepper changes
   */
  async selectionChanged() {
    if (!this.isSupported) return;
    try {
      await Haptics.selectionChanged();
    } catch (_err) {
      // Graceful fallback on unsupported web/hardware
    }
  }
}

export const haptics = new HapticsService();
