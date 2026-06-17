import { TextStyle } from 'react-native';

import { ms } from '@/ui/styles/FontsScale';

/**
 * Familias Inter cargadas desde `@expo-google-fonts/inter`.
 * El peso va horneado en la familia — nunca se setea `fontWeight` inline.
 */
const Family = {
  bold: 'Inter_700Bold',
  semiBold: 'Inter_600SemiBold',
  medium: 'Inter_500Medium',
  regular: 'Inter_400Regular',
} as const;

const Fonts = {
  bigHeader: { fontFamily: Family.bold, fontSize: ms(25, 0.2) },
  header1: { fontFamily: Family.bold, fontSize: ms(30) },
  header2: { fontFamily: Family.bold, fontSize: ms(26) },
  header3: { fontFamily: Family.semiBold, fontSize: ms(22) },
  header4: { fontFamily: Family.medium, fontSize: ms(22) },
  header5: { fontFamily: Family.medium, fontSize: ms(18) },
  bodyText: { fontFamily: Family.regular, fontSize: ms(15) },
  bodyTextBold: { fontFamily: Family.semiBold, fontSize: ms(15) },
  smallBodyText: { fontFamily: Family.regular, fontSize: ms(13) },
  smallBodyTextBold: { fontFamily: Family.semiBold, fontSize: ms(13) },
  inputsBold: { fontFamily: Family.semiBold, fontSize: ms(17) },
  inputsNormal: { fontFamily: Family.regular, fontSize: ms(15) },
  callToActions: { fontFamily: Family.semiBold, fontSize: ms(18) },
  links: { fontFamily: Family.medium, fontSize: ms(12) },
  linksBold: { fontFamily: Family.semiBold, fontSize: ms(12) },
  bigNumbers: { fontFamily: Family.bold, fontSize: ms(50, 0.2) },
  bigNumbersLight: { fontFamily: Family.regular, fontSize: ms(50, 0.2) },
  labelInputError: { fontFamily: Family.regular, fontSize: ms(12) },
} satisfies Record<string, TextStyle>;

export { Family as FontFamily };
export default Fonts;
