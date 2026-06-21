import { Platform } from 'react-native';
import * as Haptics from 'expo-haptics';

export type HapticFeedbackKind =
  | 'selection'
  | 'impactLight'
  | 'impactMedium'
  | 'success'
  | 'warning'
  | 'error';

const runHaptic = async (effect: () => Promise<void>): Promise<void> => {
  try {
    await effect();
  } catch {
    // Haptics are a comfort layer; unsupported hardware should never break UI.
  }
};

const androidOr = (
  androidType: Haptics.AndroidHaptics,
  fallback: () => Promise<void>,
): Promise<void> => {
  if (Platform.OS === 'android') {
    return Haptics.performAndroidHapticsAsync(androidType);
  }
  return fallback();
};

export const hapticFeedback = {
  selection: () => runHaptic(() => Haptics.selectionAsync()),
  impactLight: () =>
    runHaptic(() =>
      androidOr(Haptics.AndroidHaptics.Context_Click, () =>
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light),
      ),
    ),
  impactMedium: () =>
    runHaptic(() =>
      androidOr(Haptics.AndroidHaptics.Gesture_End, () =>
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium),
      ),
    ),
  success: () =>
    runHaptic(() =>
      androidOr(Haptics.AndroidHaptics.Confirm, () =>
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success),
      ),
    ),
  warning: () =>
    runHaptic(() =>
      androidOr(Haptics.AndroidHaptics.Gesture_Start, () =>
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning),
      ),
    ),
  error: () =>
    runHaptic(() =>
      androidOr(Haptics.AndroidHaptics.Reject, () =>
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error),
      ),
    ),
} as const;
