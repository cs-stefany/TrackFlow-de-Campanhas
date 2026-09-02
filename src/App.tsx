import { lazy, Suspense } from "react";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { MainLayout } from "./components/MainLayout";
import { Loader2 } from "lucide-react";

const Dashboard = lazy(() => import("./pages/Dashboard"));
const OfferDetails = lazy(() => import("./pages/OfferDetails"));
const OffersManagement = lazy(() => import("./pages/OffersManagement"));
const CreativesManagement = lazy(() => import("./pages/CreativesManagement"));
const ArchivedOffers = lazy(() => import("./pages/ArchivedOffers"));
const ArchivedCreatives = lazy(() => import("./pages/ArchivedCreatives"));
const NotFound = lazy(() => import("./pages/NotFound"));

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
      refetchOnWindowFocus: false,
      staleTime: 30_000,
    },
  },
});

function PageLoading() {
  return (
    <div className="flex min-h-[50vh] items-center justify-center" role="status" aria-label="Carregando página">
      <Loader2 className="h-7 w-7 animate-spin text-primary" />
    </div>
  );
}

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
        <MainLayout>
          <Suspense fallback={<PageLoading />}>
            <Routes>
              <Route path="/" element={<Dashboard />} />
              <Route path="/ofertas" element={<OffersManagement />} />
              <Route path="/ofertas/:id" element={<OfferDetails />} />
              <Route path="/ofertas-arquivadas" element={<ArchivedOffers />} />
              <Route path="/criativos" element={<CreativesManagement />} />
              <Route path="/criativos-arquivados" element={<ArchivedCreatives />} />
              <Route path="*" element={<NotFound />} />
            </Routes>
          </Suspense>
        </MainLayout>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
