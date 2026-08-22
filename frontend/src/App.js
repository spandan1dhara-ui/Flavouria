import "./App.css";
import React from "react";
import { BrowserRouter, Routes, Route, useLocation, Navigate, Outlet } from "react-router-dom";
import { Toaster } from "sonner";
import { AuthProvider, useAuth } from "./context/AuthContext";
import { Navbar } from "./components/Navbar";
import { Footer } from "./components/Footer";
import { LoadingState } from "./components/states";

import Home from "./pages/Home";
import SearchPage from "./pages/Search";
import RecipeDetail from "./pages/RecipeDetail";
import Categories from "./pages/Categories";
import PlanMeal from "./pages/PlanMeal";
import CreatorLanding from "./pages/CreatorLanding";
import CreatorDashboard from "./pages/CreatorDashboard";
import RecipeBuilder from "./pages/RecipeBuilder";
import CreatorProfile from "./pages/CreatorProfile";
import Profile from "./pages/Profile";
import Saved from "./pages/Saved";
import Login from "./pages/Login";
import Register from "./pages/Register";
import Admin from "./pages/Admin";
import About from "./pages/About";
import AuthCallback from "./pages/AuthCallback";

function Layout() {
  return (
    <div className="App flex flex-col min-h-screen">
      <Navbar />
      <main className="flex-1">
        <Outlet />
      </main>
      <Footer />
    </div>
  );
}

function Protected({ children, roles }) {
  const { user, loading } = useAuth();
  if (loading) return <LoadingState label="Loading..." />;
  if (!user) return <Navigate to="/login" replace />;
  if (roles && !roles.includes(user.role)) return <Navigate to="/" replace />;
  return children;
}

function AppRouter() {
  const location = useLocation();
  if (location.hash?.includes("session_id=")) return <AuthCallback />;

  return (
    <Routes>
      <Route element={<Layout />}>
        <Route path="/" element={<Home />} />
        <Route path="/search" element={<SearchPage />} />
        <Route path="/recipe/:slug" element={<RecipeDetail />} />
        <Route path="/categories" element={<Categories />} />
        <Route path="/plan-meal" element={<PlanMeal />} />
        <Route path="/about" element={<About />} />
        <Route path="/creator" element={<CreatorLanding />} />
        <Route
          path="/creator/dashboard"
          element={<Protected roles={["creator", "admin"]}><CreatorDashboard /></Protected>}
        />
        <Route
          path="/creator/recipes/new"
          element={<Protected roles={["creator", "admin"]}><RecipeBuilder /></Protected>}
        />
        <Route
          path="/creator/recipes/:id/edit"
          element={<Protected roles={["creator", "admin"]}><RecipeBuilder /></Protected>}
        />
        <Route path="/creator/:slug" element={<CreatorProfile />} />
        <Route path="/profile" element={<Protected><Profile /></Protected>} />
        <Route path="/saved" element={<Protected><Saved /></Protected>} />
        <Route path="/admin" element={<Protected roles={["admin"]}><Admin /></Protected>} />
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Route>
    </Routes>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <AppRouter />
        <Toaster position="top-center" richColors />
      </BrowserRouter>
    </AuthProvider>
  );
}
