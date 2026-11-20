// Selfcare team: one provider's details and documents, and the decision.
import { Image } from 'expo-image';
import { useLocalSearchParams } from 'expo-router';
import * as WebBrowser from 'expo-web-browser';
import { useState } from 'react';
import { Text, View } from 'react-native';

import { AdminGate, verifyTone } from '@/components/admin-gate';
import { LoadingView, NotFoundView } from '@/components/not-found';
import { Screen } from '@/components/screen';
import { Back, Btn, Field, Glass, Lines, T } from '@/components/ui';
import { reviewProvider, useReviewItem, type ReviewDoc, type ReviewStatus } from '@/lib/admin';
import { DOCS_FOR, VERIFY_LABEL } from '@/lib/business';
import { money } from '@/lib/config';
import { CATEGORIES } from '@/lib/data';
import { useConfirm, useToast } from '@/lib/feedback';
import { friendly } from '@/lib/supabase';
import { C, F, R, STATUS_TONES, veil } from '@/lib/theme';

const WHERE = { shop: 'At the shop', home: 'Home service', both: 'Shop and home' } as const;

export default function AdminReview() {
  const { id } = useLocalSearchParams<{ id: string }>();
  return <AdminGate next={`/admin/${id}`}><Review id={id} /></AdminGate>;
}

function Review({ id }: { id: string }) {
  const { item, error, reload } = useReviewItem(id);
  const toast = useToast();
  const confirmAsync = useConfirm();
  const [note, setNote] = useState('');
  const [busy, setBusy] = useState(false);
  const [actionError, setActionError] = useState('');

  if (item === null) return <NotFoundView />;
  if (!item) {
    return error ? (
      <Screen theme="business">
        <Back href="/admin" label="Review businesses" />
        <Glass style={{ padding: 18, gap: 10, maxWidth: 640 }}>
          <T muted>Could not load this business: {error}</T>
          <Btn small kind="ghost" label="Try again" onPress={reload} />
        </Glass>
      </Screen>
    ) : <LoadingView />;
  }

  const [bg, fg] = verifyTone(item.verification);
  const category = CATEGORIES.find((c) => c.id === item.category)?.label ?? item.category;
  const needed = DOCS_FOR[item.kind];
  const missing = needed.filter(([k]) => !item.docs.some((d) => d.kind === k)).map(([, label]) => label);

  const decide = async (status: ReviewStatus) => {
    if (status === 'approved' && !(await confirmAsync(
      `Approve ${item.name}?`,
      missing.length
        ? `Missing: ${missing.join(', ')}. Approving shows them to clients anyway.`
        : 'Clients will see this business and its services straight away.',
      'Approve',
    ))) return;
    setBusy(true); setActionError('');
    try {
      await reviewProvider(item.id, status, status === 'rejected' ? note : undefined);
      toast(status === 'approved' ? 'Approved' : status === 'rejected' ? 'Sent back with your note' : 'Marked as in review');
      setNote('');
      await reload();
    } catch (e) {
      setActionError(friendly(e));
    } finally {
      setBusy(false);
    }
  };

  return (
    <Screen theme="business">
      <Back href="/admin" label="Review businesses" />
      <View style={{ gap: 8 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
          <T v="h1">{item.name}</T>
          <View style={{ backgroundColor: bg, paddingHorizontal: 10, paddingVertical: 5, borderRadius: 999 }}>
            <Text style={{ fontFamily: F.body600, fontSize: 12, color: fg }}>{VERIFY_LABEL[item.verification]}</Text>
          </View>
        </View>
        <T muted>
          {item.kind === 'freelancer' ? 'Freelancer' : 'Business with a shop'} · {category} · {item.area} · travels up to {Number(item.radius_km)} km
        </T>
        <T v="small" muted>
          Joined {new Date(item.created_at).toLocaleDateString()}
          {item.owner?.full_name ? ` · Owner: ${item.owner.full_name}` : ''}
          {item.owner?.phone ? ` · ${item.owner.phone}` : ''}
        </T>
      </View>

      <Glass style={{ padding: 22, gap: 14, maxWidth: 760 }}>
        <T v="h3">Documents</T>
        <T v="small" muted>Private. Links work for 10 minutes; reload the page for fresh ones.</T>
        {needed.map(([k, label]) => {
          const doc = item.docs.find((d) => d.kind === k);
          return doc ? <DocView key={k} label={label} doc={doc} />
            : <T key={k} v="small" style={{ color: STATUS_TONES.bad[1] }}>{label}: not uploaded</T>;
        })}
      </Glass>

      <Glass style={{ padding: 22, gap: 12, maxWidth: 760 }}>
        <T v="h3">Services</T>
        {item.services.length ? (
          <Lines rows={item.services.map((s) => ({ label: `${s.name} · ${s.mins} min · ${WHERE[s.where_offered]}`, value: money(s.price) }))} />
        ) : <T muted>No services yet. Approved businesses only show to clients once they add one.</T>}
      </Glass>

      <Glass style={{ padding: 22, gap: 14, maxWidth: 760 }}>
        <T v="h3">Decision</T>
        {item.verification === 'rejected' && item.reviewNote ? (
          <T v="small" muted>Last note sent: “{item.reviewNote}”</T>
        ) : null}
        <View style={{ flexDirection: 'row', gap: 10, flexWrap: 'wrap' }}>
          <Btn kind="light" label={item.verification === 'approved' ? 'Approved' : 'Approve'} disabled={busy || item.verification === 'approved'}
            onPress={() => decide('approved')} />
          {item.verification === 'submitted' ? (
            <Btn kind="outline" label="Mark as in review" disabled={busy} onPress={() => decide('in-review')} />
          ) : null}
        </View>
        <View style={{ gap: 10, borderTopWidth: 1, borderTopColor: C.line, paddingTop: 14 }}>
          <T v="label" muted>Ask for changes{item.verification === 'approved' ? ' (this also hides the business from clients)' : ''}</T>
          <Field label="What should they fix? They see this in the app." value={note} onChangeText={setNote} multiline
            placeholder="e.g. The permit photo is blurry. Please upload a clearer one." />
          <Btn kind="ghost" label="Send back with this note" disabled={busy || !note.trim()} onPress={() => decide('rejected')} />
        </View>
        {actionError ? <View role="alert"><T v="small" style={{ color: STATUS_TONES.bad[1] }}>{actionError}</T></View> : null}
      </Glass>
    </Screen>
  );
}

function DocView({ label, doc }: { label: string; doc: ReviewDoc }) {
  const open = () => { if (doc.url) WebBrowser.openBrowserAsync(doc.url); };
  return (
    <View style={{ gap: 8 }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 10, flexWrap: 'wrap' }}>
        <T v="strong">{label}</T>
        <T v="small" muted>Uploaded {new Date(doc.uploaded_at).toLocaleDateString()}</T>
      </View>
      {!doc.url ? (
        <T v="small" style={{ color: STATUS_TONES.bad[1] }}>The file could not be opened.</T>
      ) : doc.isPdf ? (
        <View><Btn small kind="outline" label="Open PDF" onPress={open} /></View>
      ) : (
        <>
          <Image source={{ uri: doc.url }} contentFit="contain" accessibilityLabel={label}
            style={{ width: '100%', height: 280, borderRadius: R.md, backgroundColor: veil(0.06) }} />
          <View><Btn small kind="ghost" label="Open full size" onPress={open} /></View>
        </>
      )}
    </View>
  );
}
