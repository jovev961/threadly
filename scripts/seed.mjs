import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { createHash, randomBytes, randomUUID } from "node:crypto";
import { spawn } from "node:child_process";
import nextEnv from "@next/env";
import mongoose from "mongoose";
import bcrypt from "bcryptjs";
import sharp from "sharp";
import validator from "validator";
import User from "../models/User.js";
import { Profile, Link } from "../models/Profile.js";
import Post from "../models/Post.js";
import Photo from "../models/Photo.js";
import Follow from "../models/Follow.js";
import Like from "../models/Like.js";
import Comment from "../models/Comment.js";
import Repost from "../models/Repost.js";
import { generateData } from "./seed-data.mjs";

export const DATABASE = "threadly_seed_dev";
export const MODELS = { users: User, profiles: Profile, links: Link, posts: Post, photos: Photo, follows: Follow, likes: Like, comments: Comment, reposts: Repost };
const PROJECT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const RUN_KEY = "threadly-development-v1";
const MAX_BYTES = 5 * 1024 * 1024;
export const hash = (value) => createHash("sha256").update(value).digest("hex");
const ensure = (condition, message) => { if (!condition) throw new Error(message); };

export function developmentUri(source, database = DATABASE) {
    ensure(process.env.NODE_ENV !== "production", "Seed tooling is disabled in production.");
    ensure([DATABASE, "threadly_seed_test"].includes(database), "Refusing an unapproved database name.");
    const match = source?.match(/^(mongodb(?:\+srv)?:\/\/[^/?]+)(?:\/([^?]*))?(\?.*)?$/);
    ensure(match, "Set a valid MONGODB_URL in your local environment.");
    const params = new URLSearchParams(match[3]?.slice(1));
    // Changing the application database must not change password authentication's database.
    if (match[1].startsWith("mongodb://") && match[1].includes("@") && !params.has("authSource")) {
        params.set("authSource", decodeURIComponent(match[2] || "admin"));
    }
    return `${match[1]}/${database}${params.size ? `?${params}` : ""}`;
}

export function context(uri, { database = DATABASE, localRoot = path.join(PROJECT, ".local/seed"), photoRoot = path.join(PROJECT, "public/uploads/photos") } = {}) {
    const safeUri = developmentUri(uri, database);
    const host = safeUri.split("/")[2].split("@").at(-1).toLowerCase();
    return { uri: safeUri, database, fingerprint: hash(`${host}/${database}`), localRoot, photoRoot };
}

export async function connect(ctx) {
    await mongoose.connect(ctx.uri, { dbName: ctx.database, serverSelectionTimeoutMS: 10000, autoCreate: false, autoIndex: false });
    ensure(mongoose.connection.name === ctx.database, "Database isolation check failed.");
    return mongoose.connection.db.collection("development_seed_runs");
}

async function optionalStat(filename) {
    try { return await fs.lstat(filename); } catch (error) { if (error.code !== "ENOENT") throw error; return null; }
}

// Check every existing path component, not just the final file, before touching uploads.
async function noSymlinks(filename) {
    const absolute = path.resolve(filename);
    let current = path.parse(absolute).root;
    for (const part of absolute.slice(current.length).split(path.sep)) {
        current = path.join(current, part);
        const stat = await optionalStat(current);
        ensure(!stat?.isSymbolicLink(), `Refusing symlink: ${current}`);
    }
}

async function privateDirectory(ctx) {
    await noSymlinks(ctx.localRoot);
    await fs.mkdir(ctx.localRoot, { recursive: true, mode: 0o700 });
    await fs.chmod(ctx.localRoot, 0o700);
}

async function saveManifest(ctx, registry, manifest) {
    await registry.replaceOne({ _id: RUN_KEY, runId: manifest.runId }, manifest);
    const filename = path.join(ctx.localRoot, "manifest.json");
    await noSymlinks(filename);
    await fs.writeFile(filename, JSON.stringify(manifest, null, 2), { mode: 0o600 });
    await fs.chmod(filename, 0o600);
}

