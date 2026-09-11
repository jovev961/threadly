import mongoose from "mongoose";
import * as responses from "@/lib/responses";
import { DEFAULT_PROFILE_PHOTO } from "@/lib/profilePhoto";
import { connectDB } from "@/lib/backend/mongo";
import { protect } from "@/lib/backend/auth";
import { Profile } from "@/models/Profile";
import Photo from "@/models/Photo";
import "@/models/Follow";

export async function GET(request, { params }) {
    try {
        await connectDB();

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

        const currentProfile = await Profile.findOne({
            user: user._id
        });

        if (!currentProfile) {
            return responses.notFoundResponse("Profile");
        }

        const profile = await Profile.findById(id)
            .populate({
                path: "user",
                select: "username"
            })
            .populate("links")
            .populate({
                path: "followers",
                populate: {
                    path: "follower",
                    model: "Profile"
                }
            })
            .populate({
                path: "following",
                populate: {
                    path: "following",
                    model: "Profile"
                }
            });

        if (!profile) {
            return responses.notFoundResponse("Profile");
        }

        const profilePhoto = await Photo.findOne({
            profile: profile._id,
            post: null
        }).lean();

        const result = profile.toObject();

        result.username = result.user?.username || null;
        result.user = result.user?._id || result.user;

        result.profilePhoto =
            profilePhoto?.path || DEFAULT_PROFILE_PHOTO;

        result.followerCount =
            profile.followers.length;

        result.followingCount =
            profile.following.length;

        result.followedByMe =
            profile.followers.some(
                follow =>
                    follow.follower?._id?.toString() ===
                    currentProfile._id.toString()
            );

        return responses.customResponse(
            {
                message: "Success",
                body: result
            },
            200
        );

    } catch (err) {
        console.error(err);
        return responses.internalServerErrorResponse();
    }
}
