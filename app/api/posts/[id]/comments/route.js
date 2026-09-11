import mongoose from "mongoose";

import * as responses from "@/lib/responses";
import { protect } from "@/lib/backend/auth";
import {
    getPagination,
    getPaginationMeta
} from "@/lib/backend/pagination";

import { Profile } from "@/models/Profile";
import Post from "@/models/Post";
import Comment from "@/models/Comment";

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

        const [comments, total] = await Promise.all([
            Comment.find(query)
                .populate({
                    path: "profile",
                    select: "name user",
                    populate: {
                        path: "user",
                        select: "username"
                    }
                })
                .sort({ createdAt: 1 })
                .skip(skip)
                .limit(limit)
                .lean(),

            Comment.countDocuments(query)
        ]);

        return responses.customResponse(
            {
                message: "Success",
                comments,
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

        const post = await Post.findById(id);

        if (!post) {
            return responses.notFoundResponse("Post");
        }

        const { content, parentComment = null } = await request.json();

        if (!content) {
            return responses.badRequestResponse(
                "Comment content is required"
            );
        }

        let parent = null;

        if (parentComment !== null) {
            if (!mongoose.isValidObjectId(parentComment)) {
                return responses.badRequestResponse(
                    "Parent comment ID is invalid"
                );
            }

            parent = await Comment.findOne({
                _id: parentComment,
                post: post._id
            });

            if (!parent) {
                return responses.notFoundResponse("Parent comment");
            }

            // Keep replies one level deep.
            if (parent.parentComment) {
                return responses.badRequestResponse(
                    "Replies can only be added to top-level comments"
                );
            }
        }

        const comment = await Comment.create({
            post: post._id,
            profile: profile._id,
            content,
            parentComment: parent?._id || null
        });

        await comment.populate({
            path: "profile",
            select: "name user",
            populate: {
                path: "user",
                select: "username"
            }
        });

        return responses.customResponse(
            {
                message: "Comment created",
                comment
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
