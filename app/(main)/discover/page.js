"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import PostCard from "@/components/PostCard";
import { getDiscoverPosts } from "@/lib/frontend/posts";
import { getMyProfile } from "@/lib/frontend/profiles";

export default function DiscoverPage() {
    const router = useRouter();
    const [posts, setPosts] = useState([]);
    const [profileId, setProfileId] = useState("");
    const [pagination, setPagination] = useState(null);
    const [loading, setLoading] = useState(true);
    const [loadingMore, setLoadingMore] = useState(false);
    const [error, setError] = useState("");

    useEffect(() => {
        let active = true;

        Promise.all([getDiscoverPosts(), getMyProfile()])
            .then(([postResult, profileResult]) => {
                if (!active) return;
                setPosts(postResult.posts);
                setPagination(postResult.pagination);
                setProfileId(profileResult.body._id);
            })
            .catch(err => {
                if (!active) return;
                if (err.status === 401) router.replace("/login");
                else if (err.status === 404) router.replace("/onboarding");
                else setError(err.message);
            })
            .finally(() => active && setLoading(false));

        return () => { active = false; };
    }, [router]);

    function updatePost(nextPost) {
        setPosts(current => current.map(post =>
            post._id === nextPost._id
                ? { ...post, ...nextPost }
                : post
        ));
    }

    async function loadMore() {
        if (!pagination?.hasNextPage) return;

        setLoadingMore(true);
        setError("");

        try {
            const result = await getDiscoverPosts(pagination.page + 1);
            setPosts(current => {
                const existingIds = new Set(current.map(post => post._id));
                return [
                    ...current,
                    ...result.posts.filter(post => !existingIds.has(post._id))
                ];
            });
            setPagination(result.pagination);
        } catch (err) {
            setError(err.message);
        } finally {
            setLoadingMore(false);
        }
    }

    return (
        <section className="narrowPage">
            <div className="pageHeader">
                <span className="eyebrow">Across Threadly</span>
                <h1>Discover</h1>
                <p>Explore the latest posts from everyone in the community.</p>
            </div>

            {loading && <div className="loadingCard">Loading posts…</div>}
            {error && <div className="notice error" role="alert"><strong>We couldn’t load Discover.</strong><span>{error}</span></div>}
            {!loading && !error && posts.length === 0 && <div className="emptyState"><span>✦</span><h2>No posts yet.</h2><p>New posts from the community will appear here.</p></div>}

            <div className="postList">
                {posts.map(post => (
                    <PostCard
                        key={post._id}
                        initialPost={post}
                        currentProfileId={profileId}
                        onChanged={updatePost}
                        onDeleted={id => setPosts(current => current.filter(post => post._id !== id))}
                    />
                ))}
            </div>

            {pagination?.hasNextPage && (
                <button className="button secondary loadMore" onClick={loadMore} disabled={loadingMore}>
                    {loadingMore ? "Loading…" : "Load more posts"}
                </button>
            )}
        </section>
    );
}
