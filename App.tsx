import React, { useState, useEffect, useRef, useMemo } from 'react';
import { ViewState, OnboardingData, UserProfile, RecurringItem } from './types';
import firebase from "firebase/compat/app";
import "firebase/compat/auth";
import "firebase/compat/firestore";
import { 
  CheckCircleIcon, 
  ChevronLeftIcon,
  SunIcon,
  MoonIcon,
  ShieldCheckIcon,
  DocumentArrowDownIcon,
  ArrowPathIcon,
  SparklesIcon,
  RocketLaunchIcon,
  UserCircleIcon,
  LockClosedIcon,
  ChartBarIcon,
  ExclamationCircleIcon,
  BanknotesIcon,
  ArrowTrendingUpIcon,
  ArrowTrendingDownIcon,
  EnvelopeIcon,
  UserIcon,
  EyeIcon,
  EyeSlashIcon,
  PlusIcon,
  TrashIcon,
  CalendarIcon,
  TableCellsIcon,
  AdjustmentsHorizontalIcon,
  HomeIcon,
  ShoppingCartIcon,
  TruckIcon,
  HeartIcon,
  TicketIcon,
  WifiIcon,
  AcademicCapIcon,
  CurrencyDollarIcon,
  SquaresPlusIcon,
  CheckIcon,
  ChevronRightIcon
} from '@heroicons/react/24/solid';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip as RechartsTooltip, Legend } from 'recharts';

// --- CONFIGURAÇÃO DO FIREBASE ---
const firebaseConfig = {
  apiKey: "AIzaSyAjfW2QI5uq1FABoCZlV7lptXHthgrP47M",
  authDomain: "organizadin-bda01.firebaseapp.com",
  projectId: "organizadin-bda01",
  storageBucket: "organizadin-bda01.firebasestorage.app",
  messagingSenderId: "412647079016",
  appId: "1:412647079016:web:e4a76ba1512e022ad90fdd",
  measurementId: "G-6GQ691Z3MR"
};

if (!firebase.apps.length) {
  firebase.initializeApp(firebaseConfig);
}


const auth = firebase.auth();
const db = firebase.firestore();
auth.languageCode = 'pt-br';

const provider = new firebase.auth.GoogleAuthProvider();
provider.setCustomParameters({ prompt: 'select_account' });

const CATEGORIES_DEFAULT = [
  'Moradia', 'Alimentação', 'Transporte', 'Saúde', 'Lazer', 'Assinaturas', 'Educação', 'Investimentos', 'Outros'
];

const CATEGORY_ICONS: Record<string, any> = {
  'Moradia': HomeIcon,
  'Alimentação': ShoppingCartIcon,
  'Transporte': TruckIcon,
  'Saúde': HeartIcon,
  'Lazer': TicketIcon,
  'Assinaturas': WifiIcon,
  'Educação': AcademicCapIcon,
  'Investimentos': ArrowTrendingUpIcon,
  'Outros': SquaresPlusIcon
};

const COLORS = ['#1B5E20', '#FF6F00', '#2E7D32', '#FFA000', '#43A047', '#FFB300', '#66BB6A', '#FFCA28', '#81C784'];


async function getOrCreateUserProfile(user: firebase.User) {
  const userRef = db.collection("users").doc(user.uid);
  const snap = await userRef.get();

  if (!snap.exists) {
    const newProfile = {
  uid: user.uid,
  name: user.displayName || user.email?.split("@")[0] || "Usuário",
  email: user.email || "",
  plan: "free",
  planStatus: "active",
  createdAt: firebase.firestore.FieldValue.serverTimestamp(),
  updatedAt: firebase.firestore.FieldValue.serverTimestamp(),
};

    await userRef.set(newProfile);
    return newProfile;
  }

  return snap.data();
}

