import mongoose from "mongoose";

const firstNames = [
    "Oliver", "Amelia", "Mateo", "Sofia", "Noah", "Maya", "Luca", "Isla",
    "Ethan", "Aisha", "Leo", "Nora", "Arjun", "Chloe", "Oscar", "Elena",
    "Felix", "Zara", "Theo", "Freya", "Ravi", "Clara", "Adam", "Leila",
    "Hugo", "Eva", "Samir", "Iris", "Daniel", "Lina", "Adrian", "Alice",
    "Ben", "Mila", "Jasper", "Ruby", "Omar", "Vera", "Finn", "Sara",
];
const surnames = ["Morgan", "Patel", "Novak", "Reed", "Costa", "Kim", "Silva", "Bennett", "Ali", "Chen"];
const cities = ["Bristol", "Lisbon", "Skopje", "Copenhagen", "Edinburgh", "Ljubljana", "Porto", "Utrecht", "Vienna", "Valencia"];
const topics = [
    { name: "weekend walks", bio: "Collecting walking routes and finding the scenic way home.",
        ideas: ["The quiet path beside the river", "A hill worth the early start", "A rainy walk through the park", "Getting lost near the old town", "An afternoon under the trees", "My new favorite sunset spot"],
        notes: ["Packed a small picnic and left the headphones at home.", "The last stretch was steep, but the view made up for it.", "Took the longer route back and found a lovely little bridge."],
        question: "Would you take this route again in winter?", reply: "Definitely, with warmer layers and an earlier start." },
    { name: "home cooking", bio: "Home cook, market regular, and enthusiastic recipe tester.",
        ideas: ["Sunday soup with whatever was left", "My first properly crisp focaccia", "A quick lunch from the market", "Dinner for friends without the fuss", "Learning to make fresh pasta", "The roast vegetables everyone finished"],
        notes: ["A squeeze of lemon at the end made the biggest difference.", "Kept the recipe simple and let the seasonal ingredients do the work.", "Made an extra portion for tomorrow, which feels like a small victory."],
        question: "Could I prep most of this the night before?", reply: "Yes! I did the chopping ahead and finished it just before serving." },
    { name: "photography", bio: "Chasing natural light, interesting streets, and small details.",
        ideas: ["Morning light on familiar streets", "A little study in reflections", "Clouds that changed the whole scene", "Trying a slower shutter speed", "Details I usually walk past", "A photo walk with one lens"],
        notes: ["Waited a few minutes for the light instead of moving on.", "Still learning to leave more empty space in the frame.", "My favorite frame was the one I almost deleted."],
        question: "Did you edit the colors much?", reply: "Just a small exposure adjustment; the light did most of the work." },
    { name: "reading", bio: "Always carrying a book. Here for library finds and thoughtful conversations.",
        ideas: ["A library visit that became an afternoon", "Finally finishing the book on my desk", "Notes from our small book club", "A chapter worth reading twice", "Reading outside for a change", "An unexpected secondhand bookshop find"],
        notes: ["The ending stayed with me longer than I expected.", "Wrote down a few questions to bring to our next discussion.", "Trying to read a little before reaching for my phone."],
        question: "Would this work for a relaxed book club?", reply: "I think so. There is plenty to discuss without needing to rush." },
    { name: "cycling", bio: "Weekend cyclist. Coffee stops count as route planning.",
        ideas: ["A gentle ride before breakfast", "Testing a new route out of town", "The cafe stop was the best part", "Learning to fix my own puncture", "A windy ride with good company", "An easy evening loop"],
        notes: ["Kept the pace conversational and enjoyed the quieter roads.", "Brought an extra layer and was very glad I did.", "The last few kilometers felt easier than last week."],
        question: "Is the route comfortable for a beginner?", reply: "Yes, if you take it slowly. There are a couple of easy places to stop." },
    { name: "gardening", bio: "Growing herbs on a small balcony and learning as I go.",
        ideas: ["The first new leaves this month", "Repotting day on the balcony", "A tiny harvest for tonight's dinner", "Learning not to overwater everything", "Making room for one more plant", "A quiet morning in the community garden"],
        notes: ["A little patience seems to help more than constant attention.", "Moved the pots to catch the morning sun.", "Swapped a few cuttings with a neighbor."],
        question: "How much direct sunlight does it get?", reply: "A few hours in the morning, then shade for the rest of the day." },
    { name: "design", bio: "Designer who loves useful objects, sketchbooks, and clear typography.",
        ideas: ["A sketchbook page that led somewhere", "Making a small corner feel calmer", "An exhibition full of useful ideas", "Trying a more restrained color palette", "A sign with surprisingly good lettering", "Why I keep coming back to paper sketches"],
        notes: ["Removing one element made the whole thing easier to understand.", "Saved a few references to revisit when I have fresh eyes.", "The simplest version ended up being my favorite."],
        question: "Did you try any other layouts first?", reply: "A few! The early sketches helped me see what could be removed." },
    { name: "music", bio: "Live music, old records, and slowly learning a few chords.",
        ideas: ["A small venue with a wonderful sound", "The record I kept replaying today", "An evening practicing the basics", "A playlist for the train ride home", "Finding a new local band", "A Sunday spent browsing record shops"],
        notes: ["Loved how much room there was for the quieter moments.", "Went with a friend and came home with a few new favorites.", "It is nice to enjoy something without needing to be good at it."],
        question: "Would you recommend it for a first visit?", reply: "Absolutely. It felt welcoming, and there was no pressure to know everything." },
    { name: "travel", bio: "Slow trips, local trains, and little cafes away from the crowds.",
        ideas: ["A day trip with no packed itinerary", "Taking the local train for a change", "The nicest square was the quietest one", "Postcards from a short weekend away", "Finding breakfast near the station", "A small museum I nearly missed"],
        notes: ["Left plenty of time to wander instead of booking every hour.", "The best recommendation came from someone at the bakery.", "Would happily come back with another day to spare."],
        question: "Could you manage the trip without a car?", reply: "Yes, I used the train and walked most of the rest." },
    { name: "everyday projects", bio: "Making small things, fixing what I can, and sharing the process.",
        ideas: ["Finally fixing the shelf that wobbled", "A small project for a quiet afternoon", "Learning a new skill one step at a time", "Making better use of a little desk", "The repair worked on the second try", "A useful thing made from leftovers"],
        notes: ["Took longer than planned, but I learned something useful.", "Borrowed the right tool instead of buying another one.", "A rough first attempt was enough to get started."],
        question: "Would you try it again with the same materials?", reply: "Mostly, though I would measure twice before cutting next time." },
];

