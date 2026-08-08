import React, { memo, useState } from "react";
import { User2 } from "lucide-react";



export const ContactAvatar = memo(function ContactAvatar({
  name,
  phone,
  profilePicUrl,
  isSaved,
}: {
  name?: string | null;
  phone: string;
  profilePicUrl?: string | null;
  isSaved?: boolean;
}) {
  const [imgError, setImgError] = useState(false);

  const hasName = Boolean(name && name.trim() && name.trim() !== phone.trim());
  const displayName = hasName ? name!.trim() : phone;
  const initial = hasName ? displayName.charAt(0).toUpperCase() : "";


  const getAvatarColor = (str: string) => {
    const colors = [
      "bg-emerald-600 text-white",
      "bg-blue-600 text-white",
      "bg-indigo-600 text-white",
      "bg-purple-600 text-white",
      "bg-teal-600 text-white",
      "bg-cyan-600 text-white",
      "bg-amber-600 text-white",
    ];
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      hash = str.charCodeAt(i) + ((hash << 5) - hash);
    }
    return colors[Math.abs(hash) % colors.length];
  };

  //  Has Profile Picture
  if (profilePicUrl && !imgError) {
    return (
      <div className="relative flex-shrink-0">
        <img
          src={profilePicUrl}
          alt={displayName}
          onError={() => setImgError(true)}
          className="h-10 w-10 rounded-full object-cover border border-slate-200 dark:border-slate-700 shadow-sm"
        />
      </div>
    );
  }

  //  Saved Contact with Name -> Show Name Initial in Colorful Circle
  if (hasName && isSaved !== false) {
    const avatarBg = getAvatarColor(displayName);
    return (
      <div
        className={`h-10 w-10 rounded-full flex items-center justify-center font-bold text-xs shadow-sm flex-shrink-0 ${avatarBg} relative`}
      >
        <span>{initial}</span>
      </div>
    );
  }

  //  Unsaved Contact -> Standard Profile User Icon
  return (
    <div className="h-10 w-10 rounded-full bg-slate-200 dark:bg-slate-700 text-slate-500 dark:text-slate-400 flex items-center justify-center shadow-sm flex-shrink-0 border border-slate-300/50 dark:border-slate-600/50">
      <User2 className="h-5 w-5" />
    </div>
  );
});
