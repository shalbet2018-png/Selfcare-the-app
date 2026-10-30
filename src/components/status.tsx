import { Text, View } from 'react-native';

import { STATUS_COLORS, STATUS_LABEL } from '@/lib/bookings';
import type { BookingStatus } from '@/lib/store';
import { F } from '@/lib/theme';

export function StatusTag({ status }: { status: BookingStatus }) {
  const [bg, fg] = STATUS_COLORS[status];
  return (
    <View style={{ backgroundColor: bg, paddingHorizontal: 10, paddingVertical: 5, borderRadius: 999, alignSelf: 'flex-start' }}>
      <Text style={{ fontFamily: F.body600, fontSize: 12, color: fg }}>{STATUS_LABEL[status]}</Text>
    </View>
  );
}
