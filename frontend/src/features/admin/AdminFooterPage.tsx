import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Link2, Mail, MapPin, Phone, Plus, Save, Share2, Trash2 } from "lucide-react";
import { useEffect, useState } from "react";
import { AdminPageHeader } from "@/features/admin/AdminPageHeader";
import { Button } from "@/shared/components/ui/Button";
import { Input } from "@/shared/components/ui/Input";
import { fetchAdminFooter, saveAdminFooter } from "@/shared/lib/adminApi";
import { queryKeys } from "@/shared/lib/api";
import {
  DEFAULT_FOOTER_BRAND,
  DEFAULT_FOOTER_CONTACT,
  type FooterContact,
  type FooterSection,
  type FooterSettings,
  type FooterSocialLink,
} from "@/shared/types/settings";

function newLinkId() {
  return `link-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
}

function newSectionId() {
  return `section-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
}

function emptySettings(): FooterSettings {
  return {
    brandTitle: DEFAULT_FOOTER_BRAND.title,
    brandDescription: DEFAULT_FOOTER_BRAND.description,
    sections: [],
    contact: { ...DEFAULT_FOOTER_CONTACT },
    socialLinks: [],
  };
}

export default function AdminFooterPage() {
  const queryClient = useQueryClient();
  const [settings, setSettings] = useState<FooterSettings>(emptySettings);
  const [saved, setSaved] = useState(false);

  const { data, isLoading, error } = useQuery({
    queryKey: ["admin-footer"],
    queryFn: fetchAdminFooter,
  });

  useEffect(() => {
    if (!data) return;
    setSettings(
      structuredClone({
        brandTitle: data.brandTitle ?? DEFAULT_FOOTER_BRAND.title,
        brandDescription: data.brandDescription ?? DEFAULT_FOOTER_BRAND.description,
        sections: data.sections ?? [],
        contact: { ...DEFAULT_FOOTER_CONTACT, ...data.contact },
        socialLinks: data.socialLinks ?? [],
      })
    );
  }, [data]);

  const saveFooter = useMutation({
    mutationFn: () => saveAdminFooter(settings),
    onSuccess: () => {
      setSaved(true);
      queryClient.invalidateQueries({ queryKey: ["admin-footer"] });
      queryClient.invalidateQueries({ queryKey: queryKeys.footer() });
      setTimeout(() => setSaved(false), 2500);
    },
  });

  function updateContact(patch: Partial<FooterContact>) {
    setSettings((prev) => ({
      ...prev,
      contact: { ...DEFAULT_FOOTER_CONTACT, ...prev.contact, ...patch },
    }));
  }

  function addSocialLink() {
    setSettings((prev) => ({
      ...prev,
      socialLinks: [...(prev.socialLinks ?? []), { id: newLinkId(), label: "Instagram", href: "https://" }],
    }));
  }

  function updateSocialLink(index: number, patch: Partial<FooterSocialLink>) {
    setSettings((prev) => ({
      ...prev,
      socialLinks: (prev.socialLinks ?? []).map((link, i) => (i === index ? { ...link, ...patch } : link)),
    }));
  }

  function removeSocialLink(index: number) {
    setSettings((prev) => ({
      ...prev,
      socialLinks: (prev.socialLinks ?? []).filter((_, i) => i !== index),
    }));
  }

  function updateSection(index: number, patch: Partial<FooterSection>) {
    setSettings((prev) => ({
      ...prev,
      sections: prev.sections.map((s, i) => (i === index ? { ...s, ...patch } : s)),
    }));
  }

  function addSection() {
    setSettings((prev) => ({
      ...prev,
      sections: [...prev.sections, { id: newSectionId(), title: "New Section", links: [] }],
    }));
  }

  function removeSection(index: number) {
    setSettings((prev) => ({
      ...prev,
      sections: prev.sections.filter((_, i) => i !== index),
    }));
  }

  function addLink(sectionIndex: number) {
    setSettings((prev) => ({
      ...prev,
      sections: prev.sections.map((section, i) =>
        i === sectionIndex
          ? { ...section, links: [...section.links, { id: newLinkId(), label: "New Link", href: "/", external: false }] }
          : section
      ),
    }));
  }

  function updateLink(sectionIndex: number, linkIndex: number, patch: Partial<FooterSection["links"][0]>) {
    setSettings((prev) => ({
      ...prev,
      sections: prev.sections.map((section, i) =>
        i === sectionIndex
          ? { ...section, links: section.links.map((link, j) => (j === linkIndex ? { ...link, ...patch } : link)) }
          : section
      ),
    }));
  }

  function removeLink(sectionIndex: number, linkIndex: number) {
    setSettings((prev) => ({
      ...prev,
      sections: prev.sections.map((section, i) =>
        i === sectionIndex ? { ...section, links: section.links.filter((_, j) => j !== linkIndex) } : section
      ),
    }));
  }

  const contact = settings.contact ?? DEFAULT_FOOTER_CONTACT;
  const socialLinks = settings.socialLinks ?? [];

  return (
    <div className="admin-page">
      <AdminPageHeader
        title="Footer Settings"
        description="Manage contact info, social media, and footer link sections — changes appear on the student portal immediately"
        action={
          <div className="flex flex-wrap gap-2">
            <Button variant="secondary" onClick={addSection}>
              <Plus className="mr-2 inline h-4 w-4" />
              Add Section
            </Button>
            <Button onClick={() => saveFooter.mutate()} loading={saveFooter.isPending}>
              <Save className="mr-2 inline h-4 w-4" />
              {saved ? "Saved!" : "Save Footer"}
            </Button>
          </div>
        }
      />

      {error && <div className="rounded-card border border-error/30 bg-error/10 px-5 py-4 text-sm text-error">{(error as Error).message}</div>}
      {saveFooter.isError && <div className="rounded-card border border-error/30 bg-error/10 px-5 py-4 text-sm text-error">{(saveFooter.error as Error).message}</div>}

      {isLoading ? (
        <div className="admin-panel-card py-16 text-center text-muted">Loading footer settings…</div>
      ) : (
        <div className="space-y-6">
          <div className="admin-panel-card space-y-5">
            <div>
              <h2 className="font-display text-lg font-semibold">Brand</h2>
              <p className="mt-1 text-sm text-muted">Title and description shown in the footer left column</p>
            </div>
            <div className="grid gap-4 lg:grid-cols-2">
              <div>
                <label className="mb-2 block text-sm font-medium text-muted">Portal title</label>
                <Input
                  value={settings.brandTitle ?? ""}
                  onChange={(e) => setSettings((prev) => ({ ...prev, brandTitle: e.target.value }))}
                  placeholder="MRECW Results Portal"
                />
              </div>
              <div className="lg:col-span-2">
                <label className="mb-2 block text-sm font-medium text-muted">Description</label>
                <textarea
                  value={settings.brandDescription ?? ""}
                  onChange={(e) => setSettings((prev) => ({ ...prev, brandDescription: e.target.value }))}
                  className="input-field min-h-[88px] resize-y"
                  placeholder="Short description about the portal"
                />
              </div>
            </div>
          </div>

          <div className="admin-panel-card space-y-5">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <h2 className="flex items-center gap-2 font-display text-lg font-semibold">
                  <MapPin className="h-5 w-5 text-primary-light" />
                  Contact Information
                </h2>
                <p className="mt-1 text-sm text-muted">Address, email, phone, and website shown in the footer</p>
              </div>
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <label className="mb-2 block text-sm font-medium text-muted">Section title</label>
                <Input value={contact.title} onChange={(e) => updateContact({ title: e.target.value })} placeholder="Contact" />
              </div>
              <div>
                <label className="mb-2 block text-sm font-medium text-muted">Address</label>
                <Input value={contact.address} onChange={(e) => updateContact({ address: e.target.value })} placeholder="City, State, Country" />
              </div>
              <div>
                <label className="mb-2 flex items-center gap-1.5 text-sm font-medium text-muted">
                  <Mail className="h-3.5 w-3.5" /> Email
                </label>
                <Input type="email" value={contact.email} onChange={(e) => updateContact({ email: e.target.value })} placeholder="contact@mrecw.edu.in" />
              </div>
              <div>
                <label className="mb-2 flex items-center gap-1.5 text-sm font-medium text-muted">
                  <Phone className="h-3.5 w-3.5" /> Phone
                </label>
                <Input value={contact.phone} onChange={(e) => updateContact({ phone: e.target.value })} placeholder="+91 XXXXX XXXXX" />
              </div>
              <div className="sm:col-span-2">
                <label className="mb-2 block text-sm font-medium text-muted">Website URL</label>
                <Input value={contact.website} onChange={(e) => updateContact({ website: e.target.value })} placeholder="https://mrecwexamcell.vercel.app" />
              </div>
            </div>
          </div>

          <div className="admin-panel-card space-y-5">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <h2 className="flex items-center gap-2 font-display text-lg font-semibold">
                  <Share2 className="h-5 w-5 text-primary-light" />
                  Social Media Links
                </h2>
                <p className="mt-1 text-sm text-muted">Add, edit, or remove social profiles (Instagram, LinkedIn, YouTube, etc.)</p>
              </div>
              <Button variant="secondary" className="text-sm" onClick={addSocialLink}>
                <Plus className="mr-2 inline h-4 w-4" />
                Add Social Link
              </Button>
            </div>

            {socialLinks.length === 0 ? (
              <p className="rounded-xl border border-dashed border-foreground/15 bg-surface-elevated/30 px-4 py-8 text-center text-sm text-muted">
                No social links yet. Click &quot;Add Social Link&quot; to add Instagram, Facebook, LinkedIn, etc.
              </p>
            ) : (
              <div className="space-y-3">
                {socialLinks.map((link, index) => (
                  <div key={link.id} className="grid gap-3 rounded-xl border border-foreground/10 bg-surface-elevated/30 p-4 sm:grid-cols-[1fr_1.5fr_auto]">
                    <Input
                      value={link.label}
                      onChange={(e) => updateSocialLink(index, { label: e.target.value })}
                      placeholder="Platform (e.g. Instagram)"
                    />
                    <Input
                      value={link.href}
                      onChange={(e) => updateSocialLink(index, { href: e.target.value })}
                      placeholder="https://instagram.com/..."
                    />
                    <Button variant="ghost" className="text-error" onClick={() => removeSocialLink(index)}>
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div>
            <h2 className="mb-4 text-xs font-semibold uppercase tracking-wider text-muted">Link Sections</h2>
            <div className="space-y-6">
              {settings.sections.map((section, sectionIndex) => (
                <div key={section.id} className="admin-panel-card space-y-5">
                  <div className="flex flex-wrap items-center gap-3">
                    <Link2 className="h-5 w-5 text-primary-light" />
                    <Input
                      value={section.title}
                      onChange={(e) => updateSection(sectionIndex, { title: e.target.value })}
                      placeholder="Section title"
                      className="max-w-xs font-semibold"
                    />
                    <Button variant="ghost" className="ml-auto text-error" onClick={() => removeSection(sectionIndex)}>
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>

                  <div className="space-y-3">
                    {section.links.map((link, linkIndex) => (
                      <div key={link.id} className="grid gap-3 rounded-xl border border-foreground/10 bg-surface-elevated/30 p-4 sm:grid-cols-[1fr_1fr_auto_auto]">
                        <Input
                          value={link.label}
                          onChange={(e) => updateLink(sectionIndex, linkIndex, { label: e.target.value })}
                          placeholder="Label"
                        />
                        <Input
                          value={link.href}
                          onChange={(e) => updateLink(sectionIndex, linkIndex, { href: e.target.value })}
                          placeholder="/path or https://..."
                        />
                        <label className="flex items-center gap-2 text-sm text-muted">
                          <input
                            type="checkbox"
                            checked={!!link.external}
                            onChange={(e) => updateLink(sectionIndex, linkIndex, { external: e.target.checked })}
                          />
                          External
                        </label>
                        <Button variant="ghost" className="text-error" onClick={() => removeLink(sectionIndex, linkIndex)}>
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    ))}
                  </div>

                  <Button variant="secondary" className="text-sm" onClick={() => addLink(sectionIndex)}>
                    <Plus className="mr-2 inline h-4 w-4" />
                    Add Link
                  </Button>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
