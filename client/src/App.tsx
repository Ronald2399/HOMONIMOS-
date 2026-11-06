import { useMemo, useState, type ElementType, type FormEvent, type ReactNode } from "react";
import { AnimatePresence, motion } from "framer-motion";
import {
  ArrowRight,
  BadgeCheck,
  Bell,
  BookOpen,
  BriefcaseBusiness,
  ChevronRight,
  CircleHelp,
  ClipboardCheck,
  Compass,
  Heart,
  Home as HomeIcon,
  LockKeyhole,
  MapPin,
  MessageCircle,
  MoreHorizontal,
  Search,
  Send,
  ShieldCheck,
  Sparkles,
  UserRound,
  UsersRound,
  X,
} from "lucide-react";

type View = "inicio" | "busca" | "comunidade" | "protege" | "perfil";
type NoticeTone = "success" | "info";

type Notice = {
  message: string;
  tone: NoticeTone;
};

type Profile = {
  name: string;
  city: string;
  role: string;
  initials: string;
  color: string;
  verified?: boolean;
};

type Guide = {
  id: number;
  title: string;
  description: string;
  icon: ElementType;
  accent: string;
  steps: string[];
};

const profiles: Profile[] = [
  { name: "Ronaldo Almeida", city: "Campinas, SP", role: "Professor de história", initials: "RA", color: "#d7e8f4", verified: true },
  { name: "Ronaldo Santos", city: "Recife, PE", role: "Fotógrafo", initials: "RS", color: "#f5dfc4" },
  { name: "Ronaldo Oliveira", city: "Belo Horizonte, MG", role: "Médico", initials: "RO", color: "#dce9d7", verified: true },
  { name: "Ronaldo Costa", city: "Curitiba, PR", role: "Caminhoneiro", initials: "RC", color: "#e6dafa" },
];

const guides: Guide[] = [
  {
    id: 1,
    title: "Fui cobrado por uma dívida que não é minha",
    description: "Como agir diante de uma cobrança atribuída a um homônimo.",
    icon: ClipboardCheck,
    accent: "blue",
    steps: ["Não pague. Peça a cobrança por escrito.", "Junte RG, CPF e comprovante de endereço.", "Abra reclamação no SAC e no Procon com protocolo.", "Peça a certidão negativa no Serasa.", "Se continuar, procure a Defensoria Pública."],
  },
  {
    id: 2,
    title: "Apareceu um processo no meu nome",
    description: "Veja como diferenciar seus dados e pedir a correção.",
    icon: ShieldCheck,
    accent: "mint",
    steps: ["Não ignore. Consulte o processo pelo seu CPF.", "Compare data de nascimento, filiação e endereço.", "Junte certidão de nascimento e RG.", "Peça correção por homonímia ao juízo.", "Guarde o protocolo e busque orientação."],
  },
  {
    id: 3,
    title: "Meu nome está sujo por causa de homônimo",
    description: "Um passo a passo para contestar uma dívida que você não reconhece.",
    icon: LockKeyhole,
    accent: "yellow",
    steps: ["Salve um print da dívida não reconhecida.", "Abra contestação no Serasa ou SPC.", "Anexe documentos que comprovem sua identidade.", "Acompanhe a resposta em até 5 dias úteis.", "Se não resolver, use o consumidor.gov.br."],
  },
  {
    id: 4,
    title: "Fui barrado em concurso ou emprego",
    description: "Como pedir reavaliação quando o antecedente é de outra pessoa.",
    icon: BriefcaseBusiness,
    accent: "purple",
    steps: ["Peça o motivo da reprovação por escrito.", "Emita certidões estadual e federal.", "Apresente documentos de filiação e CPF.", "Peça reavaliação formal.", "Guarde todos os protocolos."],
  },
  {
    id: 5,
    title: "Minha conta foi bloqueada por confusão de nome",
    description: "Organize os documentos e peça uma resposta formal ao banco.",
    icon: CircleHelp,
    accent: "orange",
    steps: ["Vá à agência com RG, CPF e comprovante.", "Peça o motivo do bloqueio por escrito.", "Solicite a comparação de CPF e filiação.", "Peça desbloqueio com prazo definido.", "Se necessário, reclame no Banco Central."],
  },
  {
    id: 6,
    title: "Recebi uma intimação de outra pessoa",
    description: "Cuidados imediatos ao receber uma comunicação judicial ou policial.",
    icon: BookOpen,
    accent: "rose",
    steps: ["Não assine nada sem ler.", "Leve RG e CPF e explique a homonímia.", "Peça que seus dados constem em ata.", "Guarde cópia da intimação.", "Procure a Defensoria Pública."],
  },
];

