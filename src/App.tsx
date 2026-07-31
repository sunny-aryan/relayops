import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom"

import { AppLayout } from "@/components/layout/app-layout"
import { AppProvider } from "@/contexts/app-context"
import { ChangelogPage } from "@/pages/changelog"
import { DeliveriesPage } from "@/pages/deliveries"
import { DeliveryDetailPage } from "@/pages/delivery-detail"
import { DevelopersPage } from "@/pages/developers"
import { EndpointDetailPage } from "@/pages/endpoint-detail"
import { EndpointsPage } from "@/pages/endpoints"
import { NotFoundPage } from "@/pages/not-found"
import { OverviewPage } from "@/pages/overview"
import { ReplayDetailPage } from "@/pages/replay-detail"
import { SettingsPage } from "@/pages/settings"
import { StatusPage } from "@/pages/status"
import { UsagePage } from "@/pages/usage"

export function App() {
  return (
    <AppProvider>
      <BrowserRouter>
        <Routes>
          <Route element={<AppLayout />}>
            <Route path="/" element={<Navigate to="/overview" replace />} />
            <Route path="/overview" element={<OverviewPage />} />
            <Route path="/endpoints" element={<EndpointsPage />} />
            <Route path="/endpoints/:endpointId" element={<EndpointDetailPage />} />
            <Route path="/deliveries" element={<DeliveriesPage />} />
            <Route path="/deliveries/:deliveryId" element={<DeliveryDetailPage />} />
            <Route path="/replays/:replayJobId" element={<ReplayDetailPage />} />
            <Route path="/usage" element={<UsagePage />} />
            <Route path="/developers" element={<DevelopersPage />} />
            <Route path="/status" element={<StatusPage />} />
            <Route path="/changelog" element={<ChangelogPage />} />
            <Route path="/settings" element={<SettingsPage />} />
            <Route path="*" element={<NotFoundPage />} />
          </Route>
        </Routes>
      </BrowserRouter>
    </AppProvider>
  )
}

export default App
