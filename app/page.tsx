"use client";

import Image from "next/image";
import Link from "next/link";
import { signIn } from "next-auth/react";
import { useEffect, useState } from "react";
import {
    Sun,
    Moon,
    ArrowRight,
    FileSpreadsheet,
    MessageSquare,
    BarChart3,
} from "lucide-react";

export default function LandingPage() {
    const [theme, setTheme] = useState<"dark" | "light">("dark");

    useEffect(() => {
        const stored = (localStorage.getItem("theme") as "dark" | "light" | null) ?? "dark";
        setTheme(stored);
        document.documentElement.classList.toggle("dark", stored === "dark");
    }, []);

    const toggleTheme = () => {
        const next = theme === "dark" ? "light" : "dark";
        setTheme(next);
        localStorage.setItem("theme", next);
        document.documentElement.classList.toggle("dark", next === "dark");
    };

    const handleSignIn = () => signIn("azure-ad", { callbackUrl: "/chat" });

    return (
        <div className="min-h-screen bg-background text-foreground">
            {/* Header */}
            <header className="flex items-center justify-between px-8 py-6">
                <Link href="/" className="flex items-center gap-2">
                    <Image
                        src="/esti-mate-logo.png"
                        alt="Esti-Mate AI"
                        width={160}
                        height={44}
                        priority
                        className="h-11 w-auto object-contain"
                    />
                </Link>

                <div className="flex items-center gap-3">
                    <button
                        onClick={toggleTheme}
                        className="flex items-center gap-2 rounded-lg border border-border bg-card px-3 py-2 text-sm text-muted-foreground transition hover:bg-accent"
                        aria-label="Toggle theme"
                    >
                        {theme === "dark" ? (
                            <Sun className="h-4 w-4" />
                        ) : (
                            <Moon className="h-4 w-4" />
                        )}
                        {theme === "dark" ? "Light" : "Dark"}
                    </button>

                    <button
                        onClick={handleSignIn}
                        className="flex items-center gap-2 rounded-lg bg-green-500 px-4 py-2 text-sm font-medium text-black transition hover:bg-green-400"
                    >
                        Sign in
                        <ArrowRight className="h-4 w-4" />
                    </button>
                </div>
            </header>

            {/* Hero */}
            <section className="flex flex-col items-center px-8 pt-16 pb-24 text-center">
                <div className="mb-8 inline-flex items-center gap-2 rounded-full border border-green-500/30 bg-green-500/10 px-4 py-1.5 text-sm text-green-400">
                    <span className="h-1.5 w-1.5 rounded-full bg-green-400" />
                    Internal use only — company employees
                </div>

                <h1 className="mb-6 max-w-4xl text-5xl font-bold tracking-tight md:text-6xl">
                    Your construction data,
                    <br />
                    <span className="text-green-500">instantly searchable</span>
                </h1>

                <p className="mb-10 max-w-2xl text-lg text-muted-foreground">
                    Stop digging through spreadsheets. Ask EstimateAI questions about your
                    project costs, labor rates, and estimates — and get answers in seconds.
                </p>

                <button
                    onClick={handleSignIn}
                    className="flex items-center gap-3 rounded-lg bg-green-500 px-6 py-3.5 text-base font-medium text-black transition hover:bg-green-400"
                >
                    <svg
                        className="h-5 w-5"
                        viewBox="0 0 23 23"
                        xmlns="http://www.w3.org/2000/svg"
                        aria-hidden="true"
                    >
                        <rect x="1" y="1" width="10" height="10" fill="#f25022" />
                        <rect x="12" y="1" width="10" height="10" fill="#7fba00" />
                        <rect x="1" y="12" width="10" height="10" fill="#00a4ef" />
                        <rect x="12" y="12" width="10" height="10" fill="#ffb900" />
                    </svg>
                    Sign in with Microsoft
                </button>

                <p className="mt-4 text-sm text-muted-foreground">
                    Restricted to @yourcompany emails only
                </p>
            </section>

            {/* Features */}
            <section className="px-8 pb-24">
                <h2 className="mb-12 text-center text-3xl font-bold">
                    Everything your estimators need
                </h2>

                <div className="mx-auto grid max-w-6xl gap-6 md:grid-cols-3">
                    <FeatureCard
                        icon={<FileSpreadsheet className="h-5 w-5 text-green-500" />}
                        title="Excel Intelligence"
                        description="Upload your cost sheets and the AI reads every number instantly."
                    />
                    <FeatureCard
                        icon={<MessageSquare className="h-5 w-5 text-green-500" />}
                        title="Plain English Queries"
                        description="Ask questions like you'd ask a colleague. No formulas needed."
                    />
                    <FeatureCard
                        icon={<BarChart3 className="h-5 w-5 text-green-500" />}
                        title="Project Comparisons"
                        description="Compare costs across projects side by side in seconds."
                    />
                </div>
            </section>
        </div>
    );
}

function FeatureCard({
    icon,
    title,
    description,
}: {
    icon: React.ReactNode;
    title: string;
    description: string;
}) {
    return (
        <div className="rounded-xl border border-border bg-card p-6">
            <div className="mb-4 flex h-10 w-10 items-center justify-center rounded-lg bg-green-500/10">
                {icon}
            </div>
            <h3 className="mb-2 text-lg font-semibold">{title}</h3>
            <p className="text-sm text-muted-foreground">{description}</p>
        </div>
    );
}