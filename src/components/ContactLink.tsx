import { SITE } from "@/lib/site";

/** The contact address in legal text, or a placeholder until one is set in site.ts. */
export function ContactLink() {
  return SITE.contactEmail ? <a href={`mailto:${SITE.contactEmail}`}>{SITE.contactEmail}</a> : <span>the contact address we will publish here</span>;
}
