import fs from "fs/promises";
import path from "path";
import { DEFAULT_PROFILE_PHOTO } from "@/lib/profilePhoto";

const PHOTO_ROOT = path.join(
    process.cwd(),
    "public",
    "uploads",
    "photos"
);

const ALLOWED_TYPES = {
    "image/jpeg": "jpg",
    "image/png": "png",
    "image/webp": "webp",
    "image/gif": "gif"
};

const MAX_FILE_SIZE = 5 * 1024 * 1024;

export function validatePhoto(file) {
    if (!file || typeof file.arrayBuffer !== "function") {
        throw new Error("Invalid photo file");
    }

    if (!ALLOWED_TYPES[file.type]) {
        throw new Error(
            "Only JPG, PNG, WEBP and GIF photos are allowed"
        );
    }

    if (file.size > MAX_FILE_SIZE) {
        throw new Error("Photo can have max 5MB");
    }
}

async function writePhoto(file, directory, filename) {
    validatePhoto(file);

    await fs.mkdir(directory, { recursive: true });

    const buffer = Buffer.from(await file.arrayBuffer());
    const filePath = path.join(directory, filename);

    await fs.writeFile(filePath, buffer);
}

export async function saveProfilePhoto(profileId, file) {
    validatePhoto(file);

    const extension = ALLOWED_TYPES[file.type];
    const profileDirectory = path.join(
        PHOTO_ROOT,
        profileId.toString()
    );

    const filename = `profile_photo.${extension}`;

    await writePhoto(
        file,
        profileDirectory,
        filename
    );

    return `/uploads/photos/${profileId}/${filename}`;
}

export async function savePostPhotos(profileId, postId, photos) {
    const postDirectory = path.join(
        PHOTO_ROOT,
        profileId.toString(),
        postId.toString()
    );

    const timestamp = Date.now();
    const paths = [];

    for (let i = 0; i < photos.length; i++) {
        const photo = photos[i];
        validatePhoto(photo);

        const extension = ALLOWED_TYPES[photo.type];
        const filename =
            `photo_${timestamp}_${i + 1}.${extension}`;

        await writePhoto(
            photo,
            postDirectory,
            filename
        );

        paths.push(
            `/uploads/photos/${profileId}/${postId}/${filename}`
        );
    }

    return paths;
}

export async function deletePhotoFile(publicPath) {
    if (publicPath === DEFAULT_PROFILE_PHOTO) {
        return;
    }

    if (!publicPath?.startsWith("/uploads/photos/")) {
        return;
    }

    const relativePath = publicPath.replace(
        "/uploads/photos/",
        ""
    );

    const filePath = path.resolve(
        PHOTO_ROOT,
        relativePath
    );

    if (
        filePath !== PHOTO_ROOT &&
        !filePath.startsWith(`${PHOTO_ROOT}${path.sep}`)
    ) {
        return;
    }

    try {
        await fs.unlink(filePath);
    } catch (err) {
        if (err.code !== "ENOENT") {
            throw err;
        }
    }
}

export async function deletePostPhotoDirectory(
    profileId,
    postId
) {
    const directory = path.join(
        PHOTO_ROOT,
        profileId.toString(),
        postId.toString()
    );

    await fs.rm(directory, {
        recursive: true,
        force: true
    });
}

export async function deleteProfilePhotoDirectory(
    profileId
) {
    const directory = path.join(
        PHOTO_ROOT,
        profileId.toString()
    );

    await fs.rm(directory, {
        recursive: true,
        force: true
    });
}
