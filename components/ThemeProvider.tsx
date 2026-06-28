// No-op provider — theme is handled by the inline script in layout.tsx
// and the ThemeToggle component directly.
export function ThemeProvider({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
