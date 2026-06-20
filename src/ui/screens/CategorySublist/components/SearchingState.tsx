import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';

import BorderRadius from '@/ui/styles/BorderRadius';
import Colors from '@/ui/styles/Colors';
import Fonts from '@/ui/styles/Fonts';
import Spacings from '@/ui/styles/Spacings';

/**
 * Estado "Buscando sobre tu ruta..." (C1 del flow brief). Spinner pequeno
 * con label + 3 skeleton rows que dan forma a la espera — en vez del
 * ActivityIndicator desnudo que no comunica nada sobre lo que viene.
 *
 * Presentacional puro — no recibe props ni depende del ViewModel.
 */
export const SearchingState = () => (
  <>
    <View style={styles.searchingHeader}>
      <ActivityIndicator size="small" color={Colors.base.accent} />
      <Text style={styles.searchingText}>Buscando sobre tu ruta...</Text>
    </View>
    {[0, 1, 2].map((idx) => (
      <View key={idx} style={styles.skeletonRow}>
        <View style={styles.skeletonIcon} />
        <View style={styles.skeletonBody}>
          <View style={[styles.skeletonBar, { width: '65%' }]} />
          <View style={[styles.skeletonBar, { width: '85%', marginTop: 6 }]} />
        </View>
      </View>
    ))}
  </>
);

const styles = StyleSheet.create({
  searchingHeader: {
    paddingVertical: Spacings.sm,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacings.sm,
  },
  searchingText: {
    ...Fonts.smallBodyText,
    color: Colors.base.textSecondary,
  },
  skeletonRow: {
    padding: Spacings.md,
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacings.md,
    backgroundColor: Colors.base.bgCard,
    borderRadius: BorderRadius.md,
    borderWidth: 1,
    borderColor: Colors.base.cardBorder,
  },
  skeletonIcon: {
    width: 18,
    height: 18,
    backgroundColor: Colors.base.hairline,
    borderRadius: BorderRadius.pill,
  },
  skeletonBody: {
    flex: 1,
  },
  skeletonBar: {
    height: 11,
    backgroundColor: Colors.base.hairline,
    borderRadius: BorderRadius.xs,
  },
});
