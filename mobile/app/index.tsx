import { useMemo, useState } from "react";
import { Pressable, ScrollView, StyleSheet, Text, TextInput, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { HomonimosApi } from "../src/api";

const API_URL = process.env.EXPO_PUBLIC_API_URL || "http://localhost:3001";
const api = new HomonimosApi(API_URL);

export default function HomeScreen() {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<Array<{ id: number; name: string; city: string | null; profession: string | null }>>([]);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("Descubra pessoas que compartilham o seu nome.");

  const canSearch = useMemo(() => query.trim().length >= 2 && !loading, [query, loading]);

  async function search() {
    if (!canSearch) return;
    setLoading(true);
    setMessage("");
    try {
      const response = await api.search(query.trim());
      setResults(response.users);
      setMessage(response.users.length ? `${response.users.length} resultado(s) nesta busca.` : "Nenhum resultado encontrado ainda.");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Não foi possível realizar a busca.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <SafeAreaView style={styles.safe}>
      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        <View style={styles.brandRow}><View style={styles.brandMark}><View style={styles.brandDot} /><View style={styles.brandDotSecond} /></View><Text style={styles.brand}>homônimos<Text style={styles.period}>.</Text></Text></View>
        <Text style={styles.kicker}>uma rede feita para histórias reais</Text>
        <Text style={styles.title}>O mesmo nome.{"\n"}<Text style={styles.emphasis}>Mil histórias.</Text></Text>
        <Text style={styles.lead}>Encontre homônimos, participe da sua comunidade e descubra conexões que começam pelo nome.</Text>
        <View style={styles.searchCard}>
          <Text style={styles.label}>ENCONTRE SEUS HOMÔNIMOS</Text>
          <TextInput value={query} onChangeText={setQuery} placeholder="Digite um nome" placeholderTextColor="#8B999D" style={styles.input} returnKeyType="search" onSubmitEditing={search} />
          <Pressable disabled={!canSearch} onPress={search} style={({ pressed }) => [styles.button, !canSearch && styles.buttonDisabled, pressed && styles.pressed]}><Text style={styles.buttonText}>{loading ? "Buscando…" : "Encontrar"}</Text></Pressable>
          <Text style={styles.helper}>Seus dados são protegidos. Nada sensível é exibido.</Text>
        </View>
        <Text style={styles.message}>{message}</Text>
        <View style={styles.results}>{results.map((result) => <View key={result.id} style={styles.resultCard}><View style={styles.avatar}><Text style={styles.avatarText}>{result.name.slice(0, 2).toUpperCase()}</Text></View><View style={styles.resultCopy}><Text style={styles.resultName}>{result.name}</Text><Text style={styles.resultMeta}>{result.profession || "Membro da comunidade"}</Text><Text style={styles.resultCity}>{result.city || "Brasil"}</Text></View></View>)}</View>
        <View style={styles.safeCard}><Text style={styles.safeTitle}>Sua identidade no controle</Text><Text style={styles.safeCopy}>O Homônimos não mostra CPF, processos ou documentos de terceiros.</Text></View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: "#F7F5EF" },
  content: { padding: 24, paddingBottom: 48 },
  brandRow: { flexDirection: "row", alignItems: "center", marginBottom: 58 },
  brandMark: { width: 25, height: 25, justifyContent: "center", marginRight: 8 },
  brandDot: { width: 15, height: 15, borderRadius: 8, backgroundColor: "#EB765F" },
  brandDotSecond: { position: "absolute", right: 0, top: 0, width: 13, height: 13, borderRadius: 8, backgroundColor: "#F0C3A7", borderWidth: 3, borderColor: "#F7F5EF" },
  brand: { color: "#17324D", fontSize: 21, fontWeight: "700", letterSpacing: -1.1 },
  period: { color: "#EB765F" },
  kicker: { color: "#D85F4A", fontSize: 10, fontWeight: "700", letterSpacing: 1.6, textTransform: "uppercase" },
  title: { marginTop: 17, color: "#102A43", fontSize: 42, lineHeight: 44, fontWeight: "700", letterSpacing: -1.8 },
  emphasis: { color: "#EB765F" },
  lead: { marginTop: 18, color: "#53687A", fontSize: 15, lineHeight: 23 },
  searchCard: { marginTop: 28, padding: 16, backgroundColor: "#FFFDF9", borderRadius: 12, borderWidth: 1, borderColor: "#E5E7E2" },
  label: { color: "#17324D", fontSize: 10, fontWeight: "700", letterSpacing: 1.2, marginBottom: 9 },
  input: { height: 47, paddingHorizontal: 13, borderWidth: 1, borderColor: "#DFE5E4", borderRadius: 7, color: "#17324D", fontSize: 14 },
  button: { height: 47, marginTop: 9, alignItems: "center", justifyContent: "center", borderRadius: 7, backgroundColor: "#102A43" },
  buttonDisabled: { opacity: 0.55 },
  pressed: { transform: [{ scale: 0.98 }], opacity: 0.9 },
  buttonText: { color: "#FFFFFF", fontSize: 13, fontWeight: "700" },
  helper: { marginTop: 9, color: "#8B999D", fontSize: 10 },
  message: { marginTop: 18, color: "#53687A", fontSize: 12 },
  results: { gap: 10, marginTop: 12 },
  resultCard: { flexDirection: "row", alignItems: "center", padding: 14, backgroundColor: "#FFFDF9", borderRadius: 10, borderWidth: 1, borderColor: "#E7E9E5" },
  avatar: { width: 43, height: 43, alignItems: "center", justifyContent: "center", borderRadius: 22, backgroundColor: "#D7E8F4" },
  avatarText: { color: "#17324D", fontSize: 12, fontWeight: "700" },
  resultCopy: { marginLeft: 11 },
  resultName: { color: "#102A43", fontSize: 14, fontWeight: "700" },
  resultMeta: { marginTop: 3, color: "#53687A", fontSize: 11 },
  resultCity: { marginTop: 2, color: "#89979A", fontSize: 10 },
  safeCard: { marginTop: 28, padding: 16, backgroundColor: "#E5F0ED", borderRadius: 10 },
  safeTitle: { color: "#2C695D", fontSize: 12, fontWeight: "700" },
  safeCopy: { marginTop: 5, color: "#5E8682", fontSize: 11, lineHeight: 16 },
});
