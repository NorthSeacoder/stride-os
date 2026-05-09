import { LoginForm } from './login-form';

export default function LoginPage() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-[var(--bg-canvas)] p-8">
      <div className="w-full max-w-sm space-y-6 rounded-lg border border-[var(--border-subtle)] bg-[var(--bg-panel)] px-8 py-7 shadow-[0_0_0_1px_rgba(255,255,255,0.02)]">
        <h1 className="text-2xl font-bold text-center text-[var(--text-primary)]">Login</h1>
        <LoginForm />
      </div>
    </main>
  );
}
