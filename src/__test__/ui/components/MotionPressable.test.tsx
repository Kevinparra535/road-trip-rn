import { Platform, Text } from 'react-native';
import { fireEvent, render } from '@testing-library/react-native';

const mockImpactAsync = jest.fn();
const mockNotificationAsync = jest.fn();
const mockPerformAndroidHapticsAsync = jest.fn();
const mockSelectionAsync = jest.fn();

jest.mock('react-native-reanimated', () => {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const Reanimated = require('react-native-reanimated/mock');
  Reanimated.default.createAnimatedComponent = (Component: unknown) => Component;
  return Reanimated;
});

jest.mock('@/ui/hooks/useReduceMotionPreference', () => ({
  useReduceMotionPreference: jest.fn(() => false),
}));

jest.mock('expo-haptics', () => ({
  __esModule: true,
  impactAsync: mockImpactAsync,
  notificationAsync: mockNotificationAsync,
  performAndroidHapticsAsync: mockPerformAndroidHapticsAsync,
  selectionAsync: mockSelectionAsync,
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
  impactAsync: mockImpactAsync,
  notificationAsync: mockNotificationAsync,
  performAndroidHapticsAsync: mockPerformAndroidHapticsAsync,
  selectionAsync: mockSelectionAsync,
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

// eslint-disable-next-line @typescript-eslint/no-require-imports
const MotionPressable = require('@/ui/components/MotionPressable')
  .default as typeof import('@/ui/components/MotionPressable').default;

describe('MotionPressable', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.replaceProperty(Platform, 'OS', 'ios');
    mockImpactAsync.mockResolvedValue(undefined);
    mockNotificationAsync.mockResolvedValue(undefined);
    mockPerformAndroidHapticsAsync.mockResolvedValue(undefined);
    mockSelectionAsync.mockResolvedValue(undefined);
  });

  it('runs onPress and haptic feedback when pressed', () => {
    const onPress = jest.fn();
    const { getByTestId } = render(
      <MotionPressable
        accessibilityRole="button"
        haptic="impactLight"
        onPress={onPress}
        testID="motion-pressable"
      >
        <Text>Tap</Text>
      </MotionPressable>,
    );

    fireEvent.press(getByTestId('motion-pressable'));

    expect(mockImpactAsync).toHaveBeenCalledWith('light');
    expect(onPress).toHaveBeenCalledTimes(1);
  });

  it('does not run press handlers when disabled', () => {
    const onPress = jest.fn();
    const { getByTestId } = render(
      <MotionPressable
        accessibilityRole="button"
        disabled
        haptic="impactLight"
        onPress={onPress}
        testID="motion-pressable-disabled"
      >
        <Text>Tap</Text>
      </MotionPressable>,
    );

    const button = getByTestId('motion-pressable-disabled');
    fireEvent.press(button);

    expect(button.props.accessibilityState.disabled).toBe(true);
    expect(mockImpactAsync).not.toHaveBeenCalled();
    expect(onPress).not.toHaveBeenCalled();
  });
});
