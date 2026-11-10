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
import Trust from "../components/landing/Trust";
import Pricing from "../components/landing/Pricing";
import FAQ from "../components/landing/FAQ";
import Footer from "../components/landing/Footer";
import { ClosingCTA, UseCases } from "../components/landing/Sections";

export default function Page() {
  return (
    <div className="min-h-screen bg-[#090B0D] text-[#F3F5F2] antialiased selection:bg-[#C6F36B] selection:text-[#10140A]">
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
