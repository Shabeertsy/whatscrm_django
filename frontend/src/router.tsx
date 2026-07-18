import React from "react";
import { BrowserRouter, Routes, Route, useNavigate, useLocation } from "react-router-dom";
import Analytics from "./pages/Analytics";
import Inbox from "./pages/Inbox";
import Automation from "./pages/Automation";
import Campaigns from "./pages/Campaigns";
import Voice from "./pages/Voice";
import Contacts from "./pages/Contacts";
import Pipeline from "./pages/Pipeline";
import Settings from "./pages/Settings";
import Login from "./pages/Login";
import AiAgent from "./features/ai/AiAgent";
import Hotels from "./pages/Hotels";
import HotelRooms from "./pages/HotelRooms";
import Templates from "./pages/Templates";



export function RouterProvider({ children }: { children: React.ReactNode }) {
  return <BrowserRouter>{children}</BrowserRouter>;
}

export function useRouter() {
  const navigateHook = useNavigate();
  const location = useLocation();


  const path = location.pathname === "/" ? "/dashboard" : location.pathname;

  const navigate = (to: string, options?: any) => {
    const target = to.startsWith("#") ? `/${to.substring(1)}` : to;
    navigateHook(target, options);
  };

  return { path, navigate };
}

export function Router() {
  return (
    <Routes>
      <Route path="/" element={<Analytics />} />
      <Route path="/dashboard" element={<Analytics />} />
      <Route path="/hotels" element={<Hotels />} />
      <Route path="/hotels/:id" element={<HotelRooms />} />
      <Route path="/settings" element={<Settings />} />
      <Route path="/messaging" element={<Inbox />} />
      <Route path="/automations" element={<Automation />} />
      <Route path="/campaigns" element={<Campaigns />} />
      <Route path="/templates" element={<Templates />} />
      <Route path="/voice" element={<Voice />} />
      <Route path="/contacts" element={<Contacts />} />
      <Route path="/pipeline" element={<Pipeline />} />
      <Route path="/ai-agent" element={<AiAgent />} />
      <Route path="/login" element={<Login />} />
      <Route path="*" element={<Analytics />} />
    </Routes>
  );
}
