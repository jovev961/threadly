import User from "@/models/User";
import { connectDB } from "@/lib/backend/mongo";
import bcrypt from "bcryptjs";
import {
    createToken,
    getTokenMaxAgeSeconds,
    protect
} from "@/lib/backend/auth";
import { NextResponse } from "next/server";
import * as responses from "@/lib/responses";

export async function POST(request) {
    try {
        const { login, password } = await request.json();

        if (!login || !password) {
            return responses.badRequestResponse(
                "Email/Username and Password are required"
            );
        }

        const loggedUser = await protect(request);

        if (loggedUser) {
            return responses.customResponse(
                { message: "Already authenticated", redirectTo: "/" },
                200
            );
        }

        await connectDB();

        const normalizedLogin = login.trim();

        const user = await User.findOne({
            $or: [
                { username: normalizedLogin },
                { email: normalizedLogin.toLowerCase() }
            ]
        }).select("+password");

        if (!user) {
            return responses.customResponse(
                { message: "Invalid email or password" },
                401
            );
        }

        const isPasswordValid = await bcrypt.compare(
            password,
            user.password
        );

        if (!isPasswordValid) {
            return responses.customResponse(
                { message: "Invalid email or password" },
                401
            );
        }

        const token = createToken(user._id.toString());

        const response = NextResponse.json(
            {
                status: "success",
                token,
                data: {
                    user: {
                        id: user._id,
                        username: user.username,
                        email: user.email
                    }
                }
            },
            { status: 200 }
        );

        response.cookies.set("jwt", token, {
            httpOnly: true,
            secure: process.env.NODE_ENV === "production",
            sameSite: "lax",
            path: "/",
            maxAge: getTokenMaxAgeSeconds(token)
        });

        return response;
    } catch (err) {
        console.error(err);
        return responses.internalServerErrorResponse();
    }
}
