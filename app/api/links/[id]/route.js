import mongoose from "mongoose";

import * as responses from "@/lib/responses";
import { protect } from "@/lib/backend/auth";

import { Link, Profile } from "@/models/Profile";

export async function PUT(request, { params }) {
    try {
        const user = await protect(request);

        if (!user) {
            return responses.unauthorizedResponse();
        }

        const { id } = await params;

        if (!id || !mongoose.isValidObjectId(id)) {
            return responses.badRequestResponse("LinkID is missing or invalid");
        }

        const profile = await Profile.findOne({
            user: user._id
        });

        if (!profile) {
            return responses.notFoundResponse("Profile");
        }

        const { title, url } = await request.json();
        const updates = {};

        if (title !== undefined) {
            updates.title = title;
        }

        if (url !== undefined) {
            updates.url = url;
        }

        if (Object.keys(updates).length === 0) {
            return responses.badRequestResponse("Nothing to update");
        }

        const link = await Link.findOneAndUpdate(
            {
                _id: id,
                profile: profile._id
            },
            {
                $set: updates
            },
            {
                new: true,
                runValidators: true
            }
        );

        if (!link) {
            return responses.notFoundResponse("Link");
        }

        return responses.customResponse(
            {
                message: "Link updated",
                link
            },
            200
        );

    } catch (err) {
        console.error(err);

        if (err.name === "ValidationError") {
            return responses.badRequestResponse(err.message);
        }

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
            return responses.badRequestResponse("LinkID is missing or invalid");
        }

        const profile = await Profile.findOne({
            user: user._id
        });

        if (!profile) {
            return responses.notFoundResponse("Profile");
        }

        const link = await Link.findOneAndDelete({
            _id: id,
            profile: profile._id
        });

        if (!link) {
            return responses.notFoundResponse("Link");
        }

        return responses.customResponse(
            { message: "Link deleted" },
            200
        );

    } catch (err) {
        console.error(err);
        return responses.internalServerErrorResponse();
    }
}