const posts = [
  { id: 1, profile: profiles[0], time: "há 12 min", text: "Descobri que temos quatro Ronaldos na mesma rua. O mais curioso é que todos gostam de contar histórias — cada um de um jeito.", likes: 18, comments: 4, tag: "#vidadehomônimo" },
  { id: 2, profile: profiles[1], time: "há 38 min", text: "Alguém aqui também já recebeu uma entrega que era de outro Ronaldo? Resolvi com calma e agora virou uma história engraçada.", likes: 11, comments: 7, tag: "#comunidadeRonaldo" },
];

const navItems: { id: View; label: string; icon: ElementType }[] = [
  { id: "inicio", label: "Início", icon: HomeIcon },
  { id: "busca", label: "Encontrar", icon: Search },
  { id: "comunidade", label: "Comunidade", icon: UsersRound },
  { id: "protege", label: "Protege", icon: ShieldCheck },
];

function App() {
  const [view, setView] = useState<View>("inicio");
  const [searchTerm, setSearchTerm] = useState("");
  const [submittedSearch, setSubmittedSearch] = useState("Ronaldo");
  const [selectedGuide, setSelectedGuide] = useState<Guide | null>(null);
  const [notice, setNotice] = useState<Notice | null>(null);
  const [showLogin, setShowLogin] = useState(false);
  const [likedPosts, setLikedPosts] = useState<number[]>([]);
  const [menuOpen, setMenuOpen] = useState(false);

  const filteredProfiles = useMemo(() => {
    const term = submittedSearch.trim().toLowerCase();
    if (!term) return profiles;
    return profiles.filter((profile) => `${profile.name} ${profile.city} ${profile.role}`.toLowerCase().includes(term));
  }, [submittedSearch]);

  const showNotice = (message: string, tone: NoticeTone = "success") => {
    setNotice({ message, tone });
    window.setTimeout(() => setNotice(null), 3600);
  };

  const handleSearch = (event?: FormEvent) => {
    event?.preventDefault();
    const clean = searchTerm.trim() || "Ronaldo";
    setSubmittedSearch(clean);
    setView("busca");
  };

  const goTo = (nextView: View) => {
    setView(nextView);
    setMenuOpen(false);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  return (
    <div className="app-shell">
      <div className="top-strip"><span>Comunidade com respeito, identidade com segurança.</span><span className="top-strip-link"><LockKeyhole size={13} /> Privacidade em primeiro lugar</span></div>
      <header className="site-header">
        <div className="container header-inner">
          <button className="brand" onClick={() => goTo("inicio")} aria-label="Ir para o início">
            <span className="brand-mark"><span className="brand-dot" /><span className="brand-dot brand-dot-second" /></span>
            <span className="brand-word">homônimos<span className="brand-period">.</span></span>
          </button>
          <nav className="desktop-nav" aria-label="Navegação principal">
            {navItems.map((item) => <button key={item.id} className={`nav-link ${view === item.id ? "active" : ""}`} onClick={() => goTo(item.id)}>{item.label}</button>)}
          </nav>
          <div className="header-actions">
            <button className="icon-button notification-button" aria-label="Notificações" onClick={() => showNotice("Você não tem novas notificações.", "info")}><Bell size={19} /><span className="notification-dot" /></button>
            <button className="login-button" onClick={() => setShowLogin(true)}>Entrar</button>
            <button className="join-button" onClick={() => setShowLogin(true)}>Criar conta <ArrowRight size={16} /></button>
            <button className="mobile-menu-button" aria-label="Abrir menu" onClick={() => setMenuOpen((open) => !open)}>{menuOpen ? <X size={21} /> : <MoreHorizontal size={21} />}</button>
          </div>
        </div>
        <AnimatePresence>{menuOpen && <motion.div className="mobile-nav" initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} exit={{ opacity: 0, height: 0 }}>{navItems.map((item) => <button key={item.id} onClick={() => goTo(item.id)}><item.icon size={17} /> {item.label}</button>)}<button onClick={() => setShowLogin(true)}><UserRound size={17} /> Criar minha conta</button></motion.div>}</AnimatePresence>
      </header>

      <main>
        <AnimatePresence mode="wait">
          {view === "inicio" && <Home onSearch={handleSearch} searchTerm={searchTerm} setSearchTerm={setSearchTerm} goTo={goTo} showNotice={showNotice} />}
          {view === "busca" && <SearchView searchTerm={searchTerm} setSearchTerm={setSearchTerm} submittedSearch={submittedSearch} filteredProfiles={filteredProfiles} onSearch={handleSearch} goTo={goTo} showNotice={showNotice} />}
          {view === "comunidade" && <CommunityView likedPosts={likedPosts} setLikedPosts={setLikedPosts} showNotice={showNotice} goTo={goTo} />}
          {view === "protege" && <ProtectView guides={guides} onSelectGuide={setSelectedGuide} />}
          {view === "perfil" && <ProfileView goTo={goTo} showNotice={showNotice} />}
        </AnimatePresence>
      </main>

      <footer className="site-footer">
        <div className="container footer-grid">
          <div><button className="brand footer-brand" onClick={() => goTo("inicio")}><span className="brand-mark"><span className="brand-dot" /><span className="brand-dot brand-dot-second" /></span><span className="brand-word">homônimos<span className="brand-period">.</span></span></button><p className="footer-copy">O mesmo nome. Mil histórias.<br />Uma comunidade para chamar de sua.</p></div>
          <div><p className="footer-heading">Explorar</p><button onClick={() => goTo("busca")}>Encontrar homônimos</button><button onClick={() => goTo("comunidade")}>Comunidade do nome</button><button onClick={() => goTo("protege")}>Homônimos Protege</button></div>
          <div><p className="footer-heading">Segurança</p><button onClick={() => showNotice("A Central de Segurança estará disponível no próximo módulo.", "info")}>Central de segurança</button><button onClick={() => showNotice("A política de privacidade está sendo preparada.", "info")}>Privacidade e LGPD</button><button onClick={() => showNotice("Canal de contato em breve.", "info")}>Fale com a gente</button></div>
          <div className="footer-safe"><ShieldCheck size={18} /><div><strong>Você no controle</strong><p>Nunca exibimos CPF, processos ou documentos de terceiros.</p></div></div>
        </div>
        <div className="container footer-bottom"><span>© 2026 Homônimos. Protótipo navegável.</span><span>Feito para conexões reais, com cuidado.</span></div>
      </footer>

      <AnimatePresence>{notice && <motion.div className={`toast ${notice.tone}`} initial={{ opacity: 0, y: 18, scale: .98 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, y: 18, scale: .98 }}><span className="toast-icon">{notice.tone === "success" ? <BadgeCheck size={17} /> : <CircleHelp size={17} />}</span>{notice.message}</motion.div>}</AnimatePresence>
      <AnimatePresence>{selectedGuide && <GuideModal guide={selectedGuide} onClose={() => setSelectedGuide(null)} onAction={() => { setSelectedGuide(null); showNotice("Guia salvo na sua lista para ler depois."); }} />}</AnimatePresence>
      <AnimatePresence>{showLogin && <LoginModal onClose={() => setShowLogin(false)} onSuccess={() => { setShowLogin(false); goTo("perfil"); showNotice("Conta criada e sessão iniciada com segurança."); }} />}</AnimatePresence>
    </div>
  );
}

function Home({ onSearch, searchTerm, setSearchTerm, goTo, showNotice }: { onSearch: (event?: FormEvent) => void; searchTerm: string; setSearchTerm: (value: string) => void; goTo: (view: View) => void; showNotice: (message: string, tone?: NoticeTone) => void }) {
  return <motion.div key="home" className="page" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }}>
    <section className="hero container">
      <div className="hero-copy">
        <div className="eyebrow"><Sparkles size={15} /> uma rede feita para histórias reais</div>
        <h1>Você já imaginou<br />quantas pessoas têm<br /><em>o seu nome?</em></h1>
        <p className="hero-lead">No Homônimos, seu nome não é só um cadastro. É o começo de uma conexão. Encontre pessoas que compartilham o seu nome, entre para sua comunidade e descubra histórias de todo o Brasil.</p>
        <form className="search-card" onSubmit={onSearch}>
          <div className="search-card-label"><Search size={17} /><span>Encontre seus homônimos</span></div>
          <div className="search-row"><input aria-label="Digite seu nome" value={searchTerm} onChange={(event) => setSearchTerm(event.target.value)} placeholder="Digite seu nome completo ou primeiro nome" /><button type="submit">Encontrar <ArrowRight size={17} /></button></div>
          <div className="search-helper"><LockKeyhole size={13} /> Sua busca é segura. Não exibimos documentos ou dados sensíveis.</div>
        </form>
        <div className="hero-proof"><div className="avatar-stack"><span style={{ background: "#e4c8b7" }}>RA</span><span style={{ background: "#c9dce5" }}>MS</span><span style={{ background: "#ddc9e8" }}>JC</span><span style={{ background: "#dce5bd" }}>+</span></div><span>Mais de <strong>12 mil pessoas</strong> já fazem parte.</span></div>
      </div>
      <div className="hero-visual">
        <div className="hero-orbit orbit-one" /><div className="hero-orbit orbit-two" />
        <div className="hero-card hero-card-main"><div className="card-kicker"><span className="pulse-dot" /> comunidade ativa</div><div className="hero-card-title">Ronaldo</div><div className="hero-card-subtitle">4.284 pessoas encontradas</div><div className="mini-members"><span style={{ background: "#efd1bf" }}>RA</span><span style={{ background: "#cadce7" }}>RS</span><span style={{ background: "#d9e5c2" }}>RO</span><span style={{ background: "#ddcef0" }}>+4k</span></div><div className="hero-card-bottom"><span>Conecte-se por um nome</span><ArrowRight size={16} /></div></div>
        <div className="floating-note floating-note-top"><Heart size={17} fill="currentColor" /><span><strong>Um nome,</strong><br />muitas histórias.</span></div>
        <div className="floating-note floating-note-bottom"><MapPin size={16} /><span>Em todo o<br /><strong>Brasil</strong></span></div>
        <div className="hero-sun" />
      </div>
    </section>

    <section className="how-section"><div className="container"><div className="section-intro"><div><p className="section-label">como funciona</p><h2>Seu nome abre<br />uma nova história.</h2></div><p>Uma forma simples e segura de descobrir conexões que começam pelo nome, mas vão muito além dele.</p></div><div className="step-grid"><Step number="01" icon={Search} title="Digite seu nome" text="Descubra quantas pessoas compartilham o mesmo nome que você." /><Step number="02" icon={UsersRound} title="Entre na comunidade" text="Converse, compartilhe fotos e faça amizades com quem entende seu nome." /><Step number="03" icon={Compass} title="Descubra histórias" text="Conheça um Ronaldo caminhoneiro, médico, professor. Vidas diferentes, um mesmo nome." /></div></div></section>

    <section className="protect-teaser container"><div className="protect-content"><div className="protect-icon"><ShieldCheck size={24} /></div><p className="section-label">homônimos protege</p><h2>Seu nome não deve<br />te colocar em risco.</h2><p>Já foi confundido com outra pessoa por causa do nome? Reunimos orientações simples para ajudar você a agir com segurança — sem expor seus documentos.</p><button className="text-button" onClick={() => goTo("protege")}>Conhecer o Homônimos Protege <ArrowRight size={17} /></button></div><div className="protect-stats"><div className="stat-line"><strong>10</strong><span>guias práticos<br />sem juridiquês</span></div><div className="stat-line"><strong>100%</strong><span>foco em<br />privacidade</span></div><div className="protect-stamp"><LockKeyhole size={18} /><span>Dados sensíveis<br /><strong>nunca aparecem</strong></span></div></div></section>

    <section className="community-preview"><div className="container community-preview-inner"><div><p className="section-label">uma comunidade para cada nome</p><h2>O mesmo nome.<br /><em>Mil histórias.</em></h2><p>Compartilhe suas experiências, encontre afinidades e perceba como um nome pode carregar mundos completamente diferentes.</p><button className="dark-button" onClick={() => goTo("comunidade")}>Explorar comunidades <ArrowRight size={17} /></button></div><div className="quote-wall"><div className="quote-card quote-a"><span>“</span><p>O nome me trouxe até aqui. As pessoas me fizeram ficar.</p><small>— Mariana, comunidade Silva</small></div><div className="quote-card quote-b"><span>“</span><p>Nunca imaginei encontrar tantos caminhos diferentes para um mesmo nome.</p><small>— João, comunidade João</small></div><div className="quote-orb">✦</div></div></div></section>

    <section className="final-cta container"><div><p className="section-label">pronto para começar?</p><h2>Seu nome já tem<br /><em>uma comunidade.</em></h2></div><div><p>Faça parte de um espaço seguro para conexões reais, histórias inesperadas e encontros que começam com uma palavra.</p><button className="primary-button" onClick={() => goTo("busca")}>Encontrar meus homônimos <ArrowRight size={17} /></button><button className="subtle-button" onClick={() => showNotice("O cadastro será liberado na próxima etapa do MVP.", "info")}>Quero criar minha conta</button></div></section>
  </motion.div>;
}

