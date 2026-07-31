import { useEffect } from "react";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { AppLayout } from "@/components/layout/AppLayout";
import { LandingPage } from "@/pages/Landing";
import { LoginPage } from "@/pages/Login";
import { DashboardPage } from "@/pages/Dashboard";
import { MySchedulingPage } from "@/pages/MyScheduling";
import { VisitEntryPage } from "@/pages/VisitEntry";
import { ActiveVisitPage } from "@/pages/ActiveVisit";
import { ShiftPage } from "@/pages/Shift";
import { PayrollPage } from "@/pages/Payroll";
import { ProfilePage } from "@/pages/Profile";
import { ProfileHistoryPage } from "@/pages/ProfileHistory";
import { HelpPage } from "@/pages/Help";
import { SettingsPage } from "@/pages/Settings";
import { api } from "@/api/client";
import { initAutoSync } from "@/lib/sync";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60 * 2,
      retry: 1,
      refetchOnWindowFocus: false,
    },
  },
});

export default function App() {
  useEffect(() => {
    initAutoSync(async (item) => {
      try {
        if (item.action === "create") await api.post("/mobile/me/start-visit", item.data);
        else if (item.action === "update") await api.put("/mobile/me/end-visit", item.data);
        return true;
      } catch {
        return false;
      }
    });
  }, []);

  return (
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<LandingPage />} />
          <Route path="/login" element={<LoginPage />} />
          <Route element={<AppLayout />}>
            <Route path="/dashboard" element={<DashboardPage />} />
            <Route path="/scheduling" element={<MySchedulingPage />} />
            <Route path="/scheduling/:shiftId/entry" element={<VisitEntryPage />} />
            <Route path="/visit/:shiftId/active" element={<ActiveVisitPage />} />
            <Route path="/shift" element={<ShiftPage />} />
            <Route path="/payroll" element={<PayrollPage />} />
            <Route path="/profile" element={<ProfilePage />} />
            <Route path="/profile/history" element={<ProfileHistoryPage />} />
            <Route path="/help" element={<HelpPage />} />
            <Route path="/settings" element={<SettingsPage />} />
          </Route>
        </Routes>
      </BrowserRouter>
    </QueryClientProvider>
  );
}
