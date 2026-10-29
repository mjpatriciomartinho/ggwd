import Link from "next/link";
import { Prose } from "@/components/Prose";
import { ContactLink } from "@/components/ContactLink";
import { SITE } from "@/lib/site";

export const metadata = { title: "Terms of service" };

// Draft. Needs review by a lawyer before launch, and the placeholders in SITE filled in.
export default function TermsPage() {
  return (
    <Prose title="Terms of service" intro={<p>Last updated {SITE.lastLegalUpdate}.</p>}>
      <p>
        These terms govern your use of {SITE.name}, operated by {SITE.legalEntity}. By using the service you accept them. If
        you use it on behalf of a company, you accept them for that company.
      </p>

      <h2>The service</h2>
      <p>
        {SITE.name} reads publicly available player reviews of video games and produces AI-written reports about them. Reports
        are generated automatically. They summarise what a sample of players wrote; they are not facts about a game, its
        sales or its developer, and they may contain mistakes. Use them as one input to your own judgement.
      </p>

      <h2>Credits and payments</h2>
      <ul>
        <li>Reports are paid with credits. One credit produces one report on one game.</li>
        <li>Credits are sold in packs at the prices on the <Link href="/pricing">pricing page</Link>, and do not expire.</li>
        <li>If a report cannot be completed, its credit is returned.</li>
        <li>
          Credits are added to your account as soon as you pay, so purchases are final: by buying a pack you ask for
          immediate access and acknowledge that you lose the right of withdrawal. This does not affect your rights if the
          service is faulty.
        </li>
        <li>Credits have no cash value and cannot be transferred.</li>
      </ul>

      <h2>Your reports</h2>
      <p>
        You may use the reports you generate for any lawful purpose, including in internal documents, pitches and with AI
        tools. Quotes in a report belong to the players who wrote them; if you publish a report, keep quotes short and do not
        present them as your own words.
      </p>

      <h2>Acceptable use</h2>
      <ul>
        <li>Don&apos;t use {SITE.name} to identify, profile or contact individual reviewers.</li>
        <li>Don&apos;t try to overload, scrape or reverse engineer the service, or resell automated access without our agreement.</li>
        <li>Don&apos;t submit unlawful content in game descriptions.</li>
      </ul>

      <h2>Third parties</h2>
      <p>
        {SITE.name} is not affiliated with, endorsed or sponsored by Valve Corporation. Steam and the Steam logo are trademarks of
        Valve Corporation. Game names and images belong to their respective owners and are shown only to identify the games.
      </p>

      <h2>Liability</h2>
      <p>
        The service is provided as is. To the extent the law allows, we are not liable for indirect losses or for decisions
        made on the basis of a report, and our total liability is limited to what you paid us in the 12 months before the
        claim. Nothing in these terms limits rights you have as a consumer under the law of your country.
      </p>

      <h2>Changes and termination</h2>
      <p>
        We may update these terms; material changes will be announced on this page before they take effect. You can stop
        using the service at any time. We may suspend accounts that break these terms.
      </p>

      <h2>Law</h2>
      <p>
        These terms are governed by the laws of {SITE.jurisdiction}. Contact: <ContactLink />.
      </p>
    </Prose>
  );
}
