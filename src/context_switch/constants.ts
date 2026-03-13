/** Defines constants for context switch. */

// Rolling window length (10 min)
export const WINDOW_DURATION = 10 * 60 * 1000;

// Number of switches per window length
export const SWITCH_THRESHOLD = 8;

// Snooze length (5min)
export const SNOOZE_DURATION = 5 * 60 * 1000; 

// Dismiss length (1min)
export const DISMISS_COOLDOWN = 1 * 60 * 1000;