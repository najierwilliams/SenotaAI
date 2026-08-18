import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import NotFound from "@/pages/NotFound";
import { Route, Switch } from "wouter";
import ErrorBoundary from "./components/ErrorBoundary";
import { ThemeProvider } from "./contexts/ThemeContext";
import Home from "./pages/Home";
import AgentMemory from "./pages/AgentMemory";
import DashboardLayout from "./components/DashboardLayout";
import NewTask from "./pages/NewTask";
import Settings from "./pages/Settings";
import TaskDetail from "./pages/TaskDetail";
import TaskHistory from "./pages/TaskHistory";

function Router() {
  // make sure to consider if you need authentication for certain routes
  return (
    <Switch>
      <Route path={"/"}><DashboardLayout><Home /></DashboardLayout></Route>
      <Route path={"/new"}><DashboardLayout><NewTask /></DashboardLayout></Route>
      <Route path={"/history"}><DashboardLayout><TaskHistory /></DashboardLayout></Route>
      <Route path={"/tasks/:id"}>{(params) => <DashboardLayout><TaskDetail taskId={Number(params.id)} /></DashboardLayout>}</Route>
      <Route path={"/memory"}><DashboardLayout><AgentMemory /></DashboardLayout></Route>
      <Route path={"/settings"}><DashboardLayout><Settings /></DashboardLayout></Route>
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
          <Router />
        </TooltipProvider>
      </ThemeProvider>
    </ErrorBoundary>
  );
}

export default App;
