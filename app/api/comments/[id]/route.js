import mongoose from "mongoose";

import * as responses from "@/lib/responses";
import { protect } from "@/lib/backend/auth";

import { Profile } from "@/models/Profile";
import Comment from "@/models/Comment";

export async function PUT(request, { params }) {
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
                "CommentID is missing or invalid"
            );
        }

        const { content } = await request.json();

        if (content === undefined) {
            return responses.badRequestResponse(
                "Comment content is required"
            );
        }

        const comment = await Comment.findOneAndUpdate(
            {
                _id: id,
                profile: profile._id
            },
            {
                $set: { content }
            },
            {
                new: true,
                runValidators: true
            }
        );

        if (!comment) {
            return responses.notFoundResponse("Comment");
        }

        return responses.customResponse(
            {
                message: "Comment updated",
                comment
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

        const profile = await Profile.findOne({
            user: user._id
        });

        if (!profile) {
            return responses.notFoundResponse("Profile");
        }

        const { id } = await params;

        if (!id || !mongoose.isValidObjectId(id)) {
            return responses.badRequestResponse(
                "CommentID is missing or invalid"
            );
        }

        const comment = await Comment.findOne({
            _id: id,
            profile: profile._id
        });

        if (!comment) {
            return responses.notFoundResponse("Comment");
        }

        if (!comment.parentComment) {
            await Comment.deleteMany({
                parentComment: comment._id
            });
        }

        await Comment.deleteOne({
            _id: comment._id
        });

        return responses.customResponse(
            {
                message: "Comment deleted"
            },
            200
        );
    } catch (err) {
        console.error(err);
        return responses.internalServerErrorResponse();
    }
}
