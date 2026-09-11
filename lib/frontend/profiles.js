import { apiRequest } from "./request";

function withPagination(path, page, limit = 10) {
    const separator = path.includes("?") ? "&" : "?";
    return `${path}${separator}page=${page}&limit=${limit}`;
}

export function getProfiles({ search = "", page = 1, limit = 10 } = {}) {
    const params = new URLSearchParams({ page, limit });
    if (search) params.set("search", search);
    return apiRequest(`/api/profiles?${params.toString()}`);
}

export function getMyProfile() {
    return apiRequest("/api/profiles/me");
}

export function getProfile(id) {
    return apiRequest(`/api/profiles/${id}`);
}

export function createProfile(profile) {
    return apiRequest("/api/profiles/me", {
        method: "POST",
        body: JSON.stringify(profile)
    });
}

export function updateProfile(profile) {
    return apiRequest("/api/profiles/me", {
        method: "PUT",
        body: JSON.stringify(profile)
    });
}

export function followProfile(id) {
    return apiRequest(`/api/profiles/${id}/follow`, { method: "POST" });
}

export function unfollowProfile(id) {
    return apiRequest(`/api/profiles/${id}/follow`, { method: "DELETE" });
}

export function getFollowers(id, page = 1) {
    return apiRequest(withPagination(`/api/profiles/${id}/followers`, page));
}

export function getFollowing(id, page = 1) {
    return apiRequest(withPagination(`/api/profiles/${id}/following`, page));
}

export function getProfilePosts(id, page = 1) {
    return apiRequest(withPagination(`/api/profiles/${id}/posts`, page));
}

export function getProfileReposts(id, page = 1) {
    return apiRequest(
        withPagination(`/api/profiles/${id}/posts?view=reposts`, page)
    );
}

export function getMyProfilePhotos() {
    return apiRequest("/api/profiles/me/photos");
}

export function uploadProfilePhoto(file) {
    const formData = new FormData();
    formData.append("photo", file);
    return apiRequest("/api/profiles/me/photos", {
        method: "POST",
        body: formData
    });
}

export function deletePhoto(id) {
    return apiRequest(`/api/photos/${id}`, { method: "DELETE" });
}

export function getMyLinks() {
    return apiRequest("/api/profiles/me/links");
}

export function createLink(link) {
    return apiRequest("/api/profiles/me/links", {
        method: "POST",
        body: JSON.stringify(link)
    });
}

export function updateLink(id, link) {
    return apiRequest(`/api/links/${id}`, {
        method: "PUT",
        body: JSON.stringify(link)
    });
}

export function deleteLink(id) {
    return apiRequest(`/api/links/${id}`, { method: "DELETE" });
}
