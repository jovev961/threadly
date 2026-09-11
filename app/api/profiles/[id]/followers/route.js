import mongoose from "mongoose";

import * as responses from "@/lib/responses";
import { protect } from "@/lib/backend/auth";
import {
    getPagination,
    getPaginationMeta
} from "@/lib/backend/pagination";

import { Profile } from "@/models/Profile";
import Follow from "@/models/Follow";

export async function GET(request, { params }) {
    try {
        const user = await protect(request);

        if (!user) {
            return responses.unauthorizedResponse();
        }

        const { id } = await params;

        if (!id || !mongoose.isValidObjectId(id)) {
            return responses.badRequestResponse(
                "ProfileID is missing or invalid"
            );
        }

        const profile = await Profile.findById(id);

        if (!profile) {
            return responses.notFoundResponse("Profile");
        }

        const { page, limit, skip } =
            getPagination(request);

        const query = {
            following: profile._id
        };

        const [followers, total] = await Promise.all([
            Follow.find(query)
                .populate({
                    path: "follower",
                    select: "name user",
                    populate: {
                        path: "user",
                        select: "username"
                    }
                })
                .sort({ createdAt: -1 })
                .skip(skip)
                .limit(limit)
                .lean(),

            Follow.countDocuments(query)
        ]);

        return responses.customResponse(
            {
                message: "Success",
                followers,
                followerCount: total,
                pagination: getPaginationMeta(
                    total,
                    page,
                    limit
                )
            },
            200
        );

    } catch (err) {
        console.error(err);
        return responses.internalServerErrorResponse();
    }
}
