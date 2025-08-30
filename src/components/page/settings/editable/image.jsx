// Package Imports
import { useState, useRef, useEffect } from "react";
import * as Icon from "lucide-react";
import { Ring } from "ldrs/react";
import "ldrs/react/Ring.css";
import { toast } from "sonner";

// Lib Imports
import { adjustAvatar, cn, log } from "@/lib/utils";

// Main
export function EditableImage({ avatarUrl, onSave, className }) {
  let fileInputRef = useRef(null);
  let [loading, setLoading] = useState(false);
  let [error, setError] = useState(null);

  let handleClick = () => {
    if (fileInputRef.current) {
      fileInputRef.current.click();
    }
  };

  let handleFileChange = async (event) => {
    let file = event.target.files[0];
    if (!file) return;

    setError(null);
    setLoading(true);

    if (!file.type.startsWith("image/")) {
      setError("Please upload an image file (e.g., .jpg, .png).");
      setLoading(false);
      return;
    }

    let MAX_FILE_SIZE_MB = 5;
    if (file.size > MAX_FILE_SIZE_MB * 1024 * 1024) {
      setError(`File size exceeds ${MAX_FILE_SIZE_MB}MB.`);
      setLoading(false);
      return;
    }

    try {
      let reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onloadend = async () => {
        let base64String = reader.result;
        let adjusted = await adjustAvatar(base64String, true, 0);
        onSave(adjusted);
        setLoading(false);
      };

      reader.onerror = (err) => {
        log(err.message, "showError");
        setError("Failed to read file.");
        setLoading(false);
      };
    } catch (err) {
      log(err.message, "showError");
      setError("Error processing image.");
      setLoading(false);
    } finally {
      event.target.value = "";
    }
  };

  useEffect(() => {
    if (error !== "" && error !== null) {
      toast.error(error);
    }
  }, [error]);

  return (
    <div
      className={cn("relative group cursor-pointer", className)}
      onClick={handleClick}
    >
      <img
        src={avatarUrl}
        alt="User Avatar"
        className={`border-1 bg-input/15 w-full h-full object-cover rounded-full transition-all duration-300
                    ${loading ? "opacity-50" : "group-hover:opacity-75"}`}
        onError={(e) => {
          e.target.onerror = null;
          e.target.src =
            "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAAAXNSR0IArs4c6QAAAAtJREFUGFdjYAACAAAFAAGq1chRAAAAAElFTkSuQmCC";
        }}
      />

      {/* Overlay for upload icon */}
      <div className="absolute inset-0 flex items-center justify-center bg-background/75 text-foreground rounded-full opacity-0 group-hover:opacity-100 transition-opacity duration-300">
        {loading ? (
          <Ring
            size="20"
            stroke="3"
            bgOpacity="0"
            speed="2"
            color="var(--foreground)"
          />
        ) : (
          <Icon.Upload size={20} />
        )}
      </div>

      {/* Hidden file input */}
      <input
        type="file"
        ref={fileInputRef}
        onChange={handleFileChange}
        accept="image/*"
        className="hidden"
      />
    </div>
  );
}
