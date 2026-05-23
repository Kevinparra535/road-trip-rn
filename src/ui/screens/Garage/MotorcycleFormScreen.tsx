import { useEffect, useMemo } from 'react';
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { observer } from 'mobx-react-lite';
import { Ionicons } from '@expo/vector-icons';
import { RouteProp, useNavigation, useRoute } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';

import { container } from '@/config/di';
import { TYPES } from '@/config/types';

import { FuelType, LuggagePosition } from '@/domain/entities/Motorcycle';

import AppTextInput from '@/ui/components/AppTextInput';
import PrimaryButton from '@/ui/components/PrimaryButton';
import WeightSlider from '@/ui/components/WeightSlider';

import { GarageStackParamList } from '@/ui/navigation/types';

import BorderRadius from '@/ui/styles/BorderRadius';
import Colors from '@/ui/styles/Colors';
import Fonts from '@/ui/styles/Fonts';
import Spacings from '@/ui/styles/Spacings';

import {
  MAX_LUGGAGE_KG,
  MAX_PERSON_KG,
  MIN_PERSON_KG,
  MotorcycleFormViewModel,
} from './MotorcycleFormViewModel';

type Nav = NativeStackNavigationProp<GarageStackParamList, 'MotorcycleForm'>;
type Route = RouteProp<GarageStackParamList, 'MotorcycleForm'>;

const FUEL_OPTIONS: FuelType[] = ['corriente', 'extra'];

const LUGGAGE_POSITIONS: LuggagePosition[] = ['left', 'right', 'top'];

const LUGGAGE_LABEL: Record<LuggagePosition, string> = {
  left: 'izquierdo',
  right: 'derecho',
  top: 'superior',
};

