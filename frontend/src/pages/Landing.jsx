import { useNavigate } from "react-router-dom";
import { useState, useEffect, useRef } from "react";

const ACCENT = "#6366F1";
const ACCENT_LIGHT = "rgba(99,102,241,0.1)";
const ACCENT_BORDER = "rgba(99,102,241,0.25)";
const NAVY = "#0B1736";
const BG = "#F8F9FC";

// ── Navbar ────────────────────────────────────────────────────
function NavBar() {
    const [scrolled, setScrolled] = useState(false);
    const nav = useNavigate();

    useEffect(() => {
        const handler = () => setScrolled(window.scrollY > 40);
        window.addEventListener("scroll", handler);
        return () => window.removeEventListener("scroll", handler);
    }, []);

    return (
        <header style={{
            position: "fixed", top: 0, left: 0, right: 0, zIndex: 100,
            padding: scrolled ? "12px 48px" : "24px 48px",
            display: "flex", alignItems: "center", justifyContent: "space-between",
            backdropFilter: scrolled ? "blur(12px)" : "none",
            background: scrolled ? "rgba(248,249,252,0.92)" : "transparent",
            borderBottom: scrolled ? "1px solid rgba(0,0,0,0.08)" : "none",
            transition: "all 0.3s ease",
        }}>
            <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
                <span style={{ fontFamily: "'Space Grotesk', sans-serif", fontWeight: 700, fontSize: 20, color: NAVY, letterSpacing: "-0.02em" }}>AEGIS</span>
                <span style={{ fontFamily: "'Space Grotesk', sans-serif", fontWeight: 700, fontSize: 20, color: ACCENT }}>AI</span>
            </div>

            <nav style={{ display: "flex", alignItems: "center", gap: 32 }}>
                {["How it works", "Why Aegis"].map(label => (
                    <a key={label} href={`#${label.toLowerCase().replace(/ /g, "-")}`}
                        style={{ fontFamily: "'Inter', sans-serif", fontSize: 14, color: "#555", textDecoration: "none", transition: "color 0.2s" }}
                        onMouseEnter={e => e.target.style.color = NAVY}
                        onMouseLeave={e => e.target.style.color = "#555"}
                    >{label}</a>
                ))}
                <button onClick={() => nav("/login")}
                    style={{ fontFamily: "'Inter', sans-serif", fontSize: 14, color: "#555", background: "none", border: "none", cursor: "pointer", padding: 0, transition: "color 0.2s" }}
                    onMouseEnter={e => e.target.style.color = NAVY}
                    onMouseLeave={e => e.target.style.color = "#555"}
                >Log in</button>
                <button onClick={() => nav("/register")}
                    style={{
                        fontFamily: "'Inter', sans-serif", fontSize: 14, fontWeight: 600,
                        color: "#fff", background: ACCENT,
                        border: "none", borderRadius: 6, padding: "9px 20px", cursor: "pointer",
                        transition: "transform 0.15s, box-shadow 0.15s",
                    }}
                    onMouseEnter={e => { e.currentTarget.style.transform = "translateY(-1px)"; e.currentTarget.style.boxShadow = `0 4px 16px rgba(99,102,241,0.4)`; }}
                    onMouseLeave={e => { e.currentTarget.style.transform = "none"; e.currentTarget.style.boxShadow = "none"; }}
                >Get Started</button>
            </nav>
        </header>
    );
}