function Step({ number, icon: Icon, title, text }: { number: string; icon: ElementType; title: string; text: string }) {
  return <div className="step-card"><div className="step-top"><span>{number}</span><Icon size={19} /></div><h3>{title}</h3><p>{text}</p></div>;
}

function SearchView({ searchTerm, setSearchTerm, submittedSearch, filteredProfiles, onSearch, goTo, showNotice }: { searchTerm: string; setSearchTerm: (value: string) => void; submittedSearch: string; filteredProfiles: Profile[]; onSearch: (event?: FormEvent) => void; goTo: (view: View) => void; showNotice: (message: string, tone?: NoticeTone) => void }) {
  return <motion.div key="search" className="page app-page container" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }}><div className="page-heading"><p className="section-label">descoberta</p><h1>Encontre quem<br /><em>compartilha seu nome.</em></h1><p>Uma prévia das pessoas que fazem parte dessa história. No produto completo, você poderá ajustar cidade, interesses e privacidade.</p></div><form className="wide-search" onSubmit={onSearch}><Search size={18} /><input value={searchTerm} onChange={(event) => setSearchTerm(event.target.value)} placeholder="Digite um nome" /><button type="submit">Buscar <ArrowRight size={16} /></button></form><div className="result-heading"><div><span className="result-count">4.284 resultados</span><h2>Pessoas chamadas <em>{submittedSearch}</em></h2></div><button className="filter-button" onClick={() => showNotice("Filtros avançados estarão disponíveis após o cadastro.", "info")}>Filtrar <ChevronRight size={16} /></button></div><div className="profile-grid">{filteredProfiles.length ? filteredProfiles.map((profile) => <ProfileCard key={profile.name} profile={profile} onConnect={() => showNotice(`Convite enviado para ${profile.name.split(" ")[0]}.`)} />) : <div className="empty-state"><Search size={25} /><h3>Nenhum resultado nesta prévia</h3><p>Experimente buscar por Ronaldo, Santos ou Oliveira.</p><button className="text-button" onClick={() => { setSearchTerm("Ronaldo"); onSearch(); }}>Ver exemplo Ronaldo <ArrowRight size={16} /></button></div>}</div><div className="safe-banner"><ShieldCheck size={20} /><div><strong>Busca pensada para proteger você</strong><p>Mostramos apenas informações públicas escolhidas pela própria pessoa. CPF, processos e documentos nunca aparecem.</p></div><button onClick={() => goTo("protege")}>Saiba mais <ArrowRight size={15} /></button></div></motion.div>;
}