export function validateManifest(ctx, manifest) {
    ensure(manifest?._id === RUN_KEY && manifest.version === 1 && manifest.fingerprint === ctx.fingerprint && manifest.database === ctx.database, "Manifest does not match this seed database.");
    ensure(typeof manifest.runId === "string" && /^[a-f0-9-]{36}$/.test(manifest.runId), "Invalid seed run ID.");
    for (const name of Object.keys(MODELS)) {
        ensure(Array.isArray(manifest.ids[name]) && manifest.ids[name].every((id) => /^[a-f0-9]{24}$/.test(id)), `Invalid manifest IDs: ${name}`);
        ensure(new Set(manifest.ids[name]).size === manifest.ids[name].length, `Duplicate manifest IDs: ${name}`);
    }
    const paths = new Set();
    for (const file of manifest.files) {
        const match = file.path.match(/^\/uploads\/photos\/([a-f0-9]{24})\/(?:([a-f0-9]{24})\/photo_\d+_\d+|profile_photo)\.jpg$/);
        ensure(match && manifest.ids.profiles.includes(match[1]) && (!match[2] || manifest.ids.posts.includes(match[2])), "Unsafe manifest photo path.");
        ensure(/^[a-f0-9]{64}$/.test(file.sha256), "Invalid photo checksum.");
        ensure(!paths.has(file.path), "Duplicate manifest photo path.");
        paths.add(file.path);
    }
}

function diskPath(ctx, publicPath) {
    return path.join(ctx.photoRoot, publicPath.slice("/uploads/photos/".length));
}

async function downloadPhoto(url) {
    const response = await fetch(url, { signal: AbortSignal.timeout(12000) });
    ensure(response.ok && response.headers.get("content-type")?.startsWith("image/"), "Sample image unavailable.");
    const chunks = [];
    let size = 0;
    for await (const chunk of response.body) {
        size += chunk.length;
        ensure(size <= MAX_BYTES, "Sample image exceeds download limit.");
        chunks.push(chunk);
    }
    return Buffer.concat(chunks);
}

export async function preparePhotos(sources, { offline = false, progress = () => {} } = {}) {
    const urls = [...new Set(Object.values(sources))];
    const buffers = new Map();
    let cursor = 0;
    let fallbacks = 0;
    await Promise.all(Array.from({ length: 6 }, async () => {
        while (cursor < urls.length) {
            const index = cursor++;
            const url = urls[index];
            let buffer;
            try {
                ensure(!offline, "Offline images requested.");
                buffer = await downloadPhoto(url);
                buffer = await sharp(buffer, { limitInputPixels: 20_000_000 }).rotate().resize({ width: 1200, height: 1200, fit: "inside", withoutEnlargement: true }).jpeg({ quality: 82 }).toBuffer();
            } catch {
                fallbacks++;
                const hue = index * 47 % 360;
                const portrait = url.includes("randomuser");
                const art = portrait
                    ? '<circle cx="300" cy="210" r="95" fill="white"/><path d="M100 590v-80a200 200 0 0 1 400 0v80" fill="white"/>'
                    : '<circle cx="450" cy="125" r="60" fill="#fff1bd"/><path d="M0 600V410L180 210l170 220 120-130 130 130v170" fill="#355d59"/>';
                buffer = await sharp(Buffer.from(`<svg xmlns="http://www.w3.org/2000/svg" width="600" height="600"><rect width="600" height="600" fill="hsl(${hue},30%,64%)"/>${art}</svg>`)).jpeg({ quality: 82 }).toBuffer();
            }
            ensure(buffer.length <= MAX_BYTES, "Normalized image exceeds photo limit.");
            buffers.set(url, buffer);
            if (buffers.size % 20 === 0) progress(`Prepared ${buffers.size}/${urls.length} sample images.`);
        }
    }));
    return { buffers, fallbacks };
}

