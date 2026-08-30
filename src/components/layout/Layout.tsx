import { Outlet } from "react-router";
import { Header } from "./Header";
import { Footer } from "./Footer";
import { ScrollToTop } from "@/components/ScrollToTop";

export function Layout() {
  return (
    <div className="flex min-h-screen flex-col bg-background text-foreground">
      <ScrollToTop />
      <Header />
      <main className="mx-auto w-full max-w-4xl flex-1 px-4 py-8 sm:px-6 lg:py-12">
        <Outlet />
      </main>
      <Footer />
    </div>
  );
}