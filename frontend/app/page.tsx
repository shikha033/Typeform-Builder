import Link from "next/link";
import { TypeformLogo } from "@/components/Logo";

// Public home page (mirrors Typeform's hero). "Get started" -> login -> workspace at /forms.
export default function Home() {
  return (
    <div className="min-h-screen text-white" style={{ background: "#2a222b" }}>
      <header className="flex items-center justify-between px-6 md:px-[72px] pt-8">
        <Link href="/" aria-label="Typeform home">
          <TypeformLogo size={34} wordmark />
        </Link>
        <Link
          href="/login"
          className="h-[60px] px-8 rounded-2xl bg-[#faf9fb] text-ink text-xl font-medium inline-flex items-center hover:bg-white transition-colors"
          data-testid="home-signup"
        >
          Sign up
        </Link>
      </header>

      <section className="relative text-center px-6 pt-24 md:pt-28 pb-24 overflow-hidden">
        {/* purple glow behind the headline */}
        <div
          aria-hidden
          className="absolute left-1/2 top-24 -translate-x-[75%] w-[420px] h-[420px] rounded-full pointer-events-none"
          style={{ background: "radial-gradient(circle, rgba(166,70,200,0.75) 0%, rgba(166,70,200,0.25) 45%, transparent 70%)", filter: "blur(30px)" }}
        />
        <p className="relative text-[17px] md:text-lg font-semibold tracking-tight text-[#e6c9f5] mb-7">
          AI FORMS &amp; WORKFLOWS
        </p>
        <h1 className="relative font-hero text-[3.4rem] md:text-[6.2rem] leading-[0.98] max-w-[900px] mx-auto">
          <span style={{ background: "linear-gradient(90deg,#e8c9f7,#fff 70%)", WebkitBackgroundClip: "text", color: "transparent" }}>
            The form
          </span>{" "}
          is only{" "}
          <span style={{ background: "linear-gradient(90deg,#c58fe0,#f1e2f7)", WebkitBackgroundClip: "text", color: "transparent" }}>
            the
          </span>{" "}
          beginning
        </h1>
        <p className="relative mt-10 text-xl md:text-[1.7rem] leading-snug max-w-[760px] mx-auto">
          <span className="text-[#e6c9f5]">Collect</span>, analyze, and act on customer data with the complete
          platform for AI forms &amp; workflows.
        </p>
        <Link
          href="/login"
          className="relative mt-12 inline-flex items-center h-[72px] px-10 rounded-2xl bg-[#faf9fb] text-ink text-[1.4rem] font-medium hover:bg-white transition-colors"
          data-testid="get-started"
        >
          Get started—it&apos;s free
        </Link>
      </section>

      {/* product cards */}
      <section className="px-6 md:px-[72px] pb-24 grid gap-6 md:grid-cols-3">
        {[0, 1, 2].map((i) => (
          <div
            key={i}
            className="relative h-[360px] rounded-[32px] overflow-hidden border border-white/10"
            style={{ background: "linear-gradient(160deg,#2c242e,#2a222b)" }}
          >
            <div
              aria-hidden
              className="absolute -right-10 -top-10 w-[280px] h-[280px] rounded-full"
              style={{ background: "radial-gradient(circle, rgba(200,130,230,0.85), rgba(150,60,190,0.35) 55%, transparent 72%)", filter: "blur(10px)" }}
            />
            {i > 0 && (
              <div className="absolute left-[8%] right-[8%] top-[70px] bottom-0 rounded-t-3xl overflow-hidden flex" style={{ background: "#6b5a1f" }}>
                <div className="w-1/2 p-5">
                  <p className="text-sm font-semibold">Fit<i className="font-hero">Co</i></p>
                  <p className="mt-10 text-lg font-semibold leading-tight text-[#f6f0b5]">
                    {i === 1 ? "Rate your recent class" : "Share your email to get a free class"}
                  </p>
                </div>
                <div className="w-1/2" style={{ background: "linear-gradient(135deg,#c9a46b,#3b2b17)" }} />
              </div>
            )}
          </div>
        ))}
      </section>
    </div>
  );
}
