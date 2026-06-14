import { useQuery } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import { fetchFooterSettings, queryKeys } from "@/shared/lib/api";
import {
  DEFAULT_FOOTER_BRAND,
  DEFAULT_FOOTER_CONTACT,
  type FooterLink,
  type FooterSection,
  type FooterSettings,
} from "@/shared/types/settings";

const FALLBACK_SECTIONS: FooterSection[] = [
  {
    id: "quick-links",
    title: "Quick Links",
    links: [
      { id: "ql-1", label: "Academic Results", href: "/academic-results" },
      { id: "ql-2", label: "Class Results", href: "/class-results" },
      { id: "ql-3", label: "Help Center", href: "/help-center" },
    ],
  },
  {
    id: "legal",
    title: "Legal",
    links: [
      { id: "lg-1", label: "Privacy Policy", href: "/help-center" },
      { id: "lg-2", label: "Terms of Service", href: "/help-center" },
    ],
  },
];

function FooterLinkItem({ link }: { link: FooterLink }) {
  const className = "transition hover:text-primary-light";
  if (link.external || link.href.startsWith("http")) {
    return (
      <a href={link.href} target="_blank" rel="noopener noreferrer" className={className}>
        {link.label}
      </a>
    );
  }
  return <Link to={link.href} className={className}>{link.label}</Link>;
}

function ExternalText({ href, children }: { href: string; children: React.ReactNode }) {
  if (href.startsWith("http")) {
    return (
      <a href={href} target="_blank" rel="noopener noreferrer" className="transition hover:text-primary-light">
        {children}
      </a>
    );
  }
  return <span>{children}</span>;
}

export function Footer() {
  const { data } = useQuery({
    queryKey: queryKeys.footer(),
    queryFn: fetchFooterSettings,
    staleTime: 60_000,
  });

  const settings: FooterSettings = data ?? { sections: FALLBACK_SECTIONS };
  const sections = settings.sections?.length ? settings.sections : FALLBACK_SECTIONS;
  const brandTitle = settings.brandTitle || DEFAULT_FOOTER_BRAND.title;
  const brandDescription = settings.brandDescription || DEFAULT_FOOTER_BRAND.description;
  const contact = { ...DEFAULT_FOOTER_CONTACT, ...settings.contact };
  const socialLinks = settings.socialLinks ?? [];

  const hasContact =
    contact.address || contact.email || contact.phone || contact.website;

  return (
    <footer className="mt-auto w-full border-t border-foreground/10 bg-surface px-4 pb-24 pt-10 sm:px-6 lg:px-8 lg:pb-10">
      <div className="mx-auto grid max-w-content gap-8 sm:grid-cols-2 lg:grid-cols-4">
        <div>
          <h3 className="font-display font-semibold">{brandTitle}</h3>
          <p className="mt-2 text-sm leading-relaxed text-muted">{brandDescription}</p>
          {socialLinks.length > 0 && (
            <ul className="mt-4 flex flex-wrap gap-x-4 gap-y-2 text-sm">
              {socialLinks.map((link) => (
                <li key={link.id}>
                  <a
                    href={link.href}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="font-medium text-muted transition hover:text-primary-light"
                  >
                    {link.label}
                  </a>
                </li>
              ))}
            </ul>
          )}
        </div>

        {sections.map((section) => (
          <div key={section.id}>
            <h4 className="text-sm font-semibold">{section.title}</h4>
            <ul className="mt-3 space-y-2 text-sm text-muted">
              {section.links.map((link) => (
                <li key={link.id}>
                  <FooterLinkItem link={link} />
                </li>
              ))}
            </ul>
          </div>
        ))}

        {hasContact && (
          <div>
            <h4 className="text-sm font-semibold">{contact.title}</h4>
            <ul className="mt-3 space-y-2 text-sm text-muted">
              {contact.address && <li>{contact.address}</li>}
              {contact.email && (
                <li>
                  <a href={`mailto:${contact.email}`} className="transition hover:text-primary-light">
                    {contact.email}
                  </a>
                </li>
              )}
              {contact.phone && (
                <li>
                  <a href={`tel:${contact.phone.replace(/\s/g, "")}`} className="transition hover:text-primary-light">
                    {contact.phone}
                  </a>
                </li>
              )}
              {contact.website && (
                <li>
                  <ExternalText href={contact.website}>{contact.website.replace(/^https?:\/\//, "")}</ExternalText>
                </li>
              )}
            </ul>
          </div>
        )}
      </div>
      <p className="mx-auto mt-8 max-w-content text-center text-xs text-muted">
        © {new Date().getFullYear()} {brandTitle}. Built for MRECW students.
      </p>
    </footer>
  );
}
