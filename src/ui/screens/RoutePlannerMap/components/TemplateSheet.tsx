import {
  ActivityIndicator,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { observer } from 'mobx-react-lite';

import BorderRadius, { iOSCornerStyle } from '@/ui/styles/BorderRadius';
import Colors from '@/ui/styles/Colors';
import Fonts from '@/ui/styles/Fonts';
import Shadows from '@/ui/styles/Shadows';
import Spacings from '@/ui/styles/Spacings';
import { hexToRgba } from '@/ui/utils/colorUtils';

import { RoutePlannerViewModel } from '../../RoutePlanner/RoutePlannerViewModel';

// ── Types ─────────────────────────────────────────────────────────────────────

type Props = {
  viewModel: RoutePlannerViewModel;
};

// ── Component ─────────────────────────────────────────────────────────────────

/**
 * Sheet "Empieza desde una plantilla". Se abre cuando el rider quiere configurar
 * el viaje con una de las plantillas curadas del catálogo. Toda la lógica
 * (cargar plantillas, aplicar, cerrar) vive en `PlannerTemplateController`
 * inyectado en el VM como `viewModel.templates`.
 */
const TemplateSheet = observer(({ viewModel }: Props) => {
  const { templates } = viewModel;

  return (
    <Modal
      transparent
      visible={templates.isTemplateSheetOpen}
      animationType="slide"
      onRequestClose={() => templates.closeTemplateSheet()}
    >
      {/* Backdrop — tap fuera cierra el sheet */}
      <Pressable
        style={styles.backdrop}
        onPress={() => templates.closeTemplateSheet()}
      >
        {/* Sheet — inner Pressable absorbe taps para que no caigan al backdrop */}
        <Pressable style={styles.sheet} onPress={() => {}}>
          {/* Handle pill */}
          <View style={styles.handle} />

          {/* Título */}
          <Text style={styles.title}>Empieza desde una plantilla</Text>

          {/* Cuerpo */}
          {templates.isTemplatesLoading ? (
            <View style={styles.loaderWrapper}>
              <ActivityIndicator color={Colors.base.accent} size="large" />
            </View>
          ) : templates.isTemplatesError ? (
            <View style={styles.loaderWrapper}>
              <Text style={styles.errorText}>{templates.isTemplatesError}</Text>
            </View>
          ) : (
            <ScrollView
              showsVerticalScrollIndicator={false}
              contentContainerStyle={styles.listContent}
              keyboardShouldPersistTaps="handled"
            >
              {templates.templates.map((item) => (
                <TouchableOpacity
                  key={item.id}
                  style={styles.card}
                  activeOpacity={0.8}
                  onPress={() => viewModel.applyTemplate(item.id)}
                  testID={`template-card-${item.id}`}
                >
                  {/* Ícono con fondo acento suave */}
                  <View style={styles.iconWrapper}>
                    <Ionicons
                      name={item.iconName as keyof typeof Ionicons.glyphMap}
                      size={24}
                      color={Colors.base.accent}
                    />
                  </View>

                  {/* Texto */}
                  <View style={styles.cardBody}>
                    <Text style={styles.cardName} numberOfLines={1}>
                      {item.name}
                    </Text>
                    <Text style={styles.cardDescription} numberOfLines={2}>
                      {item.description}
                    </Text>
                  </View>

                  {/* Flecha */}
                  <Ionicons
                    name="chevron-forward"
                    size={18}
                    color={Colors.base.iconMuted}
                  />
                </TouchableOpacity>
              ))}
            </ScrollView>
          )}

          {/* Cancelar */}
          <TouchableOpacity
            style={styles.cancelBtn}
            activeOpacity={0.8}
            onPress={() => templates.closeTemplateSheet()}
            testID="template-sheet-cancel"
          >
            <Text style={styles.cancelText}>Cancelar</Text>
          </TouchableOpacity>
        </Pressable>
      </Pressable>
    </Modal>
  );
});

export default TemplateSheet;

// ── Styles ────────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  // Overlay oscuro semitransparente — justifyContent: flex-end ancla el sheet abajo
  backdrop: {
    flex: 1,
    justifyContent: 'flex-end',
    backgroundColor: hexToRgba(Colors.base.shadow, 0.6),
  },
  // Sheet inferior
  sheet: {
    paddingTop: Spacings.md,
    paddingBottom: Spacings.xl,
    paddingHorizontal: Spacings.lg,
    maxHeight: '85%',
    backgroundColor: Colors.base.bgGradientEnd,
    borderTopLeftRadius: BorderRadius.xl,
    borderTopRightRadius: BorderRadius.xl,
    ...iOSCornerStyle,
    ...Shadows.bankCard,
  },
  // Pill decorativo
  handle: {
    width: 40,
    height: 4,
    alignSelf: 'center',
    marginBottom: Spacings.lg,
    backgroundColor: hexToRgba(Colors.base.textPrimary, 0.15),
    borderRadius: BorderRadius.pill,
  },
  // Título del sheet
  title: {
    marginBottom: Spacings.lg,
    ...Fonts.header3,
    color: Colors.base.textPrimary,
    textAlign: 'center',
  },
  // Spinner wrapper
  loaderWrapper: {
    paddingVertical: Spacings.xxl,
    alignItems: 'center',
    justifyContent: 'center',
  },
  errorText: {
    ...Fonts.smallBodyText,
    color: Colors.alerts.error,
    textAlign: 'center',
  },
  // ScrollView content
  listContent: {
    gap: Spacings.sm,
    paddingBottom: Spacings.md,
  },
  // Card de plantilla
  card: {
    paddingHorizontal: Spacings.md,
    paddingVertical: Spacings.md,
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacings.md,
    backgroundColor: Colors.base.bgCard,
    borderRadius: BorderRadius.lg,
    borderWidth: 1,
    borderColor: Colors.base.cardBorder,
    ...iOSCornerStyle,
  },
  // Contenedor cuadrado del ícono
  iconWrapper: {
    width: 44,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.base.accentDim,
    borderRadius: BorderRadius.md,
    borderWidth: 1,
    borderColor: Colors.base.accentDimBorder,
  },
  // Columna de texto de la card
  cardBody: {
    flex: 1,
    gap: Spacings.xs,
  },
  cardName: {
    ...Fonts.bodyTextBold,
    color: Colors.base.textPrimary,
  },
  cardDescription: {
    ...Fonts.smallBodyText,
    color: Colors.base.textSecondary,
  },
  // Botón cancelar al pie
  cancelBtn: {
    marginTop: Spacings.lg,
    paddingVertical: Spacings.md,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: hexToRgba(Colors.base.textPrimary, 0.05),
    borderRadius: BorderRadius.pill,
    borderWidth: 1,
    borderColor: Colors.base.hairline,
  },
  cancelText: {
    ...Fonts.bodyTextBold,
    color: Colors.base.textSecondary,
  },
});
