import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { randomBytes } from "node:crypto";
import mongoose from "mongoose";
import nextEnv from "@next/env";
import { generateData } from "./seed-data.mjs";
import { MODELS, cleanup, connect, context, developmentUri, hash, preflight, seed, validateManifest } from "./seed.mjs";

test("database targeting never selects the normal database and preserves authentication", () => {
    assert.equal(developmentUri("mongodb://localhost:27017/threadly"), "mongodb://localhost:27017/threadly_seed_dev");
    assert.equal(developmentUri("mongodb://user:encoded%40pass@localhost:27017/threadly?retryWrites=true"), "mongodb://user:encoded%40pass@localhost:27017/threadly_seed_dev?retryWrites=true&authSource=threadly");
    assert.equal(developmentUri("mongodb+srv://user:pass@cluster.example/threadly?authSource=admin"), "mongodb+srv://user:pass@cluster.example/threadly_seed_dev?authSource=admin");
    assert.throws(() => developmentUri("mongodb://localhost/threadly", "threadly"), /unapproved/);
    assert.throws(() => developmentUri("not-a-uri"), /valid MONGODB_URL/);
    const original = process.env.NODE_ENV;
    process.env.NODE_ENV = "production";
    try { assert.throws(() => developmentUri("mongodb://localhost/threadly"), /production/); }
    finally { if (original === undefined) delete process.env.NODE_ENV; else process.env.NODE_ENV = original; }
});

test("generated documents satisfy schemas, uniqueness, timelines and realistic distributions", async () => {
    const { data, sources } = generateData(`Dev!7a${randomBytes(12).toString("hex")}`);
    assert.equal(data.users.length, 100);
    for (const [name, docs] of Object.entries(data)) for (const doc of docs) await new MODELS[name](doc).validate();
    for (const [name, fields] of [["users", ["username"]], ["users", ["email"]], ["profiles", ["user"]], ["follows", ["follower", "following"]], ["likes", ["post", "profile"]], ["reposts", ["post", "profile"]]]) {
        assert.equal(new Set(data[name].map((doc) => fields.map((field) => String(doc[field])).join(":"))).size, data[name].length);
    }
    assert(data.follows.every((f) => String(f.follower) !== String(f.following)));
    const posts = new Map(data.posts.map((p) => [String(p._id), p]));
    const comments = new Map(data.comments.map((c) => [String(c._id), c]));
    for (const comment of data.comments) {
        assert(+comment.createdAt >= +posts.get(String(comment.post)).createdAt);
        if (!comment.parentComment) continue;
        const parent = comments.get(String(comment.parentComment));
        assert.equal(parent.parentComment, null);
        assert.equal(String(parent.post), String(comment.post));
        assert(+comment.createdAt >= +parent.createdAt);
    }
    assert(data.comments.some((c) => c.parentComment));
    assert(data.posts.some((p) => p.shareCount === 0) && data.posts.some((p) => p.shareCount > 20));
    const counts = data.profiles.map((profile) => data.posts.filter((p) => String(p.profile) === String(profile._id)).length);
    assert(Math.min(...counts) >= 3 && Math.max(...counts) <= 20 && new Set(counts).size > 5);
    assert.equal(data.photos.length, Object.keys(sources).length);
    assert(data.photos.some((p) => p.post) && data.photos.filter((p) => !p.post).length === 100);
});

test("manifest validation rejects path traversal and foreign database ownership", () => {
    const ctx = context("mongodb://localhost/threadly");
    const manifest = { _id: "threadly-development-v1", version: 1, runId: "11111111-1111-1111-1111-111111111111", database: ctx.database, fingerprint: ctx.fingerprint, ids: Object.fromEntries(Object.keys(MODELS).map((name) => [name, []])), files: [] };
    validateManifest(ctx, manifest);
    assert.throws(() => validateManifest(ctx, { ...manifest, fingerprint: "another-cluster" }), /does not match/);
    assert.throws(() => validateManifest(ctx, { ...manifest, files: [{ path: "/uploads/photos/../../real.jpg", sha256: hash("x") }] }), /Unsafe/);
});

