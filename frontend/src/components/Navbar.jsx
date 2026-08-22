import React, { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Menu, User, Heart, Star, LayoutDashboard, Shield, LogOut, ChefHat, ChevronDown } from "lucide-react";
import { Logo } from "./Logo";
import { useAuth } from "../context/AuthContext";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger,
} from "./ui/dropdown-menu";
import { Sheet, SheetContent, SheetTrigger, SheetClose } from "./ui/sheet";

const INDIAN = [
  ["Bengali", "Bengali"], ["North India", "North Indian"], ["Indo-Chinese", "Indo-Chinese"],
  ["South Indian", "South Indian"], ["Kashmiri", "Kashmiri"], ["Kebabs", "Kebab"], ["Indian Desserts", "Indian Dessert"],
];
const HEALTHY = [
  ["Salads", "Salad"], ["Juices", "Juice"], ["Morning Shots", "Morning Shot"], ["Good Food Habits", "Healthy Food Habits"],
];

function MegaMenu({ label, items, navigate }) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button data-testid={`nav-${label.toLowerCase().replace(/\s+/g, "-")}`}
          className="inline-flex items-center gap-1 whitespace-nowrap px-3.5 py-2 rounded-full text-sm font-bold text-ink-soft hover:text-ink hover:bg-white transition-colors">
          {label} <ChevronDown size={15} />
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" className="w-56">
        {items.map(([lbl, q]) => (
          <DropdownMenuItem key={q} data-testid={`menu-item-${q.toLowerCase().replace(/\s+/g, "-")}`} onClick={() => navigate(`/search?q=${encodeURIComponent(q)}`)}>
            {lbl}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

export function Navbar() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);

  const doLogout = async () => { await logout(); navigate("/"); };
  const initials = (user?.name || "U").slice(0, 1).toUpperCase();

  return (
    <header className="sticky top-0 z-50 bg-cream/80 backdrop-blur-xl border-b border-border/60">
      <nav className="max-w-7xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between gap-4">
        <Logo onClick={() => navigate("/")} />

        <div className="hidden lg:flex items-center gap-1">
          <Link to="/categories" data-testid="nav-world-of-recipes" className="whitespace-nowrap px-3.5 py-2 rounded-full text-sm font-bold text-ink-soft hover:text-ink hover:bg-white transition-colors">
            World of Recipes
          </Link>
          <MegaMenu label="Best Indian Cuisines" items={INDIAN} navigate={navigate} />
          <MegaMenu label="Healthy Easy Food" items={HEALTHY} navigate={navigate} />
          <Link to="/plan-meal" data-testid="nav-plan-your-meal" className="whitespace-nowrap px-3.5 py-2 rounded-full text-sm font-bold text-ink-soft hover:text-ink hover:bg-white transition-colors">
            Plan your Meal
          </Link>
          <Link to="/creator" data-testid="nav-for-creators" className="whitespace-nowrap px-3.5 py-2 rounded-full text-sm font-bold text-ink-soft hover:text-ink hover:bg-white transition-colors">
            For Creators
          </Link>
          <Link to="/about" data-testid="nav-about" className="whitespace-nowrap px-3.5 py-2 rounded-full text-sm font-bold text-ink-soft hover:text-ink hover:bg-white transition-colors">
            About
          </Link>
        </div>

        <div className="flex items-center gap-2">
          {!user ? (
            <>
              <Link to="/login" data-testid="nav-login" className="hidden sm:inline-flex items-center h-10 px-4 rounded-full text-sm font-bold text-ink hover:bg-white transition-colors whitespace-nowrap">Log in</Link>
              <Link to="/creator" data-testid="nav-become-creator" className="hidden sm:inline-flex items-center h-10 px-4 rounded-full text-sm font-bold bg-coral hover:bg-coral-hover text-white transition-colors whitespace-nowrap">Become a Creator</Link>
            </>
          ) : (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button data-testid="user-menu-trigger" className="flex items-center gap-2 rounded-full border border-border bg-white pl-1 pr-3 h-10 hover:border-coral transition-colors">
                  {user.picture ? <img src={user.picture} alt="" className="w-8 h-8 rounded-full object-cover" /> :
                    <span className="grid place-items-center w-8 h-8 rounded-full bg-coral text-white font-bold text-sm">{initials}</span>}
                  <span className="text-sm font-bold text-ink max-w-[100px] truncate">{user.name}</span>
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56">
                <DropdownMenuItem onClick={() => navigate("/profile")} data-testid="menu-profile"><User size={16} className="mr-2" /> Profile</DropdownMenuItem>
                <DropdownMenuItem onClick={() => navigate("/saved")} data-testid="menu-saved"><Heart size={16} className="mr-2" /> Saved recipes</DropdownMenuItem>
                <DropdownMenuItem onClick={() => navigate("/profile#ratings")} data-testid="menu-ratings"><Star size={16} className="mr-2" /> My ratings</DropdownMenuItem>
                <DropdownMenuSeparator />
                {(user.role === "creator" || user.role === "admin") ? (
                  <DropdownMenuItem onClick={() => navigate("/creator/dashboard")} data-testid="menu-creator-dashboard"><LayoutDashboard size={16} className="mr-2" /> Creator dashboard</DropdownMenuItem>
                ) : (
                  <DropdownMenuItem onClick={() => navigate("/creator")} data-testid="menu-become-creator"><ChefHat size={16} className="mr-2" /> Become a creator</DropdownMenuItem>
                )}
                {user.role === "admin" && <DropdownMenuItem onClick={() => navigate("/admin")} data-testid="menu-admin"><Shield size={16} className="mr-2" /> Admin</DropdownMenuItem>}
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={doLogout} data-testid="menu-logout" className="text-coral-hover"><LogOut size={16} className="mr-2" /> Log out</DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          )}

          {/* Mobile */}
          <Sheet open={open} onOpenChange={setOpen}>
            <SheetTrigger asChild>
              <button data-testid="mobile-menu-trigger" className="lg:hidden grid place-items-center w-10 h-10 rounded-full border border-border bg-white" aria-label="Open menu">
                <Menu size={20} />
              </button>
            </SheetTrigger>
            <SheetContent side="right" className="w-[300px] bg-cream overflow-y-auto">
              <div className="mt-8 flex flex-col gap-1">
                <SheetClose asChild><Link to="/categories" className="px-4 py-3 rounded-xl text-base font-bold text-ink hover:bg-white">World of Recipes</Link></SheetClose>
                <p className="px-4 pt-3 pb-1 text-xs font-bold uppercase tracking-widest text-ink-soft">Best Indian Cuisines</p>
                {INDIAN.map(([lbl, q]) => (
                  <SheetClose asChild key={q}><Link to={`/search?q=${encodeURIComponent(q)}`} className="px-6 py-2.5 rounded-xl text-sm font-semibold text-ink-soft hover:bg-white">{lbl}</Link></SheetClose>
                ))}
                <p className="px-4 pt-3 pb-1 text-xs font-bold uppercase tracking-widest text-ink-soft">Healthy Easy Food</p>
                {HEALTHY.map(([lbl, q]) => (
                  <SheetClose asChild key={q}><Link to={`/search?q=${encodeURIComponent(q)}`} className="px-6 py-2.5 rounded-xl text-sm font-semibold text-ink-soft hover:bg-white">{lbl}</Link></SheetClose>
                ))}
                <div className="h-px bg-border my-3" />
                <SheetClose asChild><Link to="/plan-meal" className="px-4 py-3 rounded-xl text-base font-bold text-ink hover:bg-white">Plan your Meal</Link></SheetClose>
                <SheetClose asChild><Link to="/creator" className="px-4 py-3 rounded-xl text-base font-bold text-ink hover:bg-white">For Creators</Link></SheetClose>
                <SheetClose asChild><Link to="/about" className="px-4 py-3 rounded-xl text-base font-bold text-ink hover:bg-white">About</Link></SheetClose>
                <div className="h-px bg-border my-3" />
                {!user ? (
                  <>
                    <SheetClose asChild><Link to="/login" className="px-4 py-3 rounded-xl text-base font-bold text-ink hover:bg-white">Log in</Link></SheetClose>
                    <SheetClose asChild><Link to="/creator" className="px-4 py-3 rounded-xl text-base font-bold bg-coral text-white text-center">Become a Creator</Link></SheetClose>
                  </>
                ) : (
                  <>
                    <SheetClose asChild><Link to="/profile" className="px-4 py-3 rounded-xl text-base font-bold text-ink hover:bg-white">Profile</Link></SheetClose>
                    <SheetClose asChild><Link to="/saved" className="px-4 py-3 rounded-xl text-base font-bold text-ink hover:bg-white">Saved</Link></SheetClose>
                    {(user.role === "creator" || user.role === "admin") && <SheetClose asChild><Link to="/creator/dashboard" className="px-4 py-3 rounded-xl text-base font-bold text-ink hover:bg-white">Creator dashboard</Link></SheetClose>}
                    {user.role === "admin" && <SheetClose asChild><Link to="/admin" className="px-4 py-3 rounded-xl text-base font-bold text-ink hover:bg-white">Admin</Link></SheetClose>}
                    <button onClick={() => { setOpen(false); doLogout(); }} className="text-left px-4 py-3 rounded-xl text-base font-bold text-coral-hover hover:bg-white">Log out</button>
                  </>
                )}
              </div>
            </SheetContent>
          </Sheet>
        </div>
      </nav>
    </header>
  );
}