function ProfileCard({ profile, onConnect }: { profile: Profile; onConnect: () => void }) {
  return <article className="profile-card"><div className="profile-card-top"><div className="profile-avatar" style={{ background: profile.color }}>{profile.initials}</div><button className="more-button" aria-label="Mais opções"><MoreHorizontal size={18} /></button></div><div className="profile-name-row"><h3>{profile.name}</h3>{profile.verified && <BadgeCheck size={17} className="verified-icon" />}</div><p className="profile-role">{profile.role}</p><p className="profile-location"><MapPin size={14} /> {profile.city}</p><div className="profile-card-footer"><span className="safe-tag"><LockKeyhole size={12} /> perfil seguro</span><button className="outline-button" onClick={onConnect}>Conhecer <ArrowRight size={14} /></button></div></article>;
}

function CommunityView({ likedPosts, setLikedPosts, showNotice, goTo }: { likedPosts: number[]; setLikedPosts: (ids: number[]) => void; showNotice: (message: string, tone?: NoticeTone) => void; goTo: (view: View) => void }) {
  return <motion.div key="community" className="page app-page container" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }}><div className="community-header"><div><p className="section-label">comunidade do nome</p><h1>Ronaldo <span className="community-count">4.284 membros</span></h1><p>Um espaço para compartilhar histórias, trocar experiências e celebrar tudo o que cabe em um mesmo nome.</p></div><button className="primary-button" onClick={() => showNotice("A criação de posts será liberada após o cadastro.", "info")}><MessageCircle size={17} /> Criar publicação</button></div><div className="community-layout"><div className="feed-column">{posts.map((post) => <article className="post-card" key={post.id}><div className="post-header"><div className="post-user"><div className="small-avatar" style={{ background: post.profile.color }}>{post.profile.initials}</div><div><strong>{post.profile.name}</strong><span>{post.time} · na comunidade Ronaldo</span></div></div><button className="more-button" aria-label="Mais opções"><MoreHorizontal size={18} /></button></div><p className="post-text">{post.text}</p><span className="post-tag">{post.tag}</span><div className="post-actions"><button className={likedPosts.includes(post.id) ? "liked" : ""} onClick={() => { setLikedPosts(likedPosts.includes(post.id) ? likedPosts.filter((id) => id !== post.id) : [...likedPosts, post.id]); }}><Heart size={17} fill={likedPosts.includes(post.id) ? "currentColor" : "none"} /> {post.likes + (likedPosts.includes(post.id) ? 1 : 0)}</button><button onClick={() => showNotice("Comentários estarão disponíveis na próxima versão.", "info")}><MessageCircle size={17} /> {post.comments}</button><button onClick={() => showNotice("Link copiado para compartilhar.")}><Send size={16} /> Compartilhar</button></div></article>)}</div><aside className="community-sidebar"><div className="side-card"><p className="side-label">sobre a comunidade</p><p>Uma comunidade para pessoas chamadas Ronaldo compartilharem histórias, curiosidades e encontros.</p><div className="side-stat"><UsersRound size={17} /><strong>4.284</strong><span>membros</span></div><button className="side-link" onClick={() => showNotice("A lista de membros será liberada na próxima etapa.", "info")}>Ver membros <ArrowRight size={15} /></button></div><div className="side-card side-protect"><ShieldCheck size={19} /><div><strong>Espaço protegido</strong><p>Denuncie ou bloqueie qualquer conteúdo que desrespeite você.</p></div></div><button className="create-community-link" onClick={() => goTo("busca")}><Search size={16} /> Encontrar outro nome</button></aside></div></motion.div>;
}

