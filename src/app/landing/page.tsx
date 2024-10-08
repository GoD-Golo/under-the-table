import Hero from "@/components/Hero";
import Features from "@/components/Features";
import Pricing from "@/components/Pricing";
import Footer from "@/components/Footer";
import Testimonials from "@/components/Testimonials";
import Navbar from "@/components/Navbar";

import { NavbarButtons } from "@/utils/types";

const buttons: NavbarButtons[] = [
  {
    text: "Features",
    link: "#features",
    type: "secondary",
  },
  {
    text: "Players",
    link: "#player-tools",
    type: "secondary",
  },
  {
    text: "DMs",
    link: "#dm-tools",
    type: "secondary",
  },
  {
    text: "Pricing",
    link: "#pricing",
    type: "secondary",
  },
  {
    text: "Testimonials",
    link: "#testimonials",
    type: "secondary",
  },
  {
    text: "FAQ",
    link: "#faq",
    type: "secondary",
  },
  {
    text: "Sign Up",
    link: "#signup",
    type: "primary",
  },
];

export default function Home() {
  return (
    <div className="min-h-screen bg-slate-800 text-gray-100">
      <Navbar buttons={buttons} />
      <Hero />
      <Features />
      <Testimonials />
      <Pricing />
      <Footer />
    </div>
  );
}
