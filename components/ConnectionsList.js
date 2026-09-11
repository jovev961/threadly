"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Avatar from "./Avatar";
import Icon from "./Icon";
import { getFollowers, getFollowing, getProfile } from "@/lib/frontend/profiles";

export default function ConnectionsList({ profileId, type }) {
    const router = useRouter();
    const [profile, setProfile] = useState(null);
    const [items, setItems] = useState([]);
    const [pagination, setPagination] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");
    const getter = type === "followers" ? getFollowers : getFollowing;

    async function load(page = 1, append = false) {
        setLoading(true);
        setError("");
        try {
            const result = await getter(profileId, page);
            const nextItems = result[type];
            setItems(current => append ? [...current, ...nextItems] : nextItems);
            setPagination(result.pagination);
        } catch (err) {
            if (err.status === 401) router.replace("/login");
            else setError(err.message);
        } finally {
            setLoading(false);
        }
    }

    useEffect(() => {
        let active = true;
        Promise.all([getProfile(profileId), getter(profileId, 1)])
            .then(([profileResult, connections]) => {
                if (!active) return;
                setProfile(profileResult.body);
                setItems(connections[type]);
                setPagination(connections.pagination);
            })
            .catch(err => {
                if (!active) return;
                if (err.status === 401) router.replace("/login");
                else setError(err.message);
            })
            .finally(() => active && setLoading(false));
        return () => { active = false; };
    }, [getter, profileId, router, type]);

    return (
        <section className="narrowPage">
            <Link href={`/profiles/${profileId}`} className="backLink"><Icon name="back" size={18} /> Back to profile</Link>
            <div className="pageHeader"><span className="eyebrow">{profile?.name || "Profile"}</span><h1>{type === "followers" ? "Followers" : "Following"}</h1><p>{pagination?.total || 0} people</p></div>
            {error && <div className="notice error" role="alert">{error}</div>}
            <div className="connectionList">{items.map(item => {
                const person = item[type === "followers" ? "follower" : "following"];
                return <Link href={`/profiles/${person._id}`} className="connectionRow" key={item._id}><Avatar profile={person} size={46} /><span><strong>{person.name}</strong><small>@{person.user?.username || "member"}</small></span><Icon name="back" size={16} /></Link>;
            })}</div>
            {!loading && !error && items.length === 0 && <div className="emptyState"><h2>Nothing here yet.</h2></div>}
            {loading && <div className="loadingCard">Loading {type}…</div>}
            {pagination?.hasNextPage && !loading && <button className="button secondary loadMore" onClick={() => load(pagination.page + 1, true)}>Load more</button>}
        </section>
    );
}
