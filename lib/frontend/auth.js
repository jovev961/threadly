import { apiRequest } from "./request";

export function login(credentials) {
    return apiRequest("/api/auth/login", {
        method: "POST",
        body: JSON.stringify(credentials)
    });
}

export function register(credentials) {
    return apiRequest("/api/auth/register", {
        method: "POST",
        body: JSON.stringify(credentials)
    });
}

export function logout() {
    return apiRequest("/api/auth/logout", { method: "POST" });
}
