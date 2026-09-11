import * as responses from "@/lib/responses";
import { protect } from "@/lib/backend/auth";

import { Link, Profile } from "@/models/Profile";

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

        const links = await Link.find({
            profile: profile._id
        })
            .sort({ createdAt: 1 })
            .lean();

        return responses.customResponse(
            {
                message: "Success",
                links
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

        const { title, url } = await request.json();

        if (!title || !url) {
            return responses.badRequestResponse(
                "Link title and URL are required"
            );
        }

        const link = await Link.create({
            profile: profile._id,
            title,
            url
        });

        return responses.customResponse(
            {
                message: "Link created",
                link
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
