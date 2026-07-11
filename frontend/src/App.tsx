import React from "react";
import { RouterProvider, Router } from "./router";
import { useAuthStore } from "./store/authStore";
import DashboardLayout from "./components/layout/DashboardLayout";
import Login from "./pages/Login";
import { Toaster } from "react-hot-toast";

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
    <>
      <Toaster 
        position="top-right"
        containerStyle={{ zIndex: 999999 }}
        toastOptions={{
          className: 'dark:bg-slate-800 dark:text-white',
          style: {
            borderRadius: '10px',
            background: '#fff',
            color: '#334155',
          },
          success: {
            style: { borderLeft: '4px solid #007e3a' },
            iconTheme: { primary: '#007e3a', secondary: '#fff' }
          },
          error: {
            style: { borderLeft: '4px solid #ef4444' },
            iconTheme: { primary: '#ef4444', secondary: '#fff' }
          }
        }}
      />
      <RouterProvider>
        <AppContent />
      </RouterProvider>
    </>
  );
}

export default App;
