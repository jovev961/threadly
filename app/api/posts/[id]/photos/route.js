import mongoose from "mongoose";

import * as responses from "@/lib/responses";
import { protect } from "@/lib/backend/auth";
import {
    getPagination,
    getPaginationMeta
} from "@/lib/backend/pagination";

import { Profile } from "@/models/Profile";
import Post from "@/models/Post";
import Photo from "@/models/Photo";

import {
    deletePhotoFile,
    savePostPhotos,
    validatePhoto
} from "@/lib/backend/photoStorage";

export const runtime = "nodejs";

const MAX_PHOTOS_PER_UPLOAD = 10;

export async function GET(request, { params }) {
    try {
        const user = await protect(request);

        if (!user) {
            return responses.unauthorizedResponse();
        }

        const { id } = await params;

        if (!id || !mongoose.isValidObjectId(id)) {
            return responses.badRequestResponse(
                "PostID is missing or invalid"
            );
        }

        const post = await Post.findById(id);

        if (!post) {
            return responses.notFoundResponse("Post");
        }

        const { page, limit, skip } =
            getPagination(request);

        const query = {
            post: post._id
        };

        const [photos, total] = await Promise.all([
            Photo.find(query)
                .sort({ createdAt: 1 })
                .skip(skip)
                .limit(limit)
                .lean(),

            Photo.countDocuments(query)
        ]);

        return responses.customResponse(
            {
                message: "Success",
                photos,
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

export async function POST(request, { params }) {
    let savedPaths = [];

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
                "PostID is missing or invalid"
            );
        }

        const post = await Post.findOne({
            _id: id,
            profile: profile._id
        });

        if (!post) {
            return responses.notFoundResponse("Post");
        }

        const formData = await request.formData();

        const photos = formData
            .getAll("photos")
            .filter(
                photo =>
                    photo &&
                    typeof photo.arrayBuffer === "function"
            );

        if (photos.length === 0) {
            return responses.badRequestResponse(
                "At least one photo is required"
            );
        }

        if (photos.length > MAX_PHOTOS_PER_UPLOAD) {
            return responses.badRequestResponse(
                `Maximum ${MAX_PHOTOS_PER_UPLOAD} photos can be uploaded at once`
            );
        }

        try {
            for (const photo of photos) {
                validatePhoto(photo);
            }
        } catch (err) {
            return responses.badRequestResponse(err.message);
        }

        savedPaths = await savePostPhotos(
            profile._id.toString(),
            post._id.toString(),
            photos
        );

        const createdPhotos = await Photo.create(
            savedPaths.map(photoPath => ({
                profile: profile._id,
                post: post._id,
                path: photoPath
            }))
        );

        return responses.customResponse(
            {
                message: "Photos uploaded",
                photos: createdPhotos
            },
            201
        );
    } catch (err) {
        console.error(err);

        for (const photoPath of savedPaths) {
            await deletePhotoFile(photoPath);
        }

        if (err.name === "ValidationError") {
            return responses.badRequestResponse(err.message);
        }

        return responses.internalServerErrorResponse();
    }
}
