import { useEffect, useState } from 'react';
import { ActivityIndicator, Alert, KeyboardAvoidingView, Platform, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { Stack } from 'expo-router';
import { Feather } from '@expo/vector-icons';
import { getRuntimeSettings, saveRuntimeSettings, validateSettings, type RuntimeSettings } from '@/services/config/settings';
import { testGeminiConnection } from '@/services/api/geminiTransport';
import { getDatabase } from '@/services/offline/database';

export default function SettingsScreen() {
  const [draft, setDraft] = useState<RuntimeSettings | null>(null);
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState('');
  const [loadError, setLoadError] = useState('');
  const [showKey, setShowKey] = useState(false);

  const load = () => {
    setLoadError('');
    getRuntimeSettings().then(setDraft).catch(() => setLoadError('Could not read saved API settings. Unlock your phone and retry.'));
  };
  useEffect(load, []);

  const update = (field: keyof RuntimeSettings, value: string) => {
    setDraft(current => current ? { ...current, [field]: value } : current);
    setNotice('');
  };

  const save = async () => {
    if (!draft) return;
    setBusy(true);
    try {
      const settings = validateSettings(draft);
      // Migrate/bind legacy uploads before switching their old destination.
      await getDatabase();
      await saveRuntimeSettings(settings);
      setDraft(settings);
      setNotice('Saved. Your next request uses these settings. No restart needed.');
    } catch (error) { Alert.alert('Could not save', (error as Error).message); }
    finally { setBusy(false); }
  };

  const test = async () => {
    if (!draft) return;
    setBusy(true);
    setNotice('Testing the settings shown here…');
    try {
      const settings = validateSettings(draft);
      await testGeminiConnection(settings);
      setNotice('Gemini answered successfully. Save to apply these settings.');
    } catch (error) { setNotice((error as Error).message); }
    finally { setBusy(false); }
  };

  return (
    <KeyboardAvoidingView style={styles.page} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <Stack.Screen options={{ title: 'API & environment', headerShown: true }} />
      {!draft ? (
        <View style={styles.loading}>
          {loadError ? <><Text>{loadError}</Text><TouchableOpacity onPress={load}><Text style={styles.link}>Retry</Text></TouchableOpacity></> : <ActivityIndicator />}
        </View>
      ) : (
        <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
          <View style={styles.banner}>
            <Feather name="smartphone" size={26} color="#7C3AED" />
            <Text style={styles.title}>Your phone. Your connection.</Text>
            <Text style={styles.hint}>Standalone mode connects directly to Gemini over Wi-Fi or mobile data. No laptop or local server is needed.</Text>
          </View>
          <Text style={styles.heading}>Connection mode</Text>
          {([
            ['direct', 'Standalone · Gemini', 'Recommended. Listing and pricing logic run inside this app.'],
            ['gateway', 'Hosted API', 'Connect to your deployed HTTPS API gateway.'],
          ] as const).map(([mode, title, description]) => (
            <TouchableOpacity key={mode} accessibilityRole="radio" accessibilityState={{ selected: draft.aiMode === mode }} disabled={busy}
              style={[styles.option, draft.aiMode === mode && styles.selected]} onPress={() => update('aiMode', mode)}>
              <Text style={styles.optionTitle}>{draft.aiMode === mode ? '●  ' : '○  '}{title}</Text>
              <Text style={styles.hint}>{description}</Text>
            </TouchableOpacity>
          ))}
          {draft.aiMode === 'direct' ? (
            <>
              <Field label="Gemini API key" value={draft.geminiApiKey} onChange={value => update('geminiApiKey', value)} secret={!showKey} editable={!busy} placeholder="Enter your own API key" />
              <TouchableOpacity onPress={() => setShowKey(value => !value)} accessibilityRole="button"><Text style={styles.link}>{showKey ? 'Hide API key' : 'Show API key'}</Text></TouchableOpacity>
              <Text style={styles.hint}>Stored securely on this phone. Your recordings and selected product photo go to Google only when you generate a listing. API use is charged to your key’s account.</Text>
              <Field label="Gemini model" value={draft.geminiModel} onChange={value => update('geminiModel', value)} editable={!busy} placeholder="gemini-3.6-flash" />
              <TouchableOpacity disabled={busy} style={styles.secondary} onPress={test}><Text style={styles.secondaryText}>Test Gemini connection</Text></TouchableOpacity>
              <Text style={styles.hint}>The test makes one small API request using the fields shown above.</Text>
            </>
          ) : (
            <>
              <Field label="Hosted API URL" value={draft.gatewayUrl} onChange={value => update('gatewayUrl', value)} editable={!busy} placeholder="https://your-api.example.com" />
              <Text style={styles.hint}>Base URL exposing /voice-to-listing and /suggest-price. Include /api or /functions/v1/ai-gateway if your service requires it.</Text>
              <Field label="Gateway bearer token (optional)" value={draft.gatewayToken} onChange={value => update('gatewayToken', value)} editable={!busy} secret placeholder="Token for your hosted gateway" />
            </>
          )}
          <Text style={styles.heading}>Cloud storage · optional</Text>
          <Text style={styles.hint}>Photos, recordings and catalogs save on the phone. Supabase is separate from Gemini and needs a configured backend and authentication for cloud sync. Clear both fields to leave it unconfigured. Queued uploads for another backend stay on this phone until that backend is selected again.</Text>
          <Field label="Supabase URL" value={draft.supabaseUrl} onChange={value => update('supabaseUrl', value)} editable={!busy} placeholder="https://your-project.supabase.co" />
          <Field label="Supabase publishable / anon key" value={draft.supabaseAnonKey} onChange={value => update('supabaseAnonKey', value)} editable={!busy} secret placeholder="Publishable key, not a service-role key" />
          {notice ? <View style={styles.notice} accessibilityLiveRegion="polite"><Text style={styles.noticeText}>{notice}</Text></View> : null}
          <TouchableOpacity style={[styles.primary, busy && { opacity: 0.5 }]} disabled={busy} onPress={save}>
            {busy ? <ActivityIndicator color="#fff" /> : <Text style={styles.primaryText}>Save environment</Text>}
          </TouchableOpacity>
          <Text style={styles.hint}>Changes apply to new requests. Existing requests finish using the settings they started with.</Text>
        </ScrollView>
      )}
    </KeyboardAvoidingView>
  );
}

function Field({ label, value, onChange, placeholder, secret = false, editable = true }: {
  label: string; value: string; onChange: (value: string) => void; placeholder: string; secret?: boolean; editable?: boolean;
}) {
  return <View style={styles.field}><Text style={styles.label}>{label}</Text><TextInput accessibilityLabel={label} value={value} onChangeText={onChange}
    placeholder={placeholder} placeholderTextColor="#9CA3AF" style={styles.input} autoCapitalize="none" autoCorrect={false} secureTextEntry={secret} editable={editable} /></View>;
}

const styles = StyleSheet.create({
  page: { flex: 1, backgroundColor: '#fff' }, loading: { flex: 1, padding: 24, alignItems: 'center', justifyContent: 'center', gap: 16 },
  content: { padding: 20, paddingBottom: 56, gap: 12 }, banner: { padding: 20, borderRadius: 20, backgroundColor: '#F5F3FF', gap: 12 },
  title: { fontSize: 23, fontWeight: '700', color: '#111827' }, hint: { fontSize: 13, lineHeight: 20, color: '#6B7280' },
  heading: { fontSize: 19, fontWeight: '700', marginTop: 14, color: '#111827' }, option: { padding: 16, borderRadius: 16, borderWidth: 1, borderColor: '#E5E7EB', gap: 6 },
  selected: { borderColor: '#7C3AED', backgroundColor: '#FAF5FF' }, optionTitle: { fontSize: 15, fontWeight: '600', color: '#111827' },
  field: { gap: 8, marginTop: 6 }, label: { fontSize: 14, fontWeight: '600', color: '#374151' }, input: { borderWidth: 1, borderColor: '#D1D5DB', borderRadius: 12, padding: 14, color: '#111827', fontSize: 15 },
  link: { color: '#7C3AED', paddingVertical: 10, fontWeight: '600' }, primary: { padding: 17, alignItems: 'center', borderRadius: 14, backgroundColor: '#7C3AED', marginTop: 6 },
  primaryText: { color: '#fff', fontWeight: '700', fontSize: 16 }, secondary: { padding: 15, borderRadius: 14, alignItems: 'center', borderWidth: 1, borderColor: '#7C3AED' },
  secondaryText: { color: '#7C3AED', fontWeight: '600' }, notice: { padding: 16, borderRadius: 12, backgroundColor: '#F3F4F6' }, noticeText: { color: '#374151', lineHeight: 21 },
});
