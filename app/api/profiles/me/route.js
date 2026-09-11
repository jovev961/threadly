import { connectDB } from "@/lib/backend/mongo";
import { protect } from "@/lib/backend/auth";
import { Link, Profile } from "@/models/Profile";
import Photo from "@/models/Photo";
import "@/models/Follow";
import * as responses from "@/lib/responses";
import { DEFAULT_PROFILE_PHOTO } from "@/lib/profilePhoto";

export async function GET(request) {
    try {
        await connectDB();

        const user = await protect(request);

        if (!user) {
            return responses.unauthorizedResponse();
        }

        const profile = await Profile.findOne({
            user: user._id
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

        result.profilePhoto =
            profilePhoto?.path || DEFAULT_PROFILE_PHOTO;

        result.followerCount = profile.followers.length;
        result.followingCount = profile.following.length;
        result.followedByMe = false;

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

export async function POST(request) {
    try {
        await connectDB();

        const user = await protect(request);

        if (!user) {
            return responses.unauthorizedResponse();
        }

        const profile = await Profile.findOne({
            user: user._id
        });

        if (profile) {
            return responses.customResponse(
                { message: "Profile already created!" },
                409
            );
        }

        const { name, bio, gender, links = [] } = await request.json();

        if (!name) {
            return responses.badRequestResponse("Name is required");
        }

        if (!Array.isArray(links)) {
            return responses.badRequestResponse("Links must be an array");
        }

        if (links.some(link => !link.url || !link.title)) {
            return responses.badRequestResponse(
                "Link URL and title are required!"
            );
        }

        const newProfile = await Profile.create({
            user: user._id,
            name,
            bio,
            gender
        });

        if (links.length > 0) {
            await Link.create(
                links.map(link => ({
                    url: link.url,
                    title: link.title,
                    profile: newProfile._id
                }))
            );
        }

        const result = await Profile.findById(newProfile._id)
            .populate("links")
            .lean();

        result.profilePhoto = DEFAULT_PROFILE_PHOTO;
        result.followers = [];
        result.following = [];
        result.followerCount = 0;
        result.followingCount = 0;
        result.followedByMe = false;

        return responses.customResponse(
            {
                message: "Success",
                body: result
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

export async function PUT(request) {
    try {
        await connectDB();

        const user = await protect(request);

        if (!user) {
            return responses.unauthorizedResponse();
        }

        const { name, bio, gender } = await request.json();

        const updates = {};

        if (name !== undefined) {
            updates.name = name;
        }

        if (bio !== undefined) {
            updates.bio = bio;
        }

        if (gender !== undefined) {
            updates.gender = gender;
        }

        if (Object.keys(updates).length === 0) {
            return responses.badRequestResponse("Nothing to update");
        }

        const updatedProfile = await Profile.findOneAndUpdate(
            { user: user._id },
            { $set: updates },
            {
                new: true,
                runValidators: true
            }
        );

        if (!updatedProfile) {
            return responses.notFoundResponse("Profile");
        }

        const profilePhoto = await Photo.findOne({
            profile: updatedProfile._id,
            post: null
        }).lean();

        const result = updatedProfile.toObject();
        result.profilePhoto =
            profilePhoto?.path || DEFAULT_PROFILE_PHOTO;

        return responses.customResponse(
            {
                message: "Profile updated",
                body: result
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
