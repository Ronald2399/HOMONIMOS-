import { useEffect, useMemo, useState } from "react";
import { Pressable, ScrollView, StyleSheet, Text, TextInput, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { API_URL, HomonimosApi, type User } from "../src/api";
import { persistApiSession, signOut } from "../src/auth";
import { loadSessionToken } from "../src/session";

const api = new HomonimosApi(API_URL);

type AuthMode = "login" | "register";

export default function HomeScreen() {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<User[]>([]);
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(false);
  const [restoringSession, setRestoringSession] = useState(true);
  const [message, setMessage] = useState("Descubra pessoas que compartilham o seu nome.");
  const [authMode, setAuthMode] = useState<AuthMode>("login");
  const [authOpen, setAuthOpen] = useState(false);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [city, setCity] = useState("");
  const [profession, setProfession] = useState("");

  const canSearch = useMemo(() => query.trim().length >= 2 && !loading && !restoringSession, [query, loading, restoringSession]);
  const canSubmitAuth = authMode === "register"
    ? name.trim().length >= 2 && email.includes("@") && password.length >= 8 && !loading
    : email.includes("@") && password.length >= 1 && !loading;

  useEffect(() => {
    let mounted = true;
    async function restoreSession() {
      try {
        const token = await loadSessionToken();
        if (token) {
          api.setSessionToken(token);
          const response = await api.me();
          if (mounted) setUser(response.user);
        }
      } catch {
        api.setSessionToken(null);
      } finally {
        if (mounted) setRestoringSession(false);
      }
    }
    void restoreSession();
    return () => { mounted = false; };
  }, []);

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

  async function submitAuth() {
    if (!canSubmitAuth) return;
    setLoading(true);
    setMessage("");
    try {
      const authenticatedUser = authMode === "register"
        ? await api.register({ name: name.trim(), email: email.trim(), password, city: city.trim() || undefined, profession: profession.trim() || undefined })
        : await api.login(email.trim(), password);
      await persistApiSession(api);
      setUser(authenticatedUser);
      setAuthOpen(false);
      setPassword("");
      setMessage(authMode === "register" ? "Conta criada com sucesso." : "Login realizado com sucesso.");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Não foi possível concluir o acesso.");
    } finally {
      setLoading(false);
    }
  }

  async function handleLogout() {
    setLoading(true);
    try {
      await signOut(api);
      setUser(null);
      setMessage("Você saiu da sua conta neste aparelho.");
    } catch {
      setMessage("A sessão local foi encerrada.");
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

        {user ? (
          <View style={styles.profileCard}>
            <View style={styles.profileAvatar}><Text style={styles.profileAvatarText}>{user.name.slice(0, 2).toUpperCase()}</Text></View>
            <View style={styles.profileCopy}><Text style={styles.profileEyebrow}>SEU PERFIL</Text><Text style={styles.profileName}>{user.name}</Text><Text style={styles.profileMeta}>{user.profession || "Membro da comunidade"}{user.city ? ` · ${user.city}` : ""}</Text></View>
            <Pressable onPress={handleLogout} disabled={loading} style={({ pressed }) => [styles.logoutButton, pressed && styles.pressed]}><Text style={styles.logoutText}>Sair</Text></Pressable>
          </View>
        ) : (
          <View style={styles.authCtaRow}>
            <Pressable onPress={() => { setAuthMode("login"); setAuthOpen(true); }} style={({ pressed }) => [styles.primarySmall, pressed && styles.pressed]}><Text style={styles.primarySmallText}>Entrar</Text></Pressable>
            <Pressable onPress={() => { setAuthMode("register"); setAuthOpen(true); }} style={({ pressed }) => [styles.secondarySmall, pressed && styles.pressed]}><Text style={styles.secondarySmallText}>Criar conta</Text></Pressable>
          </View>
        )}

        {authOpen && (
          <View style={styles.authCard}>
            <View style={styles.authHeader}><Text style={styles.authTitle}>{authMode === "login" ? "Entrar no Homônimos" : "Criar sua conta"}</Text><Pressable onPress={() => setAuthOpen(false)}><Text style={styles.closeText}>Fechar</Text></Pressable></View>
            {authMode === "register" && <TextInput value={name} onChangeText={setName} placeholder="Nome completo" placeholderTextColor="#8B999D" style={styles.input} autoCapitalize="words" />}
            <TextInput value={email} onChangeText={setEmail} placeholder="E-mail" placeholderTextColor="#8B999D" style={styles.input} keyboardType="email-address" autoCapitalize="none" />
            <TextInput value={password} onChangeText={setPassword} placeholder="Senha (mínimo de 8 caracteres)" placeholderTextColor="#8B999D" style={styles.input} secureTextEntry returnKeyType="done" />
            {authMode === "register" && <><TextInput value={city} onChangeText={setCity} placeholder="Cidade (opcional)" placeholderTextColor="#8B999D" style={styles.input} /><TextInput value={profession} onChangeText={setProfession} placeholder="Profissão (opcional)" placeholderTextColor="#8B999D" style={styles.input} /></>}
            <Pressable disabled={!canSubmitAuth} onPress={submitAuth} style={({ pressed }) => [styles.button, !canSubmitAuth && styles.buttonDisabled, pressed && styles.pressed]}><Text style={styles.buttonText}>{loading ? "Aguarde…" : authMode === "login" ? "Entrar" : "Criar conta"}</Text></Pressable>
            <Pressable onPress={() => setAuthMode(authMode === "login" ? "register" : "login")}><Text style={styles.switchText}>{authMode === "login" ? "Ainda não tenho conta" : "Já tenho uma conta"}</Text></Pressable>
          </View>
        )}

        <View style={styles.searchCard}>
          <Text style={styles.label}>ENCONTRE SEUS HOMÔNIMOS</Text>
          <TextInput value={query} onChangeText={setQuery} placeholder="Digite um nome" placeholderTextColor="#8B999D" style={styles.input} returnKeyType="search" onSubmitEditing={search} />
          <Pressable disabled={!canSearch} onPress={search} style={({ pressed }) => [styles.button, !canSearch && styles.buttonDisabled, pressed && styles.pressed]}><Text style={styles.buttonText}>{restoringSession ? "Conectando…" : loading ? "Buscando…" : "Encontrar"}</Text></Pressable>
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
  brandRow: { flexDirection: "row", alignItems: "center", marginBottom: 40 },
  brandMark: { width: 25, height: 25, justifyContent: "center", marginRight: 8 },
  brandDot: { width: 15, height: 15, borderRadius: 8, backgroundColor: "#EB765F" },
  brandDotSecond: { position: "absolute", right: 0, top: 0, width: 13, height: 13, borderRadius: 8, backgroundColor: "#F0C3A7", borderWidth: 3, borderColor: "#F7F5EF" },
  brand: { color: "#17324D", fontSize: 21, fontWeight: "700", letterSpacing: -1.1 },
  period: { color: "#EB765F" },
  kicker: { color: "#D85F4A", fontSize: 10, fontWeight: "700", letterSpacing: 1.6, textTransform: "uppercase" },
  title: { marginTop: 17, color: "#102A43", fontSize: 42, lineHeight: 44, fontWeight: "700", letterSpacing: -1.8 },
  emphasis: { color: "#EB765F" },
  lead: { marginTop: 18, color: "#53687A", fontSize: 15, lineHeight: 23 },
  authCtaRow: { flexDirection: "row", gap: 10, marginTop: 22 },
  primarySmall: { paddingVertical: 12, paddingHorizontal: 22, borderRadius: 7, backgroundColor: "#102A43" },
  primarySmallText: { color: "#FFFFFF", fontSize: 13, fontWeight: "700" },
  secondarySmall: { paddingVertical: 12, paddingHorizontal: 18, borderRadius: 7, borderWidth: 1, borderColor: "#D8DEDC" },
  secondarySmallText: { color: "#17324D", fontSize: 13, fontWeight: "700" },
  profileCard: { flexDirection: "row", alignItems: "center", marginTop: 22, padding: 14, backgroundColor: "#E5F0ED", borderRadius: 10 },
  profileAvatar: { width: 44, height: 44, borderRadius: 22, alignItems: "center", justifyContent: "center", backgroundColor: "#FFFFFF" },
  profileAvatarText: { color: "#2C695D", fontSize: 12, fontWeight: "700" },
  profileCopy: { flex: 1, marginLeft: 11 },
  profileEyebrow: { color: "#5E8682", fontSize: 9, fontWeight: "700", letterSpacing: 1 },
  profileName: { marginTop: 2, color: "#2C695D", fontSize: 15, fontWeight: "700" },
  profileMeta: { marginTop: 2, color: "#5E8682", fontSize: 10 },
  logoutButton: { paddingVertical: 8, paddingHorizontal: 10 },
  logoutText: { color: "#D85F4A", fontSize: 11, fontWeight: "700" },
  authCard: { marginTop: 22, padding: 16, backgroundColor: "#FFFDF9", borderRadius: 12, borderWidth: 1, borderColor: "#E5E7E2" },
  authHeader: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 12 },
  authTitle: { color: "#17324D", fontSize: 17, fontWeight: "700" },
  closeText: { color: "#D85F4A", fontSize: 11, fontWeight: "700" },
  searchCard: { marginTop: 28, padding: 16, backgroundColor: "#FFFDF9", borderRadius: 12, borderWidth: 1, borderColor: "#E5E7E2" },
  label: { color: "#17324D", fontSize: 10, fontWeight: "700", letterSpacing: 1.2, marginBottom: 9 },
  input: { height: 47, marginBottom: 9, paddingHorizontal: 13, borderWidth: 1, borderColor: "#DFE5E4", borderRadius: 7, color: "#17324D", fontSize: 14, backgroundColor: "#FFFFFF" },
  button: { height: 47, marginTop: 2, alignItems: "center", justifyContent: "center", borderRadius: 7, backgroundColor: "#102A43" },
  buttonDisabled: { opacity: 0.55 },
  pressed: { transform: [{ scale: 0.98 }], opacity: 0.9 },
  buttonText: { color: "#FFFFFF", fontSize: 13, fontWeight: "700" },
  switchText: { marginTop: 13, textAlign: "center", color: "#D85F4A", fontSize: 12, fontWeight: "700" },
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