export async function seed(ctx, registry, { offline = false, progress = console.log } = {}) {
    const existing = await registry.findOne({ _id: RUN_KEY });
    if (existing) {
        validateManifest(ctx, existing);
        ensure(existing.status === "complete", "An interrupted run exists. Run seed:clean before reseeding.");
        progress("Seed already exists; verifying it without creating duplicates.");
        return verify(ctx, existing);
    }
    await privateDirectory(ctx);
    ensure(!await optionalStat(path.join(ctx.localRoot, "credentials.txt")) && !await optionalStat(path.join(ctx.localRoot, "manifest.json")), "Local seed state already exists. Restore its matching database or move it aside after review; it will not be overwritten.");
    const password = `Dev!7a${randomBytes(15).toString("hex")}`;
    const randomSeed = randomBytes(4).readUInt32LE();
    const { data, sources } = generateData(password, randomSeed);
    for (const [name, docs] of Object.entries(data)) {
        for (const doc of docs) await new MODELS[name](doc).validate();
    }
    ensure(validator.isStrongPassword(password) && data.users.every((u) => validator.isEmail(u.email)), "Registration validation failed.");
    // Preallocate every ID before the first application record is written.
    const manifest = {
        _id: RUN_KEY, version: 1, runId: randomUUID(), database: ctx.database,
        fingerprint: ctx.fingerprint, status: "preparing", randomSeed,
        createdAt: new Date().toISOString(), ids: Object.fromEntries(Object.entries(data).map(([key, docs]) => [key, docs.map((d) => String(d._id))])), files: [],
    };
    for (const [name, model] of Object.entries(MODELS)) {
        ensure(!await model.exists({ _id: { $in: manifest.ids[name] } }), `Generated ID collides with existing ${name}; nothing has been seeded.`);
    }
    ensure(!await User.exists({ $or: [{ username: { $in: data.users.map((u) => u.username) } }, { email: { $in: data.users.map((u) => u.email) } }] }), "Seed account names already exist without this manifest; they will not be adopted or overwritten.");
    await registry.insertOne(manifest); // Unique key also prevents concurrent seeds on another machine.
    await saveManifest(ctx, registry, manifest);
    const credentials = data.users.map((u) => `Username: ${u.username}\nEmail: ${u.email}\nPassword: ${password}`).join("\n\n") + "\n";
    await fs.writeFile(path.join(ctx.localRoot, "credentials.txt"), credentials, { flag: "wx", mode: 0o600 });
    progress("Preparing local portraits and post photos (with offline fallbacks).");
    const { buffers, fallbacks } = await preparePhotos(sources, { offline, progress });
    manifest.files = data.photos.map((photo) => ({ path: photo.path, sha256: hash(buffers.get(sources[photo.path])) }));
    manifest.fallbackImages = fallbacks;
    manifest.sampleImages = buffers.size;
    validateManifest(ctx, manifest);
    // Never adopt an existing upload directory, even in the unlikely event of an ID collision.
    await noSymlinks(ctx.photoRoot);
    for (const id of manifest.ids.profiles) ensure(!await optionalStat(path.join(ctx.photoRoot, id)), `Photo directory already exists for ${id}.`);
    manifest.status = "writing";
    await saveManifest(ctx, registry, manifest);
    for (const model of Object.values(MODELS)) await model.createIndexes();
    // User.insertMany would bypass the password save hook. Save these explicitly.
    for (let i = 0; i < data.users.length; i += 10) {
        await Promise.all(data.users.slice(i, i + 10).map((user) => User.create(user)));
    }
    for (const name of ["profiles", "links", "posts", "follows", "likes", "comments", "reposts"]) {
        if (data[name].length) await MODELS[name].insertMany(data[name]);
        progress(`Created ${data[name].length} ${name}.`);
    }
    for (const file of manifest.files) {
        const destination = diskPath(ctx, file.path);
        await noSymlinks(destination);
        await fs.mkdir(path.dirname(destination), { recursive: true });
        await fs.writeFile(destination, buffers.get(sources[file.path]), { flag: "wx" });
    }
    await Photo.insertMany(data.photos);
    // Verify first: an unsuccessful verification must not label the run complete.
    const report = await verify(ctx, manifest);
    manifest.status = "complete";
    await saveManifest(ctx, registry, manifest);
    progress(`Seed complete. Credentials: ${path.join(ctx.localRoot, "credentials.txt")}`);
    return report;
}

const references = {
    profiles: { user: "users" }, links: { profile: "profiles" }, posts: { profile: "profiles" },
    photos: { profile: "profiles", post: "posts" }, follows: { follower: "profiles", following: "profiles" },
    likes: { profile: "profiles", post: "posts" }, comments: { profile: "profiles", post: "posts", parentComment: "comments" },
    reposts: { profile: "profiles", post: "posts" },
};

async function readOwned(manifest) {
    return Object.fromEntries(await Promise.all(Object.entries(MODELS).map(async ([name, model]) => [name, await model.find({ _id: { $in: manifest.ids[name] } }).select(name === "users" ? "+password" : "").lean()])));
}

