import mongoose from "mongoose";

import * as responses from "@/lib/responses";
import { protect } from "@/lib/backend/auth";

import { Profile } from "@/models/Profile";
import Photo from "@/models/Photo";

import {
    deletePhotoFile
} from "@/lib/backend/photoStorage";

export const runtime = "nodejs";

export async function DELETE(request, { params }) {
    try {
        const user = await protect(request);

        if (!user) {
            return responses.unauthorizedResponse();
        }

        const profile = await Profile.findOne({
            user: user._id
        });

        if (!profile) {
            return responses.notFoundResponse("Profile");
        }

        const { id } = await params;

        if (!id || !mongoose.isValidObjectId(id)) {
            return responses.badRequestResponse(
                "PhotoID is missing or invalid"
            );
        }

        const photo = await Photo.findOne({
            _id: id,
            profile: profile._id
        });

        if (!photo) {
            return responses.notFoundResponse("Photo");
        }

        await deletePhotoFile(photo.path);

        await Photo.deleteOne({
            _id: photo._id
        });

        return responses.customResponse(
            {
                message: "Photo deleted"
            },
            200
        );
    } catch (err) {
        console.error(err);
        return responses.internalServerErrorResponse();
    }
}
