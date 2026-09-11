export function getPagination(request) {
    const pageValue = Number.parseInt(
        request.nextUrl.searchParams.get("page"),
        10
    );

    const limitValue = Number.parseInt(
        request.nextUrl.searchParams.get("limit"),
        10
    );

    const page =
        Number.isInteger(pageValue) && pageValue > 0
            ? pageValue
            : 1;

    const requestedLimit =
        Number.isInteger(limitValue) && limitValue > 0
            ? limitValue
            : 20;

    const limit = Math.min(requestedLimit, 50);

    const skip = (page - 1) * limit;

    return {
        page,
        limit,
        skip
    };
}

export function getPaginationMeta(
    total,
    page,
    limit
) {
    const totalPages = Math.ceil(total / limit);

    return {
        page,
        limit,
        total,
        totalPages,
        hasNextPage: page < totalPages,
        hasPreviousPage: page > 1
    };
}
