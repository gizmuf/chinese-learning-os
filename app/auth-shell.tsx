"use client";
import { useI18n } from "./i18n";
import { useEffect, useState } from "react";
import {
  GoogleAuthProvider,
  createUserWithEmailAndPassword,
  onIdTokenChanged,
  reload,
  sendEmailVerification,
  sendPasswordResetEmail,
  signInWithEmailAndPassword,
  signInWithPopup,
  signOut,
  updateProfile,
  type Auth,
  type User as FirebaseUser,
} from "firebase/auth";
import { FirebaseError } from "firebase/app";
import {
  ArrowRight,
  Check,
  Cloud,
  Leaf,
  LoaderCircle,
  Mail,
  MessageCircle,
  X,
} from "lucide-react";
import StudyApp from "./study-app";
import { getAuthClient } from "./auth-client";
export type StudyUser = {
  id: string;
  name: string;
  provider?: "chatgpt" | "firebase";
} | null;
type Account = { user: FirebaseUser; verified: boolean } | null;
function errorMessage(error: unknown) {
  const code = error instanceof FirebaseError ? error.code : "";
  const messages: Record<string, string> = {
    "auth/invalid-credential":
      "The email or password is incorrect. Try again or reset your password.",
    "auth/email-already-in-use":
      "An account already uses this email. Sign in or reset its password.",
    "auth/invalid-email": "Enter a valid email address.",
    "auth/weak-password": "Use a longer password with at least 8 characters.",
    "auth/too-many-requests":
      "Too many attempts. Please wait a little before trying again.",
    "auth/popup-blocked": "Allow the Google sign-in popup, then try again.",
    "auth/popup-closed-by-user":
      "Google sign-in was closed. You can try again.",
    "auth/network-request-failed":
      "Could not reach sign-in. Check your connection and try again.",
    "auth/account-exists-with-different-credential":
      "This email uses another sign-in method. Sign in with that method to keep the same notebook.",
    "auth/unauthorized-domain":
      "This address is not enabled for sign-in yet. Please contact the app owner.",
  };
  return messages[code] ?? "Could not complete sign-in. Please try again.";
}
export default function AuthShell({ initialUser }: { initialUser: StudyUser }) {
  const { t, locale } = useI18n();
  const [auth, setAuth] = useState<Auth | null>(null);
  const [account, setAccount] = useState<Account>(null);
  const [ready, setReady] = useState(false);
  const [open, setOpen] = useState(false);
  const [unavailable, setUnavailable] = useState(false);
  useEffect(() => {
    let alive = true;
    let unsubscribe: (() => void) | undefined;
    getAuthClient()
      .then((client) => {
        if (!alive) return;
        setAuth(client);
        if (!client) {
          setReady(true);
          return;
        }
        unsubscribe = onIdTokenChanged(client, (user) => {
          if (alive) {
            setAccount(user ? { user, verified: user.emailVerified } : null);
            setReady(true);
          }
        });
      })
      .catch(() => {
        if (alive) {
          setUnavailable(true);
          setReady(true);
        }
      });
    return () => {
      alive = false;
      unsubscribe?.();
    };
  }, []);
  const user: StudyUser = account
    ? account.verified
      ? {
          id: `firebase:${account.user.uid}`,
          name:
            account.user.displayName ??
            account.user.email?.split("@")[0] ??
            t("Student"),
          provider: "firebase",
        }
      : null
    : initialUser;
  async function logOut() {
    if (auth) await signOut(auth);
    window.location.assign("/signout-with-chatgpt?return_to=%2F");
  }
  function refresh() {
    const user = auth?.currentUser;
    setAccount(user ? { user, verified: user.emailVerified } : null);
  }
  if (!ready)
    return (
      <div className="auth-loading">
        <Leaf size={34} />
        <p>{t("Opening your notebook…")}</p>
      </div>
    );
  return (
    <>
      {account && !account.verified && (
        <div className="account-banner">
          <Mail size={18} />
          <span>{t("Verify your email to save progress to your account.")}</span>
          <button onClick={() => setOpen(true)}>
            {t("Check verification")}<ArrowRight size={15} />
          </button>
        </div>
      )}
      <StudyApp
        key={user?.id ?? "guest"}
        user={user}
        onSignIn={() => setOpen(true)}
        onSignOut={() => void logOut()}
        onManageAccount={() => setOpen(true)}
      />
      {open && (
        <AccountDialog
          auth={auth}
          account={account}
          initialUser={initialUser}
          unavailable={unavailable}
          onRefresh={refresh}
          onClose={() => setOpen(false)}
          onSignOut={() => void logOut()}
        />
      )}
    </>
  );
}
function AccountDialog({
  auth,
  account,
  initialUser,
  unavailable,
  onRefresh,
  onClose,
  onSignOut,
}: {
  auth: Auth | null;
  account: Account;
  initialUser: StudyUser;
  unavailable: boolean;
  onRefresh: () => void;
  onClose: () => void;
  onSignOut: () => void;
}) {
  const { t, locale } = useI18n();
  const [mode, setMode] = useState<"signin" | "signup" | "reset">("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  useEffect(() => {
    const previous = document.activeElement as HTMLElement | null;
    const dialog = document.querySelector<HTMLDivElement>(".account-dialog");
    dialog?.focus();
    const handler = (event: KeyboardEvent) => {
      if (event.key === "Escape" && !busy) {
        onClose();
        return;
      }
      if (event.key !== "Tab" || !dialog) return;
      const targets = Array.from(
        dialog.querySelectorAll<HTMLElement>(
          "summary, button:not(:disabled), input:not(:disabled), a[href]",
        ),
      ).filter((element) => element.getClientRects().length > 0);
      const first = targets[0],
        last = targets.at(-1);
      if (
        event.shiftKey &&
        (document.activeElement === first || document.activeElement === dialog)
      ) {
        event.preventDefault();
        last?.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first?.focus();
      }
    };
    document.addEventListener("keydown", handler);
    return () => {
      document.removeEventListener("keydown", handler);
      previous?.focus();
    };
  }, [busy, onClose]);
  async function google() {
    if (!auth) return;
    setBusy(true);
    setError("");
    try {
      await signInWithPopup(auth, new GoogleAuthProvider());
      onRefresh();
      onClose();
    } catch (error) {
      setError(errorMessage(error));
    } finally {
      setBusy(false);
    }
  }
  async function submit(event: React.FormEvent) {
    event.preventDefault();
    if (!auth) return;
    setBusy(true);
    setError("");
    setMessage("");
    try {
      if (mode === "reset") {
        await sendPasswordResetEmail(auth, email.trim(), {
          url: window.location.origin,
        });
        setMessage(
          t("If this address has an account, a password reset email is on its way. Check your inbox and spam folder."),
        );
      } else if (mode === "signup") {
        const result = await createUserWithEmailAndPassword(
          auth,
          email.trim(),
          password,
        );
        await updateProfile(result.user, {
          displayName: name.trim() || email.split("@")[0],
        });
        onRefresh();
        await sendEmailVerification(result.user, {
          url: window.location.origin,
        });
        setMessage(t("Verification email sent. Open its link, then return here."));
        setPassword("");
      } else {
        const result = await signInWithEmailAndPassword(
          auth,
          email.trim(),
          password,
        );
        onRefresh();
        if (result.user.emailVerified) onClose();
        else
          setMessage(
            t("Verify your email before syncing your personal notebook."),
          );
        setPassword("");
      }
    } catch (error) {
      setError(errorMessage(error));
    } finally {
      setBusy(false);
    }
  }
  async function verifyAgain() {
    if (!account) return;
    setBusy(true);
    setError("");
    try {
      await reload(account.user);
      await account.user.getIdToken(true);
      onRefresh();
      if (account.user.emailVerified) onClose();
      else
        setMessage(
          t("The address is not verified yet. Open the link in your email first."),
        );
    } catch (error) {
      setError(errorMessage(error));
    } finally {
      setBusy(false);
    }
  }
  async function resend() {
    if (!account) return;
    setBusy(true);
    setError("");
    try {
      await sendEmailVerification(account.user, {
        url: window.location.origin,
      });
      setMessage(t("Verification email sent. Check your inbox and spam folder."));
    } catch (error) {
      setError(errorMessage(error));
    } finally {
      setBusy(false);
    }
  }
  const signedIn = account?.verified || (!account && initialUser);
  return (
    <div
      className="modal-backdrop"
      onClick={() => {
        if (!busy) onClose();
      }}
    >
      <div
        className="account-dialog panel"
        role="dialog"
        aria-modal="true"
        aria-labelledby="account-title"
        tabIndex={-1}
        onClick={(event) => event.stopPropagation()}
      >
        <button
          className="account-close icon-button"
          aria-label={t("Close sign in")}
          disabled={busy}
          onClick={onClose}
        >
          <X size={21} />
        </button>
        <span className="auth-logo">
          <Leaf size={26} />
        </span>
        <p className="eyebrow">{t("YOUR OWN LITTLE NOTEBOOK")}</p>
        <h2 id="account-title">
          {account && !account.verified
            ? t("Check your inbox.")
            : signedIn
              ? t("Your learning account.")
              : mode === "signup"
                ? t("A fresh start, just for you.")
                : mode === "reset"
                  ? t("Let’s get you back in.")
                  : t("Make your progress yours.")}
        </h2>
        <p className="auth-description">
          {account && !account.verified
            ? t("We need to verify {0} before syncing. You can still practice as a guest.", [account.user.email])
            : signedIn
              ? t("Signed in as {0}. Your progress belongs only to this account.", [account?.user.email ?? initialUser?.name])
              : t("Choose Google or ChatGPT for a quick start.")}
        </p>
        {error && (
          <p className="auth-error" role="alert">
            {t(error)}
          </p>
        )}
        {message && (
          <p className="auth-message" role="status">
            <Check size={17} />
            {t(message)}
          </p>
        )}
        {account && !account.verified ? (
          <div className="auth-actions">
            <button
              className="primary"
              disabled={busy}
              onClick={() => void verifyAgain()}
            >
              {t("I verified my email")}<ArrowRight size={17} />
            </button>
            <button
              className="secondary"
              disabled={busy}
              onClick={() => void resend()}
            >
              {t("Resend verification email")}</button>
            <button className="text-button" disabled={busy} onClick={onSignOut}>
              {t("Sign out")}</button>
          </div>
        ) : signedIn ? (
          <>
            <p className="auth-note">
              <Cloud size={17} />
              {t("Your signed-in notebook synchronizes across devices.")}</p>
            <button
              className="secondary auth-wide"
              disabled={busy}
              onClick={onSignOut}
            >
              {t("Sign out / switch account")}</button>
            <button className="text-button" onClick={onClose}>
              {t("Back to practice")}<ArrowRight size={16} />
            </button>
          </>
        ) : (
          <>
            <div className="auth-provider-options">
              <button
                className="google-signin"
                disabled={busy || !auth}
                onClick={() => void google()}
              >
                <svg viewBox="0 0 24 24" aria-hidden="true">
                  <path
                    fill="#4285F4"
                    d="M21.6 12.2c0-.7-.1-1.4-.2-2.1H12v4h5.4a4.6 4.6 0 0 1-2 3v2.5h3.2c1.9-1.8 3-4.4 3-7.4Z"
                  />
                  <path
                    fill="#34A853"
                    d="M12 22c2.7 0 5-1 6.6-2.4L15.4 17c-.9.6-2 1-3.4 1-2.6 0-4.9-1.8-5.7-4.1H3v2.6A10 10 0 0 0 12 22Z"
                  />
                  <path
                    fill="#FBBC05"
                    d="M6.3 13.9a6 6 0 0 1 0-3.8V7.5H3a10 10 0 0 0 0 9l3.3-2.6Z"
                  />
                  <path
                    fill="#EA4335"
                    d="M12 6c1.5 0 2.8.5 3.8 1.5l2.8-2.8A9.6 9.6 0 0 0 12 2a10 10 0 0 0-9 5.5l3.3 2.6A6 6 0 0 1 12 6Z"
                  />
                </svg>
                {t("Continue with Google")}</button>
              <a
                className="google-signin chatgpt-signin"
                href="/signin-with-chatgpt?return_to=%2F"
                target="_top"
              >
                <MessageCircle size={20} aria-hidden="true" />
                {t("Continue with ChatGPT")}</a>
            </div>
            <details className="auth-email">
              <summary>{t("Use email instead")}</summary>
              {!auth && (
                <p className="auth-error">
                  {unavailable
                    ? t("Sign-in could not load. Check your connection and reload the page.")
                    : t("Google and email sign-in are not configured yet.")}
                </p>
              )}
              <form
                onSubmit={(event) => void submit(event)}
                className="auth-form"
              >
                {mode === "signup" && (
                  <label>
                    {t("Your name")}<input
                      value={name}
                      onChange={(event) => setName(event.target.value)}
                      autoComplete="name"
                      maxLength={80}
                      required
                      disabled={busy}
                    />
                  </label>
                )}
                <label>
                  {t("Email address")}<input
                    type="email"
                    value={email}
                    onChange={(event) => setEmail(event.target.value)}
                    autoComplete="email"
                    inputMode="email"
                    maxLength={254}
                    required
                    disabled={busy}
                  />
                </label>
                {mode !== "reset" && (
                  <label>
                    {t("Password")}<input
                      type="password"
                      value={password}
                      onChange={(event) => setPassword(event.target.value)}
                      autoComplete={
                        mode === "signup" ? "new-password" : "current-password"
                      }
                      minLength={mode === "signup" ? 8 : undefined}
                      maxLength={4096}
                      required
                      disabled={busy}
                    />
                    {mode === "signup" && (
                      <small>
                        {t("At least 8 characters. Use a unique password.")}</small>
                    )}
                  </label>
                )}
                <button
                  className="primary auth-wide"
                  disabled={busy || !auth}
                  type="submit"
                >
                  {busy ? (
                    <LoaderCircle size={18} className="spin" />
                  ) : mode === "signup" ? (
                    t("Create my account")
                  ) : mode === "reset" ? (
                    t("Send reset email")
                  ) : (
                    t("Sign in")
                  )}
                  <ArrowRight size={17} />
                </button>
              </form>
              <div className="auth-switch">
                {mode === "signin" ? (
                  <>
                    <button
                      disabled={busy}
                      onClick={() => {
                        setMode("signup");
                        setError("");
                        setMessage("");
                      }}
                    >
                      {t("New here? Create an account")}</button>
                    <button
                      disabled={busy}
                      onClick={() => {
                        setMode("reset");
                        setError("");
                        setMessage("");
                      }}
                    >
                      {t("Forgot password?")}</button>
                  </>
                ) : (
                  <button
                    disabled={busy}
                    onClick={() => {
                      setMode("signin");
                      setError("");
                      setMessage("");
                    }}
                  >
                    {t("Already have an account? Sign in")}</button>
                )}
              </div>
            </details>
            <p className="auth-note">
              {t("Your progress stays with your account. Use the same sign-in method on each device.")}</p>
          </>
        )}
      </div>
    </div>
  );
}
