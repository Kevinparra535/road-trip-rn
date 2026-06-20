---
name: design-system-rn
description: Apply the project's design system when building or editing UI components and screens in RN (Expo). Use when creating new screens, components, or styles — ensures colors, typography, spacing, shadows, gradients, and reusable components are always pulled from their token files instead of raw values.
---

<purpose>
Every UI file in this project references **tokens** (Colors, Fonts, Spacings, BorderRadius, Shadows)
and **shared components** (GradientView, PrimaryButton, AppTextInput) instead of raw values. This
skill is the complete token inventory, the component library, and the rules for using them — so the
UI stays visually consistent and a value change in one token file propagates everywhere.
</purpose>

<when_to_use>
- Creating a new screen, component, or `StyleSheet` in the RN (Expo) app.
- Editing existing UI styles (colors, typography, spacing, radii, shadows, gradients).
- Adding a button, text input, or gradient surface.
- Reviewing UI work before delivery for token/component compliance.
</when_to_use>

<rules>

### Token files (source of truth)

| File                            | Export                   | Usage                          |
| ------------------------------- | ------------------------ | ------------------------------ |
| `src/ui/styles/Colors.ts`       | `Colors` (default)       | All color values               |
| `src/ui/styles/Fonts.ts`        | `Fonts` (default)        | All typography                 |
| `src/ui/styles/Spacings.ts`     | `Spacings` (default)     | All spacing/gap/padding values |
| `src/ui/styles/BorderRadius.ts` | `BorderRadius` (default) | All corner radii               |
| `src/ui/styles/Shadows.ts`      | `Shadows` (default)      | All shadow objects             |
| `src/ui/styles/FontsScale.ts`   | `ms` (named)             | Scaled font sizes              |
| `src/ui/utils/colorUtils.ts`    | `hexToRgba` (named)      | Hex → rgba strings             |

### Colors

Namespace: `Colors.base` (aliased as `Colors.bank` for backwards compatibility — prefer
`Colors.base` in new code). The full palette:

```ts
import Colors from '@/ui/styles/Colors';

// Prefer Colors.base in new code
Colors.base.bgPrimary; // '#0A1628'   — screen background
Colors.base.bgGradientEnd; // '#1A2F5E'   — header gradient end
Colors.base.bgCard; // rgba(255,255,255,0.03)
Colors.base.bgSearchBar; // rgba(255,255,255,0.07)
Colors.base.bgSearchBarBorder; // rgba(255,255,255,0.09)
Colors.base.bgInfoCard; // rgba(255,255,255,0.04)

Colors.base.accent; // '#2D7EF8'   — primary actions / active states
Colors.base.accentGradientStart; // '#3D8EF8'
Colors.base.accentGradientEnd; // '#1A6FE8'
Colors.base.accentDim; // rgba(45,126,248,0.12) — dimmed accent bg
Colors.base.accentDimBorder; // rgba(45,126,248,0.31) — dimmed accent border

Colors.base.cardBorder; // rgba(255,255,255,0.10)
Colors.base.separator; // rgba(255,255,255,0.05)

Colors.base.textPrimary; // '#FFFFFF'
Colors.base.textSecondary; // rgba(255,255,255,0.60)
Colors.base.textMuted; // rgba(255,255,255,0.31)
Colors.base.iconMuted; // rgba(255,255,255,0.38)
Colors.base.badgeEmpty; // rgba(255,255,255,0.08)

// Product icon colors
Colors.base.iconSavings; // '#2D7EF8'
Colors.base.iconCredit; // '#9B59B6'
Colors.base.iconLoan; // '#27AE60'
Colors.base.iconInsurance; // '#E8A030'

// Other namespaces
Colors.alerts.error; // '#E74446'
Colors.alerts.warning; // '#FF8740'
Colors.alerts.check; // '#4eaf0d'
Colors.semantic.text.primaryDark; // '#1C1C1E' — light theme text
Colors.semantic.text.primaryLight; // '#FFFFFF'
```

Translucent colors come from the `hexToRgba` helper, not raw `rgba()` strings — so opacity stays
derived from a single source hex. If the result is reused across components, add it to
`Colors.base` in `Colors.ts` first. Hex colors live only in `Colors.ts`; add to the palette before
using one.

### Typography

Spread a `Fonts` token, then override only `color` (and `fontSize` if strictly needed). `fontWeight`
is baked into each `fontFamily` name (`Poppins-Bold`, `Poppins-SemiBold`, `Poppins-Medium`,
`Poppins-Regular`), so spreading a token sets weight automatically and it is never written inline.
`fontSize` always comes from `ms()` scaling.

