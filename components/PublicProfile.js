"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Avatar from "./Avatar";
import Icon from "./Icon";
import PostCard from "./PostCard";
import {
    followProfile,
    getMyProfile,
    getProfile,
    getProfilePosts,
    getProfileReposts,
    unfollowProfile
} from "@/lib/frontend/profiles";

function changePaginationTotal(pagination, change) {
    if (!pagination) return pagination;

    const total = Math.max(0, pagination.total + change);
    const totalPages = Math.ceil(total / pagination.limit);

    return {
        ...pagination,
        total,
        totalPages,
        hasNextPage: pagination.page < totalPages
    };
}

export default function PublicProfile({ profileId }) {
    const router = useRouter();
    const [profile, setProfile] = useState(null);
    const [currentProfileId, setCurrentProfileId] = useState("");
    const [activeTab, setActiveTab] = useState("posts");
    const [posts, setPosts] = useState([]);
    const [postPagination, setPostPagination] = useState(null);
    const [reposts, setReposts] = useState([]);
    const [repostPagination, setRepostPagination] = useState(null);
    const [repostsLoaded, setRepostsLoaded] = useState(false);
    const [loading, setLoading] = useState(true);
    const [timelineLoading, setTimelineLoading] = useState(false);
    const [busy, setBusy] = useState(false);
    const [error, setError] = useState("");
    const [timelineError, setTimelineError] = useState("");

    useEffect(() => {
        let active = true;

        Promise.all([getProfile(profileId), getProfilePosts(profileId), getMyProfile()])
            .then(([profileResult, postResult, me]) => {
                if (!active) return;
                if (me.body._id === profileId) {
                    router.replace("/profile");
                    return;
                }

                setProfile(profileResult.body);
                setPosts(postResult.posts);
                setPostPagination(postResult.pagination);
                setCurrentProfileId(me.body._id);
            })
            .catch(err => {
                if (!active) return;
                if (err.status === 401) router.replace("/login");
                else setError(err.message);
            })
            .finally(() => active && setLoading(false));

        return () => { active = false; };
    }, [profileId, router]);

    function updateEverywhere(nextPost) {
        const update = current => current.map(post =>
            post._id === nextPost._id
                ? { ...post, ...nextPost }
                : post
        );

        setPosts(update);
        setReposts(update);
    }

    function removeEverywhere(postId) {
        const authoredPost = posts.some(post => post._id === postId);
        const repostedPost = reposts.some(post => post._id === postId);

        setPosts(current => current.filter(post => post._id !== postId));
        setReposts(current => current.filter(post => post._id !== postId));

        if (authoredPost) {
            setPostPagination(current => changePaginationTotal(current, -1));
        }

        if (repostedPost) {
            setRepostPagination(current => changePaginationTotal(current, -1));
        }
    }

    async function toggleFollow() {
        setBusy(true);
        setError("");

        try {
            if (profile.followedByMe) await unfollowProfile(profileId);
            else await followProfile(profileId);
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

    async function loadPosts(page) {
        setTimelineLoading(true);
        setTimelineError("");

        try {
            const result = await getProfilePosts(profileId, page);
            setPosts(current => {
                const existingIds = new Set(current.map(post => post._id));
                return [
                    ...current,
                    ...result.posts.filter(post => !existingIds.has(post._id))
                ];
            });
            setPostPagination(result.pagination);
        } catch (err) {
            setTimelineError(err.message);
        } finally {
            setTimelineLoading(false);
        }
    }

    async function loadReposts(page = 1, append = false) {
        setTimelineLoading(true);
        setTimelineError("");

        try {
            const result = await getProfileReposts(profileId, page);
            setReposts(current => {
                if (!append) return result.posts;

                const existingIds = new Set(current.map(post => post._id));
                return [
                    ...current,
                    ...result.posts.filter(post => !existingIds.has(post._id))
                ];
            });
            setRepostPagination(result.pagination);
            setRepostsLoaded(true);
        } catch (err) {
            setTimelineError(err.message);
        } finally {
            setTimelineLoading(false);
        }
    }

    function selectTab(tab) {
        setActiveTab(tab);
        setTimelineError("");

        if (tab === "reposts" && !repostsLoaded) {
            loadReposts();
        }
    }

    if (loading) return <div className="standardPage"><div className="loadingCard">Loading profile…</div></div>;
    if (!profile) return <div className="standardPage"><div className="notice error" role="alert">{error || "Profile not found."}</div></div>;

    const visiblePosts = activeTab === "posts" ? posts : reposts;
    const visiblePagination = activeTab === "posts"
        ? postPagination
        : repostPagination;

    return (
        <section className="standardPage profilePage">
            <section className="profileHero card">
                <div className="profileHeroTop">
                    <Avatar profile={profile} size={104} />
                    <div className="profileHeroCopy">
                        <span className="eyebrow">@{profile.username || "member"}</span>
                        <h1>{profile.name}</h1>
                        {profile.bio && <p>{profile.bio}</p>}
                        <div className="profileStats">
                            <Link href={`/profiles/${profileId}/followers`}><strong>{profile.followerCount}</strong> followers</Link>
                            <Link href={`/profiles/${profileId}/following`}><strong>{profile.followingCount}</strong> following</Link>
                        </div>
                    </div>
                    <button className={profile.followedByMe ? "button secondary small" : "button small"} onClick={toggleFollow} disabled={busy}>
                        {busy ? "Please wait…" : profile.followedByMe ? "Following" : "Follow"}
                    </button>
                </div>
                {profile.links?.length > 0 && (
                    <div className="profileLinks">
                        {profile.links.map(link => (
                            <a key={link._id} href={link.url} target="_blank" rel="noreferrer">
                                <Icon name="link" size={15} /> {link.title}
                            </a>
                        ))}
                    </div>
                )}
                {error && <p className="fieldMessage error" role="alert">{error}</p>}
            </section>

            <div className="profileTabs" role="tablist" aria-label={`${profile.name}'s posts`}>
                <button
                    className={activeTab === "posts" ? "active" : ""}
                    type="button"
                    role="tab"
                    aria-selected={activeTab === "posts"}
                    onClick={() => selectTab("posts")}
                >
                    Posts <span>{postPagination?.total || 0}</span>
                </button>
                <button
                    className={activeTab === "reposts" ? "active" : ""}
                    type="button"
                    role="tab"
                    aria-selected={activeTab === "reposts"}
                    onClick={() => selectTab("reposts")}
                >
                    Reposts {repostsLoaded && <span>{repostPagination?.total || 0}</span>}
                </button>
            </div>

            {timelineError && <div className="notice error profileTimelineNotice" role="alert">{timelineError}</div>}
            {timelineLoading && visiblePosts.length === 0 && <div className="loadingCard profileTimelineNotice">Loading {activeTab}…</div>}

            {!timelineLoading && visiblePosts.length === 0 && (
                <div className="emptyState profileTimelineNotice">
                    <h2>{activeTab === "posts" ? "No posts yet." : "No reposts yet."}</h2>
                    <p>There’s nothing to show here right now.</p>
                </div>
            )}

            <div className="postList">
                {visiblePosts.map(post => (
                    <PostCard
                        key={`${activeTab}-${post._id}-${post.feedCreatedAt || "post"}`}
                        initialPost={post}
                        currentProfileId={currentProfileId}
                        onChanged={updateEverywhere}
                        onDeleted={removeEverywhere}
                    />
                ))}
            </div>

            {visiblePagination?.hasNextPage && (
                <button
                    className="button secondary loadMore"
                    onClick={() => activeTab === "posts"
                        ? loadPosts(postPagination.page + 1)
                        : loadReposts(repostPagination.page + 1, true)}
                    disabled={timelineLoading}
                >
                    {timelineLoading ? "Loading…" : `Load more ${activeTab}`}
                </button>
            )}
        </section>
    );
}
