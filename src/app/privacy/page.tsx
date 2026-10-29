import { Prose } from "@/components/Prose";
import { ContactLink } from "@/components/ContactLink";
import { SITE } from "@/lib/site";

export const metadata = { title: "Privacy policy" };

// Draft. Needs review by a lawyer before launch, and the placeholders in SITE filled in.
export default function PrivacyPage() {
  return (
    <Prose title="Privacy policy" intro={<p>Last updated {SITE.lastLegalUpdate}.</p>}>
      <p>
        This policy explains what {SITE.name} collects, why, and what you can do about it. {SITE.name} is operated by{" "}
        {SITE.legalEntity} (“we”), based in {SITE.jurisdiction}. Questions: <ContactLink />.
      </p>

      <h2>What we collect</h2>
      <h3>What you give us</h3>
      <ul>
        <li>The Steam links you analyze and the game descriptions you submit for suggestions.</li>
        <li>When accounts and payments launch: your email address, and a record of your purchases. Card details are handled by our payment provider and never reach our servers.</li>
      </ul>
      <h3>Public review data</h3>
      <p>
        To build a report we read publicly available Steam store reviews. We keep the review text, its language, the
        reviewer&apos;s playtime, the helpful and funny vote counts, the date and whether the game was received for free. We
        do not store reviewers&apos; names, Steam IDs, profile links or avatars.
      </p>
      <h3>Technical data</h3>
      <p>Our hosting provider keeps standard server logs (IP address, browser, pages requested) for security and debugging, for up to 30 days.</p>

      <h2>How we use it</h2>
      <ul>
        <li>To produce the reports and suggestions you ask for.</li>
        <li>To keep the service secure and working.</li>
        <li>When accounts launch: to manage your credits and send receipts. We will not send marketing email without your consent.</li>
      </ul>
      <p>Legal bases under the GDPR: performance of our contract with you, and our legitimate interest in running and securing the service and in analysing publicly available reviews in aggregate.</p>

      <h2>Who processes it</h2>
      <table>
        <thead>
          <tr>
            <th>Provider</th>
            <th>Purpose</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td>Nebius (Token Factory)</td>
            <td>Runs the NVIDIA Nemotron models that read reviews and game descriptions.</td>
          </tr>
          <tr>
            <td>Tavily</td>
            <td>Web search for public information about the games analyzed and the market. Only search queries are sent.</td>
          </tr>
          <tr>
            <td>Hosting provider</td>
            <td>Runs the application and stores its database.</td>
          </tr>
          <tr>
            <td>Payment provider</td>
            <td>Processes payments, once they launch.</td>
          </tr>
        </tbody>
      </table>
      <p>Some providers may process data outside the European Economic Area, under Standard Contractual Clauses or equivalent safeguards.</p>

      <h2>How long we keep it</h2>
      <p>Reports and the reviews behind them are kept while your account exists so you can reopen them. Game descriptions used for suggestions are not stored. You can ask us to delete your data at any time.</p>

      <h2 id="cookies">Cookies</h2>
      <p>
        {SITE.name} currently uses no tracking or advertising cookies, so there is no cookie banner. When sign-in launches we
        will use a strictly necessary session cookie. If we ever add analytics, we will ask first.
      </p>

      <h2>Your rights</h2>
      <p>
        You can ask to access, correct, delete or export your personal data, object to or restrict its processing, and
        withdraw consent. Write to <ContactLink />. You can also complain to your
        data protection authority; in Spain, the Agencia Española de Protección de Datos (aepd.es).
      </p>
      <p>If you wrote a Steam review and want it excluded from our database, send us the link to it and we will remove it.</p>

      <h2>Changes</h2>
      <p>If we change this policy in a way that matters, we will say so on this page and, once accounts exist, by email.</p>
    </Prose>
  );
}