| Token                   | fontFamily       | fontSize    | Use case                           |
| ----------------------- | ---------------- | ----------- | ---------------------------------- |
| `Fonts.bigHeader`       | Poppins-Bold     | ms(25, 0.2) | Hero numbers                       |
| `Fonts.header1`         | Poppins-Bold     | ms(30)      | Page titles                        |
| `Fonts.header2`         | Poppins-Bold     | ms(26)      | Section titles                     |
| `Fonts.header3`         | Poppins-SemiBold | ms(22)      | Card headers, logo text            |
| `Fonts.header4`         | Poppins-Medium   | ms(22)      | Secondary headers                  |
| `Fonts.header5`         | Poppins-Medium   | ms(18)      | Empty state titles, labels         |
| `Fonts.bodyText`        | Poppins-Regular  | ms(15)      | Body copy                          |
| `Fonts.bodyTextBold`    | Poppins-SemiBold | ms(15)      | Emphasized body, card names        |
| `Fonts.smallBodyText`   | Poppins-Regular  | ms(13)      | Descriptions, subtitles            |
| `Fonts.inputsBold`      | Poppins-SemiBold | ms(17)      | Nav titles                         |
| `Fonts.inputsNormal`    | Poppins-Regular  | ms(15)      | Text inputs                        |
| `Fonts.callToActions`   | Poppins-SemiBold | ms(18)      | Button labels (large)              |
| `Fonts.links`           | Poppins-Medium   | ms(12)      | Badges, small labels, links        |
| `Fonts.bigNumbers`      | Poppins-Bold     | ms(50, 0.2) | Stats, amounts                     |
| `Fonts.bigNumbersLight` | Poppins-Regular  | ms(50, 0.2) | Light stats                        |
| `Fonts.labelInputError` | Poppins-Regular  | ms(12)      | Error messages (color already set) |

### Spacing

```ts
import Spacings from '@/ui/styles/Spacings';

Spacings.xs; // 4
Spacings.sm; // 8
Spacings.md; // 12
Spacings.lg; // 16
Spacings.xl; // 24
Spacings.xxl; // 32
Spacings.spacex2; // 20  (horizontal screen padding)
Spacings.spacex6; // 48
Spacings.spacex7; // 64
```

Arithmetic is for minor tweaks only (`Spacings.sm + 2`). For a new recurring value, add it to
`Spacings.ts`.

### Border radius

```ts
import BorderRadius from '@/ui/styles/BorderRadius';

BorderRadius.xs; // 4
BorderRadius.sm; // 8
BorderRadius.md; // 12  — default cards
BorderRadius.lg; // 16  — form cards
BorderRadius.xl; // 20
BorderRadius.xxl; // 30
BorderRadius.pill; // 100 — buttons, avatars
```

### Shadows

```ts
import Shadows from '@/ui/styles/Shadows';

Shadows.bankCard; // for product cards (dark shadow)
Shadows.bankButton; // for primary buttons (blue glow)
```

Spread directly into a `StyleSheet` object: `...Shadows.bankCard`.

### Reusable components

- `GradientView` (`@/ui/components/GradientView`) wraps every gradient surface — use it instead of
  `<LinearGradient>` directly, so presets stay centralized.
- `PrimaryButton` (`@/ui/components/PrimaryButton`) is the only gradient CTA button — use it instead
  of a custom `TouchableOpacity + LinearGradient`.
- `AppTextInput` (`@/ui/components/AppTextInput`) backs every text field — use it instead of
  `<TextInput>` directly. All `TextInputProps` are forwarded via spread; the `style` prop is
  intentionally omitted because the variant controls layout.

See the `<examples>` for each component's usage and props.

### Screen layout conventions

- `SafeAreaView` (from `react-native-safe-area-context`) wraps screens with
  `edges={['top', 'left', 'right']}`; `safeArea.backgroundColor` always = `Colors.base.bgPrimary`.
- Header / nav bar is a `<GradientView preset="header">`. Height: 96 (add form) or 120 (list
  screens). Top padding: `Spacings.spacex6` (48) to clear the status bar.
- Card containers use `Colors.base.bgCard`, `BorderRadius.md` (12 for small, `BorderRadius.lg` for
  form cards), a 1px `Colors.base.cardBorder` border, and `...Shadows.bankCard`.

See the `<examples>` for the canonical layout snippets.

### Screen composition boundary

- A screen file is visual composition only. It may keep its `StyleSheet`, but it does not declare
  private subcomponents or top-level config constants.
- Screen-only UI fragments live in `src/ui/screens/<Feature>/components/`.
- Reused UI fragments live in `src/ui/components/`.
- Visual numbers, colors, typography, radii, shadows, and recurring layout values become design
  tokens in `src/ui/styles/`, not constants inside a screen.
- Runtime/env/DI values and reusable UI config constants live in `src/config/`; do not create
  `src/ui/config/`.
- Reusable UI behavior options (for example list thresholds or shared animation durations) live in
  `src/config/`.

### Style property ordering

Order properties in every `StyleSheet` object as:

1. `padding` / `margin`
2. `position` / `display` / `flex` / layout props
3. `width` / `height`
4. `fontWeight` ← only via `...Fonts.token`
5. `color`
6. `backgroundColor`
7. `fontSize` ← only `ms()` values
8. `fontFamily` ← only via spread, never inline
9. `borderRadius` / `borderWidth` / `borderColor`

### Lint + Prettier compliance

- Respect existing formatting config: `.prettierrc` + `.prettierignore`.
- Respect existing lint config: `eslint.config.js` with `eslint-config-prettier` enabled.
- Before delivering UI work, run `npm run lint` and `npm run format:check`.
- Do not introduce style rules that conflict with Prettier output.

