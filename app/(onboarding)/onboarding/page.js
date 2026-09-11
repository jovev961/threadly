"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { createProfile, uploadProfilePhoto } from "@/lib/frontend/profiles";

export default function OnboardingPage() {
    const router = useRouter();
    const [links, setLinks] = useState([]);
    const [photo, setPhoto] = useState(null);
    const [profileCreated, setProfileCreated] = useState(false);
    const [submitting, setSubmitting] = useState(false);
    const [error, setError] = useState("");

    function updateLink(index, key, value) {
        setLinks(current => current.map((link, itemIndex) => itemIndex === index ? { ...link, [key]: value } : link));
    }

    async function handleSubmit(event) {
        event.preventDefault();

        if (profileCreated) {
            router.replace("/");
            router.refresh();
            return;
        }

        setSubmitting(true);
        setError("");
        const form = new FormData(event.currentTarget);

        try {
            await createProfile({
                name: form.get("name"),
                bio: form.get("bio"),
                gender: form.get("gender") || undefined,
                links: links.filter(link => link.title && link.url)
            });
            setProfileCreated(true);
            if (photo) {
                try {
                    await uploadProfilePhoto(photo);
                } catch (photoError) {
                    setError(`Your profile was created, but the photo could not be uploaded: ${photoError.message}. You can add one later from your profile.`);
                    return;
                }
            }
            router.replace("/");
            router.refresh();
        } catch (err) {
            if (err.status === 409) {
                router.replace("/");
                return;
            }
            setError(err.message);
        } finally {
            setSubmitting(false);
        }
    }

    return (
        <main className="onboardingPage">
            <section className="onboardingCard">
                <span className="brand">threadly<span>.</span></span>
                <div className="authIntro"><span className="eyebrow">One last step</span><h1>Introduce yourself.</h1><p>Your profile helps people recognize who is behind each post.</p></div>
                <form onSubmit={handleSubmit}>
                    <label htmlFor="name">Display name</label>
                    <input id="name" name="name" maxLength="50" required placeholder="How people know you" />
                    <label htmlFor="bio">Bio</label>
                    <textarea id="bio" name="bio" maxLength="200" rows="3" placeholder="A little about you…" />
                    <label htmlFor="gender">Gender</label>
                    <select id="gender" name="gender" defaultValue=""><option value="">Choose later</option><option>Man</option><option>Woman</option><option>Prefer not to say</option></select>
                    <label htmlFor="profile-photo">Profile photo</label>
                    <input id="profile-photo" type="file" accept="image/jpeg,image/png,image/webp,image/gif" onChange={event => setPhoto(event.target.files?.[0] || null)} />
                    <div className="linkBuilder">
                        <div className="formRow"><strong>Links</strong><button type="button" className="textButton" onClick={() => setLinks(current => [...current, { title: "", url: "" }])}>+ Add link</button></div>
                        {links.map((link, index) => <div className="linkRow" key={index}><input aria-label={`Link ${index + 1} title`} value={link.title} onChange={event => updateLink(index, "title", event.target.value)} placeholder="Website" /><input aria-label={`Link ${index + 1} URL`} type="url" value={link.url} onChange={event => updateLink(index, "url", event.target.value)} placeholder="https://…" /><button type="button" aria-label="Remove link" onClick={() => setLinks(current => current.filter((_, itemIndex) => itemIndex !== index))}>×</button></div>)}
                    </div>
                    {error && <p className="fieldMessage error" role="alert">{error}</p>}
                    <button className="button wide" disabled={submitting}>{submitting ? "Creating profile…" : profileCreated ? "Continue without photo" : "Enter Threadly"}</button>
                </form>
            </section>
        </main>
    );
}
