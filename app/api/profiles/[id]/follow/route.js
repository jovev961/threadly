import mongoose from "mongoose";

import * as responses from "@/lib/responses";
import { protect } from "@/lib/backend/auth";

import { Profile } from "@/models/Profile";
import Follow from "@/models/Follow";

export async function POST(request, { params }) {
    try {
        const user = await protect(request);

        if (!user) {
            return responses.unauthorizedResponse();
        }

        const { id } = await params;

        if (!id || !mongoose.isValidObjectId(id)) {
            return responses.badRequestResponse("ProfileID is missing or invalid");
        }

        const profile = await Profile.findOne({
            user: user._id
        });

        if (!profile) {
            return responses.notFoundResponse("Profile");
        }

        const targetProfile = await Profile.findById(id);

        if (!targetProfile) {
            return responses.notFoundResponse("Profile");
        }

        if (profile._id.equals(targetProfile._id)) {
            return responses.badRequestResponse("You cannot follow yourself");
        }

        const existingFollow = await Follow.findOne({
            follower: profile._id,
            following: targetProfile._id
        });

        if (existingFollow) {
            return responses.customResponse(
                { message: "Profile already followed" },
                409
            );
        }

        const follow = await Follow.create({
            follower: profile._id,
            following: targetProfile._id
        });

        return responses.customResponse(
            {
                message: "Profile followed",
                follow
            },
            201
        );

    } catch (err) {
        console.error(err);
        return responses.internalServerErrorResponse();
    }
}

export async function DELETE(request, { params }) {
    try {
        const user = await protect(request);

        if (!user) {
            return responses.unauthorizedResponse();
        }

        const { id } = await params;

        if (!id || !mongoose.isValidObjectId(id)) {
            return responses.badRequestResponse("ProfileID is missing or invalid");
        }

        const profile = await Profile.findOne({
            user: user._id
        });

        if (!profile) {
            return responses.notFoundResponse("Profile");
        }

        const deletedFollow = await Follow.findOneAndDelete({
            follower: profile._id,
            following: id
        });

        if (!deletedFollow) {
            return responses.notFoundResponse("Follow");
        }

        return responses.customResponse(
            { message: "Profile unfollowed" },
            200
        );

    } catch (err) {
        console.error(err);
        return responses.internalServerErrorResponse();
    }
}
