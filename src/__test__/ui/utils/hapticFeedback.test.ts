import { Platform } from 'react-native';

const mockSelectionAsync = jest.fn();
const mockImpactAsync = jest.fn();
const mockNotificationAsync = jest.fn();
const mockPerformAndroidHapticsAsync = jest.fn();

jest.mock('expo-haptics', () => ({
  __esModule: true,
  selectionAsync: mockSelectionAsync,
  impactAsync: mockImpactAsync,
  notificationAsync: mockNotificationAsync,
  performAndroidHapticsAsync: mockPerformAndroidHapticsAsync,
  ImpactFeedbackStyle: {
    Light: 'light',
    Medium: 'medium',
  },
  NotificationFeedbackType: {
    Success: 'success',
    Warning: 'warning',
    Error: 'error',
  },
  AndroidHaptics: {
    Confirm: 'confirm',
    Context_Click: 'context-click',
    Gesture_End: 'gesture-end',
    Gesture_Start: 'gesture-start',
    Reject: 'reject',
  },
}));

jest.mock('expo-haptics/src/Haptics', () => ({
  __esModule: true,
  selectionAsync: mockSelectionAsync,
  impactAsync: mockImpactAsync,
  notificationAsync: mockNotificationAsync,
  performAndroidHapticsAsync: mockPerformAndroidHapticsAsync,
  ImpactFeedbackStyle: {
    Light: 'light',
    Medium: 'medium',
  },
  NotificationFeedbackType: {
    Success: 'success',
    Warning: 'warning',
    Error: 'error',
  },
  AndroidHaptics: {
    Confirm: 'confirm',
    Context_Click: 'context-click',
    Gesture_End: 'gesture-end',
    Gesture_Start: 'gesture-start',
    Reject: 'reject',
  },
}));

// The module must be loaded after the native mock declarations above.
/* eslint-disable @typescript-eslint/no-require-imports */
const { hapticFeedback } =
  require('@/ui/utils/hapticFeedback') as typeof import('@/ui/utils/hapticFeedback');
/* eslint-enable @typescript-eslint/no-require-imports */

describe('hapticFeedback', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.replaceProperty(Platform, 'OS', 'ios');
    mockSelectionAsync.mockResolvedValue(undefined);
    mockImpactAsync.mockResolvedValue(undefined);
    mockNotificationAsync.mockResolvedValue(undefined);
    mockPerformAndroidHapticsAsync.mockResolvedValue(undefined);
  });

  it('triggers selection feedback', async () => {
    await hapticFeedback.selection();

    expect(mockSelectionAsync).toHaveBeenCalledTimes(1);
  });

  it('maps success feedback to notification haptics on iOS', async () => {
    await hapticFeedback.success();

    expect(mockNotificationAsync).toHaveBeenCalledWith('success');
  });

  it('uses Android haptics when running on Android', async () => {
    jest.replaceProperty(Platform, 'OS', 'android');

    await hapticFeedback.impactLight();

    expect(mockPerformAndroidHapticsAsync).toHaveBeenCalledWith('context-click');
    expect(mockImpactAsync).not.toHaveBeenCalled();
  });

  it('swallows unsupported hardware errors', async () => {
    mockSelectionAsync.mockRejectedValueOnce(new Error('no haptic engine'));

    await expect(hapticFeedback.selection()).resolves.toBeUndefined();
  });
});