export async function preflight(ctx, manifest) {
    validateManifest(ctx, manifest);
    const conflicts = [];
    const data = await readOwned(manifest);
    for (const [name, fields] of Object.entries(references)) {
        const clauses = Object.entries(fields).map(([field, target]) => ({ [field]: { $in: manifest.ids[target] } }));
        if (name === "photos") clauses.push({ path: { $in: manifest.files.map((f) => f.path) } });
        const external = await MODELS[name].find({ _id: { $nin: manifest.ids[name] }, $or: clauses }).select("_id").lean();
        if (external.length) conflicts.push(`${name}: ${external.length} nonseed dependencies (${external.slice(0, 5).map((d) => d._id).join(", ")})`);
        for (const doc of data[name]) {
            for (const [field, target] of Object.entries(fields)) {
                if (doc[field] && !manifest.ids[target].includes(String(doc[field]))) conflicts.push(`${name}/${doc._id}: changed ${field} points outside the seed`);
            }
        }
    }
    const expected = new Map(manifest.files.map((file) => [file.path, file.sha256]));
    for (const photo of data.photos) if (!expected.has(photo.path)) conflicts.push(`photos/${photo._id}: changed photo path`);
    await noSymlinks(ctx.photoRoot);
    async function inspect(directory) {
        const stat = await optionalStat(directory);
        if (!stat) return;
        if (!stat.isDirectory() || stat.isSymbolicLink()) { conflicts.push(`Unexpected directory or symlink: ${directory}`); return; }
        for (const entry of await fs.readdir(directory, { withFileTypes: true })) {
            const filename = path.join(directory, entry.name);
            if (entry.isDirectory()) {
                const relative = path.relative(ctx.photoRoot, filename).split(path.sep);
                if (relative.length !== 2 || !manifest.ids.posts.includes(relative[1])) conflicts.push(`Unexpected directory: ${filename}`);
                else await inspect(filename);
            } else {
                const publicPath = `/uploads/photos/${path.relative(ctx.photoRoot, filename).split(path.sep).join("/")}`;
                if (!entry.isFile() || !expected.has(publicPath)) conflicts.push(`Unowned file or symlink: ${filename}`);
                else if (hash(await fs.readFile(filename)) !== expected.get(publicPath)) conflicts.push(`Modified generated photo: ${filename}`);
            }
        }
    }
    for (const id of manifest.ids.profiles) await inspect(path.join(ctx.photoRoot, id));
    return conflicts;
}

