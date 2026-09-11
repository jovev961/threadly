export function unauthorizedResponse() {
    return Response.json(
        { message: "Unauthorized" },
        { status: 401 }
    );
}

export function internalServerErrorResponse() {
    return Response.json(
        { message: "Internal server error" },
        { status: 500 }
    );
}

export function notFoundResponse(type) {
    return Response.json(
        { message: `${type} not found!` },
        { status: 404 }
    );
}

export function badRequestResponse(message) {
    return Response.json(
        { message },
        { status: 400 }
    );
}

export function customResponse(data, status = 200) {
    return Response.json(data, { status });
}
