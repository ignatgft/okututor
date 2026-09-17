import type { ReactNode } from "react";
import { ToastProvider } from "../../components/ui/Toast";
import ErrorBoundary from "../../components/ErrorBoundary";
import { ThemeProvider } from "../../context/ThemeContext";
import "../../styles/Toast.css";

export interface AppProvidersProps {
  children: ReactNode;
}

export function AppProviders({ children }: AppProvidersProps): JSX.Element {
  return (
    <ThemeProvider>
      <ToastProvider>
        <ErrorBoundary>{children}</ErrorBoundary>
      </ToastProvider>
    </ThemeProvider>
  );
}
