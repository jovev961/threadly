import { apiRequest } from "./request";

export function getAccount() {
    return apiRequest("/api/account");
}

export function updateAccount(updates) {
    return apiRequest("/api/account", {
        method: "PUT",
        body: JSON.stringify(updates)
    });
}

export function deleteAccount(currentPassword) {
    return apiRequest("/api/account", {
        method: "DELETE",
        body: JSON.stringify({ currentPassword })
    });
}
