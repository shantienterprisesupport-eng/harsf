import React, { useMemo, useState } from 'react';
import { SafeAreaView, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { StatusBar } from 'expo-status-bar';

type Service = { id: string; title: string; subtitle: string };

const services: Service[] = [
  { id: 'government', title: 'Government Paperwork', subtitle: 'Aadhaar, PAN, certificates, PF, pension, RTO & more' },
  { id: 'jobs', title: 'Jobs', subtitle: 'Resume, job search, apply & vacancy alerts' },
  { id: 'affidavit', title: 'Affidavit', subtitle: 'Draft + document checklist + next legal step' },
  { id: 'lawyer', title: 'Lawyer / Legal Help', subtitle: 'Legal paperwork and verified professional handoff' },
  { id: 'land', title: 'Land & Property', subtitle: 'Records, mutation, registry checklist and paperwork' },
  { id: 'school', title: 'School / College', subtitle: 'Private and government services kept separate' },
  { id: 'loan', title: 'Loan Help', subtitle: 'Eligibility, documents and direct legitimate routes' },
  { id: 'afterdeath', title: 'After-Death Help', subtitle: 'Death certificate, PF, pension, bank, insurance checklist' },
];

export default function HomeScreen() {
  const [message, setMessage] = useState('');
  const [selected, setSelected] = useState<string | null>(null);
  const selectedService = useMemo(() => services.find(s => s.id === selected), [selected]);

  const startConversation = () => {
    if (!message.trim() && !selectedService) return;
    const service = selectedService?.title ?? 'AI Master Router';
    alert(`Starting: ${service}\n\nAI will ask one simple question at a time.`);
  };

  return (
    <SafeAreaView style={styles.safe}>
      <StatusBar style="dark" />
      <ScrollView contentContainerStyle={styles.container}>
        <Text style={styles.brand}>L GenZ DIRECT</Text>
        <Text style={styles.tagline}>Apni Bhasha Me Bolo — Seedha Kaam Karo</Text>

        <View style={styles.hero}>
          <Text style={styles.heroTitle}>🎙️ Boliye, aapko kya kaam hai?</Text>
          <Text style={styles.heroText}>Form ka naam ya department yaad rakhne ki zaroorat nahi.</Text>
          <TextInput
            value={message}
            onChangeText={setMessage}
            placeholder="Jaise: Papa ke PF ka claim karna hai..."
            multiline
            style={styles.input}
          />
          <TouchableOpacity style={styles.primaryButton} onPress={startConversation}>
            <Text style={styles.primaryButtonText}>AI se baat shuru karein</Text>
          </TouchableOpacity>
        </View>

        <Text style={styles.sectionTitle}>Ya service choose karein</Text>
        <View style={styles.grid}>
          {services.map((service) => {
            const active = selected === service.id;
            return (
              <TouchableOpacity
                key={service.id}
                onPress={() => setSelected(service.id)}
                style={[styles.card, active && styles.cardActive]}
              >
                <Text style={styles.cardTitle}>{service.title}</Text>
                <Text style={styles.cardText}>{service.subtitle}</Text>
              </TouchableOpacity>
            );
          })}
        </View>

        <View style={styles.statusBox}>
          <Text style={styles.statusTitle}>Kaise chalega</Text>
          <Text style={styles.statusText}>1. Aap apni bhasha me bolenge ya likhenge.</Text>
          <Text style={styles.statusText}>2. AI ek-ek simple sawal puchega.</Text>
          <Text style={styles.statusText}>3. Documents aur form details check hongi.</Text>
          <Text style={styles.statusText}>4. Final payable price service ke hisaab se dikhega.</Text>
          <Text style={styles.statusText}>5. AI bolega: online kya hoga aur kahan jana hai.</Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#F7F7F8' },
  container: { padding: 18, paddingBottom: 40 },
  brand: { fontSize: 30, fontWeight: '800', marginTop: 10 },
  tagline: { fontSize: 16, marginTop: 4, marginBottom: 18, opacity: 0.72 },
  hero: { backgroundColor: '#FFFFFF', padding: 18, borderRadius: 20, marginBottom: 22 },
  heroTitle: { fontSize: 22, fontWeight: '700', marginBottom: 6 },
  heroText: { fontSize: 14, opacity: 0.68, marginBottom: 14 },
  input: { minHeight: 92, borderWidth: 1, borderColor: '#DDDEE3', borderRadius: 14, padding: 12, textAlignVertical: 'top', backgroundColor: '#FAFAFB' },
  primaryButton: { marginTop: 12, paddingVertical: 14, borderRadius: 14, backgroundColor: '#111827', alignItems: 'center' },
  primaryButtonText: { color: '#FFFFFF', fontWeight: '700', fontSize: 16 },
  sectionTitle: { fontSize: 20, fontWeight: '700', marginBottom: 12 },
  grid: { gap: 10 },
  card: { backgroundColor: '#FFFFFF', padding: 16, borderRadius: 16, borderWidth: 1, borderColor: '#ECECF0' },
  cardActive: { borderColor: '#111827', borderWidth: 2 },
  cardTitle: { fontSize: 17, fontWeight: '700' },
  cardText: { marginTop: 5, fontSize: 13, opacity: 0.65, lineHeight: 18 },
  statusBox: { marginTop: 22, padding: 16, backgroundColor: '#FFFFFF', borderRadius: 16 },
  statusTitle: { fontSize: 18, fontWeight: '700', marginBottom: 8 },
  statusText: { fontSize: 14, marginBottom: 6, lineHeight: 20 }
});
