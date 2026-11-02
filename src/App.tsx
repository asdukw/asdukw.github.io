import { BrowserRouter, Route, Routes } from "react-router";
import "./styles.css";
import { ThemeProvider } from "@/lib/ThemeContext";
import { AuthProvider } from "@/lib/AuthContext";
import { LanguageProvider } from "@/i18n/LanguageContext";
import { TooltipProvider } from "@/components/ui/tooltip";
import { Layout } from "@/components/layout/Layout";
import { NotFound } from "@/pages/NotFound";
import { langSubtrees } from "@/routes";

export function App() {
	return (
		<AuthProvider>
			<ThemeProvider>
				<TooltipProvider>
					{/* LanguageProvider 必须在 Router 内：界面语言由 URL 前缀决定。 */}
					<BrowserRouter>
						<LanguageProvider>
							<Routes>
								<Route element={<Layout />}>
									{langSubtrees()}
									<Route path="*" element={<NotFound />} />
								</Route>
							</Routes>
						</LanguageProvider>
					</BrowserRouter>
				</TooltipProvider>
			</ThemeProvider>
		</AuthProvider>
	);
}

export default App;
