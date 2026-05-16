import { hexToRgba } from '@/ui/utils/colorUtils';

const Shadows = {
  bankCard: {
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 12,
    elevation: 6,
  },
  bankButton: {
    shadowColor: hexToRgba('#2D7EF8', 1),
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.45,
    shadowRadius: 12,
    elevation: 8,
  },
};

export default Shadows;
