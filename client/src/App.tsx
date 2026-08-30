import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import NotFound from "@/pages/NotFound";
import { Route, Switch } from "wouter";
import ErrorBoundary from "./components/ErrorBoundary";
import { ThemeProvider } from "./contexts/ThemeContext";
import { ChatSessionsProvider } from "./contexts/ChatSessionsContext";
import Home from "./pages/Home";
import LunaChat from "./pages/LunaChat";
import LunaBrain from "./pages/LunaBrain";
import NpcAdmin from "./pages/NpcAdmin";
import KnowledgeSpace from "./pages/KnowledgeSpace";
import DashboardLayout from "./components/DashboardLayout";
import LunaSelfModification from "./pages/LunaSelfModification";

function Router() {
  // make sure to consider if you need authentication for certain routes
  return (
    <Switch>
      <Route path={"/"}><DashboardLayout><Home /></DashboardLayout></Route>
      <Route path={"/npc"}><DashboardLayout><NpcAdmin /></DashboardLayout></Route>
      <Route path={"/luna"}><DashboardLayout><LunaChat /></DashboardLayout></Route>
      <Route path={"/luna/brain"}><DashboardLayout><LunaBrain /></DashboardLayout></Route>
      <Route path={"/knowledge"}><DashboardLayout><KnowledgeSpace /></DashboardLayout></Route>
      <Route path={"/self-modification"}><DashboardLayout><LunaSelfModification /></DashboardLayout></Route>
      <Route path={"/new"}><DashboardLayout><Home /></DashboardLayout></Route>
      <Route path={"/history"}><DashboardLayout><Home /></DashboardLayout></Route>
      <Route path={"/memory"}><DashboardLayout><Home /></DashboardLayout></Route>
      <Route path={"/settings"}><DashboardLayout><Home /></DashboardLayout></Route>
      <Route path={"/tasks/:id"}><DashboardLayout><Home /></DashboardLayout></Route>
      <Route path={"/404"} component={NotFound} />
      {/* Final fallback route */}
      <Route component={NotFound} />
    </Switch>
  );
}

// NOTE: About Theme
// - First choose a default theme according to your design style (dark or light bg), than change color palette in index.css
//   to keep consistent foreground/background color across components
// - If you want to make theme switchable, pass `switchable` ThemeProvider and use `useTheme` hook

function App() {
  return (
    <ErrorBoundary>
      <ThemeProvider
        defaultTheme="dark"
        // switchable
      >
        <TooltipProvider>
          <Toaster />
          <ChatSessionsProvider><Router /></ChatSessionsProvider>
        </TooltipProvider>
      </ThemeProvider>
    </ErrorBoundary>
  );
}

export default App;
