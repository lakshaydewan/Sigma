import { redirect } from "next/navigation";

/**
 * The editor is always opened for a design, so "/" is just the way in. This
 * stays a page rather than a next.config redirect: without a root page, Next
 * fails to emit the pages-router `_document` the /_not-found build step needs.
 *
 * There is deliberately no loading.tsx beside it — once a loading state has
 * streamed, the flushed 200 can't be turned back into a redirect.
 */
export default function Home() {
  redirect("/dashboard");
}
