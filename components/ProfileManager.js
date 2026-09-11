"use client";

import { useRef, useState } from "react";
import Avatar from "./Avatar";
import Icon from "./Icon";
import { DEFAULT_PROFILE_PHOTO } from "@/lib/profilePhoto";
import {
    createLink,
    deleteLink,
    deletePhoto,
    updateLink,
    updateProfile,
    uploadProfilePhoto
} from "@/lib/frontend/profiles";

export default function ProfileManager({ initialProfile, initialPhotos, username, onUpdated }) {
    const fileInput = useRef(null);
    const [profile, setProfile] = useState(initialProfile);
    const [photos, setPhotos] = useState(initialPhotos);
    const [editing, setEditing] = useState(false);
    const [links, setLinks] = useState(initialProfile.links || []);
    const [newLink, setNewLink] = useState({ title: "", url: "" });
    const [busy, setBusy] = useState("");
    const [message, setMessage] = useState(null);

    function updateLocal(nextProfile) {
        setProfile(nextProfile);
        onUpdated?.(nextProfile);
    }

    async function saveProfile(event) {
        event.preventDefault();
        setBusy("profile");
        setMessage(null);
        const form = new FormData(event.currentTarget);
        try {
            const result = await updateProfile({ name: form.get("name"), bio: form.get("bio"), gender: form.get("gender") || undefined });
            updateLocal({ ...profile, ...result.body });
            setEditing(false);
            setMessage({ type: "success", text: "Profile updated." });
        } catch (err) {
            setMessage({ type: "error", text: err.message });
        } finally {
            setBusy("");
        }
    }

    async function uploadPhoto(event) {
        const file = event.target.files?.[0];
        if (!file) return;
        setBusy("photo");
        setMessage(null);
        try {
            const result = await uploadProfilePhoto(file);
            setPhotos([result.photo]);
            updateLocal({ ...profile, profilePhoto: result.photo.path });
            setMessage({ type: "success", text: "Profile photo updated." });
        } catch (err) {
            setMessage({ type: "error", text: err.message });
        } finally {
            setBusy("");
            if (fileInput.current) fileInput.current.value = "";
        }
    }

    async function removeProfilePhoto() {
        const photo = photos[0];
        if (!photo) return;
        setBusy("photo");
        setMessage(null);
        try {
            await deletePhoto(photo._id);
            setPhotos([]);
            updateLocal({
                ...profile,
                profilePhoto: DEFAULT_PROFILE_PHOTO
            });
            setMessage({ type: "success", text: "Profile photo removed." });
        } catch (err) {
            setMessage({ type: "error", text: err.message });
        } finally {
            setBusy("");
        }
    }

    function changeLink(id, key, value) {
        setLinks(current => current.map(link => link._id === id ? { ...link, [key]: value } : link));
    }

    async function saveLink(link) {
        setBusy(link._id);
        setMessage(null);
        try {
            const result = await updateLink(link._id, { title: link.title, url: link.url });
            setLinks(current => current.map(item => item._id === link._id ? result.link : item));
            setMessage({ type: "success", text: "Link updated." });
        } catch (err) {
            setMessage({ type: "error", text: err.message });
        } finally {
            setBusy("");
        }
    }

    async function removeLink(id) {
        setBusy(id);
        setMessage(null);
        try {
            await deleteLink(id);
            setLinks(current => current.filter(link => link._id !== id));
        } catch (err) {
            setMessage({ type: "error", text: err.message });
        } finally {
            setBusy("");
        }
    }

    async function addLink(event) {
        event.preventDefault();
        setBusy("new-link");
        setMessage(null);
        try {
            const result = await createLink(newLink);
            setLinks(current => [...current, result.link]);
            setNewLink({ title: "", url: "" });
        } catch (err) {
            setMessage({ type: "error", text: err.message });
        } finally {
            setBusy("");
        }
    }

    return (
        <section className="profileHero card">
            <div className="profileHeroTop">
                <div className="profileAvatarWrap"><Avatar profile={profile} size={104} /><button className="avatarEdit" onClick={() => fileInput.current?.click()} disabled={busy === "photo"} aria-label="Upload profile photo"><Icon name="image" size={17} /></button><input ref={fileInput} className="visuallyHidden" type="file" accept="image/jpeg,image/png,image/webp,image/gif" onChange={uploadPhoto} /></div>
                <div className="profileHeroCopy"><span className="eyebrow">@{username}</span><h1>{profile.name}</h1>{profile.bio && <p>{profile.bio}</p>}<div className="profileStats"><a href={`/profiles/${profile._id}/followers`}><strong>{profile.followerCount}</strong> followers</a><a href={`/profiles/${profile._id}/following`}><strong>{profile.followingCount}</strong> following</a></div></div>
                <button className="button secondary small" onClick={() => setEditing(current => !current)}><Icon name="edit" size={16} /> {editing ? "Close" : "Edit profile"}</button>
            </div>
            {photos.length > 0 && <button className="textButton dangerText" onClick={removeProfilePhoto} disabled={busy === "photo"}>Remove profile photo</button>}
            {editing && <div className="profileEditArea">
                <form className="settingsForm" onSubmit={saveProfile}><h2>Profile details</h2><label htmlFor="edit-name">Display name</label><input id="edit-name" name="name" defaultValue={profile.name} maxLength="50" required /><label htmlFor="edit-bio">Bio</label><textarea id="edit-bio" name="bio" defaultValue={profile.bio || ""} maxLength="200" rows="3" /><label htmlFor="edit-gender">Gender</label><select id="edit-gender" name="gender" defaultValue={profile.gender || ""}><option value="">Choose later</option><option>Man</option><option>Woman</option><option>Prefer not to say</option></select><button className="button" disabled={busy === "profile"}>{busy === "profile" ? "Saving…" : "Save profile"}</button></form>
                <div className="linkManager"><h2>Your links</h2>{links.map(link => <div className="managedLink" key={link._id}><input aria-label="Link title" value={link.title} onChange={event => changeLink(link._id, "title", event.target.value)} /><input aria-label="Link URL" type="url" value={link.url} onChange={event => changeLink(link._id, "url", event.target.value)} /><button className="iconButton" aria-label="Save link" onClick={() => saveLink(link)} disabled={busy === link._id}>✓</button><button className="iconButton dangerText" aria-label="Delete link" onClick={() => removeLink(link._id)} disabled={busy === link._id}>×</button></div>)}<form className="managedLink new" onSubmit={addLink}><input aria-label="New link title" value={newLink.title} onChange={event => setNewLink(current => ({ ...current, title: event.target.value }))} placeholder="Link title" required /><input aria-label="New link URL" type="url" value={newLink.url} onChange={event => setNewLink(current => ({ ...current, url: event.target.value }))} placeholder="https://…" required /><button className="button small" disabled={busy === "new-link"}>Add</button></form></div>
            </div>}
            {!editing && links.length > 0 && <div className="profileLinks">{links.map(link => <a key={link._id} href={link.url} target="_blank" rel="noreferrer"><Icon name="link" size={15} /> {link.title}</a>)}</div>}
            {message && <p className={`fieldMessage ${message.type}`} role="status">{message.text}</p>}
        </section>
    );
}
