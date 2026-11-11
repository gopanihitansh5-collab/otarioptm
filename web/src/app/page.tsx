"use client";

import AnnouncementBar from "../components/landing/AnnouncementBar";
import Nav from "../components/landing/Nav";
import Hero from "../components/landing/Hero";
import ProblemSolution from "../components/landing/ProblemSolution";
import ProductDemo from "../components/landing/ProductDemo";
import RoutingIntelligence from "../components/landing/RoutingIntelligence";
import BudgetGovernance from "../components/landing/BudgetGovernance";
import Observability from "../components/landing/Observability";
import Architecture from "../components/landing/Architecture";
import DX from "../components/landing/DX";
import BuiltDifferent from "../components/landing/BuiltDifferent";
import Trust from "../components/landing/Trust";
import Pricing from "../components/landing/Pricing";
import FAQ from "../components/landing/FAQ";
import Footer from "../components/landing/Footer";
import { ClosingCTA, UseCases } from "../components/landing/Sections";

export default function Page() {
  return (
    <div className="min-h-screen bg-[#111110] text-[#E9E4DA] antialiased selection:bg-[#B8A98F] selection:text-[#111110]">
      <AnnouncementBar />
      <Nav />
      <main>
        <Hero />
        <ProblemSolution />
        <ProductDemo />
        <RoutingIntelligence />
        <BudgetGovernance />
        <Observability />
        <Architecture />
        <DX />
        <BuiltDifferent />
        <Trust />
        <UseCases />
        <Pricing />
        <FAQ />
        <ClosingCTA />
      </main>
      <Footer />
    </div>
  );
}
