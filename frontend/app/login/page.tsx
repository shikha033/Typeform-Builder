"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ChevronLeft, ChevronRight, Pause, Play } from "lucide-react";
import { toast } from "sonner";
import { TypeformLogo } from "@/components/Logo";

// Auth is mocked (the app assumes a default logged-in creator), but the screen mirrors Typeform's login.
const SLIDES = [
  { kicker: "Manage your audience", title: "Enrich and segment contacts automatically" },
  { kicker: "Collect responses", title: "Ask one question at a time and get more answers" },
  { kicker: "Understand results", title: "See every response and summary in one place" },
];

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [slide, setSlide] = useState(1);
  const [playing, setPlaying] = useState(true);

  useEffect(() => {
    if (!playing) return;
    const t = setInterval(() => setSlide((s) => (s + 1) % SLIDES.length), 5000);
    return () => clearInterval(t);
  }, [playing]);

  const enter = () => router.push("/forms");

  return (
    <div className="min-h-screen bg-white p-3 flex flex-col">
      <header className="h-12 flex items-center justify-between px-3 shrink-0">
        <TypeformLogo size={18} className="text-ink" />
        <span className="text-sm text-slate2">
          Don&apos;t have an account? <Link href="/forms" className="underline text-ink">Sign up</Link>
        </span>
      </header>

      <div className="flex-1 grid md:grid-cols-2 rounded-[20px] overflow-hidden">
        {/* Left: form */}
        <section className="bg-canvas flex items-center justify-center px-8 py-12">
          <div className="w-full max-w-[490px]">
            <h1 className="text-[1.7rem] font-normal text-ink mb-3" data-testid="login-title">Log in</h1>
            <p className="text-[15px] text-slate2 leading-snug mb-9 max-w-[420px]">
              Build forms, gather responses, and automate your workflows.
            </p>

            <button className="tf-auth-social is-focused mb-3.5" onClick={() => toast("Google sign-in is mocked")}>
              <GoogleG /> Continue with Google
            </button>
            <button className="tf-auth-social mb-7" onClick={() => toast("Microsoft sign-in is mocked")}>
              <MicrosoftLogo /> Continue with Microsoft
            </button>

            <label className="block text-[15px] text-slate2 mb-2" htmlFor="login-email">Email</label>
            <input
              id="login-email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && enter()}
              className="tf-auth-input mb-5"
              data-testid="login-email"
            />
            <button className="tf-auth-primary" onClick={enter} data-testid="login-continue">
              Continue with email
            </button>

            <div className="text-center mt-6">
              <button className="underline text-ink font-medium text-[15px]" onClick={() => toast("SSO is mocked")}>
                Log in with SSO
              </button>
            </div>
          </div>
        </section>

        {/* Right: product carousel on plum */}
        <section className="tf-auth-art hidden md:flex flex-col items-center justify-center px-10 py-12 rounded-none">
          <h2 className="text-[1.6rem] leading-snug text-center font-normal max-w-[520px] mb-12">
            Continue exploring powerful features that make data collection effortless
          </h2>

          <div className="relative w-full max-w-[600px] h-[330px]">
            <div className="tf-glass absolute left-0 right-0 top-0 bottom-0 px-8 pt-8 text-center"
                 style={{ borderColor: "rgba(190,140,215,0.55)", background: "linear-gradient(180deg,#352a38,#2b222d)" }}>
              <p className="text-[15px]">{SLIDES[slide].kicker}</p>
              <p className="text-[18px] font-semibold mt-1 mb-6">{SLIDES[slide].title}</p>
              <div className="mx-auto w-[88%] h-[190px] rounded-xl"
                   style={{ background: "radial-gradient(80% 90% at 50% 100%, #8b4a9b 0%, #3a2c40 70%)" }}>
                <div className="pt-6 text-left pl-6 text-[13px] opacity-90 max-w-[220px]">
                  <p className="font-semibold">Share your email to get a free class</p>
                  <div className="mt-3 bg-white/10 rounded px-2 py-1 text-[11px]">robin.smith@example.com</div>
                  <div className="mt-2 inline-block bg-[#d9f56b] text-ink rounded px-3 py-1 text-[11px] font-semibold">Submit</div>
                </div>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-5 mt-9">
            <button aria-label="Previous" onClick={() => setSlide((slide + SLIDES.length - 1) % SLIDES.length)}>
              <ChevronLeft size={20} />
            </button>
            <button aria-label={playing ? "Pause" : "Play"} onClick={() => setPlaying(!playing)}>
              {playing ? <Pause size={20} fill="currentColor" /> : <Play size={20} fill="currentColor" />}
            </button>
            <div className="flex items-center gap-2.5">
              {SLIDES.map((_, i) => (
                <span key={i} className={`w-2.5 h-2.5 rounded-full ${i === slide ? "bg-white" : "bg-white/35"}`} />
              ))}
            </div>
            <button aria-label="Next" onClick={() => setSlide((slide + 1) % SLIDES.length)}>
              <ChevronRight size={20} />
            </button>
          </div>
        </section>
      </div>
    </div>
  );
}

function GoogleG() {
  return (
    <svg width="26" height="26" viewBox="0 0 48 48" aria-hidden>
      <path fill="#EA4335" d="M24 9.5c3.5 0 6.6 1.2 9.1 3.6l6.8-6.8C35.8 2.4 30.3 0 24 0 14.6 0 6.5 5.4 2.6 13.2l7.9 6.1C12.4 13.6 17.7 9.5 24 9.5z"/>
      <path fill="#4285F4" d="M46.1 24.5c0-1.6-.1-3.1-.4-4.5H24v9h12.4c-.5 2.9-2.2 5.3-4.6 6.9l7.2 5.6c4.3-4 6.8-9.9 6.8-17z"/>
      <path fill="#FBBC05" d="M10.5 28.7a14.5 14.5 0 010-9.4l-7.9-6.1a24 24 0 000 21.6l7.9-6.1z"/>
      <path fill="#34A853" d="M24 48c6.5 0 11.9-2.1 15.9-5.8l-7.2-5.6c-2 1.4-4.6 2.2-8.7 2.2-6.3 0-11.6-4.1-13.5-9.8l-7.9 6.1C6.5 42.6 14.6 48 24 48z"/>
    </svg>
  );
}

function MicrosoftLogo() {
  return (
    <svg width="26" height="26" viewBox="0 0 24 24" aria-hidden>
      <rect x="2" y="2" width="9.5" height="9.5" fill="#F25022" />
      <rect x="12.5" y="2" width="9.5" height="9.5" fill="#7FBA00" />
      <rect x="2" y="12.5" width="9.5" height="9.5" fill="#00A4EF" />
      <rect x="12.5" y="12.5" width="9.5" height="9.5" fill="#FFB900" />
    </svg>
  );
}
