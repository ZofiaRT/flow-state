import * as vscode from "vscode";
import { SNOOZE_DURATION, DISMISS_COOLDOWN } from "./constants";

export const enum WarningSelection {
  Snoozed = "Snoozed",
  Dismissed = "Dismissed",
  AlreadyShowing = "AlreadyShowing",
}

/**
 * Handles showing the context-switch warning and managing cooldowns.
 * - Snooze: suppresses the warning for 5 min; counting continues.
 * - Dismissed: applies a short 1-min cooldown; counting continues.
 */
export class WarningManager {
  private cooldownExpiresAt = 0;

  private isShowingWarning = false;

  async showWarning(): Promise<WarningSelection> {
    if (this.isOnCooldown() || this.isShowingWarning) {
      return WarningSelection.AlreadyShowing;
    }

    this.isShowingWarning = true;

    try {
      const selection = await vscode.window.showWarningMessage(
        "Frequent context switching detected! Try focusing on one task.",
        "Snooze"
      );

      return this.applyCooldown(selection);
    } finally {
      this.isShowingWarning = false;
    }
  }

  isOnCooldown(): boolean {
    return Date.now() < this.cooldownExpiresAt;
  }

  private applyCooldown(selection: string | undefined): WarningSelection {
    const now = Date.now();

    if (selection === "Snooze") {
      this.cooldownExpiresAt = now + SNOOZE_DURATION;
      console.log("[flow-state] Snoozed for 5 minutes.");
      return WarningSelection.Snoozed;
    } else {
      // User saw it, short cooldown so we don't immediately show the warning again.
      this.cooldownExpiresAt = now + DISMISS_COOLDOWN;
      console.log("[flow-state] Dismissed: 1-minute cooldown active.");
      return WarningSelection.Dismissed;
    }
  }
}