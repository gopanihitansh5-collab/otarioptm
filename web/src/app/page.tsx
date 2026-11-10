"use client";

import Nav from "../components/landing/Nav";
import Hero from "../components/landing/Hero";
import Simulator from "../components/landing/Simulator";
import Architecture from "../components/landing/Architecture";
import Footer from "../components/landing/Footer";
import { ClosingCTA, Integration, Problem, Ships, UseCases } from "../components/landing/Sections";

export default function Page() {
  return (
    <div className="min-h-screen bg-[#090B0D] text-[#F3F5F2] antialiased selection:bg-[#C6F36B] selection:text-[#10140A]">
      <Nav />
      <main>
        <Hero />
        <Problem />
        <Simulator />
        <Architecture />
        <Ships />
        <Integration />
        <UseCases />
        <ClosingCTA />
      </main>
      <Footer />
    </div>
  );
}
