import { LoginForm } from './login-form';

export default function LoginPage() {
  return (
    <main className="app-shell-grid flex min-h-screen items-center justify-center bg-[var(--bg-canvas)] p-4 text-(--text-primary)">
      <div className="metal-frame app-shell-panel w-full max-w-sm space-y-4 rounded-[var(--radius-compact)] px-5 py-5">
        <h1 className="text-center text-xl font-semibold tracking-[-0.02em] text-(--text-primary)">登录</h1>
        <LoginForm />
      </div>
    </main>
  );
}
