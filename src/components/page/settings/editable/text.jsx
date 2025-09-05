// Package Imports
import React, { useState, useRef, useEffect } from "react";
import { toast } from "sonner";

// Lib Imports
import { capitalizeFirstLetter, cn } from "@/lib/utils";

// Components
import { Textarea } from "@/components/ui/textarea";

// Main
export function EditableText({ value, onSave, className, placeholder }) {
  let [isEditing, setIsEditing] = useState(false);
  let editableRef = useRef(null);

  useEffect(() => {
    if (isEditing && editableRef.current) {
      editableRef.current.focus();
      let range = document.createRange();
      let selection = window.getSelection();
      range.selectNodeContents(editableRef.current);
      range.collapse(false);
      selection.removeAllRanges();
      selection.addRange(range);
    }
  }, [isEditing]);

  let handleClick = () => {
    setIsEditing(true);
  };

  let handleBlur = () => {
    setIsEditing(false);
    if (editableRef.current && onSave) {
      onSave(editableRef.current.textContent.trim());
    }
  };

  let handleKeyDown = (event) => {
    if (event.key === "Enter") {
      event.preventDefault();
      editableRef.current.blur();
    }
  };

  return (
    <p
      ref={editableRef}
      className={`break-words whitespace-pre-wrap outline-none ${isEditing ? "cursor-text" : ""} ${value === "" && !isEditing ? "opacity-50" : ""} ${className}`}
      onClick={handleClick}
      onBlur={handleBlur}
      onKeyDown={handleKeyDown}
      contentEditable={isEditing}
      suppressContentEditableWarning={true}
    >
      {value === "" && !isEditing ? placeholder : value}
    </p>
  );
}

export function EditableTextarea({
  name,
  value,
  onSave,
  onChar,
  maxChars,
  className,
  placeholder,
}) {
  let [editingValue, setEditingValue] = useState("");

  useEffect(() => {
    setEditingValue(value);
  }, [value]);

  function handleChange(event) {
    setEditingValue(event.target.value);
    onChar(event.target.value.length);
  }

  function handleBlur() {
    let tooLongMsg = `${name} too long!`;
    if (editingValue.length <= maxChars) {
      onSave(editingValue);
    } else {
      toast.error(tooLongMsg);
    }
  }

  return (
    <Textarea
      className={cn(
        "placeholder break-words whitespace-pre-wrap outline-none cursor-text resize-none h-35",
        className
      )}
      onBlur={handleBlur}
      placeholder={placeholder}
      value={editingValue}
      onChange={handleChange}
    />
  );
}
