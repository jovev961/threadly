import * as responses from "@/lib/responses";
import { protect } from "@/lib/backend/auth";

import { Profile } from "@/models/Profile";
import Photo from "@/models/Photo";

import {
    deletePhotoFile,
    saveProfilePhoto,
    validatePhoto
} from "@/lib/backend/photoStorage";

export const runtime = "nodejs";

export async function GET(request) {
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

export async function POST(request) {
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

        const formData = await request.formData();
        const photo = formData.get("photo");

        if (!photo || typeof photo.arrayBuffer !== "function") {
            return responses.badRequestResponse(
                "Profile photo is required"
            );
        }

        try {
            validatePhoto(photo);
        } catch (err) {
            return responses.badRequestResponse(err.message);
        }

        const existingPhotos = await Photo.find({
            profile: profile._id,
            post: null
        });

        const photoPath = await saveProfilePhoto(
            profile._id.toString(),
            photo
        );

        for (const existingPhoto of existingPhotos) {
            if (existingPhoto.path !== photoPath) {
                await deletePhotoFile(existingPhoto.path);
            }
        }

        await Photo.deleteMany({
            profile: profile._id,
            post: null
        });

        const createdPhoto = await Photo.create({
            profile: profile._id,
            post: null,
            path: photoPath
        });

        return responses.customResponse(
            {
                message: "Profile photo uploaded",
                photo: createdPhoto
            },
            201
        );
    } catch (err) {
        console.error(err);

        if (err.name === "ValidationError") {
            return responses.badRequestResponse(err.message);
        }

        return responses.internalServerErrorResponse();
    }
}
