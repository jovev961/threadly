import { apiRequest } from "./request";

export function getComments(postId, page = 1) {
    return apiRequest(`/api/posts/${postId}/comments?page=${page}&limit=20`);
}

export function createComment(postId, content, parentComment = null) {
    return apiRequest(`/api/posts/${postId}/comments`, {
        method: "POST",
        body: JSON.stringify({ content, parentComment })
    });
}

export function updateComment(id, content) {
    return apiRequest(`/api/comments/${id}`, {
        method: "PUT",
        body: JSON.stringify({ content })
    });
}

export function deleteComment(id) {
    return apiRequest(`/api/comments/${id}`, { method: "DELETE" });
}
