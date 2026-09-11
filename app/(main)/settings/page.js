"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { deleteAccount, getAccount, updateAccount } from "@/lib/frontend/account";

export default function SettingsPage() {
    const router = useRouter();
    const [account, setAccount] = useState(null);
    const [busy, setBusy] = useState("");
    const [message, setMessage] = useState(null);
    const [showDelete, setShowDelete] = useState(false);

    useEffect(() => {
        let active = true;
        getAccount()
            .then(result => active && setAccount(result.account))
            .catch(err => {
                if (!active) return;
                if (err.status === 401) router.replace("/login");
                else setMessage({ type: "error", text: err.message });
            });
        return () => { active = false; };
    }, [router]);

    async function saveIdentity(event) {
        event.preventDefault();
        setBusy("identity");
        setMessage(null);
        const form = new FormData(event.currentTarget);
        try {
            const result = await updateAccount({ username: form.get("username"), email: form.get("email") });
            setAccount(current => ({ ...current, ...result.account }));
            setMessage({ type: "success", text: "Account details updated." });
        } catch (err) {
            setMessage({ type: "error", text: err.message });
        } finally {
            setBusy("");
        }
    }

    async function savePassword(event) {
        event.preventDefault();
        setBusy("password");
        setMessage(null);
        const form = new FormData(event.currentTarget);
        const newPassword = form.get("newPassword");
        if (newPassword !== form.get("confirmPassword")) {
            setMessage({ type: "error", text: "New passwords do not match." });
            setBusy("");
            return;
        }
        try {
            await updateAccount({ currentPassword: form.get("currentPassword"), newPassword });
            event.currentTarget.reset();
            setMessage({ type: "success", text: "Password updated." });
        } catch (err) {
            setMessage({ type: "error", text: err.message });
        } finally {
            setBusy("");
        }
    }

    async function removeAccount(event) {
        event.preventDefault();
        setBusy("delete");
        setMessage(null);
        const form = new FormData(event.currentTarget);
        try {
            await deleteAccount(form.get("currentPassword"));
            router.replace("/register");
            router.refresh();
        } catch (err) {
            setMessage({ type: "error", text: err.message });
            setBusy("");
        }
    }

    return (
        <section className="settingsPage standardPage">
            <div className="pageHeader"><span className="eyebrow">Account controls</span><h1>Settings</h1><p>Manage how you sign in and keep your account secure.</p></div>
            {message && <div className={`notice ${message.type}`} role="status">{message.text}</div>}
            {!account ? <div className="loadingCard">Loading settings…</div> : <div className="settingsStack">
                <section className="settingsCard card"><div className="settingsHeading"><div><h2>Account details</h2><p>These details are used to identify your account.</p></div></div><form className="settingsForm" onSubmit={saveIdentity}><label htmlFor="settings-username">Username</label><input id="settings-username" name="username" defaultValue={account.username} minLength="2" maxLength="20" required /><label htmlFor="settings-email">Email</label><input id="settings-email" name="email" type="email" defaultValue={account.email} minLength="5" maxLength="50" required /><button className="button" disabled={busy === "identity"}>{busy === "identity" ? "Saving…" : "Save details"}</button></form></section>
                <section className="settingsCard card"><div className="settingsHeading"><div><h2>Change password</h2><p>Confirm your current password before choosing a new one.</p></div></div><form className="settingsForm" onSubmit={savePassword}><label htmlFor="current-password">Current password</label><input id="current-password" name="currentPassword" type="password" autoComplete="current-password" required /><label htmlFor="new-password">New password</label><input id="new-password" name="newPassword" type="password" minLength="8" autoComplete="new-password" required /><label htmlFor="confirm-password">Confirm new password</label><input id="confirm-password" name="confirmPassword" type="password" minLength="8" autoComplete="new-password" required /><button className="button" disabled={busy === "password"}>{busy === "password" ? "Updating…" : "Update password"}</button></form></section>
                <section className="settingsCard dangerZone"><div className="settingsHeading"><div><h2>Delete account</h2><p>Permanently remove your profile, posts, photos, comments, and connections.</p></div>{!showDelete && <button className="button danger" onClick={() => setShowDelete(true)}>Delete account</button>}</div>{showDelete && <form className="deleteForm" onSubmit={removeAccount}><label htmlFor="delete-password">Enter your current password to confirm</label><input id="delete-password" name="currentPassword" type="password" autoComplete="current-password" required /><div className="formActions"><button type="button" className="button secondary" onClick={() => setShowDelete(false)}>Cancel</button><button className="button danger" disabled={busy === "delete"}>{busy === "delete" ? "Deleting…" : "Permanently delete"}</button></div></form>}</section>
            </div>}
        </section>
    );
}
