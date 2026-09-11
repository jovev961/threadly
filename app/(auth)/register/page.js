"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { register } from "@/lib/frontend/auth";

export default function RegisterPage() {
    const router = useRouter();
    const [submitting, setSubmitting] = useState(false);
    const [error, setError] = useState("");

    async function handleSubmit(event) {
        event.preventDefault();
        setSubmitting(true);
        setError("");
        const form = new FormData(event.currentTarget);

        try {
            await register({ username: form.get("username"), email: form.get("email"), password: form.get("password") });
            router.push("/login");
        } catch (err) {
            setError(err.message);
        } finally {
            setSubmitting(false);
        }
    }

    return (
        <section className="authCard">
            <Link href="/" className="brand authBrand">threadly<span>.</span></Link>
            <div className="authIntro"><span className="eyebrow">Start fresh</span><h1>Create your corner of the internet.</h1><p>Follow people you enjoy and build conversations worth returning to.</p></div>
            <form onSubmit={handleSubmit}>
                <label htmlFor="username">Username</label>
                <input id="username" name="username" minLength="2" maxLength="20" autoComplete="username" required placeholder="yourhandle" />
                <label htmlFor="email">Email</label>
                <input id="email" name="email" type="email" minLength="5" maxLength="50" autoComplete="email" required placeholder="you@example.com" />
                <label htmlFor="password">Password</label>
                <input id="password" name="password" type="password" minLength="8" autoComplete="new-password" required placeholder="Create a strong password" />
                <small className="inputHint">Use 8+ characters with uppercase, lowercase, a number, and a symbol.</small>
                {error && <p className="fieldMessage error" role="alert">{error}</p>}
                <button className="button wide" disabled={submitting}>{submitting ? "Creating account…" : "Create account"}</button>
            </form>
            <p className="authSwitch">Already have an account? <Link href="/login">Log in</Link></p>
        </section>
    );
}
