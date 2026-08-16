import React, { useState } from "react";
import { Heart } from "lucide-react";
import { api } from "../lib/api";
import { useAuth } from "../context/AuthContext";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";

export function SaveButton({ recipeId, initialSaved = false, variant = "icon" }) {
  const { user } = useAuth();
  const [saved, setSaved] = useState(initialSaved);
  const [busy, setBusy] = useState(false);
  const navigate = useNavigate();

  const toggle = async (e) => {
    e?.preventDefault();
    e?.stopPropagation();
    if (!user) {
      toast("Log in to save recipes");
      navigate("/login");
      return;
    }
    setBusy(true);
    try {
      const { data } = await api.post(`/recipes/${recipeId}/save`);
      setSaved(data.saved);
      toast(data.saved ? "Saved to your collection" : "Removed from saved");
    } catch {
      toast.error("Could not update saved state");
    } finally {
      setBusy(false);
    }
  };

  if (variant === "full") {
    return (
      <button
        onClick={toggle}
        disabled={busy}
        data-testid="save-button"
        className={`inline-flex items-center gap-2 rounded-full px-5 h-12 font-bold border transition-all duration-200 ${
          saved ? "bg-coral/10 border-coral text-coral-hover" : "bg-white border-border text-ink hover:border-coral"
        }`}
      >
        <Heart size={18} className={`transition-transform ${saved ? "fill-coral text-coral scale-110" : ""}`} />
        {saved ? "Saved" : "Save"}
      </button>
    );
  }

  return (
    <button
      onClick={toggle}
      disabled={busy}
      data-testid="save-button"
      aria-label="Save recipe"
      className="grid place-items-center rounded-full bg-white/90 backdrop-blur w-10 h-10 shadow-soft hover:scale-110 transition-transform duration-200"
    >
      <Heart size={18} className={saved ? "fill-coral text-coral" : "text-ink-soft"} />
    </button>
  );
}
