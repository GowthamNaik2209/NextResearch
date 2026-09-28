import Link from "next/link";
import { signup, loginWithGoogle } from "@/app/auth/actions";

export default async function SignupPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; checkEmail?: string }>;
}) {
  const { error, checkEmail } = await searchParams;

  return (
    <main className="flex flex-1 items-center justify-center px-4 py-16">
      <div className="w-full max-w-sm rounded-2xl border border-line bg-panel p-8">
        <h1 className="font-display text-xl font-semibold text-ink">Create an account</h1>
        <p className="mt-1 text-sm text-ink-soft">Free to start exploring.</p>

        {checkEmail ? (
          <p className="mt-4 rounded-lg border border-accent/40 bg-accent/10 px-3 py-2 text-sm text-ink">
            Check your email to confirm your account.
          </p>
        ) : null}
        {error ? (
          <p className="mt-4 rounded-lg border border-danger/40 bg-danger/10 px-3 py-2 text-sm text-danger">
            {error}
          </p>
        ) : null}

        <form action={signup} className="mt-6 flex flex-col gap-3">
          <label className="flex flex-col gap-1 text-sm text-ink-soft">
            Email
            <input
              type="email"
              name="email"
              required
              className="rounded-lg border border-line bg-panel-2 px-3 py-2 text-ink outline-none focus:border-accent"
            />
          </label>
          <label className="flex flex-col gap-1 text-sm text-ink-soft">
            Password
            <input
              type="password"
              name="password"
              required
              minLength={6}
              className="rounded-lg border border-line bg-panel-2 px-3 py-2 text-ink outline-none focus:border-accent"
            />
          </label>
          <button
            type="submit"
            className="mt-2 rounded-lg bg-accent px-3 py-2 text-sm font-semibold text-bg hover:opacity-90"
          >
            Sign up
          </button>
        </form>

        <div className="my-4 flex items-center gap-3 text-xs text-ink-soft">
          <div className="h-px flex-1 bg-line" />
          or
          <div className="h-px flex-1 bg-line" />
        </div>

        <form action={loginWithGoogle}>
          <input type="hidden" name="next" value="/" />
          <button
            type="submit"
            className="w-full rounded-lg border border-line bg-panel-2 px-3 py-2 text-sm font-semibold text-ink hover:border-accent"
          >
            Continue with Google
          </button>
        </form>

        <p className="mt-6 text-sm text-ink-soft">
          Already have an account?{" "}
          <Link href="/login" className="text-accent hover:underline">
            Log in
          </Link>
        </p>
      </div>
    </main>
  );
}