export async function verify(ctx, manifest) {
    validateManifest(ctx, manifest);
    const data = await readOwned(manifest);
    const counts = {};
    for (const [name, docs] of Object.entries(data)) {
        ensure(docs.length === manifest.ids[name].length, `Missing generated records in ${name}.`);
        counts[name] = docs.length;
        for (const doc of docs) {
            await new MODELS[name](doc).validate();
            ensure(+doc.createdAt <= +doc.updatedAt && +doc.updatedAt <= Date.now(), `Invalid timestamps in ${name}.`);
            for (const [field, target] of Object.entries(references[name] || {})) {
                if (doc[field]) ensure(manifest.ids[target].includes(String(doc[field])), `Broken ${name}.${field} reference.`);
            }
        }
    }
    ensure(data.users.length === 100, "Expected exactly 100 generated users.");
    for (const [name, fields] of [["users", ["username"]], ["users", ["email"]], ["profiles", ["user"]], ["follows", ["follower", "following"]], ["likes", ["profile", "post"]], ["reposts", ["profile", "post"]]]) {
        ensure(new Set(data[name].map((d) => fields.map((f) => String(d[f])).join(":"))).size === data[name].length, `Duplicate ${name} relationship.`);
    }
    const credentialPath = path.join(ctx.localRoot, "credentials.txt");
    await noSymlinks(credentialPath);
    const credentials = await fs.readFile(credentialPath, "utf8");
    const blocks = credentials.trimEnd().split("\n\n");
    ensure(blocks.length === 100, "Expected 100 credential blocks.");
    for (let i = 0; i < data.users.length; i++) {
        const user = data.users[i];
        const block = blocks.find((b) => b.startsWith(`Username: ${user.username}\n`));
        ensure(block, "Missing account credentials.");
        const match = block.match(/^Username: (.+)\nEmail: (.+)\nPassword: (.+)$/);
        ensure(match && match[2] === user.email && validator.isEmail(user.email) && validator.isStrongPassword(match[3]), "Invalid credential block.");
        ensure(await bcrypt.compare(match[3], user.password), "Password hashing verification failed.");
    }
    ensure(((await fs.stat(credentialPath)).mode & 0o077) === 0, "Credentials must be owner-only.");
    const posts = new Map(data.posts.map((p) => [String(p._id), p]));
    const profiles = new Map(data.profiles.map((p) => [String(p._id), p]));
    const comments = new Map(data.comments.map((c) => [String(c._id), c]));
    for (const follow of data.follows) {
        ensure(String(follow.follower) !== String(follow.following), "Self-follow found.");
        ensure(+follow.createdAt >= Math.max(+profiles.get(String(follow.follower)).createdAt, +profiles.get(String(follow.following)).createdAt), "Follow predates a profile.");
    }
    for (const post of data.posts) {
        ensure(+post.createdAt >= +profiles.get(String(post.profile)).createdAt && Number.isInteger(post.shareCount) && post.shareCount >= 0, "Invalid post chronology/share count.");
    }
    for (const item of [...data.comments, ...data.likes, ...data.reposts]) ensure(+item.createdAt >= +posts.get(String(item.post)).createdAt, "Interaction predates its post.");
    for (const comment of data.comments) {
        if (!comment.parentComment) continue;
        const parent = comments.get(String(comment.parentComment));
        ensure(parent && !parent.parentComment && String(parent.post) === String(comment.post) && +comment.createdAt >= +parent.createdAt, "Invalid comment reply.");
    }
    for (const photo of data.photos) {
        ensure(!photo.post || String(posts.get(String(photo.post)).profile) === String(photo.profile), "Photo owner differs from post owner.");
    }
    const photoCounts = new Map();
    for (const photo of data.photos) {
        const key = photo.post ? String(photo.post) : String(photo.profile);
        photoCounts.set(key, (photoCounts.get(key) || 0) + 1);
        ensure(photoCounts.get(key) <= (photo.post ? 10 : 1), "Too many generated photos.");
    }
    ensure(manifest.files.length === data.photos.length, "Photo manifest count mismatch.");
    for (const file of manifest.files) {
        const filename = diskPath(ctx, file.path);
        await noSymlinks(filename);
        const buffer = await fs.readFile(filename);
        ensure(buffer.length <= MAX_BYTES && hash(buffer) === file.sha256, "Generated photo missing, modified, or oversized.");
        ensure((await sharp(buffer).metadata()).format === "jpeg", "Generated photo must be JPEG.");
    }
    const postCounts = data.profiles.map((p) => data.posts.filter((post) => String(post.profile) === String(p._id)).length);
    const likeCounts = data.posts.map((p) => data.likes.filter((like) => String(like.post) === String(p._id)).length);
    ensure(Math.min(...postCounts) >= 3 && Math.max(...postCounts) <= 20 && new Set(postCounts).size > 3 && new Set(likeCounts).size > 5, "Activity distribution is too uniform.");
    return { database: ctx.database, counts, postsPerUser: [Math.min(...postCounts), Math.max(...postCounts)], likesPerPost: [Math.min(...likeCounts), Math.max(...likeCounts)], replies: data.comments.filter((c) => c.parentComment).length, totalShares: data.posts.reduce((sum, p) => sum + p.shareCount, 0), fallbackImages: manifest.fallbackImages };
}

