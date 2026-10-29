import { Prose } from "@/components/Prose";
import { SITE } from "@/lib/site";

export const metadata = { title: "For your AI" };

export default function AiPage() {
  return (
    <Prose
      title="Use ggwd from your AI"
      intro={
        <p>
          Reports are written for people and structured for machines. Paste one into any chat, or connect {SITE.name} to
          your coding agent and let it pull reports and read reviews while it works on your game.
        </p>
      }
    >
      <h2>Paste the report</h2>
      <p>
        Every report has a <strong>Copy report</strong> button. It copies clean Markdown: the summary, every theme with its
        counts, the quotes behind it, early-quit reasons and design lessons. Paste it next to your design document and ask
        things like:
      </p>
      <ul>
        <li>“Review our core loop against what frustrates these players. Where are we at risk?”</li>
        <li>“Which of the things that hook players here would fit our game, and which wouldn&apos;t?”</li>
        <li>“Draft three store-page bullets that answer the top complaints in this genre.”</li>
      </ul>
      <p>Prefer raw data? The <strong>.json</strong> export includes every theme with the ids of the reviews behind it.</p>

      <h2>Connect with MCP</h2>
      <p>
        {SITE.name} ships an MCP server, so Claude Code, Claude Desktop, Cursor or any MCP client can use it as a tool. With
        the app running, add it once:
      </p>
      <pre>
        <code>claude mcp add ggwd -- npx tsx /path/to/ggwd/mcp/server.mts</code>
      </pre>
      <p>Then just ask, from your game&apos;s repository:</p>
      <pre>
        <code>{`> Use ggwd to analyze Dome Keeper and tell me what players say about its difficulty curve.
> With ggwd, compare our GDD with what frustrates Balatro players.`}</code>
      </pre>

      <h3>Tools</h3>
      <table>
        <thead>
          <tr>
            <th>Tool</th>
            <th>What it does</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td><code>analyze_steam_game</code></td>
            <td>Runs a new report from a Steam link or app id and returns it as Markdown. Uses one credit.</td>
          </tr>
          <tr>
            <td><code>get_report</code></td>
            <td>Returns a finished report as Markdown, or as JSON with the review ids behind every theme.</td>
          </tr>
          <tr>
            <td><code>search_reviews</code></td>
            <td>Searches the downloaded reviews by text, verdict and hours played, most helpful first.</td>
          </tr>
          <tr>
            <td><code>list_reports</code></td>
            <td>Lists the games already analyzed, with a one-line summary each.</td>
          </tr>
        </tbody>
      </table>

      <h2>HTTP API</h2>
      <p>The same endpoints the website uses. Analyses run in the background: start one, then poll its job.</p>
      <table>
        <thead>
          <tr>
            <th>Endpoint</th>
            <th>Purpose</th>
          </tr>
        </thead>
        <tbody>
          <tr><td><code>POST /api/analyses</code></td><td>Start a report: <code>{`{ url, perSide, language, reportLanguage }`}</code></td></tr>
          <tr><td><code>GET /api/jobs/:id</code></td><td>Progress of a running report</td></tr>
          <tr><td><code>GET /api/analyses/:id/brief</code></td><td>Report as Markdown</td></tr>
          <tr><td><code>GET /api/analyses/:id</code></td><td>Report as JSON (<code>?reviews=1</code> adds the sampled reviews)</td></tr>
          <tr><td><code>POST /api/discover</code></td><td>Games to study for a description: <code>{`{ description }`}</code></td></tr>
          <tr><td><code>GET /api/sources/:id/reviews</code></td><td>Search reviews: <code>q</code>, <code>sentiment</code>, <code>minHours</code>, <code>maxHours</code>, <code>limit</code></td></tr>
        </tbody>
      </table>
    </Prose>
  );
}
