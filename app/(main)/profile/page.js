"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import ProfileManager from "@/components/ProfileManager";
import PostCard from "@/components/PostCard";
import PostComposer from "@/components/PostComposer";
import { getAccount } from "@/lib/frontend/account";
import {
    getMyProfile,
    getMyProfilePhotos,
    getProfilePosts,
    getProfileReposts
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

export default function MyProfilePage() {
    const router = useRouter();
    const [data, setData] = useState(null);
    const [activeTab, setActiveTab] = useState("posts");
    const [posts, setPosts] = useState([]);
    const [postPagination, setPostPagination] = useState(null);
    const [reposts, setReposts] = useState([]);
    const [repostPagination, setRepostPagination] = useState(null);
    const [repostsLoaded, setRepostsLoaded] = useState(false);
    const [loading, setLoading] = useState(true);
    const [timelineLoading, setTimelineLoading] = useState(false);
    const [error, setError] = useState("");
    const [timelineError, setTimelineError] = useState("");

    useEffect(() => {
        let active = true;

        Promise.all([getMyProfile(), getMyProfilePhotos(), getAccount()])
            .then(async ([profile, photos, account]) => {
                const postResult = await getProfilePosts(profile.body._id);
                if (!active) return;

                setData({
                    profile: profile.body,
                    photos: photos.photos,
                    username: account.account.username
                });
                setPosts(postResult.posts);
                setPostPagination(postResult.pagination);
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

    function handleRepostChanged(nextPost, reposted) {
        if (!repostsLoaded) return;

        const alreadyListed = reposts.some(post => post._id === nextPost._id);

        if (reposted && !alreadyListed) {
            setReposts(current => [{
                ...nextPost,
                feedType: "repost",
                feedCreatedAt: new Date().toISOString(),
                repostedBy: {
                    _id: data.profile._id,
                    name: data.profile.name
                }
            }, ...current]);
        } else if (!reposted && alreadyListed) {
            setReposts(current => current.filter(post => post._id !== nextPost._id));
        }

        setRepostPagination(current =>
            changePaginationTotal(current, reposted ? 1 : -1)
        );
    }

    async function loadPosts(page) {
        setTimelineLoading(true);
        setTimelineError("");

        try {
            const result = await getProfilePosts(data.profile._id, page);
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
            const result = await getProfileReposts(data.profile._id, page);
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

    if (loading) return <div className="standardPage"><div className="loadingCard">Loading your profile…</div></div>;
    if (error) return <div className="standardPage"><div className="notice error" role="alert">{error}</div></div>;
    if (!data) return null;

    const visiblePosts = activeTab === "posts" ? posts : reposts;
    const visiblePagination = activeTab === "posts"
        ? postPagination
        : repostPagination;

    return (
        <section className="standardPage profilePage">
            <ProfileManager
                initialProfile={data.profile}
                initialPhotos={data.photos}
                username={data.username}
                onUpdated={profile => setData(current => ({
                    ...current,
                    profile
                }))}
            />

            <div className="profileTabs" role="tablist" aria-label="Profile posts">
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

            {activeTab === "posts" && (
                <PostComposer
                    onCreated={post => {
                        setPosts(current => [post, ...current]);
                        setPostPagination(current =>
                            changePaginationTotal(current, 1)
                        );
                    }}
                />
            )}

            {timelineError && <div className="notice error profileTimelineNotice" role="alert">{timelineError}</div>}
            {timelineLoading && visiblePosts.length === 0 && <div className="loadingCard profileTimelineNotice">Loading {activeTab}…</div>}

            {!timelineLoading && visiblePosts.length === 0 && (
                <div className="emptyState profileTimelineNotice">
                    <h2>{activeTab === "posts" ? "No posts yet." : "No reposts yet."}</h2>
                    <p>{activeTab === "posts" ? "Your first post can be a thought, a photo, or a question." : "Posts you repost will appear here."}</p>
                </div>
            )}

            <div className="postList">
                {visiblePosts.map(post => (
                    <PostCard
                        key={`${activeTab}-${post._id}-${post.feedCreatedAt || "post"}`}
                        initialPost={post}
                        currentProfileId={data.profile._id}
                        onChanged={updateEverywhere}
                        onRepostChanged={handleRepostChanged}
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
