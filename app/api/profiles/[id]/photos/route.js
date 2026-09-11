import mongoose from "mongoose";

import * as responses from "@/lib/responses";
import { protect } from "@/lib/backend/auth";

import { Profile } from "@/models/Profile";
import Photo from "@/models/Photo";

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

        const photos = await Photo.find({
            profile: profile._id,
            post: null
        })
            .sort({ createdAt: -1 })
            .lean();

        return responses.customResponse(
            {
                message: "Success",
                photos
            },
            200
        );
    } catch (err) {
        console.error(err);
        return responses.internalServerErrorResponse();
    }
}
