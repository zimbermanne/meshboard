import { useState } from "react";
import Overview from "./pages/Overview";
import ApprovalQueue from "./pages/ApprovalQueue";
import LiveBroadcasts from "./pages/LiveBroadcasts";
import NodeRegistry from "./pages/NodeRegistry";
import Tokens from "./pages/Tokens";
import Payments from "./pages/Payments";
import Messages from "./pages/Messages";
import AdminUsers from "./pages/AdminUsers";
import UserFeed from "./pages/UserFeed";
import SubmitPost from "./pages/SubmitPost";
import RedeemToken from "./pages/RedeemToken";
import UserProfile from "./pages/UserProfile";
import Login from "./pages/Login";
import Register from "./pages/Register";
import AppShell from "./components/AppShell";
import { useAuth } from "./context/AuthContext";

const ADMIN_PAGES = {
  messages: Messages,
  overview: Overview,
  queue: ApprovalQueue,
  broadcasts: LiveBroadcasts,
  nodes: NodeRegistry,
  tokens: Tokens,
  payments: Payments,
  users: AdminUsers,
};

const USER_PAGES = {
  feed: UserFeed,
  submit: SubmitPost,
  redeem: RedeemToken,
  profile: UserProfile,
};

const ADMIN_NAV_GROUPS = [
  {
    label: "NETWORK",
    items: [
      { id: "messages", icon: "✓", label: "Messages", sub: "Network broadcasts" },
      { id: "overview", icon: "◈", label: "Overview", sub: "Dashboard stats" },
      { id: "broadcasts", icon: "◉", label: "Live Broadcasts", sub: "On-air messages" },
    ],
  },
  {
    label: "OPERATIONS",
    items: [
      { id: "queue", icon: "⊞", label: "Approval Queue", sub: "Pending review" },
      { id: "nodes", icon: "⬡", label: "Node Registry", sub: "Mesh nodes" },
      { id: "tokens", icon: "◆", label: "Tokens", sub: "Credit tokens" },
      { id: "payments", icon: "⊕", label: "Payment Log", sub: "Transactions" },
      { id: "users", icon: "◎", label: "Users", sub: "Account management" },
    ],
  },
];

const USER_NAV_GROUPS = [
  {
    label: "MEMBER",
    items: [
      { id: "feed", icon: "◉", label: "Feed", sub: "Live broadcasts" },
      { id: "submit", icon: "✎", label: "Submit Post", sub: "Request broadcast" },
      { id: "redeem", icon: "◆", label: "Redeem Token", sub: "Add credits" },
      { id: "profile", icon: "◎", label: "Profile", sub: "Account & node" },
    ],
  },
];

function AuthGate() {
  const [mode, setMode] = useState("login");
  if (mode === "register") {
    return <Register onSwitchToLogin={() => setMode("login")} />;
  }
  return <Login onSwitchToRegister={() => setMode("register")} />;
}

export default function App() {
  const { isAuthenticated, booting, isAdmin } = useAuth();

  if (booting) {
    return (
      <div className="app-root">
        <div style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", color: "var(--muted)" }}>
          Loading…
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return <AuthGate />;
  }

  if (isAdmin) {
    return (
      <AppShell
        navGroups={ADMIN_NAV_GROUPS}
        pages={ADMIN_PAGES}
        defaultPage="messages"
        showStats
        windowTitle="MeshBoard · Super-Node Console"
      />
    );
  }

  return (
    <AppShell
      navGroups={USER_NAV_GROUPS}
      pages={USER_PAGES}
      defaultPage="feed"
      showStats={false}
      windowTitle="MeshBoard · Member Portal"
    />
  );
}
