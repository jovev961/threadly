export class ApiError extends Error {
    constructor(message, status) {
        super(message);
        this.name = "ApiError";
        this.status = status;
    }
}

export async function apiRequest(path, options = {}) {
    const headers = new Headers(options.headers);
    const isFormData = options.body instanceof FormData;

    if (options.body && !isFormData && !headers.has("Content-Type")) {
        headers.set("Content-Type", "application/json");
    }

    const response = await fetch(path, {
        ...options,
        headers,
        credentials: "same-origin"
    });

    const contentType = response.headers.get("content-type") || "";
    const data = contentType.includes("application/json")
        ? await response.json()
        : null;

    if (!response.ok) {
        throw new ApiError(
            data?.message || "Something went wrong. Please try again.",
            response.status
        );
    }

    return data;
}
