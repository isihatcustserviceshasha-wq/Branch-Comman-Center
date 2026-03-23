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
  Music,
  Instagram,
  BellRing,
  ClipboardList,
  Link,
  Info,
  Copy,
  Check,
  Edit2
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
  signInWithRedirect,
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
    id: 'instagram', 
    name: 'Instagram', 
    icon: <Instagram className="w-5 h-5" />, 
    url: 'https://www.instagram.com/direct/inbox/', 
    color: 'bg-gradient-to-tr from-yellow-400 via-red-500 to-purple-600' 
  },
  { 
    id: 'kreloses', 
    name: 'Kreloses', 
    icon: <ClipboardList className="w-5 h-5" />, 
    url: 'https://www.kreloses.com/account/login', 
    color: 'bg-indigo-500' 
  },
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
];

const CENTRAL_TOOLS: Tool[] = [
  { 
    id: 'docs', 
    name: 'Google Docs', 
    icon: <ClipboardList className="w-5 h-5" />, 
    url: 'https://docs.google.com', 
    color: 'bg-blue-500' 
  },
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

type ViewMode = 'branch' | 'global' | 'central' | 'users';

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
  source: 'whatsapp' | 'tiktok' | 'instagram';
  category: 'message' | 'comment' | 'notification';
  createdAt: any;
}

interface AppUser {
  id: string;
  email: string;
  displayName: string | null;
  role: 'admin' | 'user';
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
  const [activeToast, setActiveToast] = useState<Notification | null>(null);
  const lastNotifId = React.useRef<string | null>(null);
  const [branchStatus, setBranchStatus] = useState<{ [key: string]: { whatsapp: number, tiktok: number, instagram: number } }>({});
  const [isAuthReady, setIsAuthReady] = useState(false);
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [userProfile, setUserProfile] = useState<AppUser | null>(null);
  const [allUsers, setAllUsers] = useState<AppUser[]>([]);
  const [loginError, setLoginError] = useState<string | null>(null);
  const [isLoggingIn, setIsLoggingIn] = useState(false);
  const [editingBranchTool, setEditingBranchTool] = useState<string | null>(null);
  const [newBranchToolUrl, setNewBranchToolUrl] = useState('');

  const updateBranchToolUrl = async (branch: string, toolId: string, url: string) => {
    const key = `${branch}-${toolId}`;
    const updatedUrls = {
      ...branchToolUrls,
      [key]: url
    };
    setBranchToolUrls(updatedUrls);
    await updateGlobalSettings({ branchToolUrls: updatedUrls });
    setEditingBranchTool(null);
    setNewBranchToolUrl('');
  };
  const [copiedId, setCopiedId] = useState<string | null>(null);

  useEffect(() => {
    if (copiedId) {
      const timer = setTimeout(() => setCopiedId(null), 2000);
      return () => clearTimeout(timer);
    }
  }, [copiedId]);

  const handleCopy = (url: string, id: string) => {
    navigator.clipboard.writeText(url);
    setCopiedId(id);
  };
  const [isAdmin, setIsAdmin] = useState(false);
  const [connectedTools, setConnectedTools] = useState<Record<string, boolean>>({});
  const [branchToolUrls, setBranchToolUrls] = useState<Record<string, string>>({});
  const [links, setLinks] = useState<{ [key: string]: SavedLink[] }>({
    docs: [{ id: '0', name: 'Master Docs', url: 'https://docs.google.com' }],
    sheets: [{ id: '1', name: 'Master Sheet', url: 'https://docs.google.com/spreadsheets' }],
    lark: [{ id: '2', name: 'Master Lark', url: 'https://www.larksuite.com' }],
    'tiktok-central': [{ id: '3', name: 'Master TikTok', url: 'https://www.tiktok.com/business' }]
  });

