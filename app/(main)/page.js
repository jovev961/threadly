"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import PostComposer from "@/components/PostComposer";
import PostCard from "@/components/PostCard";
import ProfileCard from "@/components/ProfileCard";
import { getFeed } from "@/lib/frontend/posts";
import { getMyProfile, getProfiles } from "@/lib/frontend/profiles";

export default function FeedPage() {
    const router = useRouter();
    const [posts, setPosts] = useState([]);
    const [suggestions, setSuggestions] = useState([]);
    const [profileId, setProfileId] = useState("");
    const [pagination, setPagination] = useState(null);
    const [loading, setLoading] = useState(true);
    const [loadingMore, setLoadingMore] = useState(false);
    const [error, setError] = useState("");

    useEffect(() => {
        let active = true;
        Promise.all([getFeed(), getMyProfile(), getProfiles({ limit: 4 })])
            .then(([feed, profile, people]) => {
                if (!active) return;
                setPosts(feed.posts);
                setPagination(feed.pagination);
                setProfileId(profile.body._id);
                setSuggestions(people.body);
            })
            .catch(err => {
                if (!active) return;
                if (err.status === 401) router.replace("/login");
                else if (err.status === 404 && err.message.startsWith("Profile")) router.replace("/onboarding");
                else setError(err.message);
            })
            .finally(() => active && setLoading(false));
        return () => { active = false; };
    }, [router]);

    async function loadMore() {
        if (!pagination?.hasNextPage) return;
        setLoadingMore(true);
        setError("");
        try {
            const result = await getFeed(pagination.page + 1);
            setPosts(current => [...current, ...result.posts]);
            setPagination(result.pagination);
        } catch (err) {
            setError(err.message);
        } finally {
            setLoadingMore(false);
        }
    }

    return (
        <div className="pageGrid">
            <section className="feedColumn">
                <div className="pageHeader"><span className="eyebrow">Your community</span><h1>Home</h1><p>Fresh ideas from you and the people you follow.</p></div>
                <PostComposer onCreated={post => setPosts(current => [post, ...current])} />
                {loading && <div className="loadingCard">Loading your feed…</div>}
                {error && <div className="notice error" role="alert"><strong>We couldn’t load the feed.</strong><span>{error}</span></div>}
                {!loading && !error && posts.length === 0 && <div className="emptyState"><span>✦</span><h2>Your feed is ready for a first thread.</h2><p>Publish a post or follow someone from People to get the conversation moving.</p></div>}
                <div className="postList">
                    {posts.map((post, index) => <PostCard key={`${post.feedType || "post"}-${post._id}-${post.feedCreatedAt || index}`} initialPost={post} currentProfileId={profileId} onDeleted={id => setPosts(current => current.filter(item => item._id !== id))} />)}
                </div>
                {pagination?.hasNextPage && <button className="button secondary loadMore" onClick={loadMore} disabled={loadingMore}>{loadingMore ? "Loading…" : "Load more posts"}</button>}
            </section>

            <aside className="discoveryRail">
                <div className="railHeading"><div><span className="eyebrow">Discover</span><h2>People to follow</h2></div><a href="/people">See all</a></div>
                {suggestions.map(profile => <ProfileCard key={profile._id} initialProfile={profile} />)}
            </aside>
        </div>
    );
}
