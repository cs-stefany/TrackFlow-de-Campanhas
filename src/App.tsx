import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { MainLayout } from "./components/MainLayout";
import Dashboard from "./pages/Dashboard";
import OfferDetails from "./pages/OfferDetails";
import OffersManagement from "./pages/OffersManagement";
import CreativesManagement from "./pages/CreativesManagement";
import ArchivedOffers from "./pages/ArchivedOffers";
import ArchivedCreatives from "./pages/ArchivedCreatives";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <MainLayout>
          <Routes>
            <Route path="/" element={<Dashboard />} />
            <Route path="/ofertas" element={<OffersManagement />} />
            <Route path="/ofertas/:id" element={<OfferDetails />} />
            <Route path="/ofertas-arquivadas" element={<ArchivedOffers />} />
            <Route path="/criativos" element={<CreativesManagement />} />
            <Route path="/criativos-arquivados" element={<ArchivedCreatives />} />
            {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
            <Route path="*" element={<NotFound />} />
          </Routes>
        </MainLayout>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
