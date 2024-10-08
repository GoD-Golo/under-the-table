import React from "react";

export default function Footer() {
  return (
    <footer className="py-8 bg-slate-900 text-center text-gray-400">
      <p>© 2024 Under The Table. All rights reserved.</p>
      <div className="mt-4">
        <a href="#" className="text-amber-500 hover:text-amber-600 mx-2">
          Privacy Policy
        </a>
        <a href="#" className="text-amber-500 hover:text-amber-600 mx-2">
          Terms of Service
        </a>
      </div>
    </footer>
  );
}