test("live lifecycle: seed, verify, rerun, guarded cleanup and interrupted cleanup", { skip: process.env.SEED_INTEGRATION !== "1", timeout: 180000 }, async (t) => {
    nextEnv.loadEnvConfig(process.cwd(), true, { info() {}, error() {} });
    const temp = await fs.mkdtemp(path.join(await fs.realpath(os.tmpdir()), "threadly-seed-test-"));
    const ctx = context(process.env.MONGODB_URL, { database: "threadly_seed_test", localRoot: path.join(temp, "private"), photoRoot: path.join(temp, "photos") });
    const registry = await connect(ctx);
    t.after(() => mongoose.disconnect());
    // Never reuse, reset, or remove another test run.
    assert.equal(await registry.countDocuments({}), 0, "A prior test manifest exists; inspect it before testing.");
    const controlId = randomBytes(4).toString("hex");
    let controlUser;
    let controlProfile;
    const baseline = {};
    for (const [name, model] of Object.entries(MODELS)) baseline[name] = await model.countDocuments();
    try {
        controlUser = await MODELS.users.create({ username: `check_${controlId}`, email: `check_${controlId}@example.test`, password: `Dev!7a${randomBytes(12).toString("hex")}` });
        controlProfile = await MODELS.profiles.create({ user: controlUser._id, name: "Unrelated control account" });
        await fs.mkdir(ctx.photoRoot, { recursive: true });
        const defaultPhoto = path.join(ctx.photoRoot, "default_profile_picture.png");
        await fs.writeFile(defaultPhoto, "untouched default asset");
        const report = await seed(ctx, registry, { offline: true, progress() {} });
        assert.equal(report.counts.users, 100);
        const manifest = await registry.findOne({ _id: "threadly-development-v1" });
        assert.deepEqual(await seed(ctx, registry, { offline: true, progress() {} }), report);
        assert.equal((await cleanup(ctx, registry, manifest, { dryRun: true })).dryRun, true);
        assert.equal(await MODELS.users.countDocuments(), baseline.users + 101);

        const post = manifest.ids.posts[0];
        const profile = manifest.ids.profiles[0];
        const rootComment = await MODELS.comments.findOne({ _id: { $in: manifest.ids.comments }, parentComment: null });
        const dependencies = [
            ["follows", { follower: controlProfile._id, following: profile }],
            ["likes", { profile: controlProfile._id, post }],
            ["reposts", { profile: controlProfile._id, post }],
            ["comments", { profile: controlProfile._id, post, content: "Keep this real comment." }],
            ["comments", { profile: controlProfile._id, post: rootComment.post, parentComment: rootComment._id, content: "Keep this real reply." }],
            ["photos", { profile: controlProfile._id, path: manifest.files[0].path }],
        ];
        for (const [name, fields] of dependencies) {
            const record = await MODELS[name].create(fields);
            try {
                await assert.rejects(cleanup(ctx, registry, manifest), /stopped before deleting/);
                assert(await MODELS[name].exists({ _id: record._id }));
                assert.equal(await MODELS.users.countDocuments(), baseline.users + 101);
            } finally { await MODELS[name].deleteOne({ _id: record._id }); }
        }
        const photoPath = path.join(ctx.photoRoot, manifest.files[0].path.slice("/uploads/photos/".length));
        const original = await fs.readFile(photoPath);
        await fs.writeFile(photoPath, "a real replacement photo");
        await assert.rejects(cleanup(ctx, registry, manifest), /Modified generated photo/);
        await fs.writeFile(photoPath, original);
        const unowned = path.join(path.dirname(photoPath), "keep.txt");
        await fs.writeFile(unowned, "unowned data");
        await assert.rejects(cleanup(ctx, registry, manifest), /Unowned file/);
        await fs.unlink(unowned);
        await fs.symlink(defaultPhoto, unowned);
        await assert.rejects(cleanup(ctx, registry, manifest), /symlink/);
        await fs.unlink(unowned);
        assert.deepEqual(await preflight(ctx, manifest), []);

        // Simulate a run interrupted midway through cleanup; missing owned records/files are safe.
        await MODELS.likes.deleteOne({ _id: manifest.ids.likes[0] });
        await fs.unlink(photoPath);
        await cleanup(ctx, registry, { ...manifest, status: "cleaning" });
        assert.equal(await registry.countDocuments(), 0);
        assert.equal(await fs.readFile(defaultPhoto, "utf8"), "untouched default asset");
        assert(await MODELS.users.exists({ _id: controlUser._id }));
        assert(await MODELS.profiles.exists({ _id: controlProfile._id }));
        assert.deepEqual(await fs.readdir(ctx.localRoot), []);
        assert.deepEqual(await fs.readdir(ctx.photoRoot), ["default_profile_picture.png"]);
    } finally {
        // Only remove fixtures made by this test; never drop the database.
        if (controlProfile) await MODELS.profiles.deleteOne({ _id: controlProfile._id });
        if (controlUser) await MODELS.users.deleteOne({ _id: controlUser._id });
        for (const [name, model] of Object.entries(MODELS)) assert.equal(await model.countDocuments(), baseline[name], `Test left ${name} records; inspect ${temp}.`);
        await mongoose.disconnect();
    }
    await fs.unlink(path.join(ctx.photoRoot, "default_profile_picture.png"));
    await fs.rmdir(ctx.photoRoot);
    await fs.rmdir(ctx.localRoot);
    await fs.rmdir(temp);
});