// ── Gateway Card ──────────────────────────────────────────────
function GatewayCard() {
    const [stage, setStage] = useState(0);

    useEffect(() => {
        const t1 = setTimeout(() => setStage(1), 1200);
        const t2 = setTimeout(() => setStage(2), 2600);
        const t3 = setTimeout(() => setStage(0), 5500);
        return () => [t1, t2, t3].forEach(clearTimeout);
    }, [stage]);

    const status = stage === 0 ? null : stage === 1 ? "evaluating" : "paused";

    return (
        <div style={{
            background: "#fff",
            border: "1px solid rgba(0,0,0,0.1)",
            borderRadius: 14, padding: "28px 32px", width: 320,
            boxShadow: "0 20px 60px rgba(0,0,0,0.1)",
            fontFamily: "'Space Grotesk', sans-serif",
        }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 22 }}>
                <span style={{ fontSize: 10, letterSpacing: "0.1em", color: ACCENT, fontWeight: 600, textTransform: "uppercase" }}>Runtime Gateway</span>
                <span style={{
                    fontSize: 10, padding: "3px 8px", borderRadius: 4, fontWeight: 600,
                    textTransform: "uppercase", letterSpacing: "0.07em", transition: "all 0.4s",
                    background: status === "paused" ? "rgba(239,68,68,0.1)" : status === "evaluating" ? ACCENT_LIGHT : "rgba(0,0,0,0.05)",
                    color: status === "paused" ? "#dc2626" : status === "evaluating" ? ACCENT : "#999",
                }}>
                    {status === "paused" ? "⚠ Paused" : status === "evaluating" ? "● Evaluating" : "● Monitoring"}
                </span>
            </div>

            <div style={{ marginBottom: 18 }}>
                <div style={{ fontSize: 11, color: "#999", marginBottom: 3 }}>Agent</div>
                <div style={{ fontSize: 15, fontWeight: 600, color: NAVY }}>Customer Refund Agent</div>
                <div style={{ fontSize: 12, color: ACCENT, marginTop: 2 }}>process_refund</div>
            </div>

            {[
                { label: "Amount", value: "₹30,000", highlight: false },
                { label: "Risk Score", value: status === "evaluating" || status === "paused" ? "92" : "—", highlight: status === "paused" },
                { label: "Policy", value: status === "paused" ? "Refund Limit" : "—", highlight: false },
            ].map(({ label, value, highlight }) => (
                <div key={label} style={{ display: "flex", justifyContent: "space-between", padding: "10px 0", borderBottom: "1px solid rgba(0,0,0,0.06)" }}>
                    <span style={{ fontSize: 13, color: "#777" }}>{label}</span>
                    <span style={{ fontSize: 13, fontWeight: 600, color: highlight ? "#dc2626" : NAVY, transition: "color 0.4s" }}>{value}</span>
                </div>
            ))}

            <div style={{ marginTop: 18, textAlign: "center" }}>
                {status === "paused" ? (
                    <div style={{ background: "rgba(239,68,68,0.06)", border: "1px solid rgba(239,68,68,0.2)", borderRadius: 8, padding: "12px 0" }}>
                        <div style={{ fontSize: 13, fontWeight: 700, color: "#dc2626" }}>Action Paused</div>
                        <div style={{ fontSize: 11, color: "#999", marginTop: 4 }}>Awaiting admin approval</div>
                    </div>
                ) : status === "evaluating" ? (
                    <div style={{ background: ACCENT_LIGHT, border: `1px solid ${ACCENT_BORDER}`, borderRadius: 8, padding: "12px 0" }}>
                        <div style={{ fontSize: 13, fontWeight: 600, color: ACCENT }}>Evaluating request…</div>
                    </div>
                ) : (
                    <div style={{ padding: "12px 0" }}>
                        <div style={{ fontSize: 12, color: "#bbb" }}>Monitoring for requests</div>
                    </div>
                )}
            </div>

            <div style={{ display: "flex", alignItems: "center", gap: 6, marginTop: 16 }}>
                <div style={{ width: 6, height: 6, borderRadius: "50%", background: "#22c55e" }} />
                <span style={{ fontSize: 11, color: "#aaa" }}>Audit trail recording</span>
            </div>
        </div>
    );
}

// ── Floating chip ─────────────────────────────────────────────
function FloatingChip({ children, style }) {
    return (
        <div style={{
            position: "absolute",
            background: "#fff",
            border: "1px solid rgba(0,0,0,0.09)",
            borderRadius: 8, padding: "8px 14px",
            fontFamily: "'Space Grotesk', sans-serif",
            fontSize: 11, color: "#555",
            whiteSpace: "nowrap",
            boxShadow: "0 4px 20px rgba(0,0,0,0.08)",
            ...style,
        }}>
            {children}
        </div>
    );
}

