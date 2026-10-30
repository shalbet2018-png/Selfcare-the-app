import { useLocalSearchParams } from 'expo-router';
import { View } from 'react-native';

import { Icon } from '@/components/icon';
import { NotFoundView } from '@/components/not-found';
import { Screen } from '@/components/screen';
import { StatusTag } from '@/components/status';
import { Back, Btn, Glass, Lines, T } from '@/components/ui';
import { STATUS_LABEL, stepsFor, whenText } from '@/lib/bookings';
import { ARRIVED_CANCEL_FEE, money, PAYMENT_METHODS, SERVICE_FEE_LABEL } from '@/lib/config';
import { confirmAsync, useToast } from '@/lib/feedback';
import { useLayout } from '@/lib/layout';
import { useStore } from '@/lib/store';
import { C } from '@/lib/theme';

export default function BookingDetail() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { state, updateBooking } = useStore();
  const toast = useToast();
  const { wide } = useLayout();
  const b = state.bookings.find((x) => x.id === id);
  if (!b) return <NotFoundView />;

  const steps = stepsFor(b);
  const at = steps.indexOf(b.status);
  const active = b.status !== 'done' && b.status !== 'cancelled';
  const lateCancel = b.status === 'arrived';
  const cancelled = b.status === 'cancelled';

  const cancel = async () => {
    const fee = lateCancel ? ARRIVED_CANCEL_FEE : 0;
    const ok = await confirmAsync('Cancel booking?', fee ? `Your provider has arrived, so cancelling costs ${money(fee)}.` : 'This is free until your provider arrives.', 'Cancel booking');
    if (!ok) return;
    updateBooking(b.id, { status: 'cancelled', cancelFee: fee });
    toast('Booking cancelled');
  };

  return (
    <Screen theme="spa">
      <Back href="/bookings" label="Bookings" />
      <View style={{ gap: 4 }}>
        <T v="h1">{b.serviceName}</T>
        <T muted>{b.providerName} · {whenText(b)}</T>
      </View>

      <View style={{ flexDirection: wide ? 'row' : 'column', gap: 22, alignItems: 'flex-start' }}>
        <View style={{ flex: wide ? 1 : undefined, alignSelf: 'stretch', gap: 18 }}>
          {b.mode === 'home' && !cancelled && (
            <Glass style={{ minHeight: 200, alignItems: 'center', justifyContent: 'center', gap: 8, padding: 16 }}>
              <Icon name="pin" size={28} color={C.muted} />
              <T v="small" muted style={{ textAlign: 'center' }}>Live map: your provider’s route to {b.address || 'you'}</T>
            </Glass>
          )}
          {cancelled ? <StatusTag status="cancelled" /> : (
            <View accessibilityLabel={`Progress: ${STATUS_LABEL[b.status]}`}>
              {steps.map((s, i) => {
                const done = i < at;
                const now = i === at;
                return (
                  <View key={s} style={{ flexDirection: 'row', gap: 14, minHeight: 40 }}>
                    <View style={{ alignItems: 'center', width: 16 }}>
                      <View style={{
                        width: 14, height: 14, borderRadius: 7, marginTop: 4, borderWidth: 2,
                        borderColor: done || now ? C.sage : '#BDB4C4', backgroundColor: done ? C.sage : C.pearl,
                      }} />
                      {i < steps.length - 1 && <View style={{ flex: 1, width: 2, backgroundColor: done ? C.sage : '#D8D0DD', marginTop: 2 }} />}
                    </View>
                    <T v={now ? 'strong' : 'body'} muted={!done && !now}>{STATUS_LABEL[s]}</T>
                  </View>
                );
              })}
            </View>
          )}
          {active && (
            <View style={{ borderWidth: 1, borderStyle: 'dashed', borderColor: '#BDB4C4', borderRadius: 16, padding: 14, gap: 10 }}>
              <T v="small" muted>Demo control: in the live app, the provider’s actions move this along.</T>
              <Btn small kind="ghost" label="Next status" onPress={() => updateBooking(b.id, { status: steps[Math.min(at + 1, steps.length - 1)] })} />
            </View>
          )}
        </View>

        <Glass style={{ width: wide ? 360 : undefined, alignSelf: wide ? 'flex-start' : 'stretch', padding: 22, gap: 12 }}>
          <Lines rows={[
            { label: 'Service', value: money(b.price) },
            ...(b.travel ? [{ label: 'Travel fee', value: money(b.travel) }] : []),
            { label: SERVICE_FEE_LABEL, value: money(b.fee) },
            ...(b.cancelFee ? [{ label: 'Inconvenience fee', value: money(b.cancelFee) }] : []),
            { label: cancelled ? 'Charged' : 'Total', value: money(cancelled ? b.cancelFee ?? 0 : b.total), total: true },
          ]} />
          <T v="small" muted>Paying with {PAYMENT_METHODS.find((m) => m.id === b.pay)?.label}</T>
          {active && (
            <>
              <Btn block kind="outline" label="Cancel booking" onPress={cancel} />
              <T v="small" muted>{lateCancel ? `Your provider has arrived, so cancelling now costs ${money(ARRIVED_CANCEL_FEE)}.` : 'Free to cancel until your provider arrives.'}</T>
            </>
          )}
          {b.status === 'done' && <Btn block label="Book again" href={{ pathname: '/provider/[id]', params: { id: b.providerId } }} />}
        </Glass>
      </View>
    </Screen>
  );
}
