import BoringAvatar from "boring-avatars";

export function Avatar({ name, size = 32 }) {
  return (
    <BoringAvatar
      size={size}
      name={name || "User"}
      variant="beam"
      colors={["#2563eb", "#3b82f6", "#60a5fa", "#bfdbfe", "#1e3a8a"]}
    />
  );
}