export function randomGenerator(seed) {
    return () => {
        seed |= 0;
        seed = seed + 0x6D2B79F5 | 0;
        let value = Math.imul(seed ^ seed >>> 15, 1 | seed);
        value = value + Math.imul(value ^ value >>> 7, 61 | value) ^ value;
        return ((value ^ value >>> 14) >>> 0) / 4294967296;
    };
}

export function generateData(password, seed = 48151, now = Date.now()) {
    const random = randomGenerator(seed);
    const integer = (min, max) => min + Math.floor(random() * (max - min + 1));
    const pick = (items) => items[integer(0, items.length - 1)];
    const between = (start) => new Date(+start + random() * (now - +start));
    const data = Object.fromEntries(["users", "profiles", "links", "posts", "photos", "follows", "likes", "comments", "reposts"].map((name) => [name, []]));
    const add = (collection, fields, createdAt) => {
        const doc = { _id: new mongoose.Types.ObjectId(), ...fields, createdAt, updatedAt: createdAt };
        data[collection].push(doc);
        return doc;
    };
    const people = [];
    const sources = {};
    for (let i = 0; i < 100; i++) {
        const first = firstNames[i % firstNames.length];
        const username = `seed_${first.toLowerCase()}_${String(i + 1).padStart(3, "0")}`;
        const joined = new Date(now - integer(65, 100) * 86400000);
        const user = add("users", { username, email: `${username}@example.test`, password }, joined);
        const topic = topics[i % topics.length];
        const city = cities[integer(0, cities.length - 1)];
        const profile = add("profiles", {
            user: user._id, name: `${first} ${surnames[Math.floor(i / 10)]}`,
            bio: `${topic.bio} Based in ${city}. Fictional development account.`,
            gender: i % 13 === 0 ? "Prefer not to say" : i % 2 ? "Woman" : "Man",
        }, joined);
        const person = { profile, topic, city, index: i, activity: i < 65 ? 1 : i < 90 ? 2 : 4, popularity: i >= 95 ? 8 : i >= 80 ? 3 : 1 };
        people.push(person);
        const linkCount = random() < 0.55 ? integer(1, 3) : 0;
        for (let j = 0; j < linkCount; j++) {
            add("links", { profile: profile._id, title: ["My journal", "Projects", "Favorite places"][j], url: `https://example.com/${username}/${["journal", "projects", "places"][j]}` }, joined);
        }
        const photo = add("photos", { profile: profile._id, post: null, path: `/uploads/photos/${profile._id}/profile_photo.jpg` }, joined);
        sources[photo.path] = `https://randomuser.me/api/portraits/${i % 2 ? "women" : "men"}/${Math.floor(i / 2)}.jpg`;
    }
    function audience(owner, count) {
        return people.filter((p) => p !== owner)
            .map((person) => ({ person, score: -Math.log(Math.max(random(), Number.EPSILON)) / (person.activity * (person.topic === owner.topic ? 3 : 1)) }))
            .sort((a, b) => a.score - b.score).slice(0, count).map(({ person }) => person);
    }
    for (const person of people) {
        const candidates = people.filter((p) => p !== person).map((target) => ({ target, score: -Math.log(Math.max(random(), Number.EPSILON)) / (target.popularity * (target.topic === person.topic ? 3 : 1)) }));
        candidates.sort((a, b) => a.score - b.score);
        for (const { target } of candidates.slice(0, integer(3, 8 * person.activity + 5))) {
            add("follows", { follower: person.profile._id, following: target.profile._id }, between(Math.max(+person.profile.createdAt, +target.profile.createdAt)));
        }
        const count = person.activity === 1 ? integer(3, 5) : person.activity === 2 ? integer(6, 10) : integer(12, 20);
        for (let j = 0; j < count; j++) {
            const createdAt = new Date(now - integer(1, 60 * 24 * 60) * 60000);
            const popularity = random() < 0.12 ? integer(25, 70) : integer(0, 7) * person.popularity;
            const post = add("posts", {
                profile: person.profile._id,
                title: `${pick(person.topic.ideas)}${j >= 6 ? ` — ${person.city}` : ""}`,
                content: `${pick(person.topic.notes)} ${pick(["A welcome break from a busy week.", "Glad I made time for this.", "Sharing a little progress, not a perfect result.", "Would love to hear how others approach this.", "Already looking forward to the next time.", `A small highlight of life in ${person.city}.`, "Nothing elaborate, just a good afternoon.", "Keeping this here as a reminder to do it more often."])}`,
                shareCount: random() < 0.45 ? 0 : integer(1, Math.max(1, popularity)),
            }, createdAt);
            if (random() < 0.38) {
                const photoCount = random() < 0.08 ? integer(5, 8) : integer(1, 4);
                for (let k = 0; k < photoCount; k++) {
                    const photo = add("photos", { profile: person.profile._id, post: post._id, path: `/uploads/photos/${person.profile._id}/${post._id}/photo_${+createdAt}_${k + 1}.jpg` }, createdAt);
                    const id = pick([10, 15, 20, 24, 28, 29, 42, 49, 57, 64, 76, 82, 96, 103, 119, 133, 137, 152, 164, 180, 188, 211, 225, 250]);
                    sources[photo.path] = `https://picsum.photos/id/${id}/${k % 3 === 0 ? "900/1200" : k % 3 === 1 ? "1200/800" : "900/900"}`;
                }
            }
            for (const other of audience(person, Math.min(85, popularity))) {
                add("likes", { profile: other.profile._id, post: post._id }, between(createdAt));
            }
            for (const other of audience(person, random() < 0.6 ? 0 : integer(0, Math.ceil(popularity / 4)))) {
                add("reposts", { profile: other.profile._id, post: post._id }, between(createdAt));
            }
            const commenters = audience(person, random() < 0.35 ? 0 : integer(0, Math.ceil(popularity / 7)));
            for (const other of commenters) {
                const isQuestion = random() < 0.4;
                const comment = add("comments", {
                    profile: other.profile._id, post: post._id, parentComment: null,
                    content: isQuestion ? person.topic.question : pick([`Really enjoyed this little update about ${person.topic.name}.`, "This sounds like a lovely way to spend an afternoon.", "Thanks for sharing the process, not just the finished result.", "I have been meaning to make time for something like this too.", `Your updates from ${person.city} always give me ideas.`]),
                }, between(createdAt));
                if (random() < (isQuestion ? 0.85 : 0.3)) {
                    add("comments", { profile: person.profile._id, post: post._id, parentComment: comment._id, content: isQuestion ? person.topic.reply : "Thank you! It was a small thing, but it really improved my day." }, between(comment.createdAt));
                    if (random() < 0.25) add("comments", { profile: other.profile._id, post: post._id, parentComment: comment._id, content: "That helps, thanks for taking the time to reply!" }, new Date(now - integer(0, Math.max(0, Math.floor((now - +comment.createdAt) / 1000))) * 1000));
                }
            }
        }
    }
    return { data, sources };
}
