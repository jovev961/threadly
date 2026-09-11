import mongoose from "mongoose";
import { getEnvValue } from "../utils";

const mongoURL = getEnvValue("MONGODB_URL");

let cached = global.mongooseConnection;

if (!cached) {
    cached = global.mongooseConnection = {
        connection: null,
        promise: null
    };
}

export async function connectDB() {
    if (cached.connection) {
        return cached.connection;
    }

    if (!cached.promise) {
        cached.promise = mongoose.connect(mongoURL);
    }

    try {
        cached.connection = await cached.promise;
        return cached.connection;
    } catch (error) {
        cached.promise = null;
        throw error;
    }
}
