import Image from "next/image";
import { DEFAULT_PROFILE_PHOTO } from "@/lib/profilePhoto";

export default function Avatar({ profile, size = 44 }) {
    const name = profile?.name || profile?.username || "Threadly user";

    return (
        <Image
            className="avatar"
            src={profile?.profilePhoto || DEFAULT_PROFILE_PHOTO}
            alt={`${name}'s profile photo`}
            width={size}
            height={size}
            unoptimized
        />
    );
}
