"use client";

import { useRef, useState } from "react";
import { createPost, uploadPostPhotos } from "@/lib/frontend/posts";
import Icon from "./Icon";

const ALLOWED_TYPES = ["image/jpeg", "image/png", "image/webp", "image/gif"];
const MAX_FILE_SIZE = 5 * 1024 * 1024;

export default function PostComposer({ onCreated }) {
    const fileInput = useRef(null);
    const [expanded, setExpanded] = useState(false);
    const [title, setTitle] = useState("");
    const [content, setContent] = useState("");
    const [files, setFiles] = useState([]);
    const [submitting, setSubmitting] = useState(false);
    const [message, setMessage] = useState(null);

    function selectFiles(event) {
        const selected = Array.from(event.target.files || []);
        if (selected.length > 10) {
            setMessage({ type: "error", text: "Choose no more than 10 photos." });
            return;
        }
        const invalid = selected.find(file => !ALLOWED_TYPES.includes(file.type) || file.size > MAX_FILE_SIZE);
        if (invalid) {
            setMessage({ type: "error", text: "Photos must be JPG, PNG, WEBP, or GIF and no larger than 5MB." });
            return;
        }
        setFiles(selected);
        setMessage(null);
    }

    async function handleSubmit(event) {
        event.preventDefault();
        setSubmitting(true);
        setMessage(null);

        try {
            const result = await createPost({ title, content });
            let post = result.post;

            if (files.length > 0) {
                try {
                    const upload = await uploadPostPhotos(post._id, files);
                    post = { ...post, photos: upload.photos };
                } catch (photoError) {
                    setMessage({
                        type: "warning",
                        text: `Your post was published, but its photos could not be uploaded: ${photoError.message}`
                    });
                }
            }

            onCreated?.(post);
            setTitle("");
            setContent("");
            setFiles([]);
            setExpanded(false);
            if (fileInput.current) fileInput.current.value = "";
            setMessage(current => current || { type: "success", text: "Post published." });
        } catch (err) {
            setMessage({ type: "error", text: err.message });
        } finally {
            setSubmitting(false);
        }
    }

    if (!expanded) {
        return (
            <button className="composerPrompt" onClick={() => setExpanded(true)}>
                <span>Share something with your community…</span>
                <span className="composerPromptIcon"><Icon name="edit" size={18} /></span>
            </button>
        );
    }

    return (
        <form className="composer card" onSubmit={handleSubmit}>
            <div className="sectionHeading compact">
                <div>
                    <span className="eyebrow">Create</span>
                    <h2>New post</h2>
                </div>
                <button type="button" className="textButton" onClick={() => setExpanded(false)}>Cancel</button>
            </div>
            <label htmlFor="post-title">Title</label>
            <input id="post-title" value={title} onChange={event => setTitle(event.target.value)} minLength="3" maxLength="200" required placeholder="Give your post a clear title" />
            <label htmlFor="post-content">What do you want to share?</label>
            <textarea id="post-content" value={content} onChange={event => setContent(event.target.value)} minLength="5" maxLength="500" rows="5" required placeholder="Add context, a story, or a question…" />
            <div className="composerTools">
                <label className="fileButton" htmlFor="post-photos"><Icon name="image" size={18} /> Add photos</label>
                <input ref={fileInput} id="post-photos" className="visuallyHidden" type="file" accept="image/jpeg,image/png,image/webp,image/gif" multiple onChange={selectFiles} />
                <span>{files.length ? `${files.length} selected` : "Optional · up to 10"}</span>
                <button className="button" disabled={submitting}>{submitting ? "Publishing…" : "Publish"}</button>
            </div>
            {message && <p className={`fieldMessage ${message.type}`} role="status">{message.text}</p>}
        </form>
    );
}