export async function cleanup(ctx, registry, manifest, { dryRun = false } = {}) {
    const localManifest = path.join(ctx.localRoot, "manifest.json");
    await noSymlinks(localManifest);
    if (await optionalStat(localManifest)) {
        const local = JSON.parse(await fs.readFile(localManifest, "utf8"));
        ensure(local.runId === manifest.runId && local.fingerprint === manifest.fingerprint, "Local state belongs to a different seed run; refusing to overwrite or remove it.");
    }
    const conflicts = await preflight(ctx, manifest);
    ensure(!conflicts.length, `Cleanup stopped before deleting anything:\n${conflicts.join("\n")}`);
    const summary = { database: ctx.database, dryRun, records: Object.fromEntries(Object.entries(manifest.ids).map(([key, ids]) => [key, ids.length])), files: manifest.files.length };
    if (dryRun) return summary;
    // Run with the seed app stopped: application writes cannot share this CLI's lock.
    manifest.status = "cleaning";
    await saveManifest(ctx, registry, manifest);
    for (const name of ["likes", "reposts", "follows", "comments", "photos", "links", "posts", "profiles", "users"]) {
        await MODELS[name].deleteMany({ _id: { $in: manifest.ids[name] } });
    }
    for (const file of manifest.files) {
        const filename = diskPath(ctx, file.path);
        await noSymlinks(filename);
        if (await optionalStat(filename)) {
            ensure(hash(await fs.readFile(filename)) === file.sha256, "Photo changed during cleanup; stopping.");
            await fs.unlink(filename);
        }
    }
    const directories = new Set(manifest.files.map((f) => path.dirname(diskPath(ctx, f.path))));
    manifest.ids.profiles.forEach((id) => directories.add(path.join(ctx.photoRoot, id)));
    for (const directory of [...directories].sort((a, b) => b.length - a.length)) {
        try { await fs.rmdir(directory); } catch (error) { if (error.code !== "ENOENT") throw error; }
    }
    for (const name of ["credentials.txt", "manifest.json"]) {
        const filename = path.join(ctx.localRoot, name);
        await noSymlinks(filename);
        try { await fs.unlink(filename); } catch (error) { if (error.code !== "ENOENT") throw error; }
    }
    await registry.deleteOne({ _id: RUN_KEY, runId: manifest.runId });
    return summary;
}

async function main() {
    const [command, ...flags] = process.argv.slice(2);
    ensure(["seed", "verify", "clean", "dev"].includes(command) && flags.every((f) => command === "clean" && f === "--dry-run"), "Use seed, verify, clean [--dry-run], or dev.");
    ensure(process.env.NODE_ENV !== "production", "Seed tooling is disabled in production.");
    nextEnv.loadEnvConfig(PROJECT, true, { info() {}, error() {} });
    const ctx = context(process.env.MONGODB_URL);
    await privateDirectory(ctx);
    const lockPath = path.join(ctx.localRoot, "operation.lock");
    await noSymlinks(lockPath);
    if (await optionalStat(lockPath)) {
        const pid = Number(await fs.readFile(lockPath, "utf8"));
        ensure(Number.isSafeInteger(pid) && pid > 0, "Invalid seed lock; inspect .local/seed/operation.lock.");
        let running = true;
        try { process.kill(pid, 0); } catch (error) { if (error.code === "ESRCH") running = false; }
        ensure(!running, `Another seed command is running (PID ${pid}).`);
        await fs.unlink(lockPath);
    }
    const lock = await fs.open(lockPath, "wx", 0o600);
    await lock.writeFile(String(process.pid));
    await lock.close();
    try {
        if (command === "dev") {
            console.log(`Starting Next.js with ${DATABASE}. Stop any other Next dev server for this checkout first.`);
            const child = spawn(process.execPath, [path.join(PROJECT, "node_modules/next/dist/bin/next"), "dev"], { cwd: PROJECT, stdio: "inherit", env: { ...process.env, MONGODB_URL: ctx.uri } });
            for (const signal of ["SIGINT", "SIGTERM"]) process.on(signal, () => child.kill(signal));
            process.exitCode = await new Promise((resolve, reject) => {
                child.on("error", reject);
                child.on("exit", (code) => resolve(code || 0));
            });
            return;
        }
        const registry = await connect(ctx);
        const manifest = await registry.findOne({ _id: RUN_KEY });
        const report = command === "seed" ? await seed(ctx, registry)
            : !manifest ? { message: "No seed manifest found; nothing was changed." }
                : command === "verify" ? await verify(ctx, manifest)
                    : await cleanup(ctx, registry, manifest, { dryRun: flags.includes("--dry-run") });
        console.log(JSON.stringify(report, null, 2));
    } finally {
        await mongoose.disconnect();
        await fs.unlink(lockPath);
    }
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
    main().catch((error) => {
        // Driver errors can contain connection strings. Never log them or credential-bearing documents.
        const unsafe = /mongodb(?:\+srv)?:\/\/|password|credential block/i.test(error.message);
        console.error(unsafe ? `Seed operation failed (${error.name}); check configuration and local seed state.` : error.message);
        process.exitCode = 1;
    });
}
