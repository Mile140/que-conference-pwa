import type { ComponentChildren } from "preact";
import PageHero from "./PageHero";
import { authSession, isAdmin } from "../lib/auth";

/**
 * Shared guard for every /admin/* page: shows a loading state while admin
 * status is still being checked, a sign-in prompt for non-admins, and the
 * page content only once `is_admin()` has confirmed true.
 */
export default function AdminGuard({ children }: { children: ComponentChildren }) {
  if (isAdmin.value === null) {
    return <p>Checking admin access…</p>;
  }

  if (!authSession.value || !isAdmin.value) {
    return (
      <PageHero
        eyebrow="2026 QUE Group Conference"
        title="Admin"
        subtitle={
          <>
            <a href="/admin/login">Sign in</a> with your admin account to continue.
          </>
        }
      />
    );
  }

  return <>{children}</>;
}
