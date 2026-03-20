/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import * as React from 'react';
import { useState, useEffect, Component } from 'react';
import { 
  LayoutDashboard, 
  MessageSquare, 
  Video, 
  FileSpreadsheet, 
  MessageCircle, 
  MapPin, 
  ExternalLink,
  Plus,
  Settings,
  Bell,
  Search,
  ChevronRight,
  Globe,
  Zap,
  ClipboardList
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { db, auth } from './firebase';
import { 
  collection, 
  onSnapshot, 
  query, 
  orderBy, 
  limit, 
  addDoc, 
  serverTimestamp,
  doc,
  updateDoc,
  increment,
  getDoc,
  setDoc,
  getDocFromServer
} from 'firebase/firestore';
import { 
  signInWithPopup, 
  GoogleAuthProvider, 
  onAuthStateChanged,
  signOut,
  User
} from 'firebase/auth';

enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

interface FirestoreErrorInfo {
  error: string;
  operationType: OperationType;
  path: string | null;
  authInfo: {
    userId: string | undefined;
    email: string | null | undefined;
    emailVerified: boolean | undefined;
    isAnonymous: boolean | undefined;
    tenantId: string | null | undefined;
    providerInfo: {
      providerId: string;
      displayName: string | null;
      email: string | null;
      photoUrl: string | null;
    }[];
  }
}

function handleFirestoreError(error: unknown, operationType: OperationType, path: string | null) {
  const errInfo: FirestoreErrorInfo = {
    error: error instanceof Error ? error.message : String(error),
    authInfo: {
      userId: auth.currentUser?.uid,
      email: auth.currentUser?.email,
      emailVerified: auth.currentUser?.emailVerified,
      isAnonymous: auth.currentUser?.isAnonymous,
      tenantId: auth.currentUser?.tenantId,
      providerInfo: auth.currentUser?.providerData.map(provider => ({
        providerId: provider.providerId,
        displayName: provider.displayName,
        email: provider.email,
        photoUrl: provider.photoURL
      })) || []
    },
    operationType,
    path
  }
  console.error('Firestore Error: ', JSON.stringify(errInfo));
  throw new Error(JSON.stringify(errInfo));
}

interface ErrorBoundaryProps {
  children: React.ReactNode;
}

interface ErrorBoundaryState {
  hasError: boolean;
  error: any;
}

class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  state: ErrorBoundaryState = { hasError: false, error: null };
  props: ErrorBoundaryProps;
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.props = props;
  }

  static getDerivedStateFromError(error: any) {
    return { hasError: true, error };
  }

  render() {
    if (this.state.hasError) {
      let message = "Something went wrong.";
      try {
        const parsed = JSON.parse(this.state.error.message);
        if (parsed.error) message = `Database Error: ${parsed.error}`;
      } catch (e) {
        message = this.state.error.message || message;
      }

      return (
        <div className="min-h-screen flex items-center justify-center bg-slate-50 p-4">
          <div className="bg-white p-8 rounded-2xl shadow-xl border border-slate-200 max-w-md w-full text-center">
            <div className="w-16 h-16 bg-rose-100 text-rose-600 rounded-full flex items-center justify-center mx-auto mb-6">
              <Bell className="w-8 h-8" />
            </div>
            <h2 className="text-2xl font-bold text-slate-900 mb-2">Application Error</h2>
            <p className="text-slate-600 mb-6">{message}</p>
            <button 
              onClick={() => window.location.reload()}
              className="w-full py-3 bg-indigo-600 text-white rounded-xl font-bold hover:bg-indigo-700 transition-all"
            >
              Reload Application
            </button>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}

type Branch = 'I-Sihat Setapak' | 'I-Sihat Sentul' | 'I-Sihat Bukit Jalil' | 'T.Low Petaling Jaya';

interface Tool {
  id: string;
  name: string;
  icon: React.ReactNode;
  url: string;
  color: string;
}

const BRANCHES: Branch[] = ['I-Sihat Setapak', 'I-Sihat Sentul', 'I-Sihat Bukit Jalil', 'T.Low Petaling Jaya'];

const BRANCH_TOOLS: Tool[] = [
  { 
    id: 'whatsapp', 
    name: 'WhatsApp Business', 
    icon: <MessageSquare className="w-5 h-5" />, 
    url: 'https://web.whatsapp.com', 
    color: 'bg-emerald-500' 
  },
  { 
    id: 'tiktok', 
    name: 'TikTok Business', 
    icon: <Video className="w-5 h-5" />, 
    url: 'https://www.tiktok.com/business', 
    color: 'bg-black' 
  },
  { 
    id: 'kreloses', 
    name: 'Kreloses', 
    icon: <ClipboardList className="w-5 h-5" />, 
    url: 'https://www.kreloses.com/account/login', 
    color: 'bg-indigo-500' 
  },
];

const CENTRAL_TOOLS: Tool[] = [
  { 
    id: 'sheets', 
    name: 'Google Sheets', 
    icon: <FileSpreadsheet className="w-5 h-5" />, 
    url: 'https://docs.google.com/spreadsheets', 
    color: 'bg-green-600' 
  },
  { 
    id: 'lark', 
    name: 'Lark Suite', 
    icon: <MessageCircle className="w-5 h-5" />, 
    url: 'https://www.larksuite.com', 
    color: 'bg-blue-600' 
  },
  { 
    id: 'tiktok-central', 
    name: 'TikTok Business (Master)', 
    icon: <Video className="w-5 h-5" />, 
    url: 'https://www.tiktok.com/business', 
    color: 'bg-black' 
  },
];

type ViewMode = 'branch' | 'global' | 'central';

interface SavedLink {
  id: string;
  name: string;
  url: string;
}

interface Notification {
  id: string;
  branch: string;
  message: string;
  time: string;
  isNew: boolean;
  type: 'unread' | 'new';
  createdAt: any;
}

export default function App() {
  return (
    <ErrorBoundary>
      <AppContent />
    </ErrorBoundary>
  );
}

function AppContent() {
  const [activeBranch, setActiveBranch] = useState<Branch>('I-Sihat Setapak');
  const [viewMode, setViewMode] = useState<ViewMode>('branch');
  const [searchQuery, setSearchQuery] = useState('');
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [branchStatus, setBranchStatus] = useState<{ [key: string]: number }>({});
  const [isAuthReady, setIsAuthReady] = useState(false);
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [loginError, setLoginError] = useState<string | null>(null);
  const [isLoggingIn, setIsLoggingIn] = useState(false);

  // Link management: { [toolId: string]: SavedLink[] }
  const [links, setLinks] = useState<{ [key: string]: SavedLink[] }>(() => {
    const saved = localStorage.getItem('central_links_v2');
    if (saved) return JSON.parse(saved);
    
    // Migration from old single-link format or default
    const oldSaved = localStorage.getItem('central_links');
    if (oldSaved) {
      const oldLinks = JSON.parse(oldSaved);
      return {
        sheets: [{ id: '1', name: 'Master Sheet', url: oldLinks.sheets || 'https://docs.google.com/spreadsheets' }],
        lark: [{ id: '2', name: 'Master Lark', url: oldLinks.lark || 'https://www.larksuite.com' }],
        'tiktok-central': [{ id: '3', name: 'Master TikTok', url: oldLinks['tiktok-central'] || 'https://www.tiktok.com/business' }]
      };
    }

    return {
      sheets: [{ id: '1', name: 'Master Sheet', url: 'https://docs.google.com/spreadsheets' }],
      lark: [{ id: '2', name: 'Master Lark', url: 'https://www.larksuite.com' }],
      'tiktok-central': [{ id: '3', name: 'Master TikTok', url: 'https://www.tiktok.com/business' }]
    };
  });

  // Initialize Auth and Listeners
  useEffect(() => {
    // Connection test
    const testConnection = async () => {
      try {
        await getDocFromServer(doc(db, 'test', 'connection'));
      } catch (error) {
        if (error instanceof Error && error.message.includes('the client is offline')) {
          console.error("Please check your Firebase configuration.");
          setLoginError("Database connection failed. Please check your Firebase configuration.");
        }
      }
    };
    testConnection();

    const unsubscribeAuth = onAuthStateChanged(auth, (user) => {
      setCurrentUser(user);
      setIsAuthReady(true);
    });

    return () => unsubscribeAuth();
  }, []);

  // Listen for Notifications
  useEffect(() => {
    if (!isAuthReady || !currentUser) return;

    const q = query(
      collection(db, 'notifications'),
      orderBy('createdAt', 'desc'),
      limit(10)
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const notifs = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as Notification[];
      setNotifications(notifs);
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, 'notifications');
    });

    return () => unsubscribe();
  }, [isAuthReady, currentUser]);

  // Listen for Branch Status
  useEffect(() => {
    if (!isAuthReady || !currentUser) return;

    const unsubscribe = onSnapshot(collection(db, 'branches'), (snapshot) => {
      const status: { [key: string]: number } = {};
      snapshot.docs.forEach(doc => {
        status[doc.data().name] = doc.data().unreadCount || 0;
      });
      setBranchStatus(status);
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, 'branches');
    });

    return () => unsubscribe();
  }, [isAuthReady, currentUser]);

  const handleLogin = async () => {
    setIsLoggingIn(true);
    setLoginError(null);
    const provider = new GoogleAuthProvider();
    try {
      const result = await signInWithPopup(auth, provider);
      const user = result.user;
      
      // Create user document if it doesn't exist
      const userRef = doc(db, 'users', user.uid);
      const userSnap = await getDoc(userRef);
      if (!userSnap.exists()) {
        await setDoc(userRef, {
          email: user.email,
          displayName: user.displayName,
          role: user.email === 'isihatcustserviceshasha@gmail.com' ? 'admin' : 'user',
          createdAt: serverTimestamp()
        });
      }
    } catch (error: any) {
      console.error("Login failed:", error);
      if (error.code === 'auth/popup-blocked') {
        setLoginError("Sign-in popup was blocked by your browser. Please allow popups for this site.");
      } else if (error.code === 'auth/cancelled-popup-request') {
        // Ignore user cancellation
      } else {
        setLoginError(error.message || "Login failed. Please try again.");
      }
    } finally {
      setIsLoggingIn(false);
    }
  };

  const handleLogout = async () => {
    try {
      await signOut(auth);
    } catch (error) {
      console.error("Logout failed:", error);
    }
  };

  // Simulation Function
  const simulateWebhook = async () => {
    if (!currentUser) return;

    const randomBranch = BRANCHES[Math.floor(Math.random() * BRANCHES.length)];
    const messages = [
      "Price inquiry for service",
      "Appointment confirmation",
      "Where is your location?",
      "Can I book for tomorrow?",
      "Thank you for the info"
    ];
    const randomMsg = messages[Math.floor(Math.random() * messages.length)];
    const type = Math.random() > 0.5 ? 'unread' : 'new';

    try {
      // 1. Add Notification
      await addDoc(collection(db, 'notifications'), {
        branch: randomBranch,
        message: randomMsg,
        time: 'Just now',
        isNew: true,
        type,
        createdAt: serverTimestamp()
      });

      // 2. Update Branch Count
      const branchId = randomBranch.replace(/\s+/g, '-').toLowerCase();
      const branchRef = doc(db, 'branches', branchId);
      const branchSnap = await getDoc(branchRef);

      if (branchSnap.exists()) {
        await updateDoc(branchRef, {
          unreadCount: increment(1)
        });
      } else {
        await setDoc(branchRef, {
          name: randomBranch,
          whatsappUrl: 'https://web.whatsapp.com',
          unreadCount: 1
        });
      }
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, 'notifications/branches');
    }
  };

  const addLink = (toolId: string, name: string, url: string) => {
    const newLink: SavedLink = { id: Date.now().toString(), name, url };
    const updatedLinks = {
      ...links,
      [toolId]: [...(links[toolId] || []), newLink]
    };
    setLinks(updatedLinks);
    localStorage.setItem('central_links_v2', JSON.stringify(updatedLinks));
  };

  const removeLink = (toolId: string, linkId: string) => {
    const updatedLinks = {
      ...links,
      [toolId]: (links[toolId] || []).filter(l => l.id !== linkId)
    };
    setLinks(updatedLinks);
    localStorage.setItem('central_links_v2', JSON.stringify(updatedLinks));
  };

  const handleLaunch = (url: string) => {
    window.open(url, '_blank');
  };

  const handleLaunchFirst = (toolId: string, defaultUrl: string) => {
    const toolLinks = links[toolId] || [];
    const urlToOpen = toolLinks.length > 0 ? toolLinks[0].url : defaultUrl;
    window.open(urlToOpen, '_blank');
  };

  const getToolsForBranch = (branch: Branch) => {
    // Kreloses and WhatsApp for all branches
    // TikTok only for T.Low Petaling Jaya
    let tools = BRANCH_TOOLS;
    if (branch !== 'T.Low Petaling Jaya') {
      tools = tools.filter(t => t.id !== 'tiktok');
    }
    
    return tools.map(tool => ({
      ...tool,
      url: tool.id === 'whatsapp' ? (branch === 'I-Sihat Setapak' ? 'https://web.whatsapp.com' : tool.url) : tool.url
    }));
  };

  if (!isAuthReady) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600"></div>
      </div>
    );
  }

  if (!currentUser) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50 p-4">
        <div className="bg-white p-10 rounded-3xl shadow-xl border border-slate-200 max-w-md w-full text-center">
          <div className="w-20 h-20 bg-indigo-600 rounded-2xl flex items-center justify-center text-white shadow-lg shadow-indigo-200 mx-auto mb-8">
            <LayoutDashboard className="w-10 h-10" />
          </div>
          <h2 className="text-3xl font-bold text-slate-900 mb-2">Command Center</h2>
          <p className="text-slate-500 mb-10">Please sign in with your admin account to access the dashboard.</p>
          
          {loginError && (
            <div className="mb-6 p-4 bg-rose-50 border border-rose-100 rounded-2xl text-rose-600 text-sm flex items-start gap-3 text-left">
              <Bell className="w-5 h-5 shrink-0 mt-0.5" />
              <p>{loginError}</p>
            </div>
          )}

          <button 
            onClick={handleLogin}
            disabled={isLoggingIn}
            className={`w-full py-4 bg-indigo-600 text-white rounded-2xl font-bold text-lg shadow-lg shadow-indigo-100 hover:bg-indigo-700 transition-all active:scale-95 flex items-center justify-center gap-3 ${isLoggingIn ? 'opacity-70 cursor-not-allowed' : ''}`}
          >
            {isLoggingIn ? (
              <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-white"></div>
            ) : (
              <>
                <Globe className="w-6 h-6" />
                Sign in with Google
              </>
            )}
          </button>
          
          <p className="mt-6 text-xs text-slate-400">
            If nothing happens, please check if your browser is blocking popups.
          </p>
        </div>
      </div>
    );
  }

  const handleLaunchAll = (branch: Branch) => {
    getToolsForBranch(branch).forEach(tool => {
      handleLaunchFirst(tool.id, tool.url);
    });
  };

  return (
    <div className="min-h-screen bg-[#F8F9FA] flex font-sans text-slate-900">
      {/* Sidebar */}
      <aside className="w-64 bg-white border-r border-slate-200 flex flex-col">
        <div className="p-6 border-bottom border-slate-100">
          <div className="flex items-center gap-3 mb-8">
            <div className="w-10 h-10 bg-indigo-600 rounded-xl flex items-center justify-center text-white shadow-lg shadow-indigo-200">
              <LayoutDashboard className="w-6 h-6" />
            </div>
            <h1 className="font-bold text-xl tracking-tight">Command</h1>
          </div>

          <nav className="space-y-1">
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-4 px-3">Views</p>
            <button
              onClick={() => setViewMode('global')}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all ${
                viewMode === 'global' ? 'bg-indigo-50 text-indigo-700 shadow-sm' : 'text-slate-500 hover:bg-slate-50'
              }`}
            >
              <Globe className="w-4 h-4" />
              <span className="text-sm font-medium">Global Overview</span>
            </button>

            <button
              onClick={() => setViewMode('central')}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all ${
                viewMode === 'central' ? 'bg-indigo-50 text-indigo-700 shadow-sm' : 'text-slate-500 hover:bg-slate-50'
              }`}
            >
              <FileSpreadsheet className="w-4 h-4" />
              <span className="text-sm font-medium">Centralized Hub</span>
            </button>

            <div className="pt-4">
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-4 px-3">Branches</p>
              {BRANCHES.map((branch) => (
                <button
                  key={branch}
                  onClick={() => {
                    setActiveBranch(branch);
                    setViewMode('branch');
                  }}
                  className={`w-full flex items-center justify-between px-4 py-3 rounded-xl transition-all duration-200 group ${
                    viewMode === 'branch' && activeBranch === branch 
                      ? 'bg-indigo-50 text-indigo-700 shadow-sm' 
                      : 'text-slate-500 hover:bg-slate-50 hover:text-slate-700'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <MapPin className={`w-4 h-4 ${viewMode === 'branch' && activeBranch === branch ? 'text-indigo-600' : 'text-slate-400'}`} />
                    <span className="text-sm font-medium">{branch}</span>
                  </div>
                  {viewMode === 'branch' && activeBranch === branch && (
                    <motion.div layoutId="active-indicator">
                      <ChevronRight className="w-4 h-4 text-indigo-400" />
                    </motion.div>
                  )}
                </button>
              ))}
            </div>
          </nav>
        </div>

        <div className="mt-auto p-6 border-t border-slate-100">
          <button 
            onClick={handleLogout}
            className="w-full flex items-center gap-3 px-4 py-3 text-slate-500 hover:bg-rose-50 hover:text-rose-600 rounded-xl transition-colors"
          >
            <Plus className="w-4 h-4 rotate-45" />
            <span className="text-sm font-medium">Logout</span>
          </button>
          <button className="w-full flex items-center gap-3 px-4 py-3 text-slate-500 hover:bg-slate-50 rounded-xl transition-colors mt-2">
            <Settings className="w-4 h-4" />
            <span className="text-sm font-medium">Settings</span>
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 flex flex-col min-w-0">
        {/* Header */}
        <header className="h-20 bg-white border-b border-slate-200 px-8 flex items-center justify-between">
          <div className="flex items-center gap-4 flex-1 max-w-xl">
            <div className="relative w-full">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <input 
                type="text" 
                placeholder="Search tools or branches..." 
                className="w-full pl-10 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
          </div>

          <div className="flex items-center gap-4">
            <button className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-50 rounded-lg transition-colors relative">
              <Bell className="w-5 h-5" />
              <span className="absolute top-2 right-2 w-2 h-2 bg-rose-500 rounded-full border-2 border-white"></span>
            </button>
            <div className="h-8 w-[1px] bg-slate-200 mx-2"></div>
            <div className="flex items-center gap-3">
              <div className="text-right hidden sm:block">
                <p className="text-sm font-bold text-slate-900 leading-none">{currentUser.displayName || 'Admin User'}</p>
                <p className="text-[10px] text-slate-500 font-medium uppercase tracking-wider mt-1">{currentUser.email === 'isihatcustserviceshasha@gmail.com' ? 'Super Admin' : 'Staff'}</p>
              </div>
              <div className="w-10 h-10 bg-slate-200 rounded-full border-2 border-white shadow-sm overflow-hidden">
                <img src={currentUser.photoURL || "https://picsum.photos/seed/admin/100/100"} alt="Avatar" referrerPolicy="no-referrer" />
              </div>
            </div>
          </div>
        </header>

        {/* Dashboard Area */}
        <div className="p-8 overflow-y-auto">
          <div className="max-w-6xl mx-auto">
            {viewMode === 'branch' ? (
              <>
                <div className="flex items-end justify-between mb-8">
                  <div>
                    <div className="flex items-center gap-2 text-indigo-600 font-bold text-xs uppercase tracking-widest mb-2">
                      <Globe className="w-3 h-3" />
                      Active Workspace
                    </div>
                    <h2 className="text-3xl font-bold text-slate-900 tracking-tight">{activeBranch} Branch</h2>
                    <p className="text-slate-500 mt-1">Manage WhatsApp and TikTok for this location.</p>
                  </div>
                  <button 
                    onClick={() => handleLaunchAll(activeBranch)}
                    className="px-6 py-3 bg-indigo-600 text-white rounded-xl font-bold text-sm shadow-lg shadow-indigo-200 hover:bg-indigo-700 hover:shadow-indigo-300 transition-all active:scale-95 flex items-center gap-2"
                  >
                    <ExternalLink className="w-4 h-4" />
                    Launch Branch Tools
                  </button>
                </div>

                {/* Tools Grid */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-2 gap-6 mb-12">
                  <AnimatePresence mode="wait">
                    {getToolsForBranch(activeBranch).map((tool, index) => (
                      <motion.div
                        key={`${activeBranch}-${tool.id}`}
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, scale: 0.95 }}
                        transition={{ delay: index * 0.05 }}
                        className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm hover:shadow-md transition-all group cursor-pointer"
                        onClick={() => handleLaunchFirst(tool.id, tool.url)}
                      >
                        <div className={`w-12 h-12 ${tool.color} rounded-xl flex items-center justify-center text-white mb-6 shadow-lg group-hover:scale-110 transition-transform relative`}>
                          {tool.icon}
                          {tool.id === 'whatsapp' && (
                            <span className="absolute -top-2 -right-2 w-6 h-6 bg-rose-500 border-2 border-white rounded-full flex items-center justify-center text-[10px] font-bold shadow-sm">
                              {branchStatus[activeBranch] || 0}
                            </span>
                          )}
                        </div>
                        <h3 className="font-bold text-slate-900 mb-1">{tool.name}</h3>
                        <p className="text-xs text-slate-500 mb-4">Open {tool.name} for {activeBranch}</p>
                        <div className="flex items-center justify-between">
                          <span className="text-[10px] font-bold text-indigo-600 uppercase tracking-widest">Connect</span>
                          <ExternalLink className="w-4 h-4 text-slate-300 group-hover:text-indigo-500 transition-colors" />
                        </div>
                      </motion.div>
                    ))}
                  </AnimatePresence>
                </div>
              </>
            ) : viewMode === 'global' ? (
              <>
                <div className="mb-8">
                  <h2 className="text-3xl font-bold text-slate-900 tracking-tight">Global Overview</h2>
                  <p className="text-slate-500 mt-1">Simultaneous management of branch-specific accounts.</p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-8">
                  {BRANCHES.map((branch) => (
                    <div key={branch} className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm">
                      <div className="flex items-center justify-between mb-6">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 bg-indigo-100 text-indigo-600 rounded-lg flex items-center justify-center">
                            <MapPin className="w-4 h-4" />
                          </div>
                          <h3 className="font-bold text-lg text-slate-900">{branch}</h3>
                        </div>
                        <button 
                          onClick={() => handleLaunchAll(branch)}
                          className="text-xs font-bold text-indigo-600 hover:underline flex items-center gap-1"
                        >
                          Launch All <ExternalLink className="w-3 h-3" />
                        </button>
                      </div>
                      <div className="grid grid-cols-2 gap-3">
                        {getToolsForBranch(branch).map(tool => (
                          <button
                            key={tool.id}
                            onClick={() => handleLaunchFirst(tool.id, tool.url)}
                            className="flex items-center gap-3 p-3 bg-slate-50 hover:bg-indigo-50 border border-slate-100 rounded-xl transition-colors group"
                          >
                            <div className={`p-2 ${tool.color} rounded-lg text-white relative`}>
                              {React.cloneElement(tool.icon as React.ReactElement, { className: 'w-3 h-3' })}
                              {tool.id === 'whatsapp' && (
                                <span className="absolute -top-1.5 -right-1.5 w-4 h-4 bg-rose-500 border border-white rounded-full flex items-center justify-center text-[8px] font-bold shadow-sm">
                                  {branchStatus[branch] || 0}
                                </span>
                              )}
                            </div>
                            <span className="text-xs font-medium text-slate-700 group-hover:text-indigo-700">{tool.name}</span>
                          </button>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>

                <section className="bg-amber-50 rounded-2xl p-8 border border-amber-100 mb-12">
                  <div className="flex items-center gap-3 mb-4">
                    <div className="p-2 bg-amber-500 rounded-lg text-white">
                      <Settings className="w-4 h-4" />
                    </div>
                    <h4 className="font-bold text-amber-900">Multi-Account Pro Tip</h4>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                    <p className="text-sm text-amber-800 leading-relaxed">
                      WhatsApp Web only allows <strong>one account per browser session</strong>. To manage all branches at once, we recommend creating separate <strong>Browser Profiles</strong> (e.g., in Chrome or Edge) for each branch.
                    </p>
                    <ul className="text-xs text-amber-800 space-y-2 list-disc pl-4">
                      <li>Create a profile named for each branch.</li>
                      <li>Log in to the specific WhatsApp for that branch in its profile.</li>
                      <li>Open this dashboard in each profile for seamless switching.</li>
                    </ul>
                  </div>
                </section>
              </>
            ) : (
              <>
                <div className="mb-8 flex items-end justify-between">
                  <div>
                    <h2 className="text-3xl font-bold text-slate-900 tracking-tight">Centralized Hub</h2>
                    <p className="text-slate-500 mt-1">Consolidated data and master accounts for all branches.</p>
                  </div>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 mb-12">
                  {CENTRAL_TOOLS.map((tool, index) => (
                    <motion.div
                      key={tool.id}
                      initial={{ opacity: 0, scale: 0.95 }}
                      animate={{ opacity: 1, scale: 1 }}
                      transition={{ delay: index * 0.1 }}
                      className="bg-white p-8 rounded-2xl border border-slate-200 shadow-sm hover:shadow-lg transition-all group flex flex-col"
                    >
                      <div className="flex items-start justify-between mb-8">
                        <div className={`w-16 h-16 ${tool.color} rounded-2xl flex items-center justify-center text-white shadow-xl group-hover:scale-105 transition-transform`}>
                          {React.cloneElement(tool.icon as React.ReactElement, { className: 'w-8 h-8' })}
                        </div>
                      </div>
                      
                      <h3 className="text-2xl font-bold text-slate-900 mb-2">{tool.name}</h3>
                      <p className="text-sm text-slate-500 mb-6">
                        {tool.id === 'sheets' ? 'Master spreadsheets for financial reporting and branch data aggregation.' : 
                         tool.id === 'lark' ? 'Cross-branch team communication and project management suite.' :
                         'Master TikTok Business account for centralized marketing.'}
                      </p>

                      <div className="space-y-4 pt-6 border-t border-slate-100 flex-1">
                        <div className="flex items-center justify-between">
                          <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Saved Documents</label>
                        </div>
                        
                        <div className="space-y-2">
                          {(links[tool.id] || []).map(link => (
                            <div key={link.id} className="flex items-center justify-between p-3 bg-slate-50 rounded-xl group/link border border-slate-100 hover:border-indigo-200 hover:bg-indigo-50 transition-all">
                              <div className="flex flex-col min-w-0">
                                <span className="text-xs font-bold text-slate-900 truncate">{link.name}</span>
                                <span className="text-[10px] text-slate-400 truncate">{link.url}</span>
                              </div>
                              <div className="flex items-center gap-1 opacity-0 group-hover/link:opacity-100 transition-opacity">
                                <button 
                                  onClick={() => handleLaunch(link.url)}
                                  className="p-1.5 text-indigo-600 hover:bg-indigo-100 rounded-lg transition-colors"
                                  title="Open Link"
                                >
                                  <ExternalLink className="w-3.5 h-3.5" />
                                </button>
                                <button 
                                  onClick={() => removeLink(tool.id, link.id)}
                                  className="p-1.5 text-rose-500 hover:bg-rose-100 rounded-lg transition-colors"
                                  title="Delete Link"
                                >
                                  <Plus className="w-3.5 h-3.5 rotate-45" />
                                </button>
                              </div>
                            </div>
                          ))}
                        </div>

                        {tool.id !== 'tiktok-central' && (
                          <div className="pt-4 mt-auto">
                            <div className="p-4 bg-slate-50 rounded-xl border border-dashed border-slate-200">
                              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-3">Add New Document</p>
                              <form 
                                onSubmit={(e) => {
                                  e.preventDefault();
                                  const form = e.target as HTMLFormElement;
                                  const name = (form.elements.namedItem('name') as HTMLInputElement).value;
                                  const url = (form.elements.namedItem('url') as HTMLInputElement).value;
                                  if (name && url) {
                                    addLink(tool.id, name, url);
                                    form.reset();
                                  }
                                }}
                                className="space-y-2"
                              >
                                <input 
                                  name="name"
                                  type="text" 
                                  placeholder="Document Name (e.g. Sales Q1)"
                                  className="w-full bg-white border border-slate-200 rounded-lg px-3 py-2 text-xs focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none transition-all"
                                  required
                                />
                                <input 
                                  name="url"
                                  type="url" 
                                  placeholder="Paste URL here..."
                                  className="w-full bg-white border border-slate-200 rounded-lg px-3 py-2 text-xs focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none transition-all"
                                  required
                                />
                                <button 
                                  type="submit"
                                  className="w-full py-2 bg-indigo-600 text-white rounded-lg text-[10px] font-bold uppercase tracking-widest hover:bg-indigo-700 transition-colors"
                                >
                                  Add Document
                                </button>
                              </form>
                            </div>
                          </div>
                        )}
                      </div>
                    </motion.div>
                  ))}
                </div>

                <section className="bg-indigo-50 rounded-2xl p-8 border border-indigo-100">
                  <div className="flex items-center gap-3 mb-4">
                    <div className="p-2 bg-indigo-600 rounded-lg text-white">
                      <Bell className="w-4 h-4" />
                    </div>
                    <h4 className="font-bold text-indigo-900">Document Management</h4>
                  </div>
                  <p className="text-sm text-indigo-700 leading-relaxed">
                    You can now add multiple documents for each tool. Give each link a descriptive name (e.g., "Setapak Sales", "Monthly Report") to easily identify them. 
                    These links are stored locally in your browser.
                  </p>
                </section>
              </>
            )}

            {/* Quick Stats / Info */}
            <div className="grid grid-cols-1 gap-8">
              <div className="space-y-8">
                <section className="bg-white rounded-2xl border border-slate-200 p-8">
                  <div className="flex items-center justify-between mb-6">
                    <h3 className="font-bold text-lg text-slate-900">Recent Activity</h3>
                    <button className="text-sm text-indigo-600 font-medium hover:underline">View All</button>
                  </div>
                  <div className="space-y-6">
                    {notifications.length === 0 && (
                      <div className="text-center py-12">
                        <p className="text-slate-400 text-sm">No recent activity. Click "Simulate Webhook" to test!</p>
                      </div>
                    )}
                    {notifications.map((notif) => (
                      <div key={notif.id} className="flex items-start gap-4 pb-6 border-b border-slate-100 last:border-0 last:pb-0">
                        <div className={`w-10 h-10 rounded-full flex items-center justify-center ${notif.type === 'unread' ? 'bg-amber-50 text-amber-600' : 'bg-indigo-50 text-indigo-600'}`}>
                          <MessageSquare className="w-5 h-5" />
                        </div>
                        <div className="flex-1">
                          <div className="flex items-center gap-2">
                            <p className="text-sm text-slate-900 font-bold">{notif.type === 'unread' ? 'Unread Message' : 'New Message Received'}</p>
                            {notif.isNew && (
                              <span className="px-1.5 py-0.5 bg-rose-500 text-white text-[8px] font-black rounded uppercase tracking-tighter">New</span>
                            )}
                          </div>
                          <p className="text-sm text-slate-600 mt-0.5">{notif.message}</p>
                          <p className="text-xs text-slate-400 mt-1 font-medium">{notif.time} • {notif.branch}</p>
                        </div>
                        <div className={`px-2 py-1 text-[10px] font-bold rounded uppercase tracking-wider ${notif.isNew ? 'bg-emerald-50 text-emerald-600' : 'bg-slate-50 text-slate-400'}`}>
                          {notif.isNew ? 'Active' : 'Seen'}
                        </div>
                      </div>
                    ))}
                  </div>
                  <div className="mt-8 pt-8 border-t border-slate-100">
                    <button 
                      onClick={simulateWebhook}
                      className="w-full py-3 bg-slate-900 text-white rounded-xl font-bold text-sm hover:bg-slate-800 transition-all flex items-center justify-center gap-2"
                    >
                      <Zap className="w-4 h-4 text-amber-400" />
                      Simulate Webhook (Real-time Test)
                    </button>
                  </div>
                </section>
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
