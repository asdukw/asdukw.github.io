import { BrowserRouter, Route, Routes } from "react-router";
import "./styles.css";
import { ThemeProvider } from "@/lib/ThemeContext";
import { AuthProvider } from "@/lib/AuthContext";
import { LanguageProvider } from "@/i18n/LanguageContext";
import { TooltipProvider } from "@/components/ui/tooltip";
import { Layout } from "@/components/layout/Layout";
import { Home } from "@/pages/Home";
import { PostListPage } from "@/pages/PostListPage";
import { PostDetailPage } from "@/pages/PostDetailPage";
import { Projects } from "@/pages/Projects";
import { About } from "@/pages/About";
import { NotFound } from "@/pages/NotFound";

export function App() {
  return (
    <AuthProvider>
      <ThemeProvider>
        <LanguageProvider>
          <TooltipProvider>
            <BrowserRouter>
              <Routes>
                <Route element={<Layout />}>
                  <Route index element={<Home />} />
                  <Route path="blog" element={<PostListPage category="blog" />} />
                  <Route path="blog/:slug" element={<PostDetailPage category="blog" />} />
                  <Route path="tech" element={<PostListPage category="tech" />} />
                  <Route path="tech/:slug" element={<PostDetailPage category="tech" />} />
                  <Route path="projects" element={<Projects />} />
                  <Route path="about" element={<About />} />
                  <Route path="*" element={<NotFound />} />
                </Route>
              </Routes>
            </BrowserRouter>
          </TooltipProvider>
        </LanguageProvider>
      </ThemeProvider>
    </AuthProvider>
  );
}

export default App;