  const [editingTool, setEditingTool] = useState<{ branch: string, toolId: string, currentUrl: string } | null>(null);
  const [showHelpModal, setShowHelpModal] = useState(false);

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
      if (!user) {
        setUserProfile(null);
        setIsAdmin(false);
        setIsAuthReady(true);
      }
    });

    // Listen for global settings
    const unsubscribeSettings = onSnapshot(doc(db, 'settings', 'global'), (snapshot) => {
      if (snapshot.exists()) {
        const data = snapshot.data();
        if (data.links) setLinks(data.links);
        if (data.branchToolUrls) setBranchToolUrls(data.branchToolUrls);
        if (data.connectedTools) setConnectedTools(data.connectedTools);
      }
    }, (error) => {
      handleFirestoreError(error, OperationType.GET, 'settings/global');
    });

    return () => {
      unsubscribeAuth();
      unsubscribeSettings();
    };
  }, []);

  // Listen for current user profile
  useEffect(() => {
    if (!currentUser) return;

    const unsubscribe = onSnapshot(doc(db, 'users', currentUser.uid), (doc) => {
      if (doc.exists()) {
        const profile = { id: doc.id, ...doc.data() } as AppUser;
        setUserProfile(profile);
        setIsAdmin(profile.role === 'admin');
      }
      setIsAuthReady(true);
    }, (error) => {
      console.error("Error fetching user profile:", error);
      setIsAuthReady(true);
    });

    return () => unsubscribe();
  }, [currentUser]);

  // Listen for all users (only if admin)
  useEffect(() => {
    if (!isAdmin) {
      setAllUsers([]);
      return;
    }

    const unsubscribe = onSnapshot(collection(db, 'users'), (snapshot) => {
      const users = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as AppUser[];
      setAllUsers(users);
    }, (error) => {
      console.error("Error fetching all users:", error);
    });

    return () => unsubscribe();
  }, [isAdmin]);

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
      
      // Trigger toast for new notification
      if (notifs.length > 0) {
        const newest = notifs[0];
        if (lastNotifId.current && newest.id !== lastNotifId.current && newest.isNew) {
          setActiveToast(newest);
          setTimeout(() => setActiveToast(null), 5000);
        }
        lastNotifId.current = newest.id;
      }
      
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
      const status: { [key: string]: { whatsapp: number, tiktok: number, instagram: number } } = {};
      snapshot.docs.forEach(doc => {
        const data = doc.data();
        status[data.name] = {
          whatsapp: data.whatsappUnreadCount || 0,
          tiktok: data.tiktokUnreadCount || 0,
          instagram: data.instagramUnreadCount || 0
        };
      });
      setBranchStatus(status);
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, 'branches');
    });

    return () => unsubscribe();
  }, [isAuthReady, currentUser]);

  const clearBranchUnread = async (branch: string, toolId: 'whatsapp' | 'tiktok' | 'instagram') => {
    try {
      const branchId = branch.replace(/\s+/g, '-').toLowerCase();
      const branchRef = doc(db, 'branches', branchId);
      const countField = toolId === 'whatsapp' ? 'whatsappUnreadCount' : (toolId === 'tiktok' ? 'tiktokUnreadCount' : 'instagramUnreadCount');
      
      await updateDoc(branchRef, {
        [countField]: 0
      });
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, 'branches');
    }
  };

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
      } else if (error.code === 'auth/unauthorized-domain') {
        setLoginError("This domain is not authorized. Attempting fallback login method...");
        try {
          await signInWithRedirect(auth, provider);
        } catch (redirectError: any) {
          setLoginError("Login failed. Please add the current URL to your Firebase Console's Authorized Domains.");
        }
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
    
    let source: 'whatsapp' | 'tiktok' | 'instagram' = 'whatsapp';
    if (randomBranch === 'T.Low Petaling Jaya') {
      const rand = Math.random();
      source = rand > 0.6 ? 'whatsapp' : (rand > 0.3 ? 'tiktok' : 'instagram');
    } else {
      source = 'whatsapp';
    }
    
    const category = source === 'whatsapp' ? 'message' : (Math.random() > 0.5 ? 'message' : 'comment');
    
    const whatsappMessages = [
      "Price inquiry for service",
      "Appointment confirmation",
      "Where is your location?",
      "Can I book for tomorrow?",
      "Thank you for the info"
    ];

    const tiktokMessages = [
      "Sent you a direct message",
      "Interested in your services!",
      "How much for the pet grooming?",
      "Check your inbox please",
      "Hi, I have a question"
    ];

    const tiktokComments = [
      "Loved this video!",
      "Where is this branch located?",
      "Is this available in Setapak?",
      "Great service, highly recommend!",
      "Can you show more of the interior?"
    ];

    const instagramMessages = [
      "New DM from a customer",
      "Is this branch open on Sunday?",
      "I sent a photo of my pet",
      "Can I get a quote via DM?",
      "Hi, I'm outside the shop"
    ];

    const instagramComments = [
      "Beautiful photo!",
      "I want to visit this place",
      "Tagging my friends @user1 @user2",
      "What are your opening hours?",
      "Is there parking available?"
    ];

    let randomMsg = "";
    if (source === 'whatsapp') {
      randomMsg = whatsappMessages[Math.floor(Math.random() * whatsappMessages.length)];
    } else if (source === 'tiktok') {
      randomMsg = category === 'message' ? tiktokMessages[Math.floor(Math.random() * tiktokMessages.length)] : tiktokComments[Math.floor(Math.random() * tiktokComments.length)];
    } else {
      randomMsg = category === 'message' ? instagramMessages[Math.floor(Math.random() * instagramMessages.length)] : instagramComments[Math.floor(Math.random() * instagramComments.length)];
    }

    const type = Math.random() > 0.5 ? 'unread' : 'new';

    try {
      // 1. Add Notification
      await addDoc(collection(db, 'notifications'), {
        branch: randomBranch,
        message: randomMsg,
        time: 'Just now',
        isNew: true,
        type,
        source,
        category,
        createdAt: serverTimestamp()
      });
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, 'notifications');
    }

    try {
      // 2. Update Branch Count
      const branchId = randomBranch.replace(/\s+/g, '-').toLowerCase();
      const branchRef = doc(db, 'branches', branchId);
      const branchSnap = await getDoc(branchRef);

      const countField = source === 'whatsapp' ? 'whatsappUnreadCount' : (source === 'tiktok' ? 'tiktokUnreadCount' : 'instagramUnreadCount');

      if (branchSnap.exists()) {
        await updateDoc(branchRef, {
          [countField]: increment(1)
        });
      } else {
        await setDoc(branchRef, {
          name: randomBranch,
          whatsappUrl: 'https://web.whatsapp.com',
          whatsappUnreadCount: source === 'whatsapp' ? 1 : 0,
          tiktokUnreadCount: source === 'tiktok' ? 1 : 0,
          instagramUnreadCount: source === 'instagram' ? 1 : 0
        });
      }
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, 'branches');
    }
  };

  // Helper to update global settings in Firestore
  const updateGlobalSettings = async (updates: any) => {
    try {
      const settingsRef = doc(db, 'settings', 'global');
      const snapshot = await getDoc(settingsRef);
      if (snapshot.exists()) {
        await updateDoc(settingsRef, updates);
      } else {
        await setDoc(settingsRef, updates);
      }
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, 'settings/global');
    }
  };

  const addLink = async (toolId: string, name: string, url: string) => {
    const newLink: SavedLink = { id: Date.now().toString(), name, url };
    const updatedLinks = {
      ...links,
      [toolId]: [...(links[toolId] || []), newLink]
    };
    setLinks(updatedLinks);
    await updateGlobalSettings({ links: updatedLinks });
  };

  const removeLink = async (toolId: string, linkId: string) => {
    const updatedLinks = {
      ...links,
      [toolId]: (links[toolId] || []).filter(l => l.id !== linkId)
    };
    setLinks(updatedLinks);
    await updateGlobalSettings({ links: updatedLinks });
  };

  const handleLaunch = (url: string) => {
    window.open(url, '_blank');
  };

  const handleLaunchFirst = async (toolId: string, defaultUrl: string, branchName: string) => {
    const toolLinks = links[toolId] || [];
    const customUrl = branchToolUrls[`${branchName}-${toolId}`];
    const urlToOpen = customUrl || (toolLinks.length > 0 ? toolLinks[0].url : defaultUrl);
    
    // Open in a named window specific to branch and tool
    const windowName = `${branchName.replace(/\s+/g, '_')}_${toolId}`;
    window.open(urlToOpen, windowName);

    // Update connected state
    const key = `${branchName}-${toolId}`;
    const updatedConnected = { ...connectedTools, [key]: true };
    setConnectedTools(updatedConnected);
    await updateGlobalSettings({ connectedTools: updatedConnected });
  };

  const getToolsForBranch = (branch: Branch) => {
    // Kreloses, WhatsApp, Sheets, and Lark for all branches
    // TikTok only for T.Low Petaling Jaya
    let tools = BRANCH_TOOLS;
    if (branch !== 'T.Low Petaling Jaya') {
      tools = tools.filter(t => t.id !== 'tiktok' && t.id !== 'instagram');
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
            <div className="mb-6 p-4 bg-rose-50 border border-rose-100 rounded-2xl text-rose-600 text-sm flex flex-col gap-3 text-left">
              <div className="flex items-start gap-3">
                <Bell className="w-5 h-5 shrink-0 mt-0.5" />
                <p>{loginError}</p>
              </div>
              {(loginError.toLowerCase().includes('unauthorized') || loginError.toLowerCase().includes('domain')) && (
                <div className="mt-4 p-4 bg-indigo-50 border border-indigo-100 rounded-2xl text-sm text-indigo-900 shadow-sm">
                  <p className="font-bold mb-2 flex items-center gap-2">
                    <Bell className="w-4 h-4 text-indigo-600" />
                    Action Required: Authorize this Domain
                  </p>
                  <p className="mb-3 opacity-90 leading-relaxed">
                    Firebase requires you to manually authorize the preview domains. Please follow these steps:
                  </p>
                  <ol className="list-decimal ml-5 space-y-3">
                    <li>
                      Open the <a href="https://console.firebase.google.com/project/gen-lang-client-0853988511/authentication/settings" target="_blank" className="underline font-bold text-indigo-600 hover:text-indigo-800">Firebase Auth Settings</a>
                    </li>
                    <li>
                      Click the <strong>"Authorized domains"</strong> tab (you may need to scroll down in the left settings column).
                    </li>
                    <li>
                      Click <strong>"Add domain"</strong> and paste this:
                      <div className="flex items-center gap-2 mt-1.5">
                        <code className="flex-1 p-2 bg-white border border-indigo-100 rounded font-mono text-[10px] break-all select-all">ais-dev-5ufwm5xswynqnbqugyjbmj-280167246665.asia-southeast1.run.app</code>
                        <button 
                          onClick={(e) => {
                            e.preventDefault();
                            navigator.clipboard.writeText('ais-dev-5ufwm5xswynqnbqugyjbmj-280167246665.asia-southeast1.run.app');
                          }}
                          className="px-3 py-1.5 bg-indigo-600 text-white rounded-lg text-[10px] font-bold hover:bg-indigo-700 transition-colors shrink-0"
                        >
                          Copy
                        </button>
                      </div>
                    </li>
                    <li>
                      Click <strong>"Add domain"</strong> again and paste this:
                      <div className="flex items-center gap-2 mt-1.5">
                        <code className="flex-1 p-2 bg-white border border-indigo-100 rounded font-mono text-[10px] break-all select-all">ais-pre-5ufwm5xswynqnbqugyjbmj-280167246665.asia-southeast1.run.app</code>
                        <button 
                          onClick={(e) => {
                            e.preventDefault();
                            navigator.clipboard.writeText('ais-pre-5ufwm5xswynqnbqugyjbmj-280167246665.asia-southeast1.run.app');
                          }}
                          className="px-3 py-1.5 bg-indigo-600 text-white rounded-lg text-[10px] font-bold hover:bg-indigo-700 transition-colors shrink-0"
                        >
                          Copy
                        </button>
                      </div>
                    </li>
                    <li className="font-medium">
                      Wait 60 seconds, then <strong>Refresh (Ctrl+F5)</strong> and try again.
                    </li>
                  </ol>
                </div>
              )}
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

  const saveBranchToolUrl = async (branch: string, toolId: string, url: string) => {
    const updated = { ...branchToolUrls, [`${branch}-${toolId}`]: url };
    setBranchToolUrls(updated);
    setEditingTool(null);
    await updateGlobalSettings({ branchToolUrls: updated });
  };

  const handleLaunchAll = (branch: Branch) => {
    getToolsForBranch(branch).forEach(tool => {
      handleLaunchFirst(tool.id, tool.url, branch);
    });
  };

  return (
    <div className="min-h-screen bg-[#F8F9FA] flex font-sans text-slate-900">
      {/* Real-time Toast Alerts */}
      <AnimatePresence>
        {activeToast && (
          <motion.div
            initial={{ opacity: 0, y: 50, x: '-50%', scale: 0.9 }}
            animate={{ opacity: 1, y: 0, x: '-50%', scale: 1 }}
            exit={{ opacity: 0, y: 20, x: '-50%', scale: 0.95 }}
            className="fixed bottom-8 left-1/2 z-[100] w-full max-w-md px-4"
          >
            <div className={`relative overflow-hidden rounded-2xl shadow-2xl border border-white/20 backdrop-blur-xl p-4 flex items-center gap-4 ${
              activeToast.source === 'tiktok' 
                ? 'bg-slate-900 text-white' 
                : (activeToast.source === 'instagram' 
                    ? 'bg-gradient-to-tr from-yellow-400 via-red-500 to-purple-600 text-white' 
                    : 'bg-emerald-600 text-white')
            }`}>
              {/* Decorative background pulse */}
              <div className="absolute inset-0 bg-white/10 animate-pulse pointer-events-none" />
              
              <div className="relative w-12 h-12 rounded-xl bg-white/20 flex items-center justify-center shrink-0">
                {activeToast.source === 'tiktok' ? (
                  <Music className="w-6 h-6" />
                ) : activeToast.source === 'instagram' ? (
                  <Instagram className="w-6 h-6" />
                ) : (
                  <MessageSquare className="w-6 h-6" />
                )}
                <div className="absolute -top-1 -right-1">
                  <span className="relative flex h-3 w-3">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-rose-400 opacity-75"></span>
                    <span className="relative inline-flex rounded-full h-3 w-3 bg-rose-500"></span>
                  </span>
                </div>
              </div>

              <div className="relative flex-1 min-w-0">
                <div className="flex items-center justify-between gap-2">
                  <p className="text-xs font-black uppercase tracking-widest opacity-80">
                    {activeToast.source} • {activeToast.branch}
                  </p>
                  <button 
                    onClick={() => setActiveToast(null)}
                    className="p-1 hover:bg-white/10 rounded-full transition-colors"
                  >
                    <Plus className="w-4 h-4 rotate-45" />
                  </button>
                </div>
                <h4 className="font-bold text-sm truncate mt-0.5">
                  {activeToast.category === 'comment' ? 'New Comment' : 'New Message'}
                </h4>
                <p className="text-sm opacity-90 line-clamp-1 mt-0.5 font-medium">
                  {activeToast.message}
                </p>
              </div>

              {/* Progress bar */}
              <motion.div 
                initial={{ width: '100%' }}
                animate={{ width: '0%' }}
                transition={{ duration: 5, ease: 'linear' }}
                className="absolute bottom-0 left-0 h-1 bg-white/30"
              />
            </div>
          </motion.div>
        )}
      </AnimatePresence>
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

            {isAdmin && (
              <button
                onClick={() => setViewMode('users')}
                className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all ${
                  viewMode === 'users' ? 'bg-indigo-50 text-indigo-700 shadow-sm' : 'text-slate-500 hover:bg-slate-50'
                }`}
              >
                <Settings className="w-4 h-4" />
                <span className="text-sm font-medium">User Management</span>
              </button>
            )}

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
          
          <button 
            onClick={async () => {
              if (window.confirm('Are you sure you want to reset all connection statuses?')) {
                setConnectedTools({});
                await updateGlobalSettings({ connectedTools: {} });
              }
            }}
            className="w-full flex items-center gap-3 px-4 py-3 text-slate-400 hover:bg-rose-50 hover:text-rose-600 rounded-xl transition-colors mt-2 group"
          >
            <Zap className="w-4 h-4 group-hover:animate-pulse" />
            <span className="text-sm font-medium">Reset Connections</span>
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
            <div className="hidden lg:flex items-center gap-2 px-3 py-1.5 bg-emerald-50 text-emerald-600 rounded-full text-[10px] font-bold border border-emerald-100 shadow-sm">
              <div className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-pulse" />
              Cloud Sync Active
            </div>
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
            {viewMode === 'users' && isAdmin ? (
              <UserManagement 
                users={allUsers} 
                onUpdateRole={async (userId, newRole) => {
                  try {
                    await updateDoc(doc(db, 'users', userId), { role: newRole });
                  } catch (error) {
                    handleFirestoreError(error, OperationType.UPDATE, `users/${userId}`);
                  }
                }}
              />
            ) : viewMode === 'branch' ? (
              <>
                <div className="flex items-end justify-between mb-8">
                  <div>
                    <div className="flex items-center gap-2 text-indigo-600 font-bold text-xs uppercase tracking-widest mb-2">
                      <Globe className="w-3 h-3" />
                      Active Workspace
                    </div>
                    <h2 className="text-3xl font-bold text-slate-900 tracking-tight">{activeBranch} Branch</h2>
                    <div className="flex items-center gap-4 mt-1">
                      <p className="text-slate-500">Manage WhatsApp and TikTok for this location.</p>
                      <button 
                        onClick={() => setShowHelpModal(true)}
                        className="text-xs font-bold text-indigo-600 hover:text-indigo-700 flex items-center gap-1 bg-indigo-50 px-2 py-1 rounded-md transition-colors"
                      >
                        <BellRing className="w-3 h-3" />
                        Multi-Account Guide
                      </button>
                    </div>
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
                        onClick={() => handleLaunchFirst(tool.id, tool.url, activeBranch)}
                      >
                        <div className={`w-12 h-12 ${tool.color} rounded-xl flex items-center justify-center text-white mb-6 shadow-lg group-hover:scale-110 transition-transform relative`}>
                          {tool.icon}
                          {tool.id === 'whatsapp' && (
                            <span className="absolute -top-2 -right-2 w-6 h-6 bg-rose-500 border-2 border-white rounded-full flex items-center justify-center text-[10px] font-bold shadow-sm">
                              {branchStatus[activeBranch]?.whatsapp || 0}
                            </span>
                          )}
                          {tool.id === 'tiktok' && (
                            <span className="absolute -top-2 -right-2 w-6 h-6 bg-rose-500 border-2 border-white rounded-full flex items-center justify-center text-[10px] font-bold shadow-sm">
                              {branchStatus[activeBranch]?.tiktok || 0}
                            </span>
                          )}
                          {tool.id === 'instagram' && (
                            <span className="absolute -top-2 -right-2 w-6 h-6 bg-rose-500 border-2 border-white rounded-full flex items-center justify-center text-[10px] font-bold shadow-sm">
                              {branchStatus[activeBranch]?.instagram || 0}
                            </span>
                          )}
                        </div>
                        <h3 className="font-bold text-slate-900 mb-1">{tool.name}</h3>
                        <p className="text-xs text-slate-500 mb-4">Open {tool.name} for {activeBranch}</p>
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <button 
                              onClick={(e) => {
                                e.stopPropagation();
                                handleLaunchFirst(tool.id, tool.url, activeBranch);
                              }}
                              className={`text-[10px] font-bold uppercase tracking-widest px-2 py-1 rounded-md transition-all ${
                                connectedTools[`${activeBranch}-${tool.id}`] 
                                  ? 'bg-emerald-50 text-emerald-600 hover:bg-emerald-100' 
                                  : 'bg-indigo-50 text-indigo-600 hover:bg-indigo-100'
                              }`}
                            >
                              {connectedTools[`${activeBranch}-${tool.id}`] ? 'Connected' : 'Connect'}
                            </button>
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                setEditingTool({ 
                                  branch: activeBranch, 
                                  toolId: tool.id, 
                                  currentUrl: branchToolUrls[`${activeBranch}-${tool.id}`] || tool.url 
                                });
                              }}
                              className="p-1 text-slate-400 hover:text-indigo-600 hover:bg-slate-100 rounded transition-all"
                              title="Edit Custom URL"
                            >
                              <Settings className="w-3 h-3" />
                            </button>
                          </div>
                          <ExternalLink className={`w-4 h-4 transition-colors ${connectedTools[`${activeBranch}-${tool.id}`] ? 'text-emerald-500' : 'text-slate-300 group-hover:text-indigo-500'}`} />
                        </div>
                      </motion.div>
                    ))}
                  </AnimatePresence>
                </div>

                {/* Custom URL Modal */}
                <AnimatePresence>
                  {editingTool && (
                    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
                      <motion.div
                        initial={{ opacity: 0, scale: 0.95, y: 20 }}
                        animate={{ opacity: 1, scale: 1, y: 0 }}
                        exit={{ opacity: 0, scale: 0.95, y: 20 }}
                        className="bg-white rounded-3xl p-8 max-w-lg w-full shadow-2xl border border-slate-200"
                      >
                        <div className="flex items-center gap-3 mb-6">
                          <div className="p-2 bg-indigo-100 text-indigo-600 rounded-xl">
                            <Link className="w-5 h-5" />
                          </div>
                          <div>
                            <h3 className="text-xl font-bold text-slate-900">Custom Tool URL</h3>
                            <p className="text-sm text-slate-500">Set a specific link for {editingTool.toolId} at {editingTool.branch}</p>
                          </div>
                        </div>

                        <div className="space-y-4">
                          <div>
                            <label className="block text-xs font-bold text-slate-400 uppercase tracking-widest mb-2">Target URL</label>
                            <input 
                              type="url"
                              defaultValue={editingTool.currentUrl}
                              id="custom-tool-url"
                              className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-indigo-500 outline-none transition-all"
                              placeholder="https://..."
                            />
                          </div>
                          
                          <div className="flex gap-3 pt-4">
                            <button 
                              onClick={() => setEditingTool(null)}
                              className="flex-1 py-3 text-slate-600 font-bold text-sm hover:bg-slate-50 rounded-xl transition-all"
                            >
                              Cancel
                            </button>
                            <button 
                              onClick={() => {
                                const input = document.getElementById('custom-tool-url') as HTMLInputElement;
                                saveBranchToolUrl(editingTool.branch, editingTool.toolId, input.value);
                              }}
                              className="flex-1 py-3 bg-indigo-600 text-white font-bold text-sm rounded-xl hover:bg-indigo-700 shadow-lg shadow-indigo-200 transition-all"
                            >
                              Save Settings
                            </button>
                          </div>
                        </div>
                      </motion.div>
                    </div>
                  )}
                </AnimatePresence>
                {/* Multi-Account Help Modal */}
                <AnimatePresence>
                  {showHelpModal && (
                    <div className="fixed inset-0 z-[110] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
                      <motion.div
                        initial={{ opacity: 0, scale: 0.95, y: 20 }}
                        animate={{ opacity: 1, scale: 1, y: 0 }}
                        exit={{ opacity: 0, scale: 0.95, y: 20 }}
                        className="bg-white rounded-3xl p-8 max-w-xl w-full shadow-2xl border border-slate-200"
                      >
                        <div className="flex items-center justify-between mb-6">
                          <div className="flex items-center gap-3">
                            <div className="p-2 bg-amber-100 text-amber-600 rounded-xl">
                              <BellRing className="w-5 h-5" />
                            </div>
                            <h3 className="text-xl font-bold text-slate-900">Multi-Account Guide</h3>
                          </div>
                          <button onClick={() => setShowHelpModal(false)} className="p-2 hover:bg-slate-100 rounded-full text-slate-400 transition-colors">
                            <Plus className="w-5 h-5 rotate-45" />
                          </button>
                        </div>

                        <div className="space-y-6">
                          <div className="p-4 bg-indigo-50 border border-indigo-100 rounded-2xl">
                            <p className="text-sm text-indigo-800 leading-relaxed">
                              <strong>Why do I see the same account?</strong> Browsers share "cookies" across all tabs. If you log into WhatsApp in one tab, the browser thinks you want that same account in every other tab.
                            </p>
                          </div>

                          <div className="space-y-4">
                            <h4 className="font-bold text-slate-900 flex items-center gap-2">
                              <div className="w-6 h-6 bg-indigo-600 text-white rounded-full flex items-center justify-center text-xs">1</div>
                              Recommended: Browser Profiles
                            </h4>
                            <p className="text-sm text-slate-600 ml-8">
                              Create a separate <strong>Chrome or Edge Profile</strong> for each branch (e.g., "Setapak Profile", "Sentul Profile"). This is the only way to stay logged into multiple WhatsApp accounts at once.
                            </p>

                            <h4 className="font-bold text-slate-900 flex items-center gap-2">
                              <div className="w-6 h-6 bg-indigo-600 text-white rounded-full flex items-center justify-center text-xs">2</div>
                              Open Dashboard in each Profile
                            </h4>
                            <p className="text-sm text-slate-600 ml-8">
                              Open this dashboard in each branch's profile and scan the QR code for that specific branch.
                            </p>

                            <h4 className="font-bold text-slate-900 flex items-center gap-2">
                              <div className="w-6 h-6 bg-indigo-600 text-white rounded-full flex items-center justify-center text-xs">3</div>
                              Auto-Synced to Office PC
                            </h4>
                            <p className="text-sm text-slate-600 ml-8">
                              All your links and branch settings are now <strong>synced to the cloud</strong>. 
                              When you log in to this dashboard on your office PC, all your configurations will be there automatically.
                            </p>
                          </div>

                          <button 
                            onClick={() => setShowHelpModal(false)}
                            className="w-full py-4 bg-slate-900 text-white font-bold rounded-2xl hover:bg-slate-800 transition-all shadow-lg"
                          >
                            Got it, thanks!
                          </button>
                        </div>
                      </motion.div>
                    </div>
                  )}
                </AnimatePresence>
              </>
            ) : viewMode === 'global' ? (
              <>
                <div className="mb-8 flex items-start justify-between">
                  <div>
                    <h2 className="text-3xl font-bold text-slate-900 tracking-tight">Global Overview</h2>
                    <p className="text-slate-500 mt-1">Simultaneous management of branch-specific accounts.</p>
                  </div>
                  <button 
                    onClick={() => setShowHelpModal(true)}
                    className="flex items-center gap-2 px-4 py-2 bg-amber-50 text-amber-700 border border-amber-200 rounded-xl text-xs font-bold hover:bg-amber-100 transition-all shadow-sm"
                  >
                    <BellRing className="w-4 h-4" />
                    WhatsApp Multi-Account Guide
                  </button>
                </div>

                <div className="mb-8 p-5 bg-amber-50 border border-amber-100 rounded-2xl flex items-start gap-4 shadow-sm">
                  <div className="p-2.5 bg-amber-500 rounded-xl text-white shrink-0 shadow-lg shadow-amber-200">
                    <Info className="w-5 h-5" />
                  </div>
                  <div>
                    <p className="text-sm text-amber-900 font-bold">Important: WhatsApp Multi-Account Setup</p>
                    <p className="text-xs text-amber-800 mt-1 leading-relaxed max-w-2xl">
                      Browsers share sessions across all tabs. If you log into WhatsApp in one tab, it will show the same account in all other tabs. 
                      To manage multiple branches simultaneously, you <strong>must</strong> use separate <strong>Browser Profiles</strong> (e.g., "Setapak Profile", "Sentul Profile").
                    </p>
                    <div className="flex items-center gap-4 mt-3">
                      <button 
                        onClick={() => setShowHelpModal(true)}
                        className="text-[10px] font-bold text-amber-700 uppercase tracking-widest hover:underline flex items-center gap-1"
                      >
                        Learn how to set up profiles <ExternalLink className="w-3 h-3" />
                      </button>
                      <div className="h-3 w-px bg-amber-200" />
                      <p className="text-[10px] font-medium text-amber-600 italic">
                        Tip: Use the <Copy className="w-3 h-3 inline mx-0.5" /> button on each tool to copy the link and paste it into its specific profile.
                      </p>
                    </div>
                  </div>
                </div>

                {/* WhatsApp Unread Summary */}
                <div className="mb-12 bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
                  <div className="px-6 py-4 border-b border-slate-100 bg-slate-50/50 flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className="p-1.5 bg-emerald-500 rounded-lg text-white">
                        <MessageSquare className="w-4 h-4" />
                      </div>
                      <h3 className="font-bold text-slate-900">WhatsApp Unread Summary</h3>
                    </div>
                    <div className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                      Total Unread: {Object.values(branchStatus).reduce((acc: number, curr: any) => acc + (curr.whatsapp || 0), 0)}
                    </div>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 divide-x divide-y divide-slate-100">
                    {BRANCHES.map(branch => (
                      <div key={branch} className="p-6 flex items-center justify-between hover:bg-slate-50 transition-colors group">
                        <div className="flex flex-col">
                          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">{branch}</span>
                          <div className="flex items-center gap-2">
                            <span className={`text-2xl font-black tracking-tight ${branchStatus[branch]?.whatsapp > 0 ? 'text-rose-600' : 'text-slate-300'}`}>
                              {branchStatus[branch]?.whatsapp || 0}
                            </span>
                            <span className="text-[10px] font-bold text-slate-400">Unread</span>
                          </div>
                        </div>
                        {branchStatus[branch]?.whatsapp > 0 && (
                          <button 
                            onClick={() => clearBranchUnread(branch, 'whatsapp')}
                            className="p-2 text-slate-300 hover:text-emerald-600 hover:bg-emerald-50 rounded-xl transition-all opacity-0 group-hover:opacity-100"
                            title="Mark all as read"
                          >
                            <Check className="w-5 h-5" />
                          </button>
                        )}
                      </div>
                    ))}
                  </div>
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
                        <div className="flex items-center gap-3">
                          <button 
                            onClick={() => handleLaunchAll(branch)}
                            className="text-xs font-bold text-indigo-600 hover:underline flex items-center gap-1"
                          >
                            Launch All <ExternalLink className="w-3 h-3" />
                          </button>
                          {(branchStatus[branch]?.whatsapp > 0 || branchStatus[branch]?.tiktok > 0 || branchStatus[branch]?.instagram > 0) && (
                            <button 
                              onClick={async () => {
                                await clearBranchUnread(branch, 'whatsapp');
                                await clearBranchUnread(branch, 'tiktok');
                                await clearBranchUnread(branch, 'instagram');
                              }}
                              className="text-[10px] font-bold text-slate-400 hover:text-emerald-600 flex items-center gap-1 transition-colors"
                            >
                              Clear All <Check className="w-3 h-3" />
                            </button>
                          )}
                        </div>
                      </div>
                      <div className="grid grid-cols-2 gap-3">
                        {getToolsForBranch(branch).map(tool => (
                          <div
                            key={tool.id}
                            role="button"
                            tabIndex={0}
                            onClick={() => handleLaunchFirst(tool.id, tool.url, branch)}
                            onKeyDown={(e) => {
                              if (e.key === 'Enter' || e.key === ' ') {
                                handleLaunchFirst(tool.id, tool.url, branch);
                              }
                            }}
                            className="flex items-center gap-3 p-3 bg-slate-50 hover:bg-indigo-50 border border-slate-100 rounded-xl transition-colors group cursor-pointer"
                          >
                            <div className={`p-2 ${tool.color} rounded-lg text-white relative`}>
                              {React.cloneElement(tool.icon as React.ReactElement, { className: 'w-3 h-3' })}
                              {tool.id === 'whatsapp' && (
                                <span className="absolute -top-1.5 -right-1.5 w-4 h-4 bg-rose-500 border border-white rounded-full flex items-center justify-center text-[8px] font-bold shadow-sm">
                                  {branchStatus[branch]?.whatsapp || 0}
                                </span>
                              )}
                              {tool.id === 'tiktok' && (
                                <span className="absolute -top-1.5 -right-1.5 w-4 h-4 bg-rose-500 border border-white rounded-full flex items-center justify-center text-[8px] font-bold shadow-sm">
                                  {branchStatus[branch]?.tiktok || 0}
                                </span>
                              )}
                              {tool.id === 'instagram' && (
                                <span className="absolute -top-1.5 -right-1.5 w-4 h-4 bg-rose-500 border border-white rounded-full flex items-center justify-center text-[8px] font-bold shadow-sm">
                                  {branchStatus[branch]?.instagram || 0}
                                </span>
                              )}
                            </div>
                            <div className="flex flex-col items-start flex-1 min-w-0">
                              <div className="flex items-center justify-between w-full gap-2">
                                {editingBranchTool === `${branch}-${tool.id}` ? (
                                  <div className="flex items-center gap-1 w-full" onClick={e => e.stopPropagation()}>
                                    <input 
                                      type="url"
                                      value={newBranchToolUrl}
                                      onChange={e => setNewBranchToolUrl(e.target.value)}
                                      placeholder="Paste specific URL..."
                                      className="flex-1 text-[10px] bg-white border border-indigo-200 rounded px-1.5 py-0.5 outline-none focus:ring-1 focus:ring-indigo-500"
                                      autoFocus
                                    />
                                    <button 
                                      onClick={() => updateBranchToolUrl(branch, tool.id, newBranchToolUrl)}
                                      className="p-1 bg-emerald-500 text-white rounded hover:bg-emerald-600"
                                    >
                                      <Check className="w-2.5 h-2.5" />
                                    </button>
                                    <button 
                                      onClick={() => setEditingBranchTool(null)}
                                      className="p-1 bg-slate-200 text-slate-600 rounded hover:bg-slate-300"
                                    >
                                      <Plus className="w-2.5 h-2.5 rotate-45" />
                                    </button>
                                  </div>
                                ) : (
                                  <>
                                    <span className="text-xs font-medium text-slate-700 group-hover:text-indigo-700 truncate">{tool.name}</span>
                                    <div className="flex items-center gap-1">
                                      <button
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          setEditingBranchTool(`${branch}-${tool.id}`);
                                          setNewBranchToolUrl(branchToolUrls[`${branch}-${tool.id}`] || '');
                                        }}
                                        className="p-1 text-slate-300 hover:bg-slate-200 hover:text-slate-600 rounded-md transition-all"
                                        title="Set specific URL for this branch"
                                      >
                                        <Edit2 className="w-3 h-3" />
                                      </button>
                                      <button
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          const toolLinks = links[tool.id] || [];
                                          const customUrl = branchToolUrls[`${branch}-${tool.id}`];
                                          const urlToCopy = customUrl || (toolLinks.length > 0 ? toolLinks[0].url : tool.url);
                                          handleCopy(urlToCopy, `${branch}-${tool.id}`);
                                        }}
                                        className={`p-1 rounded-md transition-all ${
                                          copiedId === `${branch}-${tool.id}` 
                                            ? 'bg-emerald-100 text-emerald-600' 
                                            : 'text-slate-300 hover:bg-slate-200 hover:text-slate-600'
                                        }`}
                                        title="Copy Link for another Browser Profile"
                                      >
                                        {copiedId === `${branch}-${tool.id}` ? <Check className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
                                      </button>
                                    </div>
                                  </>
                                )}
                              </div>
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleLaunchFirst(tool.id, tool.url, branch);
                                }}
                                className={`text-[8px] font-bold uppercase tracking-tighter px-1.5 py-0.5 rounded transition-all mt-0.5 ${
                                  connectedTools[`${branch}-${tool.id}`] 
                                    ? 'bg-emerald-50 text-emerald-600 hover:bg-emerald-100' 
                                    : 'bg-slate-100 text-slate-400 hover:bg-indigo-50 hover:text-indigo-600'
                                }`}
                              >
                                {connectedTools[`${branch}-${tool.id}`] ? 'Connected' : 'Connect'}
                              </button>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </>
            ) : (
              <>
            <div className="mb-8 flex items-end justify-between">
              <div>
                <div className="flex items-center gap-2 text-xs font-bold text-indigo-600 uppercase tracking-widest mb-2">
                  <Globe className="w-3 h-3" />
                  Cloud Management
                </div>
                <h2 className="text-3xl font-bold text-slate-900 tracking-tight">Centralized Hub</h2>
                <div className="flex items-center gap-4 mt-1">
                  <p className="text-slate-500">Master links for Google Docs, Sheets, and Lark Suite.</p>
                  <div className="flex items-center gap-1.5 px-2 py-1 bg-emerald-50 text-emerald-600 rounded-md text-[10px] font-bold border border-emerald-100">
                    <div className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-pulse" />
                    Auto-Synced to Office PC
                  </div>
                  <button 
                    onClick={() => {
                      const btn = document.getElementById('sync-btn');
                      if (btn) {
                        btn.classList.add('animate-spin');
                        setTimeout(() => btn.classList.remove('animate-spin'), 1000);
                      }
                    }}
                    className="flex items-center gap-1.5 px-3 py-1 bg-white border border-slate-200 rounded-md text-[10px] font-bold text-slate-600 hover:bg-slate-50 transition-all shadow-sm"
                  >
                    <Zap id="sync-btn" className="w-3 h-3 text-amber-500" />
                    Sync Now
                  </button>
                </div>
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
                        {(tool.id === 'sheets' || tool.id === 'lark') && (
                          <div className="flex items-center gap-1.5 px-3 py-1.5 bg-indigo-50 text-indigo-600 rounded-full text-[10px] font-bold border border-indigo-100 shadow-sm">
                            <Zap className="w-3 h-3" />
                            Sync to Office PC
                          </div>
                        )}
                      </div>
                      
                      <h3 className="text-2xl font-bold text-slate-900 mb-2">{tool.name}</h3>
                      <p className="text-sm text-slate-500 mb-6">
                        {tool.id === 'docs' ? 'Master Google Docs for SOPs, branch guidelines, and shared documentation.' :
                         tool.id === 'sheets' ? 'Master spreadsheets for financial reporting and branch data aggregation.' : 
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
                      <Globe className="w-4 h-4" />
                    </div>
                    <h4 className="font-bold text-indigo-900">Cloud Sync Active</h4>
                  </div>
                  <p className="text-sm text-indigo-700 leading-relaxed">
                    All documents, <strong>Google Sheets</strong>, <strong>Lark Suite</strong> links, and branch URLs are now <strong>auto-synced to the cloud</strong>. 
                    Any link you add here will automatically appear on your <strong>office PC</strong> or any other device when you log in. 
                    No manual backup is required.
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
                        <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
                          notif.source === 'tiktok' 
                            ? 'bg-slate-900 text-white' 
                            : (notif.source === 'instagram' 
                                ? 'bg-gradient-to-tr from-yellow-400 via-red-500 to-purple-600 text-white' 
                                : (notif.type === 'unread' ? 'bg-amber-50 text-amber-600' : 'bg-indigo-50 text-indigo-600'))
                        }`}>
                          {notif.source === 'tiktok' ? (
                            <Music className="w-5 h-5" />
                          ) : notif.source === 'instagram' ? (
                            <Instagram className="w-5 h-5" />
                          ) : (
                            <MessageSquare className="w-5 h-5" />
                          )}
                        </div>
                        <div className="flex-1">
                          <div className="flex items-center gap-2">
                            <p className="text-sm text-slate-900 font-bold">
                              {notif.source === 'tiktok' 
                                ? (notif.category === 'comment' ? 'New TikTok Comment' : 'New TikTok Message')
                                : notif.source === 'instagram'
                                  ? (notif.category === 'comment' ? 'New Instagram Comment' : 'New Instagram Message')
                                  : (notif.type === 'unread' ? 'Unread WhatsApp' : 'New WhatsApp Message')}
                            </p>
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

function UserManagement({ 
  users, 
  onUpdateRole 
}: { 
  users: AppUser[], 
  onUpdateRole: (userId: string, newRole: 'admin' | 'user') => void 
}) {
  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold text-slate-900 tracking-tight">User Management</h2>
          <p className="text-slate-500 mt-1">Authorize team members as administrators.</p>
        </div>
      </div>

      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="bg-slate-50 border-b border-slate-200">
              <th className="px-6 py-4 text-xs font-bold text-slate-400 uppercase tracking-widest">User</th>
              <th className="px-6 py-4 text-xs font-bold text-slate-400 uppercase tracking-widest">Email</th>
              <th className="px-6 py-4 text-xs font-bold text-slate-400 uppercase tracking-widest">Role</th>
              <th className="px-6 py-4 text-xs font-bold text-slate-400 uppercase tracking-widest text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {users.map((user) => (
              <tr key={user.id} className="hover:bg-slate-50 transition-colors">
                <td className="px-6 py-4">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 bg-indigo-100 text-indigo-600 rounded-lg flex items-center justify-center font-bold text-xs">
                      {user.displayName ? user.displayName.charAt(0) : user.email.charAt(0)}
                    </div>
                    <span className="font-medium text-slate-900">{user.displayName || 'Unnamed User'}</span>
                  </div>
                </td>
                <td className="px-6 py-4 text-sm text-slate-500">{user.email}</td>
                <td className="px-6 py-4">
                  <span className={`px-2 py-1 text-[10px] font-bold rounded uppercase tracking-wider ${
                    user.role === 'admin' ? 'bg-indigo-100 text-indigo-600' : 'bg-slate-100 text-slate-500'
                  }`}>
                    {user.role}
                  </span>
                </td>
                <td className="px-6 py-4 text-right">
                  <div className="flex items-center justify-end gap-2">
                    {user.role === 'user' ? (
                      <button 
                        onClick={() => onUpdateRole(user.id, 'admin')}
                        className="px-3 py-1.5 bg-indigo-600 text-white rounded-lg text-xs font-bold hover:bg-indigo-700 transition-colors"
                      >
                        Make Admin
                      </button>
                    ) : (
                      <button 
                        onClick={() => onUpdateRole(user.id, 'user')}
                        className="px-3 py-1.5 bg-slate-200 text-slate-700 rounded-lg text-xs font-bold hover:bg-slate-300 transition-colors"
                        disabled={user.email === 'isihatcustserviceshasha@gmail.com'}
                      >
                        Demote
                      </button>
                    )}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {users.length === 0 && (
          <div className="p-12 text-center text-slate-400">
            No users found. They must sign in once to appear here.
          </div>
        )}
      </div>

      <section className="bg-amber-50 rounded-2xl p-8 border border-amber-100">
        <div className="flex items-center gap-3 mb-4">
          <div className="p-2 bg-amber-600 rounded-lg text-white">
            <Zap className="w-4 h-4" />
          </div>
          <h4 className="font-bold text-amber-900">How to add new admins</h4>
        </div>
        <p className="text-sm text-amber-800 leading-relaxed">
          1. Ask your team member to open the app and <strong>Sign in with Google</strong>.<br />
          2. Once they sign in, their name will appear in this list as a "user".<br />
          3. Click <strong>"Make Admin"</strong> next to their name to give them full access.<br />
          4. They may need to refresh the page to see the admin dashboard.
        </p>
      </section>
    </div>
  );
}
