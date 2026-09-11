"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { login } from "@/lib/frontend/auth";

export default function LoginPage() {
    const router = useRouter();
    const [submitting, setSubmitting] = useState(false);
    const [error, setError] = useState("");

    async function handleSubmit(event) {
        event.preventDefault();
        setSubmitting(true);
        setError("");
        const form = new FormData(event.currentTarget);

        try {
            await login({ login: form.get("login"), password: form.get("password") });
            router.replace("/");
            router.refresh();
        } catch (err) {
            setError(err.message);
        } finally {
            setSubmitting(false);
        }
    }

    return (
        <section className="authCard">
            <Link href="/" className="brand authBrand">threadly<span>.</span></Link>
            <div className="authIntro"><span className="eyebrow">Welcome back</span><h1>Join the conversation.</h1><p>Ideas, photos, and communities—all in one thoughtful feed.</p></div>
            <form onSubmit={handleSubmit}>
                <label htmlFor="login">Email or username</label>
                <input id="login" name="login" autoComplete="username" required placeholder="you@example.com" />
                <label htmlFor="password">Password</label>
                <input id="password" name="password" type="password" autoComplete="current-password" required placeholder="Your password" />
                {error && <p className="fieldMessage error" role="alert">{error}</p>}
                <button className="button wide" disabled={submitting}>{submitting ? "Logging in…" : "Log in"}</button>
            </form>
            <p className="authSwitch">New to Threadly? <Link href="/register">Create an account</Link></p>
        </section>
    );
}
