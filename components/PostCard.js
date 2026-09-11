"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import Avatar from "./Avatar";
import Icon from "./Icon";
import {
    deletePost,
    likePost,
    recordShare,
    removeRepost,
    repostPost,
    unlikePost,
    updatePost,
    uploadPostPhotos
} from "@/lib/frontend/posts";
import { deletePhoto } from "@/lib/frontend/profiles";

function formatDate(value) {
    return new Intl.DateTimeFormat("en", {
        month: "short",
        day: "numeric",
        year: new Date(value).getFullYear() !== new Date().getFullYear() ? "numeric" : undefined
    }).format(new Date(value));
}

export default function PostCard({ initialPost, currentProfileId, onDeleted, onChanged, onRepostChanged, detailed = false }) {
    const [post, setPost] = useState(initialPost);
    const [busyAction, setBusyAction] = useState("");
    const [error, setError] = useState("");
    const [editing, setEditing] = useState(false);
    const [title, setTitle] = useState(post.title);
    const [content, setContent] = useState(post.content);
    const [newPhotos, setNewPhotos] = useState([]);
    const [activePhotoIndex, setActivePhotoIndex] = useState(null);
    const photoTriggerRef = useRef(null);
    const lightboxCloseRef = useRef(null);
    const isOwner = post.profile?._id === currentProfileId;
    const username = post.profile?.user?.username || "member";
    const photoCount = post.photos?.length || 0;

    useEffect(() => {
        if (activePhotoIndex === null) return;

        const previousOverflow = document.body.style.overflow;
        document.body.style.overflow = "hidden";
        lightboxCloseRef.current?.focus();

        function handleKeyDown(event) {
            if (event.key === "Escape") {
                setActivePhotoIndex(null);
                window.requestAnimationFrame(() => photoTriggerRef.current?.focus());
            } else if (event.key === "ArrowLeft" && photoCount > 1) {
                setActivePhotoIndex(current =>
                    (current - 1 + photoCount) % photoCount
                );
            } else if (event.key === "ArrowRight" && photoCount > 1) {
                setActivePhotoIndex(current =>
                    (current + 1) % photoCount
                );
            }
        }

        document.addEventListener("keydown", handleKeyDown);

        return () => {
            document.body.style.overflow = previousOverflow;
            document.removeEventListener("keydown", handleKeyDown);
        };
    }, [activePhotoIndex, photoCount]);

    function openPhoto(index, trigger) {
        photoTriggerRef.current = trigger;
        setActivePhotoIndex(index);
    }

    function closePhoto() {
        setActivePhotoIndex(null);
        window.requestAnimationFrame(() => photoTriggerRef.current?.focus());
    }

    function showPreviousPhoto() {
        setActivePhotoIndex(current =>
            (current - 1 + photoCount) % photoCount
        );
    }

    function showNextPhoto() {
        setActivePhotoIndex(current =>
            (current + 1) % photoCount
        );
    }

    function updateLocal(nextPost) {
        const mergedPost = { ...post, ...nextPost };
        setPost(mergedPost);
        onChanged?.(mergedPost);
    }

    async function toggleLike() {
        setBusyAction("like");
        setError("");
        try {
            if (post.likedByMe) await unlikePost(post._id);
            else await likePost(post._id);
            updateLocal({
                ...post,
                likedByMe: !post.likedByMe,
                likeCount: post.likeCount + (post.likedByMe ? -1 : 1)
            });
        } catch (err) {
            setError(err.message);
        } finally {
            setBusyAction("");
        }
    }

    async function toggleRepost() {
        setBusyAction("repost");
        setError("");
        try {
            if (post.repostedByMe) await removeRepost(post._id);
            else await repostPost(post._id);
            const nextPost = {
                ...post,
                repostedByMe: !post.repostedByMe,
                repostCount: post.repostCount + (post.repostedByMe ? -1 : 1)
            };
            updateLocal(nextPost);
            onRepostChanged?.(nextPost, nextPost.repostedByMe);
        } catch (err) {
            setError(err.message);
        } finally {
            setBusyAction("");
        }
    }

    async function sharePost() {
        setBusyAction("share");
        setError("");
        const url = `${window.location.origin}/posts/${post._id}`;
        try {
            if (navigator.share) {
                await navigator.share({ title: post.title, text: post.content, url });
            } else {
                await navigator.clipboard.writeText(url);
            }
            const result = await recordShare(post._id);
            updateLocal({ ...post, shareCount: result.shareCount });
        } catch (err) {
            if (err.name !== "AbortError") setError(err.message || "The post could not be shared.");
        } finally {
            setBusyAction("");
        }
    }

    async function saveEdit(event) {
        event.preventDefault();
        setBusyAction("edit");
        setError("");
        try {
            const result = await updatePost(post._id, { title, content });
            let nextPost = result.post;
            if (newPhotos.length) {
                const upload = await uploadPostPhotos(post._id, newPhotos);
                nextPost = { ...nextPost, photos: [...nextPost.photos, ...upload.photos] };
            }
            updateLocal(nextPost);
            setNewPhotos([]);
            setEditing(false);
        } catch (err) {
            setError(err.message);
        } finally {
            setBusyAction("");
        }
    }

    async function removePhoto(photoId) {
        setBusyAction(photoId);
        setError("");
        try {
            await deletePhoto(photoId);
            updateLocal({ ...post, photos: post.photos.filter(photo => photo._id !== photoId) });
        } catch (err) {
            setError(err.message);
        } finally {
            setBusyAction("");
        }
    }

    async function removePost() {
        if (!window.confirm("Delete this post and all of its comments and photos?")) return;
        setBusyAction("delete");
        setError("");
        try {
            await deletePost(post._id);
            onDeleted?.(post._id);
        } catch (err) {
            setError(err.message);
        } finally {
            setBusyAction("");
        }
    }

    if (editing) {
        return (
            <form className="postCard card editPost" onSubmit={saveEdit}>
                <div className="sectionHeading compact"><h2>Edit post</h2><button type="button" className="textButton" onClick={() => setEditing(false)}>Cancel</button></div>
                <label htmlFor={`title-${post._id}`}>Title</label>
                <input id={`title-${post._id}`} value={title} onChange={event => setTitle(event.target.value)} minLength="3" maxLength="200" required />
                <label htmlFor={`content-${post._id}`}>Content</label>
                <textarea id={`content-${post._id}`} value={content} onChange={event => setContent(event.target.value)} minLength="5" maxLength="500" rows="5" required />
                {post.photos.length > 0 && <div className="editablePhotos">{post.photos.map(photo => <span key={photo._id}><Image src={photo.path} alt="Post attachment" fill sizes="100px" unoptimized /><button type="button" aria-label="Remove photo" onClick={() => removePhoto(photo._id)} disabled={busyAction === photo._id}>×</button></span>)}</div>}
                <label className="fileButton" htmlFor={`photos-${post._id}`}><Icon name="image" size={18} /> Add more photos</label>
                <input className="visuallyHidden" id={`photos-${post._id}`} type="file" accept="image/jpeg,image/png,image/webp,image/gif" multiple onChange={event => setNewPhotos(Array.from(event.target.files || []).slice(0, 10))} />
                <div className="formActions"><span>{newPhotos.length ? `${newPhotos.length} new photos` : ""}</span><button className="button" disabled={busyAction === "edit"}>{busyAction === "edit" ? "Saving…" : "Save changes"}</button></div>
                {error && <p className="fieldMessage error" role="alert">{error}</p>}
            </form>
        );
    }

    return (
        <>
        <article className={detailed ? "postCard card detailedPost" : "postCard card"}>
            {post.feedType === "repost" && post.repostedBy && <div className="repostLabel"><Icon name="repost" size={15} /> Reposted by {post.repostedBy.name}</div>}
            <header className="postHeader">
                <Link href={isOwner ? "/profile" : `/profiles/${post.profile?._id}`} className="profileIdentity">
                    <Avatar profile={post.profile} size={42} />
                    <span><strong>{post.profile?.name || "Threadly member"}</strong><small>@{username} · {formatDate(post.createdAt)}</small></span>
                </Link>
                {isOwner && <div className="ownerActions"><button aria-label="Edit post" onClick={() => setEditing(true)}><Icon name="edit" size={17} /></button><button aria-label="Delete post" onClick={removePost} disabled={busyAction === "delete"}><Icon name="trash" size={17} /></button></div>}
            </header>
            <div className="postCopy">
                {detailed ? <h1>{post.title}</h1> : <Link href={`/posts/${post._id}`}><h2>{post.title}</h2></Link>}
                <p>{post.content}</p>
            </div>
            {post.photos?.length > 0 && (
                <div className={`photoGrid photos${Math.min(post.photos.length, 4)}`}>
                    {post.photos.map((photo, index) => (
                        <button
                            key={photo._id}
                            type="button"
                            className="photoGridButton"
                            aria-label={`Open photo ${index + 1} of ${photoCount}`}
                            onClick={event => openPhoto(index, event.currentTarget)}
                        >
                            <Image
                                src={photo.path}
                                alt={`Photo ${index + 1} attached to ${post.title}`}
                                width={900}
                                height={700}
                                sizes="(max-width: 720px) 100vw, 650px"
                                unoptimized
                            />
                        </button>
                    ))}
                </div>
            )}
            <footer className="postActions">
                <button className={post.likedByMe ? "selected" : ""} onClick={toggleLike} disabled={Boolean(busyAction)} aria-label={post.likedByMe ? "Unlike post" : "Like post"}><Icon name="heart" size={19} /><span>{post.likeCount}</span></button>
                <Link href={`/posts/${post._id}`} aria-label="View comments"><Icon name="comment" size={19} /><span>{post.commentCount}</span></Link>
                <button className={post.repostedByMe ? "selected green" : ""} onClick={toggleRepost} disabled={Boolean(busyAction)} aria-label={post.repostedByMe ? "Remove repost" : "Repost"}><Icon name="repost" size={19} /><span>{post.repostCount}</span></button>
                <button onClick={sharePost} disabled={Boolean(busyAction)} aria-label="Share post"><Icon name="share" size={19} /><span>{post.shareCount || 0}</span></button>
            </footer>
            {error && <p className="fieldMessage error postError" role="alert">{error}</p>}
        </article>

        {activePhotoIndex !== null && post.photos?.[activePhotoIndex] && (
            <div
                className="photoLightbox"
                role="dialog"
                aria-modal="true"
                aria-label={`Photo ${activePhotoIndex + 1} of ${photoCount}`}
                onClick={event => {
                    if (event.target === event.currentTarget) closePhoto();
                }}
            >
                <button
                    ref={lightboxCloseRef}
                    type="button"
                    className="photoLightboxControl photoLightboxClose"
                    aria-label="Close photo viewer"
                    onClick={closePhoto}
                >
                    <Icon name="close" size={24} />
                </button>

                {photoCount > 1 && (
                    <button
                        type="button"
                        className="photoLightboxControl photoLightboxPrevious"
                        aria-label="Previous photo"
                        onClick={showPreviousPhoto}
                    >
                        <Icon name="chevronLeft" size={28} />
                    </button>
                )}

                <div
                    className="photoLightboxImage"
                    onClick={event => {
                        if (event.target === event.currentTarget) closePhoto();
                    }}
                >
                    <Image
                        src={post.photos[activePhotoIndex].path}
                        alt={`Photo ${activePhotoIndex + 1} attached to ${post.title}`}
                        fill
                        sizes="100vw"
                        unoptimized
                    />
                </div>

                {photoCount > 1 && (
                    <button
                        type="button"
                        className="photoLightboxControl photoLightboxNext"
                        aria-label="Next photo"
                        onClick={showNextPhoto}
                    >
                        <Icon name="chevronRight" size={28} />
                    </button>
                )}

                <span className="photoLightboxCounter" aria-live="polite">
                    {activePhotoIndex + 1} of {photoCount}
                </span>
            </div>
        )}
        </>
    );
}
