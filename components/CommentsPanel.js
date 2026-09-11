"use client";

import { useState } from "react";
import Avatar from "./Avatar";
import {
    createComment,
    deleteComment,
    getComments,
    updateComment
} from "@/lib/frontend/comments";

function Comment({ comment, currentProfileId, onReply, onUpdated, onDeleted }) {
    const [editing, setEditing] = useState(false);
    const [content, setContent] = useState(comment.content);
    const [busy, setBusy] = useState(false);
    const [error, setError] = useState("");
    const isOwner = comment.profile?._id === currentProfileId;

    async function save(event) {
        event.preventDefault();
        setBusy(true);
        setError("");
        try {
            const result = await updateComment(comment._id, content);
            onUpdated({ ...comment, ...result.comment, profile: comment.profile });
            setEditing(false);
        } catch (err) {
            setError(err.message);
        } finally {
            setBusy(false);
        }
    }

    async function remove() {
        if (!window.confirm("Delete this comment? Replies will also be removed.")) return;
        setBusy(true);
        setError("");
        try {
            await deleteComment(comment._id);
            onDeleted(comment);
        } catch (err) {
            setError(err.message);
        } finally {
            setBusy(false);
        }
    }

    return (
        <article className={comment.parentComment ? "comment reply" : "comment"}>
            <Avatar profile={comment.profile} size={34} />
            <div className="commentBody">
                <div className="commentMeta"><strong>{comment.profile?.name || "Threadly member"}</strong><span>@{comment.profile?.user?.username || "member"}</span></div>
                {editing ? <form className="inlineEdit" onSubmit={save}><textarea value={content} onChange={event => setContent(event.target.value)} minLength="2" maxLength="500" required rows="2" /><div><button type="button" className="textButton" onClick={() => setEditing(false)}>Cancel</button><button className="button small" disabled={busy}>Save</button></div></form> : <p>{comment.content}</p>}
                {!editing && <div className="commentActions">{!comment.parentComment && <button onClick={() => onReply(comment)}>Reply</button>}{isOwner && <><button onClick={() => setEditing(true)}>Edit</button><button className="dangerText" onClick={remove} disabled={busy}>Delete</button></>}</div>}
                {error && <p className="fieldMessage error" role="alert">{error}</p>}
            </div>
        </article>
    );
}

export default function CommentsPanel({ postId, initialComments, initialPagination, currentProfileId }) {
    const [comments, setComments] = useState(initialComments);
    const [pagination, setPagination] = useState(initialPagination);
    const [content, setContent] = useState("");
    const [replyingTo, setReplyingTo] = useState(null);
    const [busy, setBusy] = useState(false);
    const [error, setError] = useState("");

    async function submit(event) {
        event.preventDefault();
        setBusy(true);
        setError("");
        try {
            const result = await createComment(postId, content, replyingTo?._id || null);
            setComments(current => [...current, result.comment]);
            setContent("");
            setReplyingTo(null);
        } catch (err) {
            setError(err.message);
        } finally {
            setBusy(false);
        }
    }

    async function loadMore() {
        setBusy(true);
        setError("");
        try {
            const result = await getComments(postId, pagination.page + 1);
            setComments(current => [...current, ...result.comments]);
            setPagination(result.pagination);
        } catch (err) {
            setError(err.message);
        } finally {
            setBusy(false);
        }
    }

    function removeLocal(comment) {
        setComments(current => current.filter(item => item._id !== comment._id && item.parentComment !== comment._id));
    }

    return (
        <section className="commentsSection card">
            <div className="sectionHeading"><div><span className="eyebrow">Discussion</span><h2>Comments</h2></div><span>{comments.length}{pagination?.hasNextPage ? "+" : ""}</span></div>
            <form className="commentForm" onSubmit={submit}>
                {replyingTo && <div className="replyingTo">Replying to {replyingTo.profile?.name}<button type="button" onClick={() => setReplyingTo(null)}>Cancel</button></div>}
                <label className="visuallyHidden" htmlFor="new-comment">Add a comment</label>
                <textarea id="new-comment" value={content} onChange={event => setContent(event.target.value)} minLength="2" maxLength="500" rows="3" required placeholder={replyingTo ? "Write a reply…" : "Add to the conversation…"} />
                <button className="button small" disabled={busy}>{busy ? "Posting…" : replyingTo ? "Post reply" : "Post comment"}</button>
            </form>
            {error && <p className="fieldMessage error" role="alert">{error}</p>}
            <div className="commentList">{comments.map(comment => <Comment key={comment._id} comment={comment} currentProfileId={currentProfileId} onReply={setReplyingTo} onUpdated={updated => setComments(current => current.map(item => item._id === updated._id ? updated : item))} onDeleted={removeLocal} />)}</div>
            {comments.length === 0 && <div className="emptyComments">No comments yet. Start the discussion.</div>}
            {pagination?.hasNextPage && <button className="button secondary loadMore" onClick={loadMore} disabled={busy}>Load more comments</button>}
        </section>
    );
}
