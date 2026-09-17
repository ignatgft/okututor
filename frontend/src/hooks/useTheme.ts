import { useThemeContext, type Theme } from "../context/ThemeContext";

// Re-export for backward compat — now delegates to context
export type { Theme };

export const useTheme = () => {
  try {
    return useThemeContext();
  } catch {
    // fallback for isolated render (tests) without provider
    const fallback: Theme = "light";
    return {
      theme: fallback,
      setTheme: () => {},
      toggleTheme: () => {},
    } as ReturnType<typeof useThemeContext>;
  }
};

export default useTheme;
