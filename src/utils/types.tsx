// NavBar

export interface NavbarButtons {
  text: string;
  link: string;
  type: "primary" | "secondary";
}

export interface NavbarButtonsList {
  buttons: NavbarButtons[];
}
