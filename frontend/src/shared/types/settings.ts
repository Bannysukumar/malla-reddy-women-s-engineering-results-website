export interface FooterLink {
  id: string;
  label: string;
  href: string;
  external?: boolean;
}

export interface FooterSection {
  id: string;
  title: string;
  links: FooterLink[];
}

export interface FooterContact {
  title: string;
  address: string;
  email: string;
  phone: string;
  website: string;
}

export interface FooterSocialLink {
  id: string;
  label: string;
  href: string;
}

export interface FooterSettings {
  brandTitle?: string;
  brandDescription?: string;
  sections: FooterSection[];
  contact?: FooterContact;
  socialLinks?: FooterSocialLink[];
  updatedAt?: string;
}

export interface FeedbackItem {
  id: string;
  message: string;
  status: "new" | "read" | "resolved";
  source?: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface AdminUser {
  id: string;
  username: string;
  role: "admin";
  active: boolean;
  createdAt?: string;
  updatedAt?: string;
}

export const DEFAULT_FOOTER_CONTACT: FooterContact = {
  title: "Contact",
  address: "Hyderabad, Telangana, India",
  email: "",
  phone: "",
  website: "https://mrecwexamcell.vercel.app",
};

export const DEFAULT_FOOTER_BRAND = {
  title: "MRECW Results Portal",
  description: "Malla Reddy Engineering College for Women (Autonomous), Hyderabad — fast academic insights for students.",
};