</rules>

<examples>

<example name="hexToRgba helper">
Use the helper when a new translucent color is needed:

```ts
import { hexToRgba } from '@/ui/utils/colorUtils';

hexToRgba('#2D7EF8', 0.2); // 'rgba(45,126,248,0.2)'
hexToRgba('#FFFFFF', 0.08); // 'rgba(255,255,255,0.08)'
```
</example>

<example name="Typography token spread">
```ts
import Fonts from '@/ui/styles/Fonts';
import Colors from '@/ui/styles/Colors';

// ✅ Correct
label: {
  ...Fonts.header3,
  color: Colors.base.textPrimary,
},

// ❌ Wrong — raw fontFamily/fontWeight inline
label: {
  fontSize: 22,
  fontFamily: 'Poppins-SemiBold',
  fontWeight: '600',
  color: '#FFFFFF',
},
```
</example>

<example name="GradientView">
A `LinearGradient` wrapper with design-system presets.

```tsx
import GradientView from '@/ui/components/GradientView';

// Preset — header/nav background
<GradientView preset="header" style={styles.header}>…</GradientView>

// Preset — primary CTA fill
<GradientView preset="accent" style={styles.button}>…</GradientView>

// Custom gradient (icon containers, decorative elements)
<GradientView colors={['#9B59B6', '#2D7EF8']} style={styles.icon}>…</GradientView>

// Horizontal direction
<GradientView preset="accent" direction="horizontal" style={styles.bar} />
```
</example>

<example name="PrimaryButton">
The only gradient CTA button in the app. Props: `label`, `onPress`, `iconName?` (Ionicons key),
`loading?`, `disabled?`, `style?` (wrapper override).

```tsx
import PrimaryButton from '@/ui/components/PrimaryButton';

<PrimaryButton label="Agregar" iconName="add" onPress={handleAdd} />
<PrimaryButton label="Guardar" onPress={handleSave} loading={viewModel.saving} />
<PrimaryButton label="Confirmar" onPress={handleConfirm} disabled={!viewModel.isValid} />
<PrimaryButton label="Registrar" onPress={handleRegister} style={{ marginTop: 16 }} />
```
</example>

<example name="AppTextInput">
All text inputs in the app. Two variants (default and search) plus a custom leading icon:

```tsx
import AppTextInput from '@/ui/components/AppTextInput';

// Default — form field with label and optional inline error
<AppTextInput
  label="Nombre del producto"
  placeholder="ej. Cuenta de Ahorros"
  value={viewModel.name}
  onChangeText={viewModel.setName}
  error={viewModel.nameError}
/>

// Search — pill shape, auto leading search icon
<AppTextInput
  variant="search"
  placeholder="Buscar producto..."
  value={viewModel.query}
  onChangeText={viewModel.setQuery}
/>

// Custom leading icon
<AppTextInput
  label="Correo"
  leadingIcon="mail-outline"
  value={viewModel.email}
  onChangeText={viewModel.setEmail}
  keyboardType="email-address"
/>
```
</example>

<example name="Screen layout">
```tsx
import { SafeAreaView } from 'react-native-safe-area-context';

<SafeAreaView style={styles.safeArea} edges={['top', 'left', 'right']}>
  {/* screen content */}
</SafeAreaView>;
```

Header / nav bar:

```tsx
<GradientView preset="header" style={styles.header}>
  {/* back button, title, right action */}
</GradientView>
```

Card container:

```ts
cardContainer: {
  padding: Spacings.md,
  backgroundColor: Colors.base.bgCard,
  borderRadius: BorderRadius.md,   // 12 for small, BorderRadius.lg for form cards
  borderWidth: 1,
  borderColor: Colors.base.cardBorder,
  ...Shadows.bankCard,
},
```
</example>

</examples>

<output_format>
<checklist>
Apply to every new or edited UI file before delivery:

- [ ] No raw `rgba()` strings — use `hexToRgba` or `Colors.base.*`
- [ ] No raw hex colors outside `Colors.ts` — add to palette first
- [ ] No inline `fontFamily` or `fontWeight` — always `...Fonts.[token]`
- [ ] No `fontSize` without `ms()` scaling
- [ ] No direct `LinearGradient` — use `GradientView`
- [ ] No direct `TouchableOpacity + gradient` buttons — use `PrimaryButton`
- [ ] No direct `TextInput` — use `AppTextInput`
- [ ] Spacing values from `Spacings.*`, radii from `BorderRadius.*`
- [ ] Shadows from `Shadows.*` spread into StyleSheet
- [ ] No screen-private subcomponents inside `XxxScreen.tsx`
- [ ] No top-level screen config constants except `StyleSheet`
- [ ] Style property order matches the ordering rule
- [ ] `npm run lint` and `npm run format:check` pass
</checklist>
</output_format>

<see_also>
- [[clean-architecture-rn-expo-mvvm]] — the architecture rules these UI conventions sit inside.
- [[feature-scaffold-rn]] — generates the screens/components this design system styles.
</see_also>
