import changelog from "../../../../CHANGELOG.md?raw";
import incidents from "../../../../INCIDENTS.md?raw";

/**
 * /status content, imported from the repo-root markdown files rather than
 * copies.
 *
 * The indirection is deliberate. CHANGELOG.md and INCIDENTS.md belong at the
 * repository root — that is where a contributor looks for them, and where
 * they get reviewed in a diff alongside the change they describe. Keeping a
 * second copy inside the frontend so the bundler had a tidier path would
 * guarantee the two drift, and the whole value of an incident log is that it
 * is the same text the operator actually maintains.
 */
export const CHANGELOG_MD = changelog;
export const INCIDENTS_MD = incidents;

/** Strip the leading `# Title` so the page can render its own header without
 *  the document repeating it. */
export const withoutTitle = (md: string): string =>
  md.replace(/^#\s+.*\n+/, "");
