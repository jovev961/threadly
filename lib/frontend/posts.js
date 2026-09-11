import { apiRequest } from "./request";

export function getFeed(page = 1) {
    return apiRequest(`/api/posts?page=${page}&limit=10`);
}

export function getDiscoverPosts(page = 1) {
    return apiRequest(
        `/api/posts?scope=discover&page=${page}&limit=10`
    );
}

export function getPost(id) {
    return apiRequest(`/api/posts/${id}`);
}

export function getMyPosts() {
    return apiRequest("/api/posts/me");
}

export function createPost(post) {
    return apiRequest("/api/posts/me", {
        method: "POST",
        body: JSON.stringify(post)
    });
}

export function updatePost(postId, updates) {
    return apiRequest("/api/posts/me", {
        method: "PUT",
        body: JSON.stringify({ postId, ...updates })
    });
}

export function deletePost(postId) {
    return apiRequest("/api/posts/me", {
        method: "DELETE",
        body: JSON.stringify({ postId })
    });
}

export function uploadPostPhotos(postId, files) {
    const formData = new FormData();
    for (const file of files) formData.append("photos", file);
    return apiRequest(`/api/posts/${postId}/photos`, {
        method: "POST",
        body: formData
    });
}

function postAction(path, postId, method) {
    return apiRequest(path, {
        method,
        body: JSON.stringify({ postId })
    });
}

export function likePost(postId) {
    return postAction("/api/posts/like", postId, "POST");
}

export function unlikePost(postId) {
    return postAction("/api/posts/like", postId, "DELETE");
}

export function repostPost(postId) {
    return postAction("/api/posts/repost", postId, "POST");
}

export function removeRepost(postId) {
    return postAction("/api/posts/repost", postId, "DELETE");
}

export function recordShare(postId) {
    return postAction("/api/posts/share", postId, "POST");
}
