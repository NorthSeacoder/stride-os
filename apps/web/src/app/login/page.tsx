import { LoginForm } from './login-form';

export default function LoginPage() {
  return (
    <main className="app-shell-grid flex min-h-screen items-center justify-center bg-[var(--bg-canvas)] p-4 text-(--text-primary)">
      <div className="metal-frame app-shell-panel w-full max-w-sm rounded-[var(--radius-panel)] px-5 py-5 sm:px-6 sm:py-6">
        <div className="space-y-4">
          <div className="space-y-2 text-center">
            <p className="text-[11px] uppercase tracking-[0.22em] text-(--text-muted)">Stride OS</p>
            <h1 className="text-xl font-semibold tracking-[-0.02em] text-(--text-primary)">登录</h1>
          </div>
          <LoginForm />
        </div>
      </div>
    </main>
  );
}
