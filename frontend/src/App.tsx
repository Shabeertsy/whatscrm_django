import React from "react";
import { RouterProvider, Router } from "./router";
import { useAuthStore } from "./store/authStore";
import DashboardLayout from "./components/layout/DashboardLayout";
import Login from "./pages/Login";

function AppContent() {
  const [authState] = useAuthStore();

  if (!authState.isAuthenticated) {
    return <Login />;
  }

  return (
    <DashboardLayout>
      <Router />
    </DashboardLayout>
  );
}

export function App() {
  return (
    <RouterProvider>
      <AppContent />
    </RouterProvider>
  );
}

export default App;
