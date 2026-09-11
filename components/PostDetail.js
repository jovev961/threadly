"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import CommentsPanel from "./CommentsPanel";
import Icon from "./Icon";
import PostCard from "./PostCard";
import { getComments } from "@/lib/frontend/comments";
import { getPost } from "@/lib/frontend/posts";
import { getMyProfile } from "@/lib/frontend/profiles";

export default function PostDetail({ postId }) {
    const router = useRouter();
    const [data, setData] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");

    useEffect(() => {
        let active = true;
        Promise.all([getPost(postId), getMyProfile(), getComments(postId)])
            .then(([post, profile, comments]) => active && setData({ post: post.post, profileId: profile.body._id, comments }))
            .catch(err => {
                if (!active) return;
                if (err.status === 401) router.replace("/login");
                else setError(err.message);
            })
            .finally(() => active && setLoading(false));
        return () => { active = false; };
    }, [postId, router]);

    if (loading) return <div className="narrowPage"><div className="loadingCard">Loading post…</div></div>;
    if (!data) return <div className="narrowPage"><Link href="/" className="backLink"><Icon name="back" size={18} /> Back home</Link><div className="notice error" role="alert">{error || "Post not found."}</div></div>;

    return (
        <section className="narrowPage postDetailPage">
            <Link href="/" className="backLink"><Icon name="back" size={18} /> Back home</Link>
            <PostCard initialPost={data.post} currentProfileId={data.profileId} detailed onDeleted={() => router.replace("/")} />
            <CommentsPanel postId={postId} initialComments={data.comments.comments} initialPagination={data.comments.pagination} currentProfileId={data.profileId} />
        </section>
    );
}
