import { BrowserRouter, Navigate, Route, Routes } from "react-router";
import "./styles.css";
import { ThemeProvider } from "@/lib/ThemeContext";
import { AuthProvider } from "@/lib/AuthContext";
import { LanguageProvider } from "@/i18n/LanguageContext";
import { TooltipProvider } from "@/components/ui/tooltip";
import { Layout } from "@/components/layout/Layout";
import { Home } from "@/pages/Home";
import { PostListPage } from "@/pages/PostListPage";
import { PostDetailPage } from "@/pages/PostDetailPage";
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
									<Route path="post" element={<PostListPage />} />
									<Route path="post/:id" element={<PostDetailPage />} />
									{/* 项目已并成「关于」页的子章节，旧地址不退化成 404。 */}
									<Route
										path="projects"
										element={<Navigate to="/about" replace />}
									/>
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
