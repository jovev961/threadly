import * as responses from "@/lib/responses";
import { DEFAULT_PROFILE_PHOTO } from "@/lib/profilePhoto";
import { connectDB } from "@/lib/backend/mongo";
import { protect } from "@/lib/backend/auth";
import {
    getPagination,
    getPaginationMeta
} from "@/lib/backend/pagination";

import { Profile } from "@/models/Profile";
import User from "@/models/User";
import Photo from "@/models/Photo";
import "@/models/Follow";

export async function GET(request) {
    try {
        await connectDB();

        const user = await protect(request);

        if (!user) {
            return responses.unauthorizedResponse();
        }

        const currentProfile = await Profile.findOne({
            user: user._id
        });

        if (!currentProfile) {
            return responses.notFoundResponse("Profile");
        }

        const search =
            request.nextUrl.searchParams
                .get("search")
                ?.trim() || "";

        const { page, limit, skip } =
            getPagination(request);

        const query = {
            _id: { $ne: currentProfile._id }
        };

        if (search) {
            const matchingUsers = await User.find({
                username: {
                    $regex: search,
                    $options: "i"
                }
            }).select("_id");

            query.$or = [
                {
                    name: {
                        $regex: search,
                        $options: "i"
                    }
                },
                {
                    user: {
                        $in: matchingUsers.map(
                            user => user._id
                        )
                    }
                }
            ];
        }

        const [profiles, total] = await Promise.all([
            Profile.find(query)
                .populate({
                    path: "user",
                    select: "username"
                })
                .populate("followers")
                .populate("following")
                .sort({ name: 1 })
                .skip(skip)
                .limit(limit),

            Profile.countDocuments(query)
        ]);

        const profileIds =
            profiles.map(profile => profile._id);

        const photos =
            profileIds.length > 0
                ? await Photo.find({
                    profile: {
                        $in: profileIds
                    },
                    post: null
                }).lean()
                : [];

        const photoByProfile = new Map(
            photos.map(photo => [
                photo.profile.toString(),
                photo.path
            ])
        );

        const results = profiles.map(profile => {
            const result = profile.toObject();

            result.profilePhoto =
                photoByProfile.get(
                    profile._id.toString()
                ) || DEFAULT_PROFILE_PHOTO;

            result.followerCount =
                profile.followers.length;

            result.followingCount =
                profile.following.length;

            result.followedByMe =
                profile.followers.some(
                    follow =>
                        follow.follower?.toString() ===
                        currentProfile._id.toString()
                );

            return result;
        });

        return responses.customResponse(
            {
                message: "Success",
                body: results,
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
