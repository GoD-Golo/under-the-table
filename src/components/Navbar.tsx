import { NavbarButtonsList } from "@/utils/types";
import Link from "next/link";

export default function Navbar(buttonsList: NavbarButtonsList) {
  return (
    <nav className="bg-slate-900 bg-opacity-80 fixed w-full z-10 top-0 shadow-md">
      <div className="max-w-6xl mx-auto px-4 py-3 flex justify-between items-center">
        <div className="text-2xl font-bold text-amber-500">
          <a href="#">Under The Table</a>
        </div>
        <ul className="flex space-x-6 text-gray-300">
          {buttonsList.buttons.map((button) =>
            button.type === "secondary" ? (
              <li key={button.text}>
                <Link href={button.link} className={`hover:text-amber-500`}>
                  {button.text}
                </Link>
              </li>
            ) : (
              ""
            )
          )}
        </ul>
        <div>
          <ul className="flex space-x-6 text-gray-300">
            {buttonsList.buttons.map((button) =>
              button.type === "primary" ? (
                <li key={button.text}>
                  <Link
                    href={`/${button.link}`}
                    className={`hover:text-amber-500`}
                  >
                    <button className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-gray-100 font-semibold rounded-lg">
                      {button.text}
                    </button>
                  </Link>
                </li>
              ) : (
                ""
              )
            )}
          </ul>
        </div>
      </div>
    </nav>
  );
}