export default function App() {
  const [isDark, setIsDark] = useState(() => 
    localStorage.theme === 'dark' || 
    (!('theme' in localStorage) && window.matchMedia('(prefers-color-scheme: dark)').matches)
  );
  
 // ✅ DEV MODE (Vite)
const isDev = import.meta.env.DEV;

// (opcional) override de plano para testes (só funciona em DEV)
const devPlanOverride = isDev ? (import.meta.env?.VITE_DEV_PLAN_OVERRIDE || null) : null;


  const [view, setView] = useState<ViewState>(ViewState.LANDING);
  const [stepIndex, setStepIndex] = useState(0);
  const [statusText, setStatusText] = useState('Iniciando...');
  const [engineReady, setEngineReady] = useState(false);
  const [showLimitModal, setShowLimitModal] = useState(false);
  const [isGeneratingExcel, setIsGeneratingExcel] = useState(false);
  
  // Auth Form State
  const [authForm, setAuthForm] = useState({ name: '', email: '', password: '' });
  const [authError, setAuthError] = useState('');
  const [authLoading, setAuthLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  // New Recurring Item State for Wizard
  const [newRecurring, setNewRecurring] = useState<Partial<RecurringItem>>({ name: '', value: 0, category: 'Moradia', day: 5 });

  const pyodideInstance = useRef<any>(null);
  
  // Logic Helpers
  const getMonthKey = () => {
    const date = new Date();
    return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
  };

  const getVisitorPlan = (): 'free' | 'premium' => {
  return (localStorage.getItem('organizadin_plan') as 'free' | 'premium') || 'free';
};

  const [user, setUser] = useState<UserProfile>(() => {
    const saved = localStorage.getItem('organiza_user');
    let userData: UserProfile;
    const [userProfile, setUserProfile] = useState<any>(null);
    
    // Default Plan from LocalStorage (Simple MVP Logic)
    const currentPlan = getStoredPlan();

    if (saved) {
      const parsed = JSON.parse(saved);
      userData = {
        ...parsed,
        plan: currentPlan
      };
    } else {
      userData = {
        id: '',
        name: '',
        email: '',
        plan: currentPlan,
        isLoggedIn: false
      };
    }
    return userData;
  });
useEffect(() => {
  // 🚫 Em produção, não permitir usuário de teste persistido no localStorage
  if (!isDev) {
    const saved = localStorage.getItem('organiza_user');
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (parsed?.id && String(parsed.id).startsWith('test-user-')) {
          localStorage.removeItem('organiza_user');
          localStorage.removeItem('organizadin_plan');
          // força reset
          setUser({
            id: '',
            name: '',
            email: '',
            plan: 'free',
            isLoggedIn: false
          });
        }
      } catch (e) {
        // se tiver corrompido, apaga
        localStorage.removeItem('organiza_user');
      }
    }
  }
}, []);
  const [onboarding, setOnboarding] = useState<OnboardingData>({
    goal: 'Controlar gastos',
    income: '',
    startDay: 1,
    categories: ['Moradia', 'Alimentação', 'Transporte', 'Lazer'],
    budgets: {},
    reservePercent: 10,
    recurringItems: [],
    useExampleData: true,
    includeDebts: false,
    includeInvestments: false,
    theme: 'Green',
    fileName: 'Minha Planilha OrganizaDin'
  });
  
  const [progress, setProgress] = useState(0);

  // Monitora estado de autenticação Firebase
  useEffect(() => {
  const unsubscribe = auth.onAuthStateChanged(async (firebaseUser: any) => {
    if (firebaseUser) {
      try {
        // 🔥 Busca ou cria perfil real no Firestore
        const profile: any = await getOrCreateUserProfile(firebaseUser);

        // ✅ Se você quiser manter compatibilidade com localStorage,
        // você pode sincronizar o plano aqui (opcional)
        localStorage.setItem("organizadin_plan", profile?.plan || "free");

        // ✅ Atualiza estado do usuário com o plano vindo do Firestore
        setUser(prev => ({
          ...prev,
          id: firebaseUser.uid,
          name: firebaseUser.displayName || firebaseUser.email?.split('@')[0] || 'Usuário',
          email: firebaseUser.email || '',
          isLoggedIn: true,
          plan: profile?.plan === "premium" ? "premium" : "free",
        }));

        // ✅ State opcional com perfil completo
        setUserProfile(profile);

        // Redireciona se estiver na tela de login/register
        if (view === ViewState.LOGIN || view === ViewState.REGISTER) {
          setView(ViewState.LANDING);
        }

      } catch (err) {
        console.error("Erro ao carregar perfil Firestore:", err);

        // fallback seguro (se falhar o Firestore)
        setUser(prev => ({
          ...prev,
          id: firebaseUser.uid,
          name: firebaseUser.displayName || firebaseUser.email?.split('@')[0] || 'Usuário',
          email: firebaseUser.email || '',
          isLoggedIn: true,
          plan: "free",
        }));
      }

    } else {
      setUserProfile(null);

      // se for usuário mock (DEV), mantém
      setUser(prev => {
        if (prev.id && prev.id.startsWith("test-user-")) return prev;

        localStorage.setItem("organizadin_plan", "free"); // reset plano local
        return {
          ...prev,
          id: "",
          name: "",
          email: "",
          isLoggedIn: false,
          plan: "free",
        };
      });
    }
  });

  return () => unsubscribe();
}, [view]);

  useEffect(() => {
    localStorage.setItem('organiza_user', JSON.stringify(user));
  }, [user]);

  useEffect(() => {
    async function initEngine() {
      try {
        // @ts-ignore
        const py = await window.loadPyodide();
        await py.loadPackage("micropip");
        const micropip = py.pyimport("micropip");
        await micropip.install("xlsxwriter");
        pyodideInstance.current = py;
        setEngineReady(true);
      } catch (e) {
        console.error("Failed to load engine", e);
      }
    }
    initEngine();
  }, []);

  useEffect(() => {
    if (isDark) {
      document.documentElement.classList.add('dark');
      localStorage.theme = 'dark';
    } else {
      document.documentElement.classList.remove('dark');
      localStorage.theme = 'light';
    }
  }, [isDark]);

  const toggleTheme = () => setIsDark(!isDark);

  // --- AUTH METHODS ---
  const handleAuthError = (error: any) => {
      console.error("Auth Error:", error);
      let msg = "Ocorreu um erro. Tente novamente.";
      if (error.code === 'auth/email-already-in-use') msg = "Este e-mail já está cadastrado.";
      if (error.code === 'auth/invalid-email') msg = "E-mail inválido.";
      if (error.code === 'auth/weak-password') msg = "A senha deve ter pelo menos 6 caracteres.";
      if (error.code === 'auth/user-not-found' || error.code === 'auth/wrong-password' || error.code === 'auth/invalid-credential') msg = "E-mail ou senha incorretos.";
      if (error.code === 'auth/unauthorized-domain') {
  // ✅ Em produção apenas mostra erro
  if (!isDev) {
    setAuthError("Domínio não autorizado no Firebase. Verifique as configurações.");
    setAuthLoading(false);
    return;
  }
  handleMockFallback(error);
  return;
}
      setAuthError(msg); setAuthLoading(false);
  };

 const handleMockFallback = (error: any) => {
  // 🚫 NUNCA permitir mock login em produção
  if (!isDev) {
    console.error("Mock fallback blocked in production:", error);
    setAuthError("Login indisponível no momento. Verifique sua configuração do Firebase.");
    setAuthLoading(false);
    return;
  }

  console.warn("DEV ONLY: Switching to Mock Mode.");
  const mockUser = {
    id: 'test-user-' + Math.random().toString(36).substr(2, 9),
    name: authForm.name || 'Usuário Teste',
    email: authForm.email || 'teste@organizadin.com',
    isLoggedIn: true,
    plan: getVisitorPlan(),
  };

  // @ts-ignore
  setUser(mockUser);
  setAuthLoading(false);
  setView(ViewState.LANDING);
};

  const handleEmailRegister = async (e: React.FormEvent) => {
    e.preventDefault(); setAuthError(''); setAuthLoading(true);
    if (!authForm.name || !authForm.email || !authForm.password) { setAuthError('Preencha todos os campos.'); setAuthLoading(false); return; }
    try {
        const userCredential = await auth.createUserWithEmailAndPassword(authForm.email, authForm.password);
        if (userCredential.user) {
            await userCredential.user.updateProfile({ displayName: authForm.name });
            setUser(prev => ({ ...prev, name: authForm.name, isLoggedIn: true, id: userCredential.user!.uid, email: userCredential.user!.email! }));
        }
        setAuthLoading(false);
    } catch (error: any) { handleAuthError(error); }
  };

  const handleEmailLogin = async (e: React.FormEvent) => {
    e.preventDefault(); setAuthError(''); setAuthLoading(true);

    if (!authForm.email || !authForm.password) { setAuthError('Preencha e-mail e senha.'); setAuthLoading(false); return; }
    try { await auth.signInWithEmailAndPassword(authForm.email, authForm.password); setAuthLoading(false); } catch (error: any) { handleAuthError(error); }
  };

  const handleGoogleLogin = async () => {
    setAuthLoading(true);
    try {
      await auth.signInWithPopup(provider); setShowLimitModal(false); setAuthLoading(false);
    } catch (error: any) {
      setAuthLoading(false);
      if (error.code === 'auth/popup-closed-by-user' || error.code === 'auth/cancelled-popup-request') return;
      if (error.code === 'auth/popup-blocked') { alert("O navegador bloqueou o login."); return; }
      if (
  error?.code === 'auth/unauthorized-domain' ||
  error?.code === 'auth/operation-not-supported-in-this-environment'
) {
  // 🚫 Produção: sem mock
  if (!isDev) {
    setAuthError("Não foi possível autenticar com Google. Verifique a configuração do Firebase.");
    return;
  }
  handleMockFallback(error);
} else {
  setAuthError("Erro ao conectar com Google.");
}
    }
  };

  const logout = async () => {
    
    await auth.signOut();
    setUser(prev => ({ ...prev, id: '', name: '', email: '', isLoggedIn: false, plan: 'free' }));
    setAuthForm({ name: '', email: '', password: '' }); setView(ViewState.LANDING);
  };

  // --- LOGIC: LIMITS & TRACKING ---
  const checkLimitBeforeStart = () => {
  // Se estiver logado, quem manda é Firestore (user.plan)
  if (user.isLoggedIn && user.plan === 'premium') return true;

  // Se não estiver logado, usa visitor plan (localStorage)
  if (!user.isLoggedIn && getVisitorPlan() === 'premium') return true;

    const monthKey = getMonthKey();

    if (user.isLoggedIn) {
        // User Limit: Max 1 (Total 2 including guest, but managed separately for simplicity)
        const count = parseInt(localStorage.getItem(`organizadin_user_generations_${monthKey}`) || '0');
        if (count >= 1) {
            setShowLimitModal(true);
            return false;
        }
    } else {
        // Guest Limit: Max 1
        const count = parseInt(localStorage.getItem(`organizadin_guest_generations_${monthKey}`) || '0');
        if (count >= 1) {
            setShowLimitModal(true);
            return false;
        }
    }
    return true;
  };

  const incrementUsage = () => {
  if (user.isLoggedIn && user.plan === 'premium') return;
  if (!user.isLoggedIn && getVisitorPlan() === 'premium') return;

    const monthKey = getMonthKey();
    if (user.isLoggedIn) {
        const count = parseInt(localStorage.getItem(`organizadin_user_generations_${monthKey}`) || '0');
        localStorage.setItem(`organizadin_user_generations_${monthKey}`, (count + 1).toString());
    } else {
        const count = parseInt(localStorage.getItem(`organizadin_guest_generations_${monthKey}`) || '0');
        localStorage.setItem(`organizadin_guest_generations_${monthKey}`, (count + 1).toString());
    }
  };

  // === DASHBOARD CALCS ===
  const dashboardData = useMemo(() => {
    const income = parseFloat(onboarding.income) || 0;
    
    let totalExpenses = 0;
    const chartData = onboarding.categories.map(cat => {
        const val = parseFloat(onboarding.budgets[cat]) || 0;
        totalExpenses += val;
        return { name: cat, value: val };
    });

    const balance = income - totalExpenses;
    const reserveAmount = (income * (onboarding.reservePercent / 100));
    const goalProgress = income > 0 ? ((income - totalExpenses) / reserveAmount) * 100 : 0;

    return { income, totalExpenses, balance, chartData, goalProgress, reserveAmount };
  }, [onboarding]);


  const startGenerationFlow = async () => {
    if (!checkLimitBeforeStart()) return;
    
    incrementUsage();

    setView(ViewState.GENERATING); setProgress(0); setStatusText('Configurando estrutura Excel...');
    
    const timer = setInterval(() => {
        setProgress(old => {
            if (old >= 95) { clearInterval(timer); return 95; }
            return old + (Math.random() * 10);
        });
    }, 200);

    // Simulate delay for Pyodide
    setTimeout(() => {
        clearInterval(timer);
        setProgress(100);
        setStatusText("Pronto!");
        setTimeout(() => setView(ViewState.VIEWER), 500);
    }, 2000);
  };

  const downloadExcel = async () => {
    setIsGeneratingExcel(true);
    try {
      if (!engineReady || !pyodideInstance.current) { alert("Motor carregando..."); setIsGeneratingExcel(false); return; }
      const py = pyodideInstance.current;

      // 1. Prepare structured payload for Python with STRICT types
      const payload = {
          plan: user.plan, // Pass the plan type
          profile: {
              goal: onboarding.goal,
              income: parseFloat(onboarding.income) || 0,
              startDay: onboarding.startDay || 1,
              currency: 'BRL'
          },
          categories: onboarding.categories.map(cat => ({
              name: cat,
              budget: parseFloat(onboarding.budgets[cat]) || 0
          })),
          // Ensure all recurring items are sent regardless of example flag
          recurringExpenses: onboarding.recurringItems
              .filter(i => i.type === 'expense')
              .map(i => ({ name: i.name, value: parseFloat(String(i.value)), category: i.category, dueDay: i.day })),
          recurringIncomes: parseFloat(onboarding.income) > 0 ? [{ name: 'Salário', value: parseFloat(onboarding.income), payDay: 5 }] : [],
          reservePercent: onboarding.reservePercent,
          preferences: {
              useExampleData: onboarding.useExampleData,
              includeDebts: onboarding.includeDebts,
              includeInvestments: onboarding.includeInvestments,
              theme: onboarding.theme
          }
      };
      
      const pythonScript = `
import xlsxwriter
import io
import json
import random
import datetime

def generate_xlsx(data_json):
    data = json.loads(data_json)
    output = io.BytesIO()
    workbook = xlsxwriter.Workbook(output)
    workbook.set_calc_mode('auto')
    
    # --- UNPACK DATA ---
    plan = data.get('plan', 'free')
    profile = data.get('profile', {})
    cats_data = data.get('categories', [])
    rec_exp = data.get('recurringExpenses', [])
    rec_inc = data.get('recurringIncomes', [])
    prefs = data.get('preferences', {})
    
    income_val = float(profile.get('income', 0))
    start_day = int(profile.get('startDay', 1))
    
    # --- FORMATS & COLORS ---
    C_GREEN = '#1B5E20'
    C_GREEN_LIGHT = '#E8F5E9'
    C_WHITE = '#FFFFFF'
    C_ORANGE = '#F97316'
    C_RED = '#EF4444'
    C_RED_LIGHT = '#FEE2E2'
    C_GRAY = '#6B7280'
    C_BG_CARD = '#F9FAFB'
    C_BORDER = '#E5E7EB'
    
    # Text Formats
    fmt_title = workbook.add_format({'bold': True, 'font_size': 20, 'font_color': C_GREEN, 'font_name': 'Arial'})
    fmt_subtitle = workbook.add_format({'bold': False, 'font_size': 11, 'font_color': C_GRAY, 'font_name': 'Arial'})
    fmt_text = workbook.add_format({'font_name': 'Arial', 'font_size': 10, 'border': 1, 'border_color': C_BORDER, 'valign': 'vcenter'})
    fmt_text_center = workbook.add_format({'font_name': 'Arial', 'font_size': 10, 'border': 1, 'border_color': C_BORDER, 'align': 'center', 'valign': 'vcenter'})
    fmt_text_bold = workbook.add_format({'font_name': 'Arial', 'font_size': 10, 'border': 1, 'border_color': C_BORDER, 'bold': True, 'valign': 'vcenter'})
    
    # Value Formats
    fmt_curr = workbook.add_format({'num_format': 'R$ #,##0.00', 'font_name': 'Arial', 'font_size': 10, 'border': 1, 'border_color': C_BORDER, 'valign': 'vcenter'})
    fmt_curr_bold = workbook.add_format({'num_format': 'R$ #,##0.00', 'font_name': 'Arial', 'font_size': 10, 'border': 1, 'border_color': C_BORDER, 'bold': True, 'valign': 'vcenter'})
    fmt_date = workbook.add_format({'num_format': 'dd/mm/yyyy', 'font_name': 'Arial', 'font_size': 10, 'border': 1, 'align': 'center', 'border_color': C_BORDER, 'valign': 'vcenter'})
    
    # Special Formats
    fmt_header = workbook.add_format({'bold': True, 'bg_color': C_GREEN, 'font_color': C_WHITE, 'border': 1, 'align': 'center', 'valign': 'vcenter', 'font_name': 'Arial'})
    fmt_table_head = workbook.add_format({
    'bold': True,
    'bg_color': '#E5E7EB',
    'font_color': '#111827',
    'border': 1,
    'border_color': C_BORDER,
    'align': 'left',
    'valign': 'vcenter',
    'font_name': 'Arial'
})

    fmt_card_title = workbook.add_format({'bold': True, 'font_size': 10, 'font_color': C_GRAY, 'bg_color': C_BG_CARD, 'border': 1, 'border_color': C_BORDER, 'align': 'center', 'valign': 'vcenter', 'font_name': 'Arial'})
    fmt_card_val = workbook.add_format({'bold': True, 'font_size': 14, 'font_color': '#111827', 'bg_color': C_WHITE, 'border': 1, 'border_color': C_BORDER, 'align': 'center', 'valign': 'vcenter', 'num_format': 'R$ #,##0.00', 'font_name': 'Arial'})
    fmt_card_val_pct = workbook.add_format({'bold': True, 'font_size': 14, 'font_color': '#111827', 'bg_color': C_WHITE, 'border': 1, 'border_color': C_BORDER, 'align': 'center', 'valign': 'vcenter', 'num_format': '0%', 'font_name': 'Arial'})
    
    # Conditional Formats
    fmt_green_fill = workbook.add_format({'bg_color': '#DCFCE7', 'font_color': '#166534'})
    fmt_red_fill = workbook.add_format({'bg_color': '#FEE2E2', 'font_color': '#991B1B'})
    fmt_yellow_fill = workbook.add_format({'bg_color': '#FEF9C3', 'font_color': '#854D0E'})

    # ==========================
    # DATA PREP FOR LOG
    # ==========================
    rows = []
    today = datetime.date.today()
    curr_month = today.month
    curr_year = today.year
    
    # Recurring Items
    for inc in rec_inc:
        day = int(inc.get('payDay', 5))
        try: dt = datetime.date(curr_year, curr_month, day)
        except: dt = datetime.date(curr_year, curr_month, 28)
        rows.append([dt, inc['name'], 'Receita', 'Renda', float(inc['value']), 'Pago'])
        
    for exp in rec_exp:
        day = int(exp.get('dueDay', 10))
        try: dt = datetime.date(curr_year, curr_month, day)
        except: dt = datetime.date(curr_year, curr_month, 28)
        rows.append([dt, exp['name'], 'Despesa', exp.get('category', 'Outros'), float(exp['value']), 'Pendente'])
        
    # Random Data (Example)
    if prefs.get('useExampleData', True):
        for c in cats_data:
            budget = float(c['budget'])
            if budget > 0:
                for _ in range(random.randint(1, 2)):
                    day = random.randint(1, 28)
                    dt = datetime.date(curr_year, curr_month, day)
                    val = round(budget * random.uniform(0.1, 0.3), 2)
                    rows.append([dt, f'Exemplo {c["name"]}', 'Despesa', c['name'], val, 'Pago'])

    rows.sort(key=lambda x: x[0])
    
    # ==========================
    # BRANCHING LOGIC
    # ==========================

    if plan == 'premium':
        # ---------------------------------------------------------------------
        # SHEET: AUX_DADOS (Hidden Calculation Engine)
        # ---------------------------------------------------------------------
        ws_aux = workbook.add_worksheet('AUX_DADOS')
        ws_aux.hide() # Requirement: Hidden
        
        # Cols: A=Categories, B=Budgets, C=Realized (Formula)
        ws_aux.write('A1', 'Categoria')
        ws_aux.write('B1', 'Orçamento')
        ws_aux.write('C1', 'Realizado')
        
        category_list = [c['name'] for c in cats_data]
        if 'Renda' not in category_list: category_list.append('Renda')
        if 'Outros' not in category_list: category_list.append('Outros')
        
        # Write Categories and Formulas
        for i, cat in enumerate(cats_data):
            row = i + 1
            ws_aux.write(row, 0, cat['name'])
            ws_aux.write(row, 1, float(cat['budget']))
            # Formula: SUMIFS in LANÇAMENTOS for this category and type='Despesa'
            ws_aux.write_formula(row, 2, f'=SUMIFS(LANÇAMENTOS!E:E, LANÇAMENTOS!D:D, A{row+1}, LANÇAMENTOS!C:C, "Despesa")')

        # Aux for Line Chart (Simplified Monthly Balance)
        # Since local formulas for dates are tricky, we rely on XlsxWriter to set a basic structure
        # We will create a small table for Jan-Dec in Cols E-G
        months = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez']
        ws_aux.write_row('E1', ['Mês', 'Receita', 'Despesa'])
        for i, m in enumerate(months):
            r = i + 1
            ws_aux.write(r, 4, m)
            # Placeholder formulas (Professional would use date ranges, keeping it simple for stability)
            # This links to the main totals just for visualization structure in this MVP
            if i == (curr_month - 1):
                ws_aux.write_formula(r, 5, '=SUMIFS(LANÇAMENTOS!E:E, LANÇAMENTOS!C:C, "Receita")')
                ws_aux.write_formula(r, 6, '=SUMIFS(LANÇAMENTOS!E:E, LANÇAMENTOS!C:C, "Despesa")')
            else:
                ws_aux.write(r, 5, 0)
                ws_aux.write(r, 6, 0)

        # ---------------------------------------------------------------------
        # SHEET: LANÇAMENTOS (Data Entry)
        # ---------------------------------------------------------------------
        ws_log = workbook.add_worksheet('LANÇAMENTOS')
        ws_log.set_tab_color(C_GREEN)
        ws_log.set_column('A:A', 12) # Data
        ws_log.set_column('B:B', 35) # Desc
        ws_log.set_column('C:C', 15) # Tipo
        ws_log.set_column('D:D', 20) # Categoria
        ws_log.set_column('E:E', 15) # Valor
        ws_log.set_column('F:F', 15) # Status
        
        ws_log.freeze_panes(3, 0) # Freeze Header
        
        ws_log.write('A1', 'LANÇAMENTOS FINANCEIROS', fmt_title)
        ws_log.write('A2', 'Registre abaixo todas as suas movimentações.', fmt_subtitle)
        
        headers = ['DATA', 'DESCRIÇÃO', 'TIPO', 'CATEGORIA', 'VALOR', 'STATUS']
        ws_log.write_row('A3', headers, fmt_header)
        
        # Pre-fill data
        start_row = 3
        for i, r in enumerate(rows):
            ws_log.write_datetime(start_row + i, 0, r[0], fmt_date)
            ws_log.write(start_row + i, 1, r[1], fmt_text)
            ws_log.write(start_row + i, 2, r[2], fmt_text_center)
            ws_log.write(start_row + i, 3, r[3], fmt_text_center)
            ws_log.write(start_row + i, 4, r[4], fmt_curr)
            ws_log.write(start_row + i, 5, r[5], fmt_text_center)

        # Add 300 Blank Rows with formatting and validation
        total_rows = len(rows) + 300
        for r in range(start_row + len(rows), total_rows):
            ws_log.write_blank(r, 0, None, fmt_date)
            ws_log.write_blank(r, 1, None, fmt_text)
            ws_log.write_blank(r, 2, None, fmt_text_center)
            ws_log.write_blank(r, 3, None, fmt_text_center)
            ws_log.write_blank(r, 4, None, fmt_curr)
            ws_log.write_blank(r, 5, None, fmt_text_center)

        # Data Validation
        ws_log.data_validation(start_row, 2, total_rows, 2, {'validate': 'list', 'source': ['Receita', 'Despesa']})
        ws_log.data_validation(start_row, 3, total_rows, 3, {'validate': 'list', 'source': category_list})
        ws_log.data_validation(start_row, 5, total_rows, 5, {'validate': 'list', 'source': ['Pago', 'Pendente']})
        
        # Conditional Formatting
        # Green for Receita
        ws_log.conditional_format(start_row, 2, total_rows, 2, {
            'type': 'cell', 'criteria': 'equal to', 'value': '"Receita"', 'format': fmt_green_fill
        })
        # Red for Despesa
        ws_log.conditional_format(start_row, 2, total_rows, 2, {
            'type': 'cell', 'criteria': 'equal to', 'value': '"Despesa"', 'format': fmt_red_fill
        })
        # Yellow for Pendente
        ws_log.conditional_format(start_row, 5, total_rows, 5, {
            'type': 'cell', 'criteria': 'equal to', 'value': '"Pendente"', 'format': fmt_yellow_fill
        })
        
        # Table Filter
        ws_log.autofilter(2, 0, total_rows, 5)

        # ---------------------------------------------------------------------
        # SHEET: RELATÓRIOS (Charts)
        # ---------------------------------------------------------------------
        ws_rel = workbook.add_worksheet('RELATÓRIOS')
        ws_rel.set_tab_color(C_ORANGE)
        ws_rel.hide_gridlines(2)
        ws_rel.write('B2', 'RELATÓRIOS E GRÁFICOS', fmt_title)
        
        # Pie Chart: Despesas por Categoria
        chart_pie = workbook.add_chart({'type': 'pie'})
        chart_pie.add_series({
            'name': 'Despesas por Categoria',
            'categories': f'=AUX_DADOS!$A$2:$A\${len(cats_data)+1}',
            'values':     f'=AUX_DADOS!$C$2:$C\${len(cats_data)+1}',
            'data_labels': {'percentage': True},
        })
        chart_pie.set_title({'name': 'Distribuição de Gastos'})
        chart_pie.set_style(10)
        ws_rel.insert_chart('B4', chart_pie)
        
        # Column Chart: Orçamento vs Realizado
        chart_col = workbook.add_chart({'type': 'column'})
        chart_col.add_series({
            'name': 'Orçamento',
            'categories': f'=AUX_DADOS!$A$2:$A\${len(cats_data)+1}',
            'values':     f'=AUX_DADOS!$B$2:$B\${len(cats_data)+1}',
            'fill':       {'color': C_GRAY}
        })
        chart_col.add_series({
            'name': 'Realizado',
            'categories': f'=AUX_DADOS!$A$2:$A\${len(cats_data)+1}',
            'values':     f'=AUX_DADOS!$C$2:$C\${len(cats_data)+1}',
            'fill':       {'color': C_ORANGE}
        })
        chart_col.set_title({'name': 'Orçamento vs Realizado'})
        chart_col.set_style(10)
        ws_rel.insert_chart('J4', chart_col)
        
        # Line Chart: Evolução
        chart_line = workbook.add_chart({'type': 'line'})
        chart_line.add_series({
            'name': 'Receitas',
            'categories': '=AUX_DADOS!$E$2:$E$13',
            'values':     '=AUX_DADOS!$F$2:$F$13',
            'line':       {'color': C_GREEN, 'width': 2.25}
        })
        chart_line.add_series({
            'name': 'Despesas',
            'categories': '=AUX_DADOS!$E$2:$E$13',
            'values':     '=AUX_DADOS!$G$2:$G$13',
            'line':       {'color': C_RED, 'width': 2.25}
        })
        chart_line.set_title({'name': 'Fluxo de Caixa Mensal'})
        chart_line.set_style(10)
        ws_rel.insert_chart('B20', chart_line)

        # ---------------------------------------------------------------------
        # SHEET: INÍCIO (Dashboard)
        # ---------------------------------------------------------------------
        ws_dash = workbook.add_worksheet('INÍCIO')
        ws_dash.activate()
        ws_dash.set_tab_color(C_GREEN)
        ws_dash.hide_gridlines(2)
        
        # Layout Setup
        ws_dash.set_column('A:A', 2) # Spacer
        ws_dash.set_column('B:C', 22) # Cards
        ws_dash.set_column('D:E', 22) # Cards
        ws_dash.set_column('F:G', 22) # Cards
        
        ws_dash.merge_range('B2:G2', 'DASHBOARD PREMIUM', fmt_title)
        ws_dash.write('B3', 'Visão geral da sua saúde financeira.', fmt_subtitle)
        
        # Navigation
        ws_dash.write_url('F3', 'internal:LANÇAMENTOS!A1', string='>> Ir para Lançamentos', cell_format=fmt_subtitle)
        ws_dash.write_url('G3', 'internal:RELATÓRIOS!A1', string='>> Ir para Relatórios', cell_format=fmt_subtitle)
        
        # KPI Cards Row
        row_card = 5
        
        # Card 1: Receita Total
        ws_dash.merge_range('B5:B6', 'RECEITA TOTAL', fmt_card_title)
        ws_dash.merge_range('B7:B8', '', fmt_card_val)
        ws_dash.write_formula('B7', '=SUMIFS(LANÇAMENTOS!E:E, LANÇAMENTOS!C:C, "Receita")', fmt_card_val)
        
        # Card 2: Despesa Total
        ws_dash.merge_range('C5:C6', 'DESPESA TOTAL', fmt_card_title)
        ws_dash.merge_range('C7:C8', '', fmt_card_val)
        ws_dash.write_formula('C7', '=SUMIFS(LANÇAMENTOS!E:E, LANÇAMENTOS!C:C, "Despesa")', fmt_card_val)
        
        # Card 3: Saldo
        ws_dash.merge_range('D5:D6', 'SALDO ATUAL', fmt_card_title)
        ws_dash.merge_range('D7:D8', '', fmt_card_val)
        ws_dash.write_formula('D7', '=B7-C7', fmt_card_val)
        
        # Card 4: Meta Economia (Editable)
        ws_dash.merge_range('E5:E6', 'META POUPANÇA', fmt_card_title)
        ws_dash.merge_range('E7:E8', '', fmt_card_val)
        ws_dash.write('E7', float(income_val) * (prefs.get('reservePercent', 10)/100), fmt_card_val)
        
        # Card 5: % Economizado
        ws_dash.merge_range('F5:F6', '% ECONOMIZADO', fmt_card_title)
        ws_dash.merge_range('F7:F8', '', fmt_card_val_pct)
        ws_dash.write_formula('F7', '=IF(B7>0, (B7-C7)/B7, 0)', fmt_card_val_pct)
        
        # Insights Section
        ws_dash.merge_range('B11:G11', 'INSIGHTS DINÂMICOS', fmt_title)
        
        # Insight 1: Saldo Negativo
        ws_dash.merge_range('B13:G13', '', fmt_text)
        ws_dash.write_formula('B13', '=IF(D7<0, "⚠️ Cuidado! Seu saldo está negativo. Revise suas despesas imediatamente.", "✅ Seu saldo está positivo. Continue assim!")', fmt_text)
        
        # Insight 2: Meta
        ws_dash.merge_range('B14:G14', '', fmt_text)
        ws_dash.write_formula('B14', '=IF(D7>=E7, "🏆 Parabéns! Você atingiu sua meta de economia mensal.", "📉 Você ainda não atingiu sua meta de poupança.")', fmt_text)
        
        # Insight 3: Dica
        ws_dash.merge_range('B15:G15', '💡 Dica: Mantenha seus lançamentos atualizados diariamente para um controle preciso.', fmt_text)
        
        ws_dash.activate()
        
    else:
        # --- FREE: TEXT ONLY (2 TABS ONLY) ---
        
        # 1. INÍCIO (Resumo Estático) - NO CHARTS
        ws_home = workbook.add_worksheet('INÍCIO')
        ws_home.set_tab_color(C_ORANGE)
        ws_home.hide_gridlines(2)
        
        ws_home.set_column('B:D', 20)
        
        ws_home.write('B2', 'ORGANIZADIN - PLANO GRATUITO', fmt_title)
        
        # Section: Perfil
        ws_home.write('B4', 'SEU PERFIL FINANCEIRO', fmt_table_head)
        ws_home.write('B5', 'Objetivo Principal', fmt_text)
        ws_home.write('C5', profile.get('goal', '-'), fmt_text_bold)
        
        ws_home.write('B6', 'Renda Declarada', fmt_text)
        ws_home.write('C6', income_val, fmt_curr)
        
        ws_home.write('B7', 'Dia Início Mês', fmt_text)
        ws_home.write('C7', start_row if 'start_row' in locals() else start_day, fmt_text)

        # Section: Planejamento (Budget)
        ws_home.write('B10', 'PLANEJAMENTO MENSAL (TETOS DE GASTOS)', fmt_table_head)
        ws_home.write('B11', 'Categoria', fmt_header)
        ws_home.write('C11', 'Orçamento Definido', fmt_header)
        
        r_idx = 11
        for c in cats_data:
            ws_home.write(r_idx, 1, c['name'], fmt_text)
            ws_home.write(r_idx, 2, c['budget'], fmt_curr)
            r_idx += 1
            
        # Section: Totals (Formulas)
        total_row = r_idx + 2
        ws_home.write(total_row, 1, 'RESUMO GERAL', fmt_table_head)
        ws_home.write(total_row + 1, 1, 'Total Receitas', fmt_text)
        ws_home.write_formula(total_row + 1, 2, '=SUMIFS(LANÇAMENTOS!E:E, LANÇAMENTOS!C:C, "Receita")', fmt_curr_bold)
        
        ws_home.write(total_row + 2, 1, 'Total Despesas', fmt_text)
        ws_home.write_formula(total_row + 2, 2, '=SUMIFS(LANÇAMENTOS!E:E, LANÇAMENTOS!C:C, "Despesa")', fmt_curr_bold)
        
        ws_home.activate()

        # 2. LANÇAMENTOS (Transactions)
        ws_log = workbook.add_worksheet('LANÇAMENTOS')
        ws_log.set_tab_color(C_GREEN)
        ws_log.set_column('A:A', 12)
        ws_log.set_column('B:B', 35)
        ws_log.set_column('C:D', 18)
        ws_log.set_column('E:E', 15)
        
        ws_log.write('A1', 'REGISTRO DE TRANSAÇÕES', fmt_title)
        headers = ['DATA', 'DESCRIÇÃO', 'TIPO', 'CATEGORIA', 'VALOR']
        ws_log.write_row('A3', headers, fmt_header)
        
        start_row = 3
        for i, r in enumerate(rows):
            ws_log.write_datetime(start_row + i, 0, r[0], fmt_date)
            ws_log.write(start_row + i, 1, r[1], fmt_text)
            ws_log.write(start_row + i, 2, r[2], fmt_text)
            ws_log.write(start_row + i, 3, r[3], fmt_text)
            ws_log.write(start_row + i, 4, r[4], fmt_curr)

        # Basic Table
        tbl_len = len(rows) if len(rows) > 0 else 1
        ws_log.add_table(start_row - 1, 0, start_row + tbl_len - 1, 4, {
            'columns': [{'header': h} for h in headers],
            'style': 'TableStyleMedium2',
            'name': 'TabelaLançamentos'
        })

    workbook.close()
    output.seek(0)
    return output.read()

generate_xlsx(json_input)
`;
      
      py.globals.set("json_input", JSON.stringify(payload));
      const result = await py.runPythonAsync(pythonScript);
      const uint8Array = new Uint8Array(result.toJs());
      const blob = new Blob([uint8Array], { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" });

      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${onboarding.fileName.replace(/\s+/g, '_')}.xlsx`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (err: any) {
      console.error("Erro na geração:", err);
      alert("Erro ao criar planilha.");
    } finally {
      setIsGeneratingExcel(false);
    }
  };

  const Navbar = () => (
    <nav className="p-4 md:p-6 flex justify-between items-center max-w-7xl mx-auto w-full sticky top-0 bg-white/90 dark:bg-slate-950/90 backdrop-blur-md z-40 border-b border-slate-100 dark:border-slate-800">
      <div className="flex items-center gap-2 cursor-pointer" onClick={() => { setView(ViewState.LANDING); setStepIndex(0); }}>
        <div className="bg-brand-green p-2 rounded-xl text-white font-bold shadow-md">OD</div>
        <span className="text-xl md:text-2xl font-black text-brand-green dark:text-emerald-400 tracking-tight">OrganizaDin</span>
      </div>
      
      <div className="hidden md:flex items-center gap-8 text-sm font-bold text-slate-600 dark:text-slate-400">
        <button onClick={() => setView(ViewState.LANDING)} className="hover:text-brand-green">Início</button>
        <button onClick={() => {
           const el = document.getElementById('how-it-works');
           if (el) el.scrollIntoView({ behavior: 'smooth' });
        }} className="hover:text-brand-green">Como funciona</button>
        <button onClick={() => {
             const el = document.getElementById('pricing');
             if (el) el.scrollIntoView({ behavior: 'smooth' });
        }} className="hover:text-brand-green">Preços</button>
      </div>

      <div className="flex items-center gap-4">
        <button onClick={toggleTheme} className="p-2 rounded-full hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors">
          {isDark ? <SunIcon className="w-6 h-6 text-yellow-400" /> : <MoonIcon className="w-6 h-6 text-slate-600" />}
        </button>
        
        {user.isLoggedIn ? (
          <div className="flex items-center gap-3 bg-slate-100 dark:bg-slate-800 p-1.5 pr-4 rounded-2xl">
             <div className="w-8 h-8 rounded-full bg-brand-green text-white flex items-center justify-center font-black text-xs">
               {user.name.charAt(0)}
             </div>
             <div className="flex flex-col">
                <div className="flex items-center gap-1">
                   <p className="text-[10px] font-black dark:text-white leading-none truncate max-w-[80px]">{user.name}</p>
                   {/* MOCK BADGE */}
                   {user.plan === 'premium' && (
                     <span className="bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-300 text-[8px] font-bold px-1 rounded border border-purple-200 dark:border-purple-800">
                   PREMIUM
                 </span>
                  )}
                </div>
                <p className="text-[9px] text-slate-500 uppercase font-black">{user.plan}</p>
             </div>
             <button onClick={logout} className="ml-2 text-slate-400 hover:text-red-500"><LockClosedIcon className="w-4 h-4" /></button>
          </div>
        ) : (
          <button onClick={() => setView(ViewState.LOGIN)} className="flex items-center gap-2 bg-slate-100 dark:bg-slate-800 px-4 py-2 rounded-xl text-sm font-bold hover:bg-slate-200 dark:hover:bg-slate-700">
            <UserCircleIcon className="w-5 h-5 text-slate-500" /> Entrar
          </button>
        )}
      </div>
    </nav>
  );

  const renderLanding = () => (
    <div className="flex flex-col">
      {/* HERO */}
      <section className="max-w-7xl mx-auto px-6 py-20 md:py-32 flex flex-col md:flex-row items-center gap-16">
        <div className="flex-1 animate-in fade-in slide-in-from-left-8 duration-700">
          <div className="inline-flex items-center gap-2 bg-brand-green/10 text-brand-green px-4 py-2 rounded-full text-xs font-black uppercase tracking-widest mb-8">
            <SparklesIcon className="w-4 h-4" /> Planilhas Inteligentes
          </div>
          <h1 className="text-5xl md:text-7xl font-black text-slate-900 dark:text-white leading-tight mb-8 tracking-tighter">
            OrganizaDin — Sua planilha financeira pronta em <span className="text-brand-green">1 minuto.</span>
          </h1>
          <p className="text-xl text-slate-600 dark:text-slate-400 mb-12 max-w-xl leading-relaxed font-medium">
            Esqueça fórmulas complexas. Responda perguntas rápidas e receba um dashboard Excel profissional feito sob medida para sua realidade.
          </p>
          <div className="flex flex-col sm:flex-row gap-4">
            <button 
              onClick={() => { if (checkLimitBeforeStart()) { setView(ViewState.WIZARD); setStepIndex(0); } }}
              className="bg-brand-green text-white px-10 py-5 rounded-2xl text-xl font-black shadow-2xl shadow-brand-green/30 hover:scale-105 transition-all flex items-center justify-center gap-4 group"
            >
              Gerar minha planilha grátis
              <RocketLaunchIcon className="w-6 h-6 group-hover:translate-x-2 transition-transform" />
            </button>
            <button onClick={() => document.getElementById('how-it-works')?.scrollIntoView({behavior: 'smooth'})} className="px-10 py-5 rounded-2xl text-lg font-bold text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors">
              Ver como funciona
            </button>
          </div>
          <div className="mt-8 flex gap-6 text-sm font-bold text-slate-500">
             <span className="flex items-center gap-1"><CheckCircleIcon className="w-4 h-4 text-brand-green"/> Sem cartão</span>
             <span className="flex items-center gap-1"><CheckCircleIcon className="w-4 h-4 text-brand-green"/> Download imediato</span>
             <span className="flex items-center gap-1"><CheckCircleIcon className="w-4 h-4 text-brand-green"/> Feito para brasileiros</span>
          </div>
        </div>
        <div className="flex-1 w-full max-w-xl relative">
           <div className="absolute -inset-4 bg-gradient-to-r from-brand-green to-brand-orange opacity-20 blur-3xl rounded-full"></div>
           <div className="bg-white dark:bg-slate-800 p-2 rounded-[24px] shadow-2xl border border-slate-200 dark:border-slate-700 relative">
              <img src="https://images.unsplash.com/photo-1460925895917-afdab827c52f?auto=format&fit=crop&q=80&w=800" className="rounded-[20px] shadow-sm" alt="Excel Dashboard" />
           </div>
        </div>
      </section>

      {/* HOW IT WORKS */}
      <section id="how-it-works" className="bg-slate-50 dark:bg-slate-900/50 py-24">
        <div className="max-w-7xl mx-auto px-6">
            <div className="text-center mb-16">
                <h2 className="text-3xl md:text-5xl font-black dark:text-white mb-6">Como funciona?</h2>
                <p className="text-slate-500 text-lg">Três passos simples para sua liberdade financeira.</p>
            </div>
            <div className="grid md:grid-cols-3 gap-8">
                {[
                    {step: "01", title: "Perfil Rápido", desc: "Responda perguntas sobre sua renda e datas de pagamento."},
                    {step: "02", title: "Personalize", desc: "Defina suas categorias de gastos e orçamentos mensais."},
                    {step: "03", title: "Baixe e Use", desc: "Receba o arquivo .xlsx pronto com gráficos e fórmulas."}
                ].map((s, i) => (
                    <div key={i} className="bg-white dark:bg-slate-800 p-8 rounded-3xl shadow-sm relative overflow-hidden group hover:-translate-y-2 transition-transform duration-300">
                        <div className="text-6xl font-black text-slate-100 dark:text-slate-700 absolute -right-4 -top-4">{s.step}</div>
                        <div className="relative z-10">
                            <div className="w-12 h-12 bg-brand-green/10 rounded-xl flex items-center justify-center mb-6">
                                <ArrowPathIcon className="w-6 h-6 text-brand-green" />
                            </div>
                            <h3 className="text-xl font-black dark:text-white mb-2">{s.title}</h3>
                            <p className="text-slate-500 font-medium">{s.desc}</p>
                        </div>
                    </div>
                ))}
            </div>
        </div>
      </section>

      {/* FEATURES GRID */}
      <section className="py-24 max-w-7xl mx-auto px-6">
        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
            {[
                {icon: TableCellsIcon, t: "Fórmulas Automáticas", d: "Somas e projeções já configuradas."},
                {icon: ChartBarIcon, t: "Gráficos Nativos", d: "Visuais reais do Excel, não imagens."},
                {icon: AdjustmentsHorizontalIcon, t: "Categorias", d: "Totalmente adaptável à sua vida."},
                {icon: BanknotesIcon, t: "Reserva Mensal", d: "Planeje quanto quer poupar."},
                {icon: CalendarIcon, t: "Contas Fixas", d: "Área dedicada para boletos recorrentes."},
                {icon: DocumentArrowDownIcon, t: "Relatórios", d: "Resumos mensais de performance."},
                {icon: ShieldCheckIcon, t: "Privacidade", d: "Seus dados ficam apenas no seu PC."},
                {icon: SparklesIcon, t: "Layout Premium", d: "Design limpo e profissional."}
            ].map((f, i) => (
                <div key={i} className="flex gap-4 items-start p-4 rounded-2xl hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors">
                    <f.icon className="w-8 h-8 text-brand-green shrink-0" />
                    <div>
                        <h4 className="font-bold dark:text-white">{f.t}</h4>
                        <p className="text-sm text-slate-500 font-medium">{f.d}</p>
                    </div>
                </div>
            ))}
        </div>
      </section>

      {/* PRICING */}
      <section id="pricing" className="bg-slate-900 text-white py-24 rounded-[40px] mb-20 mx-4 md:mx-auto max-w-7xl">
         <div className="text-center mb-16">
            <h2 className="text-4xl font-black mb-4">Escolha seu plano</h2>
            <p className="text-slate-400">Invista na sua organização.</p>
         </div>
         <div className="grid md:grid-cols-2 gap-8 px-6 md:px-20 max-w-4xl mx-auto">
            {/* FREE */}
            <div className="bg-slate-800 p-8 rounded-3xl border border-slate-700">
                <div className="text-2xl font-black mb-2">Grátis</div>
                <div className="text-4xl font-black mb-6">R$ 0</div>
                <ul className="space-y-4 mb-8 text-sm text-slate-300 font-bold">
                    <li className="flex gap-2"><CheckCircleIcon className="w-5 h-5 text-brand-green"/> 1 Geração (Visitante)</li>
                    <li className="flex gap-2"><CheckCircleIcon className="w-5 h-5 text-brand-green"/> +1 Geração (com Login)</li>
                    <li className="flex gap-2"><CheckCircleIcon className="w-5 h-5 text-brand-green"/> Planilha Básica (sem gráficos)</li>
                </ul>
                <button onClick={() => { if(checkLimitBeforeStart()){ setView(ViewState.WIZARD); setStepIndex(0); }}} className="w-full py-4 bg-slate-700 rounded-xl font-bold hover:bg-slate-600 transition-colors">Começar Grátis</button>
            </div>
            
             {/* PREMIUM MENSAL */}
             <div className="bg-brand-green p-8 rounded-3xl shadow-2xl scale-105 relative border-2 border-white/20">
                <div className="absolute top-0 right-0 bg-white text-brand-green text-xs font-black px-3 py-1 rounded-bl-xl rounded-tr-2xl uppercase">Mais Popular</div>
                <div className="text-2xl font-black mb-2">Premium Mensal</div>
                <div className="text-4xl font-black mb-6">R$ 29,90<span className="text-base font-medium">/mês</span></div>
                <ul className="space-y-4 mb-8 text-sm text-white font-bold">
                    <li className="flex gap-2"><CheckCircleIcon className="w-5 h-5 text-white"/> Gerações Ilimitadas</li>
                    <li className="flex gap-2"><CheckCircleIcon className="w-5 h-5 text-white"/> Dashboard com Gráficos</li>
                    <li className="flex gap-2"><CheckCircleIcon className="w-5 h-5 text-white"/> Abas Premium (Dívidas)</li>
                </ul>
                <button className="w-full py-4 bg-white text-brand-green rounded-xl font-black hover:brightness-95 transition-colors">Assinar Premium Mensal</button>
            </div>
         </div>
      </section>

      {/* FAQ */}
      <section className="max-w-4xl mx-auto px-6 pb-24">
        <h2 className="text-3xl font-black dark:text-white mb-12 text-center">Perguntas Frequentes</h2>
        <div className="space-y-4">
            {[
                {q: "Preciso saber Excel?", a: "Não! A planilha já vem pronta com todas as fórmulas. Você só preenche os valores."},
                {q: "Funciona no celular?", a: "Sim, se você tiver o app do Excel ou Google Sheets instalado."},
                {q: "Funciona no Google Sheets?", a: "Sim! O arquivo .xlsx gerado é totalmente compatível com Google Sheets."},
                {q: "Preciso pagar para testar?", a: "Não. Você pode gerar planilhas gratuitamente todos os meses."},
                {q: "Os dados ficam salvos onde?", a: "Apenas no arquivo que você baixa. Não salvamos seus dados financeiros em nossos servidores."}
            ].map((faq, i) => (
                <div key={i} className="bg-white dark:bg-slate-800 p-6 rounded-2xl border border-slate-100 dark:border-slate-700">
                    <h3 className="font-bold dark:text-white mb-2">{faq.q}</h3>
                    <p className="text-slate-500 text-sm">{faq.a}</p>
                </div>
            ))}
        </div>
      </section>

      {/* FOOTER */}
      <footer className="bg-slate-50 dark:bg-slate-900 py-12 border-t border-slate-200 dark:border-slate-800">
        <div className="max-w-7xl mx-auto px-6 flex flex-col md:flex-row justify-between items-center gap-6">
            <div className="flex items-center gap-2">
                <div className="bg-slate-200 dark:bg-slate-800 p-2 rounded-lg font-bold text-slate-500">OD</div>
                <span className="font-bold text-slate-500">OrganizaDin © 2024</span>
            </div>
            <div className="flex gap-6 text-sm font-bold text-slate-400">
                <a href="#" className="hover:text-brand-green">Termos</a>
                <a href="#" className="hover:text-brand-green">Privacidade</a>
            </div>
        </div>
      </footer>
    </div>
  );

  const renderWizard = () => {
    return (
      <div className="max-w-4xl mx-auto py-12 px-6">
        <div className="mb-8">
            <div className="flex items-center justify-between mb-4">
               <button onClick={() => {
                   if (stepIndex > 0) setStepIndex(stepIndex - 1);
                   else setView(ViewState.LANDING);
               }} className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200">
                   <ChevronLeftIcon className="w-6 h-6" />
               </button>
               <span className="font-bold text-slate-400">Passo {stepIndex + 1} de 4</span>
            </div>
            <div className="h-2 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                <div className="h-full bg-brand-green transition-all duration-500" style={{ width: `${((stepIndex + 1) / 4) * 100}%` }}></div>
            </div>
        </div>

        {stepIndex === 0 && (
            <div className="space-y-6 animate-in fade-in slide-in-from-right-8 duration-500">
                <h2 className="text-3xl font-black dark:text-white">Vamos começar pelo básico.</h2>
                <div className="space-y-4">
                    <div>
                        <label className="block text-sm font-bold text-slate-500 mb-2">Qual seu objetivo principal?</label>
                        <input 
                          type="text" 
                          value={onboarding.goal}
                          onChange={e => setOnboarding({...onboarding, goal: e.target.value})}
                          className="w-full p-4 rounded-xl bg-slate-50 dark:bg-slate-800 border-2 border-transparent focus:border-brand-green outline-none font-bold"
                          placeholder="Ex: Comprar um carro, Sair das dívidas..."
                        />
                    </div>
                    <div>
                        <label className="block text-sm font-bold text-slate-500 mb-2">Qual sua renda mensal aproximada?</label>
                        <input 
                          type="number" 
                          value={onboarding.income}
                          onChange={e => setOnboarding({...onboarding, income: e.target.value})}
                          className="w-full p-4 rounded-xl bg-slate-50 dark:bg-slate-800 border-2 border-transparent focus:border-brand-green outline-none font-bold"
                          placeholder="R$ 0,00"
                        />
                    </div>
                    <div>
                        <label className="block text-sm font-bold text-slate-500 mb-2">Dia de início do mês financeiro</label>
                        <input 
                          type="number" 
                          min="1" max="28"
                          value={onboarding.startDay}
                          onChange={e => setOnboarding({...onboarding, startDay: parseInt(e.target.value) || 1})}
                          className="w-full p-4 rounded-xl bg-slate-50 dark:bg-slate-800 border-2 border-transparent focus:border-brand-green outline-none font-bold"
                        />
                    </div>
                </div>
                <button onClick={() => setStepIndex(1)} className="w-full py-4 bg-brand-green text-white font-bold rounded-xl mt-8">Continuar</button>
            </div>
        )}

        {stepIndex === 1 && (
            <div className="space-y-6 animate-in fade-in slide-in-from-right-8 duration-500">
                <h2 className="text-3xl font-black dark:text-white">Defina seus tetos de gastos.</h2>
                <p className="text-slate-500">Quanto você planeja gastar em cada categoria?</p>
                
                <div className="grid md:grid-cols-2 gap-4">
                    {onboarding.categories.map(cat => (
                        <div key={cat} className="bg-slate-50 dark:bg-slate-800 p-4 rounded-xl flex items-center gap-4">
                            {React.createElement(CATEGORY_ICONS[cat] || SquaresPlusIcon, { className: "w-8 h-8 text-slate-400" })}
                            <div className="flex-1">
                                <p className="font-bold text-sm dark:text-white">{cat}</p>
                            </div>
                            <input 
                                type="number" 
                                placeholder="R$ 0"
                                value={onboarding.budgets[cat] || ''}
                                onChange={e => setOnboarding({
                                    ...onboarding,
                                    budgets: { ...onboarding.budgets, [cat]: e.target.value }
                                })}
                                className="w-24 p-2 rounded-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 font-bold text-right outline-none focus:border-brand-green"
                            />
                        </div>
                    ))}
                </div>
                <button onClick={() => setStepIndex(2)} className="w-full py-4 bg-brand-green text-white font-bold rounded-xl mt-8">Continuar</button>
            </div>
        )}

        {stepIndex === 2 && (
            <div className="space-y-6 animate-in fade-in slide-in-from-right-8 duration-500">
                <h2 className="text-3xl font-black dark:text-white">Contas Fixas & Recorrentes</h2>
                <p className="text-slate-500">Adicione aluguel, internet, academia...</p>

                <div className="bg-slate-50 dark:bg-slate-800 p-6 rounded-2xl space-y-4">
                     <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                        <input 
                            placeholder="Nome (ex: Internet)" 
                            value={newRecurring.name}
                            onChange={e => setNewRecurring({...newRecurring, name: e.target.value})}
                            className="p-3 rounded-xl bg-white dark:bg-slate-900 outline-none border focus:border-brand-green"
                        />
                        <input 
                            type="number"
                            placeholder="Valor" 
                            value={newRecurring.value || ''}
                            onChange={e => setNewRecurring({...newRecurring, value: parseFloat(e.target.value)})}
                            className="p-3 rounded-xl bg-white dark:bg-slate-900 outline-none border focus:border-brand-green"
                        />
                        <select 
                             value={newRecurring.category}
                             onChange={e => setNewRecurring({...newRecurring, category: e.target.value})}
                             className="p-3 rounded-xl bg-white dark:bg-slate-900 outline-none border focus:border-brand-green"
                        >
                            {onboarding.categories.map(c => <option key={c} value={c}>{c}</option>)}
                        </select>
                        <button 
                            onClick={() => {
                                if(newRecurring.name && newRecurring.value) {
                                    setOnboarding(prev => ({
                                        ...prev,
                                        recurringItems: [...prev.recurringItems, { ...newRecurring, id: Date.now().toString(), type: 'expense' } as RecurringItem]
                                    }));
                                    setNewRecurring({ name: '', value: 0, category: 'Moradia', day: 5 });
                                }
                            }}
                            className="bg-slate-200 dark:bg-slate-700 hover:bg-brand-green hover:text-white rounded-xl font-bold transition-colors"
                        >
                            <PlusIcon className="w-6 h-6 mx-auto" />
                        </button>
                     </div>
                </div>

                <div className="space-y-2">
                    {onboarding.recurringItems.map(item => (
                        <div key={item.id} className="flex items-center justify-between p-4 bg-white dark:bg-slate-800 border border-slate-100 dark:border-slate-700 rounded-xl">
                            <div className="flex items-center gap-3">
                                <div className="p-2 bg-slate-100 dark:bg-slate-900 rounded-lg">
                                    {React.createElement(CATEGORY_ICONS[item.category] || SquaresPlusIcon, { className: "w-5 h-5 text-slate-500" })}
                                </div>
                                <div>
                                    <p className="font-bold dark:text-white">{item.name}</p>
                                    <p className="text-xs text-slate-500">{item.category} • Dia {item.day}</p>
                                </div>
                            </div>
                            <div className="flex items-center gap-4">
                                <span className="font-bold dark:text-white">R$ {item.value}</span>
                                <button onClick={() => setOnboarding(prev => ({ ...prev, recurringItems: prev.recurringItems.filter(i => i.id !== item.id)}))} className="text-red-400 hover:text-red-500">
                                    <TrashIcon className="w-5 h-5" />
                                </button>
                            </div>
                        </div>
                    ))}
                    {onboarding.recurringItems.length === 0 && (
                        <div className="text-center py-8 text-slate-400 font-medium">Nenhum item adicionado ainda.</div>
                    )}
                </div>

                <button onClick={() => setStepIndex(3)} className="w-full py-4 bg-brand-green text-white font-bold rounded-xl mt-8">Continuar</button>
            </div>
        )}

        {stepIndex === 3 && (
            <div className="space-y-6 animate-in fade-in slide-in-from-right-8 duration-500">
                <h2 className="text-3xl font-black dark:text-white">Finalizando...</h2>
                
                <div>
                    <label className="block text-sm font-bold text-slate-500 mb-2">Nome do arquivo</label>
                    <input 
                        type="text" 
                        value={onboarding.fileName}
                        onChange={e => setOnboarding({...onboarding, fileName: e.target.value})}
                        className="w-full p-4 rounded-xl bg-slate-50 dark:bg-slate-800 border-2 border-transparent focus:border-brand-green outline-none font-bold"
                    />
                </div>

                <div className="grid grid-cols-2 gap-4">
                   <div className={`p-4 rounded-xl border-2 cursor-pointer transition-all ${onboarding.theme === 'Green' ? 'border-brand-green bg-brand-green/5' : 'border-slate-200 dark:border-slate-700'}`} onClick={() => setOnboarding({...onboarding, theme: 'Green'})}>
                       <div className="w-full h-20 bg-[#1B5E20] rounded-lg mb-2"></div>
                       <p className="text-center font-bold">Verde (Padrão)</p>
                   </div>
                   <div className={`p-4 rounded-xl border-2 cursor-pointer transition-all ${onboarding.theme === 'Blue' ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20' : 'border-slate-200 dark:border-slate-700'}`} onClick={() => setOnboarding({...onboarding, theme: 'Blue'})}>
                       <div className="w-full h-20 bg-[#0D47A1] rounded-lg mb-2"></div>
                       <p className="text-center font-bold">Azul Corporativo</p>
                   </div>
                </div>

                <div className="flex gap-3 mt-4">
                    <input 
                      type="checkbox" 
                      id="exampleData"
                      checked={onboarding.useExampleData} 
                      onChange={e => setOnboarding({...onboarding, useExampleData: e.target.checked})}
                      className="w-5 h-5 accent-brand-green rounded"
                    />
                    <label htmlFor="exampleData" className="text-sm font-bold text-slate-600 dark:text-slate-400">Incluir dados de exemplo para facilitar o início</label>
                </div>

                <button onClick={startGenerationFlow} className="w-full py-4 bg-brand-green text-white font-bold rounded-xl mt-8 flex items-center justify-center gap-2">
                    <SparklesIcon className="w-6 h-6" /> Gerar Planilha
                </button>
            </div>
        )}
      </div>
    );
  };

  const renderGenerating = () => (
      <div className="flex flex-col items-center justify-center min-h-[60vh] px-6 text-center">
          <div className="w-full max-w-md bg-slate-100 dark:bg-slate-800 rounded-full h-4 mb-8 overflow-hidden">
              <div className="h-full bg-brand-green transition-all duration-300 ease-out" style={{ width: `${progress}%` }}></div>
          </div>
          <h2 className="text-3xl font-black dark:text-white mb-4 animate-pulse">{statusText}</h2>
          <p className="text-slate-500 font-medium">Estamos construindo as fórmulas e gráficos...</p>
      </div>
  );

  const renderViewer = () => (
      <div className="max-w-7xl mx-auto py-12 px-6">
          <div className="text-center mb-12">
              <div className="inline-flex items-center justify-center w-20 h-20 bg-green-100 text-green-600 rounded-full mb-6">
                  <CheckCircleIcon className="w-10 h-10" />
              </div>
              <h1 className="text-4xl font-black dark:text-white mb-4">Sua planilha está pronta!</h1>
              <p className="text-xl text-slate-500">O arquivo foi gerado com sucesso base nos seus dados.</p>
          </div>

          <div className="grid md:grid-cols-2 gap-8 mb-12">
              {/* Preview Card 1: Summary */}
              <div className="bg-white dark:bg-slate-800 p-8 rounded-3xl shadow-xl border border-slate-100 dark:border-slate-700">
                  <h3 className="font-bold text-slate-400 mb-6 uppercase tracking-wider text-xs">Resumo Financeiro</h3>
                  <div className="flex items-end justify-between mb-4">
                      <div>
                          <p className="text-sm font-bold text-slate-500">Renda Estimada</p>
                          <p className="text-2xl font-black dark:text-white">R$ {dashboardData.income.toFixed(2)}</p>
                      </div>
                      <div className="text-right">
                           <p className="text-sm font-bold text-slate-500">Despesas Planejadas</p>
                           <p className="text-2xl font-black text-orange-500">R$ {dashboardData.totalExpenses.toFixed(2)}</p>
                      </div>
                  </div>
                  <div className="h-4 bg-slate-100 dark:bg-slate-900 rounded-full overflow-hidden flex">
                      <div className="bg-orange-400 h-full" style={{ width: `${Math.min((dashboardData.totalExpenses / (dashboardData.income || 1)) * 100, 100)}%` }}></div>
                  </div>
                  <p className="text-xs text-center mt-2 font-bold text-slate-400">
                      {((dashboardData.totalExpenses / (dashboardData.income || 1)) * 100).toFixed(0)}% da renda comprometida
                  </p>
              </div>

              {/* Preview Card 2: Chart */}
              <div className="bg-white dark:bg-slate-800 p-8 rounded-3xl shadow-xl border border-slate-100 dark:border-slate-700 flex flex-col items-center justify-center">
                   <h3 className="font-bold text-slate-400 mb-2 uppercase tracking-wider text-xs w-full text-left">Distribuição</h3>
                   <div className="w-full h-48">
                      <ResponsiveContainer width="100%" height="100%">
                        <PieChart>
                            <Pie data={dashboardData.chartData} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={60} fill="#8884d8">
                                {dashboardData.chartData.map((entry, index) => (
                                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                                ))}
                            </Pie>
                            <RechartsTooltip />
                        </PieChart>
                      </ResponsiveContainer>
                   </div>
              </div>
          </div>

          <div className="flex flex-col items-center gap-4">
              <button 
                  onClick={downloadExcel} 
                  disabled={isGeneratingExcel}
                  className="bg-brand-green text-white px-12 py-5 rounded-2xl text-xl font-black shadow-2xl shadow-brand-green/30 hover:scale-105 transition-all flex items-center gap-3 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                  {isGeneratingExcel ? <ArrowPathIcon className="w-6 h-6 animate-spin" /> : <DocumentArrowDownIcon className="w-6 h-6" />}
                  {isGeneratingExcel ? 'Gerando Arquivo...' : 'Baixar Planilha Excel (.xlsx)'}
              </button>
              <button onClick={() => { setView(ViewState.LANDING); setOnboarding({ ...onboarding, recurringItems: [] }); }} className="text-slate-500 font-bold hover:text-brand-green">
                  Voltar ao Início
              </button>
          </div>
      </div>
  );

  const renderAuth = () => (
      <div className="min-h-[80vh] flex items-center justify-center p-6">
          <div className="bg-white dark:bg-slate-800 p-8 md:p-12 rounded-[32px] shadow-2xl w-full max-w-md border border-slate-100 dark:border-slate-700">
              <h2 className="text-3xl font-black mb-2 dark:text-white">{view === ViewState.LOGIN ? 'Bem-vindo de volta' : 'Crie sua conta'}</h2>
              <p className="text-slate-500 mb-8 font-medium">Salve suas gerações e acesse recursos Premium.</p>

              <form onSubmit={view === ViewState.LOGIN ? handleEmailLogin : handleEmailRegister} className="space-y-4">
                  {view === ViewState.REGISTER && (
                      <div className="bg-slate-50 dark:bg-slate-900 p-3 rounded-xl border-2 border-transparent focus-within:border-brand-green transition-colors">
                          <label className="text-xs font-black text-slate-400 uppercase ml-1">Nome</label>
                          <div className="flex items-center gap-2">
                              <UserIcon className="w-5 h-5 text-slate-400" />
                              <input 
                                  type="text" 
                                  value={authForm.name}
                                  onChange={e => setAuthForm({...authForm, name: e.target.value})}
                                  className="w-full bg-transparent outline-none font-bold dark:text-white"
                                  placeholder="Seu nome"
                              />
                          </div>
                      </div>
                  )}
                  
                  <div className="bg-slate-50 dark:bg-slate-900 p-3 rounded-xl border-2 border-transparent focus-within:border-brand-green transition-colors">
                      <label className="text-xs font-black text-slate-400 uppercase ml-1">E-mail</label>
                      <div className="flex items-center gap-2">
                          <EnvelopeIcon className="w-5 h-5 text-slate-400" />
                          <input 
                              type="email" 
                              value={authForm.email}
                              onChange={e => setAuthForm({...authForm, email: e.target.value})}
                              className="w-full bg-transparent outline-none font-bold dark:text-white"
                              placeholder="seu@email.com"
                          />
                      </div>
                  </div>

                  <div className="bg-slate-50 dark:bg-slate-900 p-3 rounded-xl border-2 border-transparent focus-within:border-brand-green transition-colors">
                      <label className="text-xs font-black text-slate-400 uppercase ml-1">Senha</label>
                      <div className="flex items-center gap-2">
                          <LockClosedIcon className="w-5 h-5 text-slate-400" />
                          <input 
                              type={showPassword ? "text" : "password"} 
                              value={authForm.password}
                              onChange={e => setAuthForm({...authForm, password: e.target.value})}
                              className="w-full bg-transparent outline-none font-bold dark:text-white"
                              placeholder="******"
                          />
                          <button type="button" onClick={() => setShowPassword(!showPassword)}>
                              {showPassword ? <EyeSlashIcon className="w-5 h-5 text-slate-400"/> : <EyeIcon className="w-5 h-5 text-slate-400"/>}
                          </button>
                      </div>
                  </div>

                  {authError && <div className="text-red-500 text-sm font-bold bg-red-50 p-3 rounded-lg flex items-center gap-2"><ExclamationCircleIcon className="w-5 h-5"/> {authError}</div>}

                  <button type="submit" disabled={authLoading} className="w-full py-4 bg-brand-green text-white font-bold rounded-xl hover:brightness-110 transition-all shadow-lg shadow-brand-green/20">
                      {authLoading ? <ArrowPathIcon className="w-6 h-6 animate-spin mx-auto" /> : (view === ViewState.LOGIN ? 'Entrar' : 'Cadastrar Grátis')}
                  </button>
              </form>
              
              <div className="relative my-8">
                  <div className="absolute inset-0 flex items-center"><div className="w-full border-t border-slate-200 dark:border-slate-700"></div></div>
                  <div className="relative flex justify-center text-sm"><span className="px-2 bg-white dark:bg-slate-800 text-slate-400 font-bold">ou continue com</span></div>
              </div>

              <button onClick={handleGoogleLogin} disabled={authLoading} className="w-full py-4 bg-white dark:bg-slate-700 border-2 border-slate-100 dark:border-slate-600 rounded-xl font-bold flex items-center justify-center gap-3 hover:bg-slate-50 dark:hover:bg-slate-600 transition-colors">
                  <img src="https://www.gstatic.com/firebasejs/ui/2.0.0/images/auth/google.svg" className="w-5 h-5" alt="Google" />
                  Google
              </button>

              <div className="text-center mt-8">
                  <button onClick={() => { setView(view === ViewState.LOGIN ? ViewState.REGISTER : ViewState.LOGIN); setAuthError(''); }} className="text-slate-500 font-bold hover:text-brand-green">
                      {view === ViewState.LOGIN ? 'Não tem conta? Crie agora' : 'Já tem conta? Entrar'}
                  </button>
              </div>
          </div>
      </div>
  );

  return (
    <div className={`min-h-screen bg-white dark:bg-slate-950 text-slate-900 dark:text-slate-100 font-sans transition-colors duration-300 selection:bg-brand-green/30 ${isDark ? 'dark' : ''}`}>
        <Navbar />
        <main className="flex-1 w-full relative">
            {view === ViewState.LANDING && renderLanding()}
            {view === ViewState.WIZARD && renderWizard()}
            {view === ViewState.GENERATING && renderGenerating()}
            {view === ViewState.VIEWER && renderViewer()}
            {(view === ViewState.LOGIN || view === ViewState.REGISTER) && renderAuth()}
        </main>
        
        {/* Limit Modal */}
        {showLimitModal && (
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
                <div className="bg-white dark:bg-slate-800 p-8 rounded-3xl max-w-md w-full shadow-2xl relative animate-in fade-in zoom-in duration-300">
                    <div className="w-16 h-16 bg-orange-100 text-orange-500 rounded-full flex items-center justify-center mb-6 mx-auto">
                        <LockClosedIcon className="w-8 h-8" />
                    </div>
                    <h3 className="text-2xl font-black mb-4 dark:text-white text-center">Limite Diário Atingido</h3>
                    <p className="text-slate-500 mb-8 text-center font-medium">Você atingiu o limite de gerações gratuitas por hoje. Crie uma conta ou volte amanhã!</p>
                    <div className="flex flex-col gap-3">
                        {!user.isLoggedIn && (
                            <button onClick={() => { setShowLimitModal(false); setView(ViewState.REGISTER); }} className="w-full py-3 bg-brand-green text-white font-bold rounded-xl shadow-lg shadow-brand-green/20">
                                Criar Conta Grátis
                            </button>
                        )}
                        <button onClick={() => setShowLimitModal(false)} className="w-full py-3 bg-slate-100 dark:bg-slate-700 font-bold rounded-xl text-slate-500 hover:bg-slate-200 dark:hover:bg-slate-600 transition-colors">
                            Fechar
                        </button>
                    </div>
                </div>
            </div>
        )}
    </div>
  );
}
