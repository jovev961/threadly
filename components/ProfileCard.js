"use client";

import Link from "next/link";
import { useState } from "react";
import Avatar from "./Avatar";
import { followProfile, unfollowProfile } from "@/lib/frontend/profiles";

export default function ProfileCard({ initialProfile }) {
    const [profile, setProfile] = useState(initialProfile);
    const [busy, setBusy] = useState(false);
    const [error, setError] = useState("");

    async function toggleFollow() {
        setBusy(true);
        setError("");
        try {
            if (profile.followedByMe) {
                await unfollowProfile(profile._id);
            } else {
                await followProfile(profile._id);
            }
            setProfile(current => ({
                ...current,
                followedByMe: !current.followedByMe,
                followerCount: current.followerCount + (current.followedByMe ? -1 : 1)
            }));
        } catch (err) {
            setError(err.message);
        } finally {
            setBusy(false);
        }
    }

    return (
        <article className="profileCard">
            <Link href={`/profiles/${profile._id}`} className="profileIdentity">
                <Avatar profile={profile} size={52} />
                <span>
                    <strong>{profile.name}</strong>
                    <small>@{profile.user?.username || "member"}</small>
                </span>
            </Link>
            {profile.bio && <p>{profile.bio}</p>}
            <div className="profileCardFooter">
                <span>{profile.followerCount} followers</span>
                <button className={profile.followedByMe ? "button secondary small" : "button small"} onClick={toggleFollow} disabled={busy}>
                    {busy ? "Please wait…" : profile.followedByMe ? "Following" : "Follow"}
                </button>
            </div>
            {error && <p className="fieldMessage error" role="alert">{error}</p>}
        </article>
    );
}