function ProtectView({ guides, onSelectGuide }: { guides: Guide[]; onSelectGuide: (guide: Guide) => void }) {
  return <motion.div key="protect" className="page app-page container" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }}><div className="protect-header"><div className="protect-header-icon"><ShieldCheck size={29} /></div><p className="section-label">homônimos protege</p><h1>Quando o nome<br /><em>vira uma confusão.</em></h1><p>Orientações práticas para ajudar você a resolver confusões de identidade com calma, informação e segurança. Sem juridiquês. Sem exposição.</p></div><div className="legal-alert"><LockKeyhole size={18} /><div><strong>Um lembrete importante</strong><p>Nunca compartilhe CPF, documentos ou processos de terceiros. Este conteúdo é informativo e não substitui orientação jurídica.</p></div></div><div className="guide-list-heading"><h2>Escolha uma situação</h2><span>{guides.length} de 10 guias disponíveis nesta prévia</span></div><div className="guide-grid">{guides.map((guide) => <button key={guide.id} className={`guide-card ${guide.accent}`} onClick={() => onSelectGuide(guide)}><div className="guide-number">0{guide.id}</div><div className="guide-icon"><guide.icon size={20} /></div><h3>{guide.title}</h3><p>{guide.description}</p><span className="guide-link">Ver passo a passo <ArrowRight size={15} /></span></button>)}</div><div className="more-guides"><div><Sparkles size={18} /><strong>Mais guias estão a caminho</strong><span>Banco, Pix, empresa no seu CPF e mais.</span></div><span className="soon-pill">em breve</span></div></motion.div>;
}

