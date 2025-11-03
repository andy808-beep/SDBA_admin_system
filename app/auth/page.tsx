"use client";

import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabaseClient";

export default function AuthPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isSignUp, setIsSignUp] = useState(false);
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);

  // Debug: Log environment variables on mount
  useEffect(() => {
    console.log("=== Auth Page Debug ===");
    console.log("Supabase URL:", process.env.NEXT_PUBLIC_SUPABASE_URL);
    console.log("Has Anon Key:", !!process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY);
    console.log("Anon Key length:", process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY?.length);
  }, []);

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setMessage("");

    try {
      console.log("Starting auth request...");
      
      if (isSignUp) {
        // Sign up via server API (bypasses CORS)
        const response = await fetch("/api/auth/signup", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ email, password }),
        });

        const result = await response.json();

        if (!response.ok) {
          throw new Error(result.error || "Sign up failed");
        }

        setMessage(result.message || "Sign up successful! You can now log in.");
      } else {
        // Sign in via server API (bypasses CORS)
        const response = await fetch("/api/auth/signin", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ email, password }),
        });

        const result = await response.json();

        if (!response.ok) {
          throw new Error(result.error || "Login failed");
        }

        setMessage("Login successful! Redirecting to admin...");
        setTimeout(() => {
          window.location.href = "/admin";
        }, 1000);
      }
    } catch (error: any) {
      setMessage(`Error: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    setMessage("Logged out successfully");
  };

  return (
    <div style={{ 
      minHeight: "100vh", 
      display: "flex", 
      alignItems: "center", 
      justifyContent: "center",
      background: "linear-gradient(135deg, #667eea 0%, #764ba2 100%)"
    }}>
      <div style={{ 
        background: "white", 
        padding: "40px", 
        borderRadius: "12px", 
        boxShadow: "0 10px 40px rgba(0,0,0,0.1)",
        width: "400px",
        maxWidth: "90%"
      }}>
        <h1 style={{ 
          textAlign: "center", 
          marginBottom: "30px",
          color: "#333",
          fontSize: "28px",
          fontWeight: "600"
        }}>
          {isSignUp ? "Create Admin Account" : "Admin Login"}
        </h1>

        <form onSubmit={handleAuth}>
          <div style={{ marginBottom: "20px" }}>
            <label style={{ 
              display: "block", 
              marginBottom: "8px",
              color: "#555",
              fontWeight: "500"
            }}>
              Email
            </label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              style={{
                width: "100%",
                padding: "12px",
                border: "1px solid #ddd",
                borderRadius: "6px",
                fontSize: "14px",
                boxSizing: "border-box"
              }}
              placeholder="admin@example.com"
            />
          </div>

          <div style={{ marginBottom: "20px" }}>
            <label style={{ 
              display: "block", 
              marginBottom: "8px",
              color: "#555",
              fontWeight: "500"
            }}>
              Password
            </label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              minLength={6}
              style={{
                width: "100%",
                padding: "12px",
                border: "1px solid #ddd",
                borderRadius: "6px",
                fontSize: "14px",
                boxSizing: "border-box"
              }}
              placeholder="••••••••"
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            style={{
              width: "100%",
              padding: "12px",
              background: loading ? "#ccc" : "linear-gradient(135deg, #667eea 0%, #764ba2 100%)",
              color: "white",
              border: "none",
              borderRadius: "6px",
              fontSize: "16px",
              fontWeight: "600",
              cursor: loading ? "not-allowed" : "pointer",
              marginBottom: "15px"
            }}
          >
            {loading ? "Processing..." : isSignUp ? "Sign Up" : "Log In"}
          </button>
        </form>

        <button
          onClick={() => {
            setIsSignUp(!isSignUp);
            setMessage("");
          }}
          style={{
            width: "100%",
            padding: "10px",
            background: "transparent",
            color: "#667eea",
            border: "none",
            cursor: "pointer",
            fontSize: "14px",
            textDecoration: "underline"
          }}
        >
          {isSignUp
            ? "Already have an account? Log in"
            : "Don't have an account? Sign up"}
        </button>

        {message && (
          <div
            style={{
              marginTop: "20px",
              padding: "12px",
              background: message.includes("Error") ? "#fee" : "#efe",
              color: message.includes("Error") ? "#c33" : "#363",
              borderRadius: "6px",
              fontSize: "14px",
              textAlign: "center"
            }}
          >
            {message}
          </div>
        )}

        <div style={{ 
          marginTop: "30px", 
          paddingTop: "20px", 
          borderTop: "1px solid #eee",
          textAlign: "center"
        }}>
          <button
            onClick={handleLogout}
            style={{
              background: "transparent",
              color: "#999",
              border: "none",
              cursor: "pointer",
              fontSize: "13px",
              textDecoration: "underline"
            }}
          >
            Logout
          </button>
        </div>
      </div>
    </div>
  );
}
