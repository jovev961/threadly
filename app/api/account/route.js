import bcrypt from "bcryptjs";

import * as responses from "@/lib/responses";
import { protect } from "@/lib/backend/auth";

import User from "@/models/User";
import { Link, Profile } from "@/models/Profile";
import Post from "@/models/Post";
import Like from "@/models/Like";
import Comment from "@/models/Comment";
import Repost from "@/models/Repost";
import Follow from "@/models/Follow";
import Photo from "@/models/Photo";

import {
    deleteProfilePhotoDirectory
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
        }).select("_id");

        return responses.customResponse(
            {
                message: "Success",
                account: {
                    _id: user._id,
                    username: user.username,
                    email: user.email,
                    profileId: profile?._id || null
                }
            },
            200
        );
    } catch (err) {
        console.error(err);
        return responses.internalServerErrorResponse();
    }
}

export async function PUT(request) {
    try {
        const user = await protect(request);

        if (!user) {
            return responses.unauthorizedResponse();
        }

        const {
            username,
            email,
            currentPassword,
            newPassword
        } = await request.json();

        if (
            username === undefined &&
            email === undefined &&
            newPassword === undefined
        ) {
            return responses.badRequestResponse(
                "Nothing to update"
            );
        }

        if (username !== undefined) {
            const existingUser = await User.findOne({
                username,
                _id: { $ne: user._id }
            });

            if (existingUser) {
                return responses.customResponse(
                    { message: "Username already in use" },
                    409
                );
            }

            user.username = username;
        }

        if (email !== undefined) {
            const normalizedEmail = email.toLowerCase();

            const existingUser = await User.findOne({
                email: normalizedEmail,
                _id: { $ne: user._id }
            });

            if (existingUser) {
                return responses.customResponse(
                    { message: "Email already in use" },
                    409
                );
            }

            user.email = normalizedEmail;
        }

        if (newPassword !== undefined) {
            if (!currentPassword) {
                return responses.badRequestResponse(
                    "Current password is required"
                );
            }

            const passwordMatches = await bcrypt.compare(
                currentPassword,
                user.password
            );

            if (!passwordMatches) {
                return responses.customResponse(
                    { message: "Current password is incorrect" },
                    403
                );
            }

            user.password = newPassword;
        }

        await user.save();

        return responses.customResponse(
            {
                message: "Account updated",
                account: {
                    _id: user._id,
                    username: user.username,
                    email: user.email
                }
            },
            200
        );
    } catch (err) {
        console.error(err);

        if (err.name === "ValidationError") {
            return responses.badRequestResponse(err.message);
        }

        if (err.code === 11000) {
            return responses.customResponse(
                { message: "Username or email already in use" },
                409
            );
        }

        return responses.internalServerErrorResponse();
    }
}

export async function DELETE(request) {
    try {
        const user = await protect(request);

        if (!user) {
            return responses.unauthorizedResponse();
        }

        const { currentPassword } = await request.json();

        if (!currentPassword) {
            return responses.badRequestResponse(
                "Current password is required"
            );
        }

        const passwordMatches = await bcrypt.compare(
            currentPassword,
            user.password
        );

        if (!passwordMatches) {
            return responses.customResponse(
                { message: "Current password is incorrect" },
                403
            );
        }

        const profile = await Profile.findOne({
            user: user._id
        });

        if (profile) {
            const posts = await Post.find({
                profile: profile._id
            }).select("_id");

            const postIds = posts.map(post => post._id);

            const topLevelComments = await Comment.find({
                profile: profile._id,
                parentComment: null
            }).select("_id");

            const topLevelCommentIds = topLevelComments.map(
                comment => comment._id
            );

            if (topLevelCommentIds.length > 0) {
                await Comment.deleteMany({
                    parentComment: {
                        $in: topLevelCommentIds
                    }
                });
            }

            await Promise.all([
                Follow.deleteMany({
                    $or: [
                        { follower: profile._id },
                        { following: profile._id }
                    ]
                }),

                Like.deleteMany({
                    profile: profile._id
                }),

                Repost.deleteMany({
                    profile: profile._id
                }),

                Comment.deleteMany({
                    profile: profile._id
                }),

                Link.deleteMany({
                    profile: profile._id
                })
            ]);

            if (postIds.length > 0) {
                await Promise.all([
                    Like.deleteMany({
                        post: { $in: postIds }
                    }),

                    Repost.deleteMany({
                        post: { $in: postIds }
                    }),

                    Comment.deleteMany({
                        post: { $in: postIds }
                    }),

                    Photo.deleteMany({
                        post: { $in: postIds }
                    })
                ]);
            }

            await Photo.deleteMany({
                profile: profile._id
            });

            await Post.deleteMany({
                profile: profile._id
            });

            await deleteProfilePhotoDirectory(
                profile._id.toString()
            );

            await Profile.deleteOne({
                _id: profile._id
            });
        }

        await User.deleteOne({
            _id: user._id
        });

        return responses.customResponse(
            {
                message: "Account deleted"
            },
            200
        );
    } catch (err) {
        console.error(err);
        return responses.internalServerErrorResponse();
    }
}