const MotorcycleFormScreen = observer(() => {
  const navigation = useNavigation<Nav>();
  const route = useRoute<Route>();
  const motorcycleId = route.params?.motorcycleId;

  const viewModel = useMemo(
    () => container.get<MotorcycleFormViewModel>(TYPES.MotorcycleFormViewModel),
    [],
  );

  useEffect(() => {
    viewModel.initialize(motorcycleId);
  }, [viewModel, motorcycleId]);

  useEffect(() => {
    if (viewModel.hasSubmitSuccess) {
      viewModel.consumeSubmitResult();
      navigation.goBack();
    }
  }, [viewModel, viewModel.hasSubmitSuccess, navigation]);

  return (
    <SafeAreaView style={styles.safeArea} edges={['top', 'left', 'right']}>
      <View style={styles.navbar}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Ionicons
            name="chevron-back"
            size={26}
            color={Colors.base.textPrimary}
          />
        </TouchableOpacity>
        <Text style={styles.navTitle}>{viewModel.title}</Text>
        <View style={styles.navSpacer} />
      </View>

      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 90 : 0}
      >
        <ScrollView
          style={styles.scrollView}
          contentContainerStyle={styles.scrollContainer}
          keyboardShouldPersistTaps="handled"
          keyboardDismissMode="on-drag"
          contentInsetAdjustmentBehavior="automatic"
        >
          <Text style={styles.sectionLabel}>Identificacion</Text>
          <AppTextInput
            label="Marca"
            placeholder="ej. Yamaha"
            value={viewModel.brand}
            onChangeText={viewModel.setBrand}
          />
          <View style={styles.gap} />
          <AppTextInput
            label="Modelo"
            placeholder="ej. XTZ 250"
            value={viewModel.model}
            onChangeText={viewModel.setModel}
          />
          <View style={styles.gap} />
          <AppTextInput
            label="Ano"
            placeholder="ej. 2022"
            keyboardType="number-pad"
            value={viewModel.yearText}
            onChangeText={viewModel.setYearText}
          />
          <View style={styles.gap} />
          <AppTextInput
            label="Apodo (opcional)"
            placeholder="ej. La Negra"
            value={viewModel.nickname}
            onChangeText={viewModel.setNickname}
          />

          <TouchableOpacity
            style={[
              styles.searchBtn,
              !viewModel.canSearchSpecs && styles.searchBtnDisabled,
            ]}
            disabled={!viewModel.canSearchSpecs || viewModel.isSpecsLoading}
            onPress={() => viewModel.fetchSpecs()}
          >
            {viewModel.isSpecsLoading ? (
              <ActivityIndicator color={Colors.base.accent} />
            ) : (
              <>
                <Ionicons name="search" size={18} color={Colors.base.accent} />
                <Text style={styles.searchBtnText}>Buscar ficha tecnica</Text>
              </>
            )}
          </TouchableOpacity>

          {viewModel.specsResult ? (
            <View style={styles.specsBanner}>
              <Ionicons
                name="checkmark-circle"
                size={18}
                color={Colors.alerts.check}
              />
              <Text style={styles.specsText}>
                Stats encontradas ({viewModel.specsResult.source} · confianza{' '}
                {viewModel.specsResult.confidence}). Revisa y ajusta si hace
                falta.
              </Text>
            </View>
          ) : null}
          {viewModel.specsNotFound ? (
            <View style={styles.specsBanner}>
              <Ionicons
                name="information-circle"
                size={18}
                color={Colors.alerts.warning}
              />
              <Text style={styles.specsText}>
                No encontramos la ficha. Ingresa los datos manualmente.
              </Text>
            </View>
          ) : null}
          {viewModel.isSpecsError ? (
            <Text style={styles.error}>{viewModel.isSpecsError}</Text>
          ) : null}

          <Text style={styles.sectionLabel}>Combustible y autonomia</Text>

          <Text style={styles.fieldLabel}>Tipo de gasolina</Text>
          <View style={styles.segment}>
            {FUEL_OPTIONS.map((option) => {
              const active = viewModel.fuelType === option;
              return (
                <TouchableOpacity
                  key={option}
                  style={[
                    styles.segmentItem,
                    active && styles.segmentItemActive,
                  ]}
                  onPress={() => viewModel.setFuelType(option)}
                >
                  <Text
                    style={[
                      styles.segmentText,
                      active && styles.segmentTextActive,
                    ]}
                  >
                    {option}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>

          <View style={styles.gap} />
          <AppTextInput
            label="Capacidad del tanque (L)"
            placeholder="ej. 12"
            keyboardType="decimal-pad"
            value={viewModel.tankCapacityText}
            onChangeText={viewModel.setTankCapacityText}
          />
          <View style={styles.gap} />
          <AppTextInput
            label="Rendimiento (km/L)"
            placeholder="ej. 30"
            keyboardType="decimal-pad"
            value={viewModel.consumptionText}
            onChangeText={viewModel.setConsumptionText}
          />
          <View style={styles.gap} />
          <AppTextInput
            label="Cilindraje cc (opcional)"
            placeholder="ej. 250"
            keyboardType="number-pad"
            value={viewModel.engineCcText}
            onChangeText={viewModel.setEngineCcText}
          />

          <Text style={styles.sectionLabel}>Carga</Text>

          <WeightSlider
            label="Peso del piloto"
            value={viewModel.driverWeightKg}
            min={MIN_PERSON_KG}
            max={MAX_PERSON_KG}
            onChange={(weight) => viewModel.setDriverWeight(weight)}
          />

          <View style={styles.switchRow}>
            <View style={styles.switchInfo}>
              <Text style={styles.switchTitle}>Copiloto</Text>
              <Text style={styles.switchHint}>
                Suma el peso de un acompanante al consumo.
              </Text>
            </View>
            <Switch
              value={viewModel.hasPassenger}
              onValueChange={(value) => viewModel.setHasPassenger(value)}
              trackColor={{
                true: Colors.base.accentDimBorder,
                false: Colors.base.bgCard,
              }}
              thumbColor={
                viewModel.hasPassenger
                  ? Colors.base.accent
                  : Colors.base.iconMuted
              }
            />
          </View>

          {viewModel.hasPassenger ? (
            <WeightSlider
              label="Peso del copiloto"
              value={viewModel.passengerWeightKg}
              min={MIN_PERSON_KG}
              max={MAX_PERSON_KG}
              onChange={(weight) => viewModel.setPassengerWeight(weight)}
            />
          ) : null}

          <View style={styles.switchRow}>
            <View style={styles.switchInfo}>
              <Text style={styles.switchTitle}>Maleteros</Text>
              <Text style={styles.switchHint}>
                Configura el peso de cada maletero.
              </Text>
            </View>
            <Switch
              value={viewModel.luggageEnabled}
              onValueChange={(value) => viewModel.setLuggageEnabled(value)}
              trackColor={{
                true: Colors.base.accentDimBorder,
                false: Colors.base.bgCard,
              }}
              thumbColor={
                viewModel.luggageEnabled
                  ? Colors.base.accent
                  : Colors.base.iconMuted
              }
            />
          </View>

          {viewModel.luggageEnabled ? (
            <View style={styles.luggagePanel}>
              <Text style={styles.luggageHint}>
                Ajusta el peso aproximado de cada maletero.
              </Text>
              {LUGGAGE_POSITIONS.map((position) => (
                <WeightSlider
                  key={position}
                  label={`Maletero ${LUGGAGE_LABEL[position]}`}
                  value={viewModel.luggageWeights[position]}
                  min={0}
                  max={MAX_LUGGAGE_KG}
                  onChange={(weight) =>
                    viewModel.setLuggageWeight(position, weight)
                  }
                />
              ))}
            </View>
          ) : null}

          {viewModel.isValid ? (
            <View style={styles.rangeCard}>
              <Text style={styles.rangeLabel}>Autonomia con tu carga</Text>
              <Text style={styles.rangeValue}>
                {viewModel.loadAdjustedRangeKm} km
              </Text>
              <Text style={styles.rangeHint}>
                {viewModel.totalLoadKg} kg a bordo ·{' '}
                {viewModel.estimatedRangeKm} km sin carga
              </Text>
            </View>
          ) : null}

          {viewModel.isSubmitError ? (
            <Text style={styles.error}>{viewModel.isSubmitError}</Text>
          ) : null}

          <PrimaryButton
            label={viewModel.isEditMode ? 'Guardar cambios' : 'Registrar moto'}
            iconName="save-outline"
            loading={viewModel.isSubmitting}
            disabled={!viewModel.isValid}
            onPress={() => viewModel.submit()}
            style={styles.submit}
          />
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
});

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: Colors.base.bgPrimary,
  },
  flex: {
    flex: 1,
  },
  scrollView: {
    flex: 1,
  },
  scrollContainer: {
    padding: Spacings.spacex2,
    paddingBottom: Spacings.spacex6,
    flexGrow: 1,
  },
  navbar: {
    paddingHorizontal: Spacings.spacex2,
    paddingVertical: Spacings.md,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  navTitle: {
    ...Fonts.inputsBold,
    color: Colors.base.textPrimary,
  },
  navSpacer: {
    width: 26,
  },
  scroll: {
    padding: Spacings.spacex2,
    paddingBottom: Spacings.spacex6,
  },
  sectionLabel: {
    marginTop: Spacings.lg,
    marginBottom: Spacings.md,
    ...Fonts.header5,
    color: Colors.base.textPrimary,
  },
  fieldLabel: {
    marginBottom: Spacings.sm,
    ...Fonts.header5,
    color: Colors.base.textSecondary,
  },
  switchRow: {
    marginTop: Spacings.md,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: Spacings.md,
  },
  switchInfo: {
    flex: 1,
  },
  switchTitle: {
    ...Fonts.bodyTextBold,
    color: Colors.base.textPrimary,
  },
  switchHint: {
    marginTop: Spacings.xs,
    ...Fonts.links,
    color: Colors.base.textSecondary,
  },
  luggagePanel: {
    marginTop: Spacings.lg,
    padding: Spacings.md,
    backgroundColor: Colors.base.bgCard,
    borderRadius: BorderRadius.md,
    borderWidth: 1,
    borderColor: Colors.base.cardBorder,
  },
  luggageHint: {
    marginTop: Spacings.md,
    textAlign: 'center',
    ...Fonts.smallBodyText,
    color: Colors.base.textMuted,
  },
  gap: {
    height: Spacings.lg,
  },
  searchBtn: {
    marginTop: Spacings.lg,
    paddingVertical: Spacings.md,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacings.sm,
    backgroundColor: Colors.base.accentDim,
    borderRadius: BorderRadius.md,
    borderWidth: 1,
    borderColor: Colors.base.accentDimBorder,
  },
  searchBtnDisabled: {
    opacity: 0.4,
  },
  searchBtnText: {
    ...Fonts.bodyTextBold,
    color: Colors.base.accent,
  },
  specsBanner: {
    marginTop: Spacings.md,
    padding: Spacings.md,
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacings.sm,
    backgroundColor: Colors.base.bgInfoCard,
    borderRadius: BorderRadius.sm,
  },
  specsText: {
    flex: 1,
    ...Fonts.smallBodyText,
    color: Colors.base.textSecondary,
  },
  segment: {
    flexDirection: 'row',
    gap: Spacings.sm,
  },
  segmentItem: {
    flex: 1,
    paddingVertical: Spacings.md,
    alignItems: 'center',
    backgroundColor: Colors.base.bgCard,
    borderRadius: BorderRadius.md,
    borderWidth: 1,
    borderColor: Colors.base.cardBorder,
  },
  segmentItemActive: {
    backgroundColor: Colors.base.accentDim,
    borderColor: Colors.base.accentDimBorder,
  },
  segmentText: {
    ...Fonts.bodyText,
    color: Colors.base.textSecondary,
    textTransform: 'capitalize',
  },
  segmentTextActive: {
    ...Fonts.bodyTextBold,
    color: Colors.base.accent,
  },
  rangeCard: {
    marginTop: Spacings.lg,
    padding: Spacings.lg,
    alignItems: 'center',
    backgroundColor: Colors.base.accentDim,
    borderRadius: BorderRadius.md,
    borderWidth: 1,
    borderColor: Colors.base.accentDimBorder,
  },
  rangeLabel: {
    ...Fonts.smallBodyText,
    color: Colors.base.textSecondary,
  },
  rangeValue: {
    marginTop: Spacings.xs,
    ...Fonts.bigHeader,
    color: Colors.base.textPrimary,
  },
  rangeHint: {
    marginTop: Spacings.xs,
    ...Fonts.links,
    color: Colors.base.textSecondary,
  },
  error: {
    marginTop: Spacings.md,
    ...Fonts.labelInputError,
    color: Colors.alerts.error,
  },
  submit: {
    marginTop: Spacings.xl,
  },
});

export default MotorcycleFormScreen;