function ProfileView({ goTo, showNotice }: { goTo: (view: View) => void; showNotice: (message: string, tone?: NoticeTone) => void }) {
  return <motion.div key="profile" className="page app-page container" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }}><div className="profile-shell"><div className="profile-cover" /><div className="profile-main"><div className="profile-large-avatar">RO</div><div className="profile-main-heading"><div><p className="section-label">meu perfil</p><h1>Ronaldo Oliveira <BadgeCheck size={20} /></h1><p><MapPin size={14} /> Belo Horizonte, MG · Médico</p></div><button className="outline-button" onClick={() => showNotice("A edição de perfil será liberada após a autenticação.", "info")}>Editar perfil</button></div><div className="profile-badges"><span><ShieldCheck size={15} /> identidade protegida</span><span><UsersRound size={15} /> comunidade Ronaldo</span></div><div className="profile-info-grid"><div><p className="side-label">sobre mim</p><p>Este é um perfil de demonstração do Homônimos. No produto completo, você decide o que quer compartilhar.</p></div><div><p className="side-label">privacidade</p><p>Seu CPF, documentos e informações sensíveis nunca aparecem para outros membros.</p><button className="text-button" onClick={() => goTo("protege")}>Conhecer suas proteções <ArrowRight size={15} /></button></div></div></div></div></motion.div>;
}

function GuideModal({ guide, onClose, onAction }: { guide: Guide; onClose: () => void; onAction: () => void }) {
  return <div className="modal-backdrop" onMouseDown={(event) => { if (event.target === event.currentTarget) onClose(); }}><motion.div className="modal-card guide-modal" initial={{ opacity: 0, y: 14, scale: .98 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, y: 14, scale: .98 }}><button className="modal-close" onClick={onClose} aria-label="Fechar"><X size={19} /></button><div className="modal-icon"><guide.icon size={21} /></div><p className="section-label">guia 0{guide.id} · homônimos protege</p><h2>{guide.title}</h2><p className="modal-lead">Siga estes passos e mantenha todos os protocolos guardados.</p><ol className="guide-steps">{guide.steps.map((step, index) => <li key={step}><span>{index + 1}</span><p>{step}</p></li>)}</ol><div className="modal-disclaimer"><LockKeyhole size={15} /> Não envie documentos pela comunidade. Este guia é informativo.</div><button className="primary-button full-button" onClick={onAction}>Salvar este guia <BookmarkIcon /></button></motion.div></div>;
}

function BookmarkIcon() { return <span aria-hidden="true">☆</span>; }

function LoginModal({ onClose, onSuccess }: { onClose: () => void; onSuccess: () => void }) {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    setError("");
    setLoading(true);
    try {
      const response = await fetch("/api/auth/register", {
        method: "POST",
        headers: { "content-type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ name, email, password }),
      });
      const payload = await response.json();
      if (!response.ok) throw new Error(payload.message || "Não foi possível criar sua conta.");
      onSuccess();
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : "Não foi possível criar sua conta.");
    } finally {
      setLoading(false);
    }
  };

  return <div className="modal-backdrop" onMouseDown={(event) => { if (event.target === event.currentTarget) onClose(); }}><motion.div className="modal-card login-modal" initial={{ opacity: 0, y: 14, scale: .98 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, y: 14, scale: .98 }}><button className="modal-close" onClick={onClose} aria-label="Fechar"><X size={19} /></button><div className="login-logo"><span className="brand-mark"><span className="brand-dot" /><span className="brand-dot brand-dot-second" /></span></div><p className="section-label">crie sua conta</p><h2>Comece pela sua<br /><em>própria história.</em></h2><p className="modal-lead">Usamos apenas os dados básicos necessários para criar seu perfil. CPF, selfie e documentos não são solicitados nesta etapa.</p><form onSubmit={submit}><label>Seu nome<input autoFocus required minLength={2} value={name} onChange={(event) => setName(event.target.value)} placeholder="Como podemos chamar você?" /></label><label>E-mail<input required type="email" value={email} onChange={(event) => setEmail(event.target.value)} placeholder="voce@email.com" /></label><label>Senha<input required minLength={8} type="password" value={password} onChange={(event) => setPassword(event.target.value)} placeholder="Mínimo de 8 caracteres" /></label>{error && <p className="form-error" role="alert">{error}</p>}<button className="primary-button full-button" disabled={loading}>{loading ? "Criando sua conta…" : "Criar conta"} {!loading && <ArrowRight size={17} />}</button></form><div className="login-safe"><LockKeyhole size={15} /> Sua sessão é protegida por cookie httpOnly.</div></motion.div></div>;
}

export default App;
