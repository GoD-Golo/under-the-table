// NavBar

export interface NavbarButtons {
  text: string;
  link: string;
  type: "primary" | "secondary";
}

export interface NavbarButtonsList {
  buttons: NavbarButtons[];
}

// StyledInput
export interface StyledInputProps {
  label: string;
  type: "text" | "email" | "password";
  id: "username" | "email" | "password";
  width: "w-48" | "w-72" | "w-96";
}
