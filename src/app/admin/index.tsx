// Selfcare team: every provider, with the ones waiting for a decision first.
import { router } from 'expo-router';
import { useState } from 'react';
import { Pressable, Text, View } from 'react-native';

import { AdminGate, verifyTone } from '@/components/admin-gate';
import { Screen } from '@/components/screen';
import { Back, Btn, Glass, Segmented, T } from '@/components/ui';
import { useReviewQueue, type QueueItem } from '@/lib/admin';
import { DOCS_FOR, VERIFY_LABEL } from '@/lib/business';
import { CATEGORIES } from '@/lib/data';
import { C, F } from '@/lib/theme';

type Filter = 'waiting' | 'approved' | 'rejected' | 'all';
const FILTERS: { id: Filter; label: string }[] = [
  { id: 'waiting', label: 'Waiting' }, { id: 'approved', label: 'Approved' },
  { id: 'rejected', label: 'Needs changes' }, { id: 'all', label: 'All' },
];
const WAITING = ['submitted', 'in-review'];

const matches = (f: Filter, p: QueueItem) =>
  f === 'all' ? true : f === 'waiting' ? WAITING.includes(p.verification) : p.verification === f;

export default function AdminHome() {
  return <AdminGate next="/admin"><Queue /></AdminGate>;
}

function Queue() {
  const { items, error, reload } = useReviewQueue();
  const [filter, setFilter] = useState<Filter>('waiting');
  const shown = (items ?? []).filter((p) => matches(filter, p));
  const waiting = (items ?? []).filter((p) => WAITING.includes(p.verification)).length;

  return (
    <Screen theme="business">
      <Back href="/profile" label="Profile" />
      <View style={{ gap: 6 }}>
        <T v="eyebrow">Selfcare team</T>
        <T v="h1">Review businesses</T>
        <T muted>{items ? `${waiting} waiting for a decision.` : 'Loading…'}</T>
      </View>
      <Segmented label="Show" value={filter} onChange={setFilter} options={FILTERS} />
      {error ? (
        <Glass style={{ padding: 18, gap: 10, maxWidth: 640 }}>
          <T muted>Could not load businesses: {error}</T>
          <Btn small kind="ghost" label="Try again" onPress={reload} />
        </Glass>
      ) : null}
      {items && !shown.length ? (
        <Glass style={{ padding: 22, maxWidth: 640 }}>
          <T muted>{filter === 'waiting' ? 'Nothing waiting. All caught up.' : 'No businesses here.'}</T>
        </Glass>
      ) : null}
      <View style={{ gap: 12, maxWidth: 760 }}>
        {shown.map((p) => <QueueCard key={p.id} p={p} />)}
      </View>
    </Screen>
  );
}

function QueueCard({ p }: { p: QueueItem }) {
  const [bg, fg] = verifyTone(p.verification);
  const category = CATEGORIES.find((c) => c.id === p.category)?.label ?? p.category;
  const needed = DOCS_FOR[p.kind].length;
  const docs = p.provider_documents.length;
  const services = p.services[0]?.count ?? 0;
  return (
    <Pressable role="link" accessibilityLabel={`Review ${p.name}`}
      onPress={() => router.push({ pathname: '/admin/[id]', params: { id: p.id } })}>
      <Glass style={{ padding: 18, gap: 8 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 10 }}>
          <T v="h3" numberOfLines={1} style={{ flexShrink: 1 }}>{p.name}</T>
          <View style={{ backgroundColor: bg, paddingHorizontal: 10, paddingVertical: 5, borderRadius: 999 }}>
            <Text style={{ fontFamily: F.body600, fontSize: 12, color: fg }}>{VERIFY_LABEL[p.verification]}</Text>
          </View>
        </View>
        <T v="small" muted>
          {p.kind === 'freelancer' ? 'Freelancer' : 'Business'} · {category} · {p.area} · joined {new Date(p.created_at).toLocaleDateString()}
        </T>
        <T v="small" style={{ color: docs < needed ? C.gold : C.muted }}>
          {docs} of {needed} documents · {services} {services === 1 ? 'service' : 'services'}
        </T>
      </Glass>
    </Pressable>
  );
}
