// The business's listing photos: add from the phone's gallery, pick the cover, remove.
import { Image } from 'expo-image';
import * as ImagePicker from 'expo-image-picker';
import { Redirect } from 'expo-router';
import { useState } from 'react';
import { Text, View } from 'react-native';

import { LoadingView } from '@/components/not-found';
import { CardGrid } from '@/components/provider-card';
import { Screen } from '@/components/screen';
import { SignInPrompt } from '@/components/sign-in-prompt';
import { Back, Btn, Glass, T } from '@/components/ui';
import { MAX_PHOTOS, useBusiness, type BizPhoto } from '@/lib/business';
import { useConfirm, useToast } from '@/lib/feedback';
import { friendly } from '@/lib/supabase';
import { C, F, R, STATUS_TONES, veil } from '@/lib/theme';

export default function Photos() {
  const b = useBusiness();
  const toast = useToast();
  const confirmAsync = useConfirm();
  const [progress, setProgress] = useState<{ done: number; total: number } | null>(null);
  const [busyId, setBusyId] = useState('');
  const [error, setError] = useState('');

  if (b.needsSignIn) return <SignInPrompt next="/biz/photos" title="Photos" body="Sign in to add photos to your listing." />;
  if (b.loading) return <LoadingView />;
  if (!b.biz.registered) return <Redirect href="/biz/register" />;

  const photos = b.photos;
  const room = MAX_PHOTOS - photos.length;
  const uploading = !!progress;

  const add = async () => {
    setError('');
    // Opening the gallery needs no permission prompt (Expo SDK 58 docs).
    const res = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'], allowsMultipleSelection: true, selectionLimit: room, quality: 0.7,
    });
    if (res.canceled || !res.assets.length) return;
    const files = res.assets.slice(0, room);
    setProgress({ done: 0, total: files.length });
    try {
      await b.addPhotos(files, (done) => setProgress({ done, total: files.length }));
      toast(files.length === 1 ? 'Photo added' : `${files.length} photos added`);
    } catch (e) {
      setError(friendly(e));
    } finally {
      setProgress(null);
    }
  };

  const act = async (p: BizPhoto, work: () => Promise<void>, done: string) => {
    setBusyId(p.id); setError('');
    try {
      await work();
      toast(done);
    } catch (e) {
      setError(friendly(e));
    } finally {
      setBusyId('');
    }
  };

  const remove = async (p: BizPhoto) => {
    if (await confirmAsync('Remove this photo?', 'Clients will no longer see it on your listing.', 'Remove')) {
      act(p, () => b.removePhoto(p.id), 'Photo removed');
    }
  };

  return (
    <Screen theme="business">
      <Back href="/biz/services" label="Services" />
      <View style={{ gap: 6 }}>
        <T v="h1">Photos</T>
        <T v="lead" muted>
          Show your shop and your best work. The first photo is your cover on search results and your listing. Up to {MAX_PHOTOS} photos.
        </T>
      </View>

      {!b.live ? (
        <Glass style={{ padding: 22, maxWidth: 640 }}>
          <T muted>This preview runs on demo data, so photos are not saved. They work once the app is connected to Selfcare.</T>
        </Glass>
      ) : (
        <Glass style={{ padding: 22, gap: 12, maxWidth: 760 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap' }}>
            <T v="h3">{photos.length} of {MAX_PHOTOS} photos</T>
            <Btn kind="light" label={uploading ? `Uploading ${progress.done + 1} of ${progress.total}…` : 'Add photos'}
              disabled={uploading || room <= 0} onPress={add} />
          </View>
          <T v="small" muted>
            {room <= 0 ? 'You have the most photos allowed. Remove one to add another.'
              : 'Bright, sharp photos of your work get more bookings. JPG, PNG or WebP, up to 5 MB each.'}
          </T>
          {error ? <View role="alert"><T v="small" style={{ color: STATUS_TONES.bad[1] }}>{error}</T></View> : null}
        </Glass>
      )}

      {b.live && photos.length ? (
        <CardGrid min={200} maxCols={4}>
          {photos.map((p, i) => (
            <Glass key={p.id} style={{ overflow: 'hidden', flex: 1 }}>
              <View>
                <Image source={{ uri: p.url }} contentFit="cover" accessibilityLabel={i === 0 ? 'Cover photo' : `Photo ${i + 1}`}
                  style={{ width: '100%', aspectRatio: 4 / 3, backgroundColor: veil(0.06) }} />
                {i === 0 ? (
                  <View style={{ position: 'absolute', left: 10, top: 10, paddingHorizontal: 9, paddingVertical: 3, borderRadius: R.pill, backgroundColor: C.gold }}>
                    <Text style={{ fontFamily: F.body600, fontSize: 11, color: C.onGold }}>Cover</Text>
                  </View>
                ) : null}
              </View>
              <View style={{ flexDirection: 'row', gap: 8, padding: 10, flexWrap: 'wrap' }}>
                {i > 0 ? (
                  <Btn small kind="outline" label="Make cover" disabled={!!busyId || uploading}
                    onPress={() => act(p, () => b.makeCover(p.id), 'Cover photo changed')} />
                ) : null}
                <Btn small kind="ghost" label={busyId === p.id ? 'Working…' : 'Remove'} disabled={!!busyId || uploading}
                  onPress={() => remove(p)} />
              </View>
            </Glass>
          ))}
        </CardGrid>
      ) : b.live ? (
        <Glass style={{ padding: 22, maxWidth: 640 }}>
          <T muted>No photos yet. Listings with photos stand out in search; your category artwork shows until you add some.</T>
        </Glass>
      ) : null}
    </Screen>
  );
}
