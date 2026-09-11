import { connectDB } from "@/lib/backend/mongo";
import { protect } from "@/lib/backend/auth";
import User from "@/models/User";
import validator from "validator";
import * as responses from "@/lib/responses";

export async function POST(request) {
    try {
        const user = await protect(request);

        if (user) {
            return responses.customResponse(
                { message: "Already authenticated", redirectTo: "/" },
                200
            );
        }

        const { username, email, password } = await request.json();

        if (!email || !password || !username) {
            return responses.badRequestResponse(
                "Username, Email and password are required"
            );
        }

        const normalizedUsername = username.trim();
        const normalizedEmail = email.trim().toLowerCase();

        if (!validator.isEmail(normalizedEmail)) {
            return responses.badRequestResponse("Email is not valid!");
        }

        if (!validator.isStrongPassword(password)) {
            return responses.badRequestResponse(
                "Password is not strong enough"
            );
        }

        await connectDB();

        const existingUser = await User.findOne({
            $or: [
                { email: normalizedEmail },
                { username: normalizedUsername }
            ]
        });

        if (existingUser) {
            return responses.customResponse(
                { message: "User already exists" },
                409
            );
        }

        const newUser = await User.create({
            username: normalizedUsername,
            email: normalizedEmail,
            password
        });

        return responses.customResponse(
            {
                id: newUser._id,
                email: newUser.email,
                username: newUser.username
            },
            201
        );
    } catch (error) {
        console.error(error);

        if (error.name === "ValidationError") {
            return responses.badRequestResponse(error.message);
        }

        if (error.code === 11000) {
            return responses.customResponse(
                { message: "User already exists" },
                409
            );
        }

        return responses.internalServerErrorResponse();
    }
}
