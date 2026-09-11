import { connectDB } from "./mongo";
import jwt from "jsonwebtoken";
import User from "@/models/User";
import { cookies } from "next/headers";
import { getEnvValue } from "../utils";

const DEFAULT_JWT_EXPIRES_IN = "1d";

function getJWTSecret() {
    return getEnvValue("JWT_SECRET");
}

function getJWTExpiresIn() {
    return process.env.JWT_EXPIRES_IN || DEFAULT_JWT_EXPIRES_IN;
}

export function createToken(userID) {
    return jwt.sign(
        { id: userID },
        getJWTSecret(),
        { expiresIn: getJWTExpiresIn() }
    );
}

export function verifyToken(token) {
    if (!token) return null;

    try {
        return jwt.verify(token, getJWTSecret());
    } catch {
        return null;
    }
}

export function getTokenMaxAgeSeconds(token) {
    const decoded = jwt.decode(token);

    if (!decoded?.exp) {
        return 24 * 60 * 60;
    }

    return Math.max(
        decoded.exp - Math.floor(Date.now() / 1000),
        0
    );
}

export async function getSession() {
    const cookieStore = await cookies();
    const token = cookieStore.get("jwt")?.value;
    return verifyToken(token);
}

export async function protect(request) {
    const authorization = request.headers.get("authorization");

    let token;

    if (authorization?.startsWith("Bearer ")) {
        token = authorization.split(" ")[1];
    }

    if (!token) {
        const cookieStore = await cookies();
        token = cookieStore.get("jwt")?.value;
    }

    const decoded = verifyToken(token);

    if (!decoded) {
        return null;
    }

    await connectDB();

    return User.findById(decoded.id).select("+password");
}
