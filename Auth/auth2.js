// ----- Configure Supabase -----
import { createClient } from "https://cdn.jsdelivr.net/npm/@supabase/supabase-js/+esm";

const SUPABASE_URL  = "https://khqarcvszewerjckmtpg.supabase.co";
const SUPABASE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImtocWFyY3ZzemV3ZXJqY2ttdHBnIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDg3NTE5MTEsImV4cCI6MjA2NDMyNzkxMX0.d8_q1aI_I5pwNf73FIKxNo8Ok0KNxzF-SGDGegpRwbY";
const sb = createClient(SUPABASE_URL, SUPABASE_KEY);

// ----- DOM refs -----
window.addEventListener('DOMContentLoaded', () => {
  const signupForm = document.getElementById("signupForm");
  const loginForm  = document.getElementById("loginForm");
  const suMsg      = document.getElementById("suMsg");
  const liMsg      = document.getElementById("liMsg");

  // toggle helpers
  document.getElementById("toLogin").onclick = () => swap(true);
  document.getElementById("toSignup").onclick = () => swap(false);

  function swap(showLogin){
    signupForm.classList.toggle("hide", showLogin);
    loginForm .classList.toggle("hide", !showLogin);
    suMsg.textContent = liMsg.textContent = "";
  }

  /* ---------- Sign-up ---------- */
  signupForm.onsubmit = async (e) =>{
    e.preventDefault();
    const email = suEmail.value.trim();
    const pass  = suPass.value;
    const { error } = await sb.auth.signUp({ email, password: pass });
    suMsg.style.color = error ? "#c00" : "green";
    suMsg.textContent = error ? error.message : "Check your email to confirm!";
  }

  /* ---------- Log-in ---------- */
  loginForm.onsubmit = async (e) =>{
    e.preventDefault();
    const { error } = await sb.auth.signInWithPassword({
      email: liEmail.value.trim(),
      password: liPass.value
    });
    if(error){
      liMsg.textContent = error.message;
    }else{
      window.location.href = "../dashboard/dashboard.html";
    }
  }
});

/* ---------- Log-out helper (call from dashboard) ---------- */
export async function logout(){
  await sb.auth.signOut();
  window.location.href = "/";
}