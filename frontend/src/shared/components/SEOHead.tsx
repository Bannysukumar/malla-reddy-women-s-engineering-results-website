import { Helmet } from "react-helmet-async";
import { FAQ_ITEMS, PAGE_SEO, SEO, SITE_URL } from "@/shared/constants/seo";

export function SEOHead({ path = "/" }: { path?: string }) {
  const page = PAGE_SEO[path] || PAGE_SEO["/"];
  const title = page.title;
  const description = page.description;

  const faqSchema = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: FAQ_ITEMS.map((item) => ({
      "@type": "Question",
      name: item.q,
      acceptedAnswer: { "@type": "Answer", text: item.a },
    })),
  };

  const appSchema = {
    "@context": "https://schema.org",
    "@type": "WebApplication",
    name: SEO.siteName,
    url: SITE_URL,
    description: SEO.defaultDescription,
    applicationCategory: "EducationalApplication",
    operatingSystem: "Any",
    offers: { "@type": "Offer", price: "0", priceCurrency: "INR" },
  };

  return (
    <Helmet>
      <html lang="en" />
      <title>{title}</title>
      <meta name="description" content={description} />
      <meta name="keywords" content={SEO.keywords} />
      <meta name="robots" content="index, follow, max-image-preview:large" />
      <link rel="canonical" href={`${SITE_URL}${path === "/" ? "" : path}`} />
      <meta property="og:type" content="website" />
      <meta property="og:url" content={`${SITE_URL}${path}`} />
      <meta property="og:title" content={title} />
      <meta property="og:description" content={description} />
      <meta property="og:site_name" content={SEO.siteName} />
      <meta property="og:locale" content={SEO.locale} />
      <meta name="twitter:card" content="summary_large_image" />
      <meta name="twitter:title" content={title} />
      <meta name="twitter:description" content={description} />
      <script type="application/ld+json">{JSON.stringify(appSchema)}</script>
      <script type="application/ld+json">{JSON.stringify(faqSchema)}</script>
    </Helmet>
  );
}