// ── Hero ──────────────────────────────────────────────────────
function Hero() {
    const nav = useNavigate();
    return (
        <section style={{
            minHeight: "100vh",
            background: BG,
            display: "flex", alignItems: "center",
            padding: "120px 48px 80px",
            position: "relative", overflow: "hidden",
        }}>
            <div style={{
                position: "absolute", inset: 0, opacity: 0.5,
                backgroundImage: "radial-gradient(circle, #d0d5e8 1px, transparent 1px)",
                backgroundSize: "32px 32px",
                pointerEvents: "none",
            }} />

            {/* left */}
            <div style={{ flex: 1, maxWidth: 540, position: "relative", zIndex: 2 }}>
                <div style={{
                    display: "inline-block",
                    background: ACCENT_LIGHT,
                    border: `1px solid ${ACCENT_BORDER}`,
                    borderRadius: 20, padding: "5px 14px", marginBottom: 28,
                }}>
                    <span style={{ fontFamily: "'Inter', sans-serif", fontSize: 12, color: ACCENT, fontWeight: 500 }}>
                        AI Security & Governance
                    </span>
                </div>

                <h1 style={{
                    fontFamily: "'Space Grotesk', sans-serif", fontWeight: 700,
                    fontSize: "clamp(38px, 4.5vw, 58px)", lineHeight: 1.1,
                    letterSpacing: "-0.03em", color: NAVY,
                    margin: "0 0 22px",
                }}>
                    AI agents can act<br />on their own.<br />
                    <span style={{ color: ACCENT }}>Your security shouldn't.</span>
                </h1>

                <p style={{
                    fontFamily: "'Inter', sans-serif", fontSize: 17, lineHeight: 1.7,
                    color: "#555", maxWidth: 460, margin: "0 0 36px",
                }}>
                    Aegis AI gives organizations visibility, control, and accountability
                    over every AI agent, tool, and action — before risk becomes an incident.
                </p>

                <div style={{ display: "flex", gap: 16, alignItems: "center" }}>
                    <button onClick={() => nav("/register")} style={{
                        fontFamily: "'Inter', sans-serif", fontWeight: 600, fontSize: 15,
                        color: "#fff", background: ACCENT,
                        border: "none", borderRadius: 8, padding: "14px 28px", cursor: "pointer",
                        transition: "transform 0.15s, box-shadow 0.15s",
                    }}
                        onMouseEnter={e => { e.currentTarget.style.transform = "translateY(-2px)"; e.currentTarget.style.boxShadow = "0 8px 24px rgba(99,102,241,0.4)"; }}
                        onMouseLeave={e => { e.currentTarget.style.transform = "none"; e.currentTarget.style.boxShadow = "none"; }}
                    >Get Started</button>

                    <a href="#how-it-works" style={{
                        fontFamily: "'Inter', sans-serif", fontSize: 15,
                        color: "#777", textDecoration: "none", transition: "color 0.2s",
                    }}
                        onMouseEnter={e => e.target.style.color = NAVY}
                        onMouseLeave={e => e.target.style.color = "#777"}
                    >Explore the platform ↓</a>
                </div>

                <div style={{ display: "flex", gap: 40, marginTop: 60, paddingTop: 32, borderTop: "1px solid rgba(0,0,0,0.08)" }}>
                    {[
                        { num: "12", label: "Agents monitored" },
                        { num: "98%", label: "Actions evaluated" },
                        { num: "0", label: "Unreviewed escalations" },
                    ].map(({ num, label }) => (
                        <div key={label}>
                            <div style={{ fontFamily: "'Space Grotesk', sans-serif", fontSize: 28, fontWeight: 700, color: NAVY }}>{num}</div>
                            <div style={{ fontFamily: "'Inter', sans-serif", fontSize: 12, color: "#999", marginTop: 2 }}>{label}</div>
                        </div>
                    ))}
                </div>
            </div>

            {/* right */}
            <div style={{ flex: 1, display: "flex", justifyContent: "center", position: "relative", zIndex: 2 }}>
                <div style={{ position: "relative" }}>
                    <GatewayCard />
                    <FloatingChip style={{ top: -18, right: -70, animation: "floatA 4s ease-in-out infinite" }}>
                        <span style={{ color: "#22c55e", marginRight: 5 }}>●</span>Risk Engine Active
                    </FloatingChip>
                    <FloatingChip style={{ bottom: 70, left: -90, animation: "floatB 4s ease-in-out infinite" }}>
                        ● Audit Trail Recording
                    </FloatingChip>
                    <FloatingChip style={{ bottom: -10, right: -50, animation: "floatA 4s ease-in-out infinite 1s" }}>
                        12 Agents Monitored
                    </FloatingChip>
                </div>
            </div>

            <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@400;600;700&family=Inter:wght@400;500;600&display=swap');
        @keyframes floatA { 0%,100% { transform: translateY(0); } 50% { transform: translateY(-8px); } }
        @keyframes floatB { 0%,100% { transform: translateY(0); } 50% { transform: translateY(6px); } }
        * { box-sizing: border-box; }
        body { margin: 0; }
      `}</style>
        </section>
    );
}

// ── Process step card ─────────────────────────────────────────
function ProcessStep({ number, title, description, visual }) {
    return (
        <div style={{
            display: "flex", flexDirection: "column", gap: 20,
            background: "#fff", border: "1px solid rgba(99,102,241,0.12)",
            borderRadius: 14, padding: "32px 28px",
            transition: "transform 0.2s, box-shadow 0.2s",
        }}
            onMouseEnter={e => { e.currentTarget.style.transform = "translateY(-4px)"; e.currentTarget.style.boxShadow = "0 16px 48px rgba(99,102,241,0.12)"; }}
            onMouseLeave={e => { e.currentTarget.style.transform = "none"; e.currentTarget.style.boxShadow = "none"; }}
        >
            <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between" }}>
                <span style={{
                    fontFamily: "'Space Grotesk', sans-serif", fontSize: 13, fontWeight: 700,
                    color: ACCENT, letterSpacing: "0.04em",
                }}>{number}</span>
            </div>
            <div>
                <div style={{ fontFamily: "'Space Grotesk', sans-serif", fontSize: 20, fontWeight: 700, color: NAVY, marginBottom: 10 }}>{title}</div>
                <div style={{ fontFamily: "'Inter', sans-serif", fontSize: 14, lineHeight: 1.65, color: "#666" }}>{description}</div>
            </div>
            <div style={{
                background: "#F8F9FC", border: "1px solid rgba(0,0,0,0.06)",
                borderRadius: 10, padding: "20px",
                fontFamily: "'Space Grotesk', sans-serif",
            }}>
                {visual}
            </div>
        </div>
    );
}

// ── Process section ───────────────────────────────────────────
function Process() {
    return (
        <section id="how-it-works" style={{
            background: BG, padding: "100px 48px",
            borderTop: "1px solid rgba(0,0,0,0.06)",
        }}>
            {/* heading */}
            <div style={{ maxWidth: 560, marginBottom: 64, margin: "0 auto 64px", textAlign: "center" }}>
                <div style={{
                    display: "inline-block",
                    background: ACCENT_LIGHT, border: `1px solid ${ACCENT_BORDER}`,
                    borderRadius: 20, padding: "5px 14px", marginBottom: 20,
                }}>
                    <span style={{ fontFamily: "'Inter', sans-serif", fontSize: 12, color: ACCENT, fontWeight: 500 }}>How it works</span>
                </div>
                <h2 style={{
                    fontFamily: "'Space Grotesk', sans-serif", fontWeight: 700,
                    fontSize: "clamp(30px, 3.5vw, 44px)", lineHeight: 1.15,
                    letterSpacing: "-0.025em", color: NAVY, margin: "0 0 16px",
                }}>
                    From AI action to<br />accountable decision.
                </h2>
                <p style={{ fontFamily: "'Inter', sans-serif", fontSize: 16, lineHeight: 1.7, color: "#666", margin: 0 }}>
                    Every agent action passes through the same controlled path before it reaches your systems.
                </p>
            </div>


            {/* three cards */}
            <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 24 }}>

                {/* 1 — Discover */}
                <ProcessStep
                    number="01 — Discover"
                    title="Know what's acting."
                    description="Aegis maps your AI agents, models, tools, APIs, and dependencies into one centralized inventory."
                    visual={
                        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                            {[
                                { label: "Customer Refund Agent", type: "Agent", color: ACCENT },
                                { label: "process_refund", type: "Tool", color: "#3B6FD8" },
                                { label: "payments-api", type: "API", color: "#0B1736" },
                                { label: "orders_db", type: "Database", color: "#555" },
                            ].map(({ label, type, color }) => (
                                <div key={label} style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                                    <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                                        <div style={{ width: 6, height: 6, borderRadius: "50%", background: color, flexShrink: 0 }} />
                                        <span style={{ fontFamily: "'Inter', sans-serif", fontSize: 12, color: "#444" }}>{label}</span>
                                    </div>
                                    <span style={{
                                        fontFamily: "'Space Grotesk', sans-serif", fontSize: 10, fontWeight: 600,
                                        color, background: `${color}14`, borderRadius: 4, padding: "2px 7px",
                                    }}>{type}</span>
                                </div>
                            ))}
                        </div>
                    }
                />

                {/* 2 — Evaluate */}
                <ProcessStep
                    number="02 — Evaluate"
                    title="Know what it's about to do."
                    description="Every agent action is checked for risk and policy violations before it executes."
                    visual={<EvaluateVisual />}
                />

                {/* 3 — Control */}
                <ProcessStep
                    number="03 — Control"
                    title="Know who allowed it."
                    description="Low-risk actions proceed automatically. High-risk actions pause for human approval. Every outcome is recorded."
                    visual={
                        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                            {[
                                { action: "query_customer_data", risk: 18, verdict: "Allowed", verdictColor: "#16a34a", verdictBg: "rgba(22,163,74,0.08)" },
                                { action: "send_notification", risk: 12, verdict: "Allowed", verdictColor: "#16a34a", verdictBg: "rgba(22,163,74,0.08)" },
                                { action: "process_refund", risk: 92, verdict: "Paused", verdictColor: "#dc2626", verdictBg: "rgba(220,38,38,0.08)" },
                            ].map(({ action, risk, verdict, verdictColor, verdictBg }) => (
                                <div key={action} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "6px 0", borderBottom: "1px solid rgba(0,0,0,0.05)" }}>
                                    <div>
                                        <div style={{ fontFamily: "'Space Grotesk', sans-serif", fontSize: 11, fontWeight: 600, color: "#333" }}>{action}</div>
                                        <div style={{ fontFamily: "'Inter', sans-serif", fontSize: 10, color: "#999", marginTop: 1 }}>Risk {risk}</div>
                                    </div>
                                    <span style={{
                                        fontFamily: "'Space Grotesk', sans-serif", fontSize: 10, fontWeight: 700,
                                        color: verdictColor, background: verdictBg,
                                        borderRadius: 4, padding: "3px 8px",
                                    }}>{verdict}</span>
                                </div>
                            ))}
                        </div>
                    }
                />
            </div>
        </section>
    );
}

// ── Evaluate visual (animated) ────────────────────────────────
function EvaluateVisual() {
    const [score, setScore] = useState(0);
    const [active, setActive] = useState(false);

    return (
        <div
            onMouseEnter={() => { setActive(true); let i = 0; const t = setInterval(() => { i += 4; setScore(Math.min(i, 92)); if (i >= 92) clearInterval(t); }, 20); }}
            onMouseLeave={() => { setActive(false); setScore(0); }}
            style={{ cursor: "default" }}
        >
            {[
                { label: "Action", value: "process_refund", mono: true },
                { label: "Amount", value: "₹30,000", mono: false },
            ].map(({ label, value, mono }) => (
                <div key={label} style={{ display: "flex", justifyContent: "space-between", padding: "7px 0", borderBottom: "1px solid rgba(0,0,0,0.05)" }}>
                    <span style={{ fontFamily: "'Inter', sans-serif", fontSize: 12, color: "#888" }}>{label}</span>
                    <span style={{ fontFamily: mono ? "'Space Grotesk', sans-serif" : "'Inter', sans-serif", fontSize: 12, fontWeight: 600, color: "#333" }}>{value}</span>
                </div>
            ))}

            {/* risk bar */}
            <div style={{ marginTop: 14 }}>
                <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 6 }}>
                    <span style={{ fontFamily: "'Inter', sans-serif", fontSize: 12, color: "#888" }}>Risk Score</span>
                    <span style={{ fontFamily: "'Space Grotesk', sans-serif", fontSize: 13, fontWeight: 700, color: score > 70 ? "#dc2626" : ACCENT }}>{score}</span>
                </div>
                <div style={{ height: 5, background: "rgba(0,0,0,0.07)", borderRadius: 3, overflow: "hidden" }}>
                    <div style={{
                        height: "100%", borderRadius: 3, transition: "width 0.05s linear",
                        width: `${score}%`,
                        background: score > 70 ? "#dc2626" : ACCENT,
                    }} />
                </div>
                <div style={{ fontFamily: "'Inter', sans-serif", fontSize: 10, color: "#bbb", marginTop: 8, textAlign: "center" }}>
                    {active ? "Hover to reset" : "Hover to simulate evaluation"}
                </div>
            </div>

            {/* policy */}
            {score >= 92 && (
                <div style={{
                    marginTop: 12, background: "rgba(220,38,38,0.06)",
                    border: "1px solid rgba(220,38,38,0.2)", borderRadius: 6, padding: "8px 12px",
                    fontFamily: "'Space Grotesk', sans-serif", fontSize: 11, color: "#dc2626", fontWeight: 600,
                }}>
                    Policy violation: Refund Limit
                </div>
            )}
        </div>
    );
}

// ── Why Aegis section ─────────────────────────────────────────
function WhyAegis() {
    return (
        <section id="why-aegis" style={{
            background: "#fff", padding: "100px 48px",
            borderTop: "1px solid rgba(0,0,0,0.06)",
        }}>
            {/* heading */}
            <div style={{ maxWidth: 600, margin: "0 auto 72px", textAlign: "center" }}>
                <div style={{
                    display: "inline-block",
                    background: ACCENT_LIGHT, border: `1px solid ${ACCENT_BORDER}`,
                    borderRadius: 20, padding: "5px 14px", marginBottom: 20,
                }}>
                    <span style={{ fontFamily: "'Inter', sans-serif", fontSize: 12, color: ACCENT, fontWeight: 500 }}>Why Aegis</span>
                </div>
                <h2 style={{
                    fontFamily: "'Space Grotesk', sans-serif", fontWeight: 700,
                    fontSize: "clamp(30px, 3.5vw, 44px)", lineHeight: 1.15,
                    letterSpacing: "-0.025em", color: NAVY, margin: "0 0 16px",
                }}>
                    AI governance shouldn't begin<br />after something goes wrong.
                </h2>
                <p style={{ fontFamily: "'Inter', sans-serif", fontSize: 16, lineHeight: 1.7, color: "#666", margin: 0 }}>
                    Aegis sits between your agents and the real world — evaluating every action before it executes.
                </p>
            </div>

            {/* three feature blocks */}
            <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 24, maxWidth: 1200, margin: "0 auto" }}>

                {/* 1 — Runtime Protection */}
                <div style={{
                    background: BG, border: "1px solid rgba(0,0,0,0.07)",
                    borderRadius: 14, padding: "32px 28px", display: "flex", flexDirection: "column", gap: 20,
                }}>
                    <div>
                        <div style={{ fontFamily: "'Space Grotesk', sans-serif", fontSize: 18, fontWeight: 700, color: NAVY, marginBottom: 10 }}>
                            Runtime Protection
                        </div>
                        <div style={{ fontFamily: "'Inter', sans-serif", fontSize: 14, lineHeight: 1.6, color: "#666" }}>
                            Stop risky actions before they execute. Aegis evaluates every tool call at runtime, not after the fact.
                        </div>
                    </div>
                    {/* visual — request approaching gateway */}
                    <div style={{
                        background: "#fff", border: "1px solid rgba(0,0,0,0.07)",
                        borderRadius: 10, padding: "20px",
                        display: "flex", flexDirection: "column", gap: 10,
                    }}>
                        {[
                            { label: "Agent request", status: "incoming", color: "#3B6FD8" },
                            { label: "Gateway intercept", status: "active", color: ACCENT },
                            { label: "Risk evaluated", status: "done", color: "#16a34a" },
                        ].map(({ label, status, color }, i) => (
                            <div key={label} style={{ display: "flex", alignItems: "center", gap: 10 }}>
                                <div style={{
                                    width: 28, height: 28, borderRadius: "50%", flexShrink: 0,
                                    background: `${color}14`, border: `1px solid ${color}40`,
                                    display: "flex", alignItems: "center", justifyContent: "center",
                                }}>
                                    <div style={{ width: 8, height: 8, borderRadius: "50%", background: color }} />
                                </div>
                                <div style={{ flex: 1 }}>
                                    <div style={{ fontFamily: "'Space Grotesk', sans-serif", fontSize: 12, fontWeight: 600, color: "#333" }}>{label}</div>
                                </div>
                                {i < 2 && (
                                    <div style={{ position: "absolute", left: 34, marginTop: 28, width: 1, height: 10, background: "rgba(0,0,0,0.1)" }} />
                                )}
                            </div>
                        ))}
                    </div>
                </div>

                {/* 2 — Human Control */}
                <div style={{
                    background: BG, border: "1px solid rgba(0,0,0,0.07)",
                    borderRadius: 14, padding: "32px 28px", display: "flex", flexDirection: "column", gap: 20,
                }}>
                    <div>
                        <div style={{ fontFamily: "'Space Grotesk', sans-serif", fontSize: 18, fontWeight: 700, color: NAVY, marginBottom: 10 }}>
                            Human Control
                        </div>
                        <div style={{ fontFamily: "'Inter', sans-serif", fontSize: 14, lineHeight: 1.6, color: "#666" }}>
                            Low-risk actions proceed automatically. High-risk decisions pause for a human before anything happens.
                        </div>
                    </div>
                    {/* visual — approval card */}
                    <ApprovalCard />
                </div>

                {/* 3 — Evidence */}
                <div style={{
                    background: BG, border: "1px solid rgba(0,0,0,0.07)",
                    borderRadius: 14, padding: "32px 28px", display: "flex", flexDirection: "column", gap: 20,
                }}>
                    <div>
                        <div style={{ fontFamily: "'Space Grotesk', sans-serif", fontSize: 18, fontWeight: 700, color: NAVY, marginBottom: 10 }}>
                            Evidence, Not Assumptions
                        </div>
                        <div style={{ fontFamily: "'Inter', sans-serif", fontSize: 14, lineHeight: 1.6, color: "#666" }}>
                            Every decision leaves a trail. Investigate outcomes and answer compliance questions from one audit log.
                        </div>
                    </div>
                    {/* visual — audit timeline */}
                    <AuditTimeline />
                </div>

            </div>
        </section>
    );
}

// ── Approval card (interactive) ───────────────────────────────
function ApprovalCard() {
    const [state, setState] = useState("pending"); // pending | approved | denied

    return (
        <div style={{
            background: "#fff", border: "1px solid rgba(0,0,0,0.07)",
            borderRadius: 10, padding: "18px 20px",
        }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14 }}>
                <span style={{ fontFamily: "'Space Grotesk', sans-serif", fontSize: 11, fontWeight: 600, color: ACCENT, letterSpacing: "0.06em" }}>
                    APPROVAL REQUIRED
                </span>
                <span style={{
                    fontFamily: "'Space Grotesk', sans-serif", fontSize: 10, fontWeight: 700,
                    padding: "2px 8px", borderRadius: 4,
                    background: state === "pending" ? "rgba(220,38,38,0.08)" : state === "approved" ? "rgba(22,163,74,0.08)" : "rgba(0,0,0,0.06)",
                    color: state === "pending" ? "#dc2626" : state === "approved" ? "#16a34a" : "#666",
                    transition: "all 0.3s",
                }}>
                    {state === "pending" ? "● High Risk" : state === "approved" ? "✓ Approved" : "✕ Denied"}
                </span>
            </div>

            <div style={{ fontFamily: "'Space Grotesk', sans-serif", fontSize: 14, fontWeight: 600, color: NAVY, marginBottom: 4 }}>
                Customer Refund Agent
            </div>
            <div style={{ fontFamily: "'Inter', sans-serif", fontSize: 12, color: "#777", marginBottom: 14 }}>
                process_refund · ₹30,000 · Risk 92
            </div>

            {state === "pending" ? (
                <div style={{ display: "flex", gap: 8 }}>
                    <button onClick={() => setState("approved")} style={{
                        flex: 1, fontFamily: "'Inter', sans-serif", fontSize: 12, fontWeight: 600,
                        color: "#fff", background: "#16a34a", border: "none",
                        borderRadius: 6, padding: "9px 0", cursor: "pointer",
                        transition: "opacity 0.15s",
                    }}
                        onMouseEnter={e => e.currentTarget.style.opacity = "0.85"}
                        onMouseLeave={e => e.currentTarget.style.opacity = "1"}
                    >Approve</button>
                    <button onClick={() => setState("denied")} style={{
                        flex: 1, fontFamily: "'Inter', sans-serif", fontSize: 12, fontWeight: 600,
                        color: "#dc2626", background: "rgba(220,38,38,0.08)", border: "1px solid rgba(220,38,38,0.2)",
                        borderRadius: 6, padding: "9px 0", cursor: "pointer",
                        transition: "opacity 0.15s",
                    }}
                        onMouseEnter={e => e.currentTarget.style.opacity = "0.75"}
                        onMouseLeave={e => e.currentTarget.style.opacity = "1"}
                    >Deny</button>
                </div>
            ) : (
                <button onClick={() => setState("pending")} style={{
                    width: "100%", fontFamily: "'Inter', sans-serif", fontSize: 12,
                    color: "#999", background: "none", border: "1px solid rgba(0,0,0,0.1)",
                    borderRadius: 6, padding: "9px 0", cursor: "pointer",
                }}>Reset</button>
            )}
        </div>
    );
}

// ── Audit timeline (scroll-reveal) ───────────────────────────
function AuditTimeline() {
    const [visible, setVisible] = useState(0);
    const ref = useRef(null);

    const events = [
        { time: "14:32:01", text: "Agent requested process_refund", color: "#3B6FD8" },
        { time: "14:32:01", text: "Risk score calculated — 92", color: ACCENT },
        { time: "14:32:02", text: "Policy violation: Refund Limit", color: "#dc2626" },
        { time: "14:32:02", text: "Escalated for admin approval", color: "#c47f00" },
        { time: "14:33:15", text: "Admin approved the action", color: "#16a34a" },
    ];

    useEffect(() => {
        const observer = new IntersectionObserver(
            ([entry]) => { if (entry.isIntersecting) { let i = 0; const t = setInterval(() => { i++; setVisible(i); if (i >= events.length) clearInterval(t); }, 300); } },
            { threshold: 0.3 }
        );
        if (ref.current) observer.observe(ref.current);
        return () => observer.disconnect();
    }, []);

    return (
        <div ref={ref} style={{
            background: "#fff", border: "1px solid rgba(0,0,0,0.07)",
            borderRadius: 10, padding: "18px 20px",
            display: "flex", flexDirection: "column", gap: 0,
        }}>
            {events.map(({ time, text, color }, i) => (
                <div key={i} style={{
                    display: "flex", gap: 12, alignItems: "flex-start",
                    opacity: i < visible ? 1 : 0,
                    transform: i < visible ? "none" : "translateY(6px)",
                    transition: "opacity 0.35s, transform 0.35s",
                    paddingBottom: i < events.length - 1 ? 12 : 0,
                    borderBottom: i < events.length - 1 ? "1px solid rgba(0,0,0,0.05)" : "none",
                    marginBottom: i < events.length - 1 ? 12 : 0,
                }}>
                    <div style={{ width: 6, height: 6, borderRadius: "50%", background: color, marginTop: 4, flexShrink: 0 }} />
                    <div style={{ flex: 1 }}>
                        <div style={{ fontFamily: "'Inter', sans-serif", fontSize: 12, color: "#333", lineHeight: 1.4 }}>{text}</div>
                        <div style={{ fontFamily: "'Space Grotesk', sans-serif", fontSize: 10, color: "#bbb", marginTop: 2 }}>{time}</div>
                    </div>
                </div>
            ))}
        </div>
    );
}

// ── Final CTA ─────────────────────────────────────────────────
function CTA() {
  const nav = useNavigate();
  return (
    <section style={{
      background: NAVY, padding: "120px 48px",
      position: "relative", overflow: "hidden",
    }}>
      {/* subtle dot grid */}
      <div style={{
        position: "absolute", inset: 0, opacity: 0.06,
        backgroundImage: "radial-gradient(circle, #fff 1px, transparent 1px)",
        backgroundSize: "32px 32px", pointerEvents: "none",
      }} />

      {/* animated network lines */}
      <svg style={{ position: "absolute", inset: 0, width: "100%", height: "100%", opacity: 0.07, pointerEvents: "none" }} xmlns="http://www.w3.org/2000/svg">
        <line x1="10%" y1="30%" x2="35%" y2="50%" stroke="#6366F1" strokeWidth="1" />
        <line x1="35%" y1="50%" x2="65%" y2="50%" stroke="#6366F1" strokeWidth="1" />
        <line x1="65%" y1="50%" x2="90%" y2="30%" stroke="#6366F1" strokeWidth="1" />
        <line x1="65%" y1="50%" x2="90%" y2="70%" stroke="#6366F1" strokeWidth="1" />
        <line x1="10%" y1="70%" x2="35%" y2="50%" stroke="#6366F1" strokeWidth="1" />
        {["10%","35%","65%","90%","90%","10%"].map((cx, i) => (
          <circle key={i} cx={cx} cy={["30%","50%","50%","30%","70%","70%"][i]} r="3" fill="#6366F1" opacity="0.6" />
        ))}
      </svg>

      {/* content */}
      <div style={{ position: "relative", zIndex: 2, maxWidth: 640, margin: "0 auto", textAlign: "center" }}>
        <h2 style={{
          fontFamily: "'Space Grotesk', sans-serif", fontWeight: 700,
          fontSize: "clamp(32px, 4vw, 52px)", lineHeight: 1.1,
          letterSpacing: "-0.03em", color: "#F8F9FC", margin: "0 0 20px",
        }}>
          Give your AI agents<br />freedom to act.<br />
          <span style={{ color: ACCENT }}>Not freedom to operate unchecked.</span>
        </h2>

        <p style={{
          fontFamily: "'Inter', sans-serif", fontSize: 17, lineHeight: 1.7,
          color: "rgba(248,249,252,0.55)", margin: "0 0 48px",
        }}>
          Connect your AI systems to Aegis and put a governance layer between autonomous decisions and real-world actions.
        </p>

        {/* three pillars */}
        <div style={{ display: "flex", justifyContent: "center", gap: 40, marginBottom: 56 }}>
          {[
            { label: "Connect", desc: "Agents, tools and policies in one layer" },
            { label: "Govern", desc: "Evaluate, approve, pause or block" },
            { label: "Audit", desc: "Every decision recorded and searchable" },
          ].map(({ label, desc }) => (
            <div key={label} style={{ textAlign: "center", maxWidth: 160 }}>
              <div style={{
                width: 36, height: 36, borderRadius: "50%",
                background: ACCENT_LIGHT, border: `1px solid ${ACCENT_BORDER}`,
                margin: "0 auto 12px",
                display: "flex", alignItems: "center", justifyContent: "center",
              }}>
                <div style={{ width: 8, height: 8, borderRadius: "50%", background: ACCENT }} />
              </div>
              <div style={{ fontFamily: "'Space Grotesk', sans-serif", fontSize: 14, fontWeight: 700, color: "#F8F9FC", marginBottom: 6 }}>{label}</div>
              <div style={{ fontFamily: "'Inter', sans-serif", fontSize: 12, color: "rgba(248,249,252,0.4)", lineHeight: 1.5 }}>{desc}</div>
            </div>
          ))}
        </div>

        {/* CTA button */}
        <button onClick={() => nav("/register")} style={{
          fontFamily: "'Inter', sans-serif", fontWeight: 600, fontSize: 16,
          color: "#fff", background: ACCENT,
          border: "none", borderRadius: 8, padding: "16px 40px", cursor: "pointer",
          transition: "transform 0.15s, box-shadow 0.15s",
        }}
          onMouseEnter={e => { e.currentTarget.style.transform = "translateY(-2px)"; e.currentTarget.style.boxShadow = "0 12px 32px rgba(99,102,241,0.45)"; }}
          onMouseLeave={e => { e.currentTarget.style.transform = "none"; e.currentTarget.style.boxShadow = "none"; }}
        >Start securing your AI</button>

        <div style={{ fontFamily: "'Inter', sans-serif", fontSize: 13, color: "rgba(248,249,252,0.3)", marginTop: 16 }}>
          Built for teams adopting AI agents without giving up control.
        </div>
      </div>

      {/* footer line */}
      <div style={{
        position: "relative", zIndex: 2,
        borderTop: "1px solid rgba(255,255,255,0.07)",
        marginTop: 80, paddingTop: 32,
        display: "flex", justifyContent: "space-between", alignItems: "center",
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
          <span style={{ fontFamily: "'Space Grotesk', sans-serif", fontWeight: 700, fontSize: 16, color: "#F8F9FC" }}>AEGIS</span>
          <span style={{ fontFamily: "'Space Grotesk', sans-serif", fontWeight: 700, fontSize: 16, color: ACCENT }}>AI</span>
        </div>
        <div style={{ fontFamily: "'Inter', sans-serif", fontSize: 12, color: "rgba(248,249,252,0.25)" }}>
          © 2026 Aegis AI. All rights reserved.
        </div>
        <div style={{ display: "flex", gap: 24 }}>
          {["How it works", "Why Aegis", "Log in"].map(label => (
            <a key={label} href="#" style={{
              fontFamily: "'Inter', sans-serif", fontSize: 12,
              color: "rgba(248,249,252,0.35)", textDecoration: "none", transition: "color 0.2s",
            }}
              onMouseEnter={e => e.target.style.color = "rgba(248,249,252,0.8)"}
              onMouseLeave={e => e.target.style.color = "rgba(248,249,252,0.35)"}
            >{label}</a>
          ))}
        </div>
      </div>
    </section>
  );
}

export default function Landing() {
  return (
    <div style={{ margin: 0, padding: 0 }}>
      <NavBar />
      <Hero />
      <Process />
      <WhyAegis />
      <CTA />
    </div>
  );
}