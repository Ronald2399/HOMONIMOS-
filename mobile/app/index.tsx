import { useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  Pressable,
  SafeAreaView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { API_URL, HomonimosApi, type Community, type Post, type User } from "../src/api";
import { persistApiSession, signOut } from "../src/auth";
import { loadSessionToken } from "../src/session";

const api = new HomonimosApi(API_URL);
type AuthMode = "login" | "register";
type Screen = "home" | "communities" | "community" | "profile";

function Brand() {
  return (
    <View style={styles.brandRow}>
      <View style={styles.brandMark}><View style={styles.brandDot} /><View style={styles.brandDotSecond} /></View>
      <Text style={styles.brand}>homônimos<Text style={styles.period}>.</Text></Text>
    </View>
  );
}

function BottomNav({ screen, onChange }: { screen: Screen; onChange: (screen: Screen) => void }) {
  return (
    <View style={styles.bottomNav}>
      {([ ["home", "Início"], ["communities", "Comunidades"], ["profile", "Perfil"] ] as const).map(([key, label]) => (
        <Pressable key={key} onPress={() => onChange(key)} style={({ pressed }) => [styles.navItem, screen === key && styles.navItemActive, pressed && styles.pressed]}>
          <Text style={[styles.navLabel, screen === key && styles.navLabelActive]}>{label}</Text>
        </Pressable>
      ))}
    </View>
  );
}

export default function HomeScreen() {
  const [screen, setScreen] = useState<Screen>("home");
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<User[]>([]);
  const [communities, setCommunities] = useState<Community[]>([]);
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(false);
  const [communityLoading, setCommunityLoading] = useState(false);
  const [restoringSession, setRestoringSession] = useState(true);
  const [message, setMessage] = useState("Descubra pessoas que compartilham o seu nome.");
  const [authMode, setAuthMode] = useState<AuthMode>("login");
  const [authOpen, setAuthOpen] = useState(false);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [city, setCity] = useState("");
  const [profession, setProfession] = useState("");
  const [selectedCommunity, setSelectedCommunity] = useState<Community | null>(null);
  const [posts, setPosts] = useState<Post[]>([]);
  const [postBody, setPostBody] = useState("");
  const [postLoading, setPostLoading] = useState(false);

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

  useEffect(() => {
    if (screen === "communities" && communities.length === 0) void loadCommunities();
  }, [screen]);

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

  async function loadCommunities() {
    setCommunityLoading(true);
    try {
      const response = await api.listCommunities();
      setCommunities(response.communities);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Não foi possível carregar as comunidades.");
    } finally {
      setCommunityLoading(false);
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
      setScreen("home");
      setMessage("Você saiu da sua conta neste aparelho.");
    } catch {
      setMessage("A sessão local foi encerrada.");
    } finally {
      setLoading(false);
    }
  }

  async function joinCommunity(community: Community) {
    if (!user) {
      setScreen("profile");
      setMessage("Entre ou crie uma conta para participar de comunidades.");
      return;
    }
    if (community.joined) return;
    setCommunityLoading(true);
    try {
      await api.joinCommunity(community.slug);
      setCommunities((current) => current.map((item) => item.id === community.id ? { ...item, joined: true, memberCount: item.memberCount + 1 } : item));
      setMessage(`Você entrou na comunidade ${community.name}.`);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Não foi possível entrar na comunidade.");
    } finally {
      setCommunityLoading(false);
    }
  }

  async function openCommunity(community: Community) {
    setSelectedCommunity(community);
    setPosts([]);
    setPostBody("");
    setScreen("community");
    setPostLoading(true);
    try {
      const response = await api.listPosts(community.slug);
      setPosts(response.posts);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Não foi possível carregar as publicações.");
    } finally {
      setPostLoading(false);
    }
  }

  async function createPost() {
    if (!selectedCommunity || !user || postBody.trim().length < 1 || postLoading) return;
    setPostLoading(true);
    try {
      await api.createPost(selectedCommunity.slug, postBody.trim());
      setPostBody("");
      const response = await api.listPosts(selectedCommunity.slug);
      setPosts(response.posts);
      setMessage("Publicação criada com sucesso.");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Não foi possível criar a publicação.");
    } finally {
      setPostLoading(false);
    }
  }

  function openAuth(mode: AuthMode) {
    setAuthMode(mode);
    setAuthOpen(true);
    setScreen("profile");
  }

  function renderHome() {
    return (
      <View>
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
            <Pressable onPress={() => openAuth("login")} style={({ pressed }) => [styles.primarySmall, pressed && styles.pressed]}><Text style={styles.primarySmallText}>Entrar</Text></Pressable>
            <Pressable onPress={() => openAuth("register")} style={({ pressed }) => [styles.secondarySmall, pressed && styles.pressed]}><Text style={styles.secondarySmallText}>Criar conta</Text></Pressable>
          </View>
        )}
        <View style={styles.searchCard}>
          <Text style={styles.label}>ENCONTRE SEUS HOMÔNIMOS</Text>
          <TextInput value={query} onChangeText={setQuery} placeholder="Digite um nome" placeholderTextColor="#8B999D" style={styles.input} returnKeyType="search" onSubmitEditing={search} />
          <Pressable disabled={!canSearch} onPress={search} style={({ pressed }) => [styles.button, !canSearch && styles.buttonDisabled, pressed && styles.pressed]}><Text style={styles.buttonText}>{restoringSession ? "Conectando…" : loading ? "Buscando…" : "Encontrar"}</Text></Pressable>
          <Text style={styles.helper}>A busca aceita nomes com ou sem acento. Seus dados são protegidos.</Text>
        </View>
        <Text style={styles.message}>{message}</Text>
        <FlatList data={results} scrollEnabled={false} keyExtractor={(item) => String(item.id)} contentContainerStyle={styles.listGap} renderItem={({ item }) => (
          <View style={styles.resultCard}><View style={styles.avatar}><Text style={styles.avatarText}>{item.name.slice(0, 2).toUpperCase()}</Text></View><View style={styles.resultCopy}><Text style={styles.resultName}>{item.name}</Text><Text style={styles.resultMeta}>{item.profession || "Membro da comunidade"}</Text><Text style={styles.resultCity}>{item.city || "Brasil"}</Text></View></View>
        )} />
        <Pressable onPress={() => setScreen("communities")} style={({ pressed }) => [styles.discoveryCard, pressed && styles.pressed]}><Text style={styles.discoveryTitle}>Conheça as comunidades</Text><Text style={styles.discoveryCopy}>Encontre pessoas com o mesmo nome por profissão, cidade e interesses.</Text><Text style={styles.discoveryLink}>Ver comunidades →</Text></Pressable>
        <View style={styles.safeCard}><Text style={styles.safeTitle}>Sua identidade no controle</Text><Text style={styles.safeCopy}>O Homônimos não mostra CPF, processos ou documentos de terceiros.</Text></View>
      </View>
    );
  }

  function renderCommunities() {
    return (
      <View>
        <Text style={styles.sectionTitle}>Comunidades</Text>
        <Text style={styles.sectionLead}>Espaços para conversar, trocar experiências e criar conexões reais.</Text>
        {communityLoading && communities.length === 0 ? <ActivityIndicator color="#102A43" style={styles.loader} /> : (
          <FlatList data={communities} scrollEnabled={false} keyExtractor={(item) => String(item.id)} contentContainerStyle={styles.listGap} renderItem={({ item }) => (
            <View style={styles.communityCard}><Pressable onPress={() => openCommunity(item)} style={({ pressed }) => [styles.communityInfoPressable, pressed && styles.pressed]}><View style={styles.communityIcon}><Text style={styles.communityIconText}>{item.name.slice(0, 1).toUpperCase()}</Text></View><View style={styles.communityCopy}><Text style={styles.communityName}>{item.name}</Text><Text style={styles.communityMembers}>{item.memberCount.toLocaleString("pt-BR")} membros</Text></View></Pressable><Pressable onPress={() => joinCommunity(item)} disabled={communityLoading || item.joined} style={({ pressed }) => [styles.joinButton, item.joined && styles.joinedButton, pressed && styles.pressed]}><Text style={[styles.joinText, item.joined && styles.joinedText]}>{item.joined ? "Participando" : "Entrar"}</Text></Pressable></View>
          )} ListEmptyComponent={<Text style={styles.emptyText}>Ainda não há comunidades disponíveis.</Text>} />
        )}
        <View style={styles.safeCard}><Text style={styles.safeTitle}>Convivência segura</Text><Text style={styles.safeCopy}>Respeite os outros membros. Denúncias e bloqueios fazem parte da proteção da comunidade.</Text></View>
      </View>
    );
  }

  function renderCommunityDetail() {
    if (!selectedCommunity) return null;
    return (
      <View>
        <Pressable onPress={() => setScreen("communities")} style={({ pressed }) => [styles.backButton, pressed && styles.pressed]}><Text style={styles.backText}>← Comunidades</Text></Pressable>
        <View style={styles.communityHero}><View style={styles.largeCommunityIcon}><Text style={styles.largeCommunityIconText}>{selectedCommunity.name.slice(0, 1).toUpperCase()}</Text></View><Text style={styles.sectionTitle}>{selectedCommunity.name}</Text><Text style={styles.sectionLead}>{selectedCommunity.memberCount.toLocaleString("pt-BR")} membros · um espaço para conexões reais.</Text></View>
        {message && <Text style={styles.message}>{message}</Text>}
        {user && selectedCommunity.joined ? <View style={styles.postComposer}><Text style={styles.label}>NOVA PUBLICAÇÃO</Text><TextInput value={postBody} onChangeText={setPostBody} placeholder="Compartilhe algo com a comunidade" placeholderTextColor="#8B999D" style={[styles.input, styles.postInput]} multiline maxLength={1000} /><Pressable disabled={postBody.trim().length < 1 || postLoading} onPress={createPost} style={({ pressed }) => [styles.button, (postBody.trim().length < 1 || postLoading) && styles.buttonDisabled, pressed && styles.pressed]}><Text style={styles.buttonText}>{postLoading ? "Publicando…" : "Publicar"}</Text></Pressable></View> : <View style={styles.joinPrompt}><Text style={styles.joinPromptTitle}>Participe da comunidade</Text><Text style={styles.joinPromptCopy}>Entre para publicar e conversar com outros membros.</Text><Pressable onPress={() => joinCommunity(selectedCommunity)} disabled={communityLoading || selectedCommunity.joined} style={({ pressed }) => [styles.button, pressed && styles.pressed]}><Text style={styles.buttonText}>{selectedCommunity.joined ? "Participando" : "Entrar na comunidade"}</Text></Pressable></View>}
        <Text style={styles.postsTitle}>Publicações recentes</Text>
        {postLoading && posts.length === 0 ? <ActivityIndicator color="#102A43" style={styles.loader} /> : <FlatList data={posts} scrollEnabled={false} keyExtractor={(item) => String(item.id)} contentContainerStyle={styles.listGap} renderItem={({ item }) => <View style={styles.postCard}><View style={styles.postHeader}><View style={styles.avatar}><Text style={styles.avatarText}>{item.author.name.slice(0, 2).toUpperCase()}</Text></View><View><Text style={styles.postAuthor}>{item.author.name}</Text><Text style={styles.postMeta}>{item.author.profession || "Membro"}</Text></View></View><Text style={styles.postBody}>{item.body}</Text><Text style={styles.postDate}>{new Date(item.createdAt).toLocaleDateString("pt-BR")}</Text></View>} ListEmptyComponent={<Text style={styles.emptyText}>Ainda não há publicações. Seja o primeiro a compartilhar algo.</Text>} />}
      </View>
    );
  }

  function renderProfile() {
    return (
      <View>
        <Text style={styles.sectionTitle}>Seu perfil</Text>
        {user ? (
          <View style={styles.profilePanel}><View style={styles.largeAvatar}><Text style={styles.largeAvatarText}>{user.name.slice(0, 2).toUpperCase()}</Text></View><Text style={styles.panelName}>{user.name}</Text><Text style={styles.panelMeta}>{user.profession || "Membro da comunidade"}{user.city ? ` · ${user.city}` : ""}</Text><Text style={styles.panelBio}>{user.bio || "Seu perfil está protegido. Compartilhe apenas o que fizer sentido para você."}</Text><Pressable onPress={handleLogout} disabled={loading} style={({ pressed }) => [styles.button, pressed && styles.pressed]}><Text style={styles.buttonText}>{loading ? "Saindo…" : "Sair da conta"}</Text></Pressable></View>
        ) : (
          <View style={styles.profilePanel}><View style={styles.largeAvatar}><Text style={styles.largeAvatarText}>HM</Text></View><Text style={styles.panelName}>Entre para participar</Text><Text style={styles.panelMeta}>Crie seu perfil e faça parte da rede.</Text><Text style={styles.panelBio}>{message}</Text><Pressable onPress={() => openAuth("login")} style={({ pressed }) => [styles.button, pressed && styles.pressed]}><Text style={styles.buttonText}>Entrar</Text></Pressable><Pressable onPress={() => openAuth("register")} style={({ pressed }) => [styles.secondaryAction, pressed && styles.pressed]}><Text style={styles.secondaryActionText}>Criar uma conta</Text></Pressable></View>
        )}
        {authOpen && <View style={styles.authCard}><View style={styles.authHeader}><Text style={styles.authTitle}>{authMode === "login" ? "Entrar no Homônimos" : "Criar sua conta"}</Text><Pressable onPress={() => setAuthOpen(false)}><Text style={styles.closeText}>Fechar</Text></Pressable></View>{authMode === "register" && <TextInput value={name} onChangeText={setName} placeholder="Nome completo" placeholderTextColor="#8B999D" style={styles.input} autoCapitalize="words" />}<TextInput value={email} onChangeText={setEmail} placeholder="E-mail" placeholderTextColor="#8B999D" style={styles.input} keyboardType="email-address" autoCapitalize="none" /><TextInput value={password} onChangeText={setPassword} placeholder="Senha (mínimo de 8 caracteres)" placeholderTextColor="#8B999D" style={styles.input} secureTextEntry returnKeyType="done" />{authMode === "register" && <><TextInput value={city} onChangeText={setCity} placeholder="Cidade (opcional)" placeholderTextColor="#8B999D" style={styles.input} /><TextInput value={profession} onChangeText={setProfession} placeholder="Profissão (opcional)" placeholderTextColor="#8B999D" style={styles.input} /></>}<Pressable disabled={!canSubmitAuth} onPress={submitAuth} style={({ pressed }) => [styles.button, !canSubmitAuth && styles.buttonDisabled, pressed && styles.pressed]}><Text style={styles.buttonText}>{loading ? "Aguarde…" : authMode === "login" ? "Entrar" : "Criar conta"}</Text></Pressable><Pressable onPress={() => setAuthMode(authMode === "login" ? "register" : "login")}><Text style={styles.switchText}>{authMode === "login" ? "Ainda não tenho conta" : "Já tenho uma conta"}</Text></Pressable></View>}
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.container}><FlatList data={[screen]} keyExtractor={(item) => item} renderItem={() => <View style={styles.content}><Brand />{screen === "home" ? renderHome() : screen === "communities" ? renderCommunities() : screen === "community" ? renderCommunityDetail() : renderProfile()}</View>} showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent} keyboardShouldPersistTaps="handled" />
        {screen !== "community" && <BottomNav screen={screen} onChange={setScreen} />}
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: "#F7F5EF" },
  container: { flex: 1 },
  scrollContent: { paddingBottom: 90 },
  content: { padding: 24 },
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
  listGap: { gap: 10, marginTop: 12 },
  resultCard: { flexDirection: "row", alignItems: "center", padding: 14, backgroundColor: "#FFFDF9", borderRadius: 10, borderWidth: 1, borderColor: "#E7E9E5" },
  avatar: { width: 43, height: 43, alignItems: "center", justifyContent: "center", borderRadius: 22, backgroundColor: "#D7E8F4" },
  avatarText: { color: "#17324D", fontSize: 12, fontWeight: "700" },
  resultCopy: { marginLeft: 11 },
  resultName: { color: "#102A43", fontSize: 14, fontWeight: "700" },
  resultMeta: { marginTop: 3, color: "#53687A", fontSize: 11 },
  resultCity: { marginTop: 2, color: "#89979A", fontSize: 10 },
  discoveryCard: { marginTop: 26, padding: 16, backgroundColor: "#E8F3F1", borderRadius: 10 },
  discoveryTitle: { color: "#2C695D", fontSize: 13, fontWeight: "700" },
  discoveryCopy: { marginTop: 5, color: "#5E8682", fontSize: 11, lineHeight: 17 },
  discoveryLink: { marginTop: 10, color: "#D85F4A", fontSize: 11, fontWeight: "700" },
  safeCard: { marginTop: 28, padding: 16, backgroundColor: "#E5F0ED", borderRadius: 10 },
  safeTitle: { color: "#2C695D", fontSize: 12, fontWeight: "700" },
  safeCopy: { marginTop: 5, color: "#5E8682", fontSize: 11, lineHeight: 16 },
  sectionTitle: { color: "#102A43", fontSize: 30, fontWeight: "700", letterSpacing: -1 },
  sectionLead: { marginTop: 10, color: "#53687A", fontSize: 14, lineHeight: 21 },
  loader: { marginTop: 32 },
  communityCard: { flexDirection: "row", alignItems: "center", padding: 14, backgroundColor: "#FFFDF9", borderRadius: 10, borderWidth: 1, borderColor: "#E7E9E5" },
  communityInfoPressable: { flex: 1, flexDirection: "row", alignItems: "center" },
  communityIcon: { width: 42, height: 42, borderRadius: 21, alignItems: "center", justifyContent: "center", backgroundColor: "#D7E8F4" },
  communityIconText: { color: "#17324D", fontSize: 15, fontWeight: "700" },
  communityCopy: { flex: 1, marginLeft: 11 },
  communityName: { color: "#102A43", fontSize: 15, fontWeight: "700" },
  communityMembers: { marginTop: 4, color: "#89979A", fontSize: 11 },
  joinButton: { paddingVertical: 9, paddingHorizontal: 11, borderRadius: 7, backgroundColor: "#102A43" },
  joinText: { color: "#FFFFFF", fontSize: 10, fontWeight: "700" },
  joinedButton: { backgroundColor: "#E5F0ED" },
  joinedText: { color: "#2C695D" },
  emptyText: { marginTop: 24, color: "#53687A", fontSize: 13 },
  backButton: { alignSelf: "flex-start", paddingVertical: 5, paddingHorizontal: 2, marginBottom: 16 },
  backText: { color: "#D85F4A", fontSize: 12, fontWeight: "700" },
  communityHero: { alignItems: "center", paddingVertical: 4 },
  largeCommunityIcon: { width: 64, height: 64, borderRadius: 32, alignItems: "center", justifyContent: "center", backgroundColor: "#D7E8F4", marginBottom: 13 },
  largeCommunityIconText: { color: "#17324D", fontSize: 22, fontWeight: "700" },
  postComposer: { marginTop: 22, padding: 16, backgroundColor: "#FFFDF9", borderRadius: 12, borderWidth: 1, borderColor: "#E5E7E2" },
  postInput: { height: 90, paddingTop: 13, textAlignVertical: "top" },
  joinPrompt: { marginTop: 22, padding: 16, backgroundColor: "#E5F0ED", borderRadius: 10 },
  joinPromptTitle: { color: "#2C695D", fontSize: 13, fontWeight: "700" },
  joinPromptCopy: { marginTop: 5, marginBottom: 13, color: "#5E8682", fontSize: 11, lineHeight: 17 },
  postsTitle: { marginTop: 28, color: "#102A43", fontSize: 16, fontWeight: "700" },
  postCard: { padding: 15, backgroundColor: "#FFFDF9", borderRadius: 10, borderWidth: 1, borderColor: "#E7E9E5" },
  postHeader: { flexDirection: "row", alignItems: "center" },
  postAuthor: { color: "#102A43", fontSize: 13, fontWeight: "700" },
  postMeta: { marginTop: 3, color: "#89979A", fontSize: 10 },
  postBody: { marginTop: 13, color: "#53687A", fontSize: 13, lineHeight: 20 },
  postDate: { marginTop: 11, color: "#A0AAAC", fontSize: 10 },
  profilePanel: { marginTop: 22, padding: 20, alignItems: "center", backgroundColor: "#FFFDF9", borderRadius: 12, borderWidth: 1, borderColor: "#E5E7E2" },
  largeAvatar: { width: 76, height: 76, borderRadius: 38, alignItems: "center", justifyContent: "center", backgroundColor: "#D7E8F4" },
  largeAvatarText: { color: "#17324D", fontSize: 20, fontWeight: "700" },
  panelName: { marginTop: 14, color: "#102A43", fontSize: 19, fontWeight: "700", textAlign: "center" },
  panelMeta: { marginTop: 5, color: "#53687A", fontSize: 12, textAlign: "center" },
  panelBio: { marginTop: 16, marginBottom: 18, color: "#89979A", fontSize: 12, lineHeight: 18, textAlign: "center" },
  secondaryAction: { marginTop: 14, paddingVertical: 12 },
  secondaryActionText: { color: "#D85F4A", fontSize: 12, fontWeight: "700" },
  bottomNav: { position: "absolute", bottom: 0, left: 0, right: 0, flexDirection: "row", justifyContent: "space-around", paddingTop: 10, paddingBottom: 12, backgroundColor: "#FFFDF9", borderTopWidth: 1, borderTopColor: "#E5E7E2" },
  navItem: { minWidth: 92, alignItems: "center", paddingVertical: 7, borderRadius: 8 },
  navItemActive: { backgroundColor: "#E5F0ED" },
  navLabel: { color: "#89979A", fontSize: 10, fontWeight: "600" },
  navLabelActive: { color: "#2C695D", fontWeight: "700" },
});
