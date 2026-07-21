import * as React from "react";
import { createRoot } from "react-dom/client";
import { QueryClient, QueryClientProvider, useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Link, Outlet, RouterProvider, createRootRoute, createRoute, createRouter, useParams } from "@tanstack/react-router";
import { createApi } from "@linnet/api-client";
import { createAuthClient } from "better-auth/react";
import "./styles.css";

const apiUrl = import.meta.env.VITE_API_URL ?? window.location.origin;
const authClient = createAuthClient({ baseURL: apiUrl });
const api = createApi({ baseUrl: apiUrl, credentials: "include" });
const queryClient = new QueryClient();

type Goal = { id: string; title: string; why?: string | null; description?: string | null; targetDate?: string | null; risk: "on_track" | "watch" | "at_risk"; plan?: { summary: string; revision: number } | null };
type Action = { id: string; title: string; status: string; scheduledFor?: string | null; rationale?: string | null };
type Proposal = { id: string; status: string; rationale: string; requiresConfirmation: boolean; createdAt: string; operations: Array<{ id: string; kind: string; payload: Record<string, unknown> }> };

function ErrorState({ error, retry }: { error: unknown; retry?: () => void }) {
  const message = error instanceof Error ? error.message : "Linnet could not load this right now.";
  return <section className="panel empty error"><h2>Something interrupted Linnet.</h2><p>{message}</p>{retry && <button className="primary" onClick={retry}>Try again</button>}</section>;
}

function Loading() { return <section className="panel empty"><p>Loading the current plan…</p></section>; }

function useGoals() {
  return useQuery({ queryKey: ["goals"], queryFn: async () => {
    const { data, error } = await api.api.v1.goals.get();
    if (error) throw new Error("Goals could not be loaded.");
    return data as Goal[];
  }, retry: false });
}

function Composer({ goalId, compact = false }: { goalId?: string; compact?: boolean }) {
  const client = useQueryClient();
  const [jobId, setJobId] = React.useState<string>();
  const send = useMutation({
    mutationFn: async (body: string) => {
      const { data, error } = await api.api.v1.inbox.post({ body, goalId, clientMutationId: crypto.randomUUID() });
      if (error || !data) throw new Error("Linnet could not capture that update.");
      return data as { job?: { id: string } };
    },
    onSuccess: (data) => { setJobId(data.job?.id); void client.invalidateQueries({ queryKey: ["inbox"] }); }
  });
  const job = useQuery({ enabled: Boolean(jobId), queryKey: ["job", jobId], queryFn: async () => {
    const { data, error } = await api.api.v1.jobs({ id: jobId! }).get();
    if (error) throw new Error("The secretary job could not be checked.");
    return data as { status: string };
  }, refetchInterval: (query) => query.state.data?.status === "succeeded" ? false : 1200 });
  React.useEffect(() => { if (job.data?.status === "succeeded") { void client.invalidateQueries(); } }, [job.data?.status, client]);
  return <form className={`composer ${compact ? "compact" : ""}`} onSubmit={(event) => {
    event.preventDefault(); const field = new FormData(event.currentTarget).get("message")?.toString().trim();
    if (field) { send.mutate(field); event.currentTarget.reset(); }
  }}>
    <textarea name="message" required placeholder={goalId ? "Report progress, a blocker, or ask Linnet to revise this plan…" : "Describe an outcome, tell Linnet what changed, or capture a loose thought…"} />
    <div><span>{send.isPending || job.data?.status === "running" ? "Linnet is reasoning…" : job.data?.status === "succeeded" ? "Plan updated. Review the audit in Inbox." : "Linnet will explain each change."}</span><button className="primary" type="submit">Send</button></div>
    {send.isError && <p className="form-error">{send.error.message}</p>}
  </form>;
}

function Landing() {
  const session = authClient.useSession();
  if (session.data) return <Link to="/app" className="landing-continue">Open Linnet</Link>;
  return <main className="landing"><div className="brand">linnet</div><div className="landing-copy"><p className="eyebrow">Private beta</p><h1>A secretary for your direction.</h1><p>Goals stay stable. Plans adapt. Linnet keeps the next meaningful move in view.</p><button className="primary" onClick={() => authClient.signIn.social({ provider: "google", callbackURL: `${window.location.origin}/app` })}>Continue with Google</button></div><aside><span>01</span><h2>Goal → plan → progress</h2><p>Not another task list. A living picture of what matters and what moves it forward.</p></aside></main>;
}

function AppShell() {
  const session = authClient.useSession();
  if (session.isPending) return <main className="landing"><p>Restoring your Linnet session…</p></main>;
  if (!session.data) return <Landing />;
  return <div className="app-shell"><aside className="sidebar"><Link to="/app" className="brand">linnet</Link><nav><Link to="/app" activeProps={{ className: "selected" }}>Now</Link><Link to="/app/goals" activeProps={{ className: "selected" }}>Goals</Link><Link to="/app/inbox" activeProps={{ className: "selected" }}>Inbox</Link></nav><div className="profile"><span>{session.data.user.name?.slice(0, 1) ?? "L"}</span><button onClick={() => authClient.signOut()}>Sign out</button></div></aside><main className="content"><Outlet /></main></div>;
}

function Now() {
  const now = useQuery({ queryKey: ["now"], queryFn: async () => { const { data, error } = await api.api.v1.now.get(); if (error) throw new Error("Today’s direction could not be loaded."); return data as { primaryGoal?: Goal; nextAction?: Action; attentionCount: number }; }, retry: false });
  if (now.isPending) return <main className="content"><Loading /></main>;
  if (now.isError) return <main className="content"><ErrorState error={now.error} retry={() => now.refetch()} /></main>;
  const primary = now.data.primaryGoal;
  return <section className="page"><header className="welcome"><p className="eyebrow">{new Intl.DateTimeFormat(undefined, { weekday: "long", month: "long", day: "numeric" }).format(new Date())}</p><h1>Direction, not inventory.</h1><p>Your day should make the plan move.</p></header>{primary ? <><section className="hero-card"><p className="eyebrow">Today’s highest-leverage outcome</p><h2>{primary.title}</h2><p>{now.data.nextAction ? `Next move: ${now.data.nextAction.title}` : primary.plan?.summary ?? primary.why ?? "Linnet needs one update to form the next move."}</p><div className="hero-actions"><Link to="/app/goals/$goalId/$tab" params={{ goalId: primary.id, tab: "overview" }}>See the plan</Link></div></section><div className="grid two"><section className="panel"><div className="section-head"><h2>Needs attention</h2><span>{String(now.data.attentionCount).padStart(2, "0")}</span></div><p>{now.data.attentionCount ? "Linnet found goals that need a decision, an update, or a smaller next move." : "No plan is signalling risk right now."}</p></section><section className="panel"><div className="section-head"><h2>Next move</h2><span>Plan-led</span></div><p>{now.data.nextAction?.title ?? "Capture your first outcome below and Linnet will make a plan."}</p></section></div></> : <section className="panel empty"><h2>Start with an outcome.</h2><p>Tell Linnet what you want to make true. It will return a small, inspectable plan instead of a task dump.</p></section>}<Composer /></section>;
}

function GoalCard({ goal }: { goal: Goal }) { return <Link to="/app/goals/$goalId/$tab" params={{ goalId: goal.id, tab: "overview" }} className="goal-card"><div className="row"><span className={`pill ${goal.risk}`}>{goal.risk.replace("_", " ")}</span><span className="date">{goal.targetDate ? new Date(goal.targetDate).toLocaleDateString(undefined, { month: "short", day: "numeric" }) : "No target date"}</span></div><h3>{goal.title}</h3><p>{goal.plan?.summary ?? goal.why ?? "Linnet is ready to form a plan."}</p></Link>; }

function Goals() { const goals = useGoals(); if (goals.isPending) return <section className="page"><Loading /></section>; if (goals.isError) return <section className="page"><ErrorState error={goals.error} retry={() => goals.refetch()} /></section>; return <section className="page"><header className="page-head"><div><p className="eyebrow">Your active direction</p><h1>Goals</h1></div></header>{goals.data.length ? <div className="goal-list">{goals.data.map((goal) => <GoalCard key={goal.id} goal={goal} />)}</div> : <section className="panel empty"><h2>No active goals yet.</h2><p>Use the secretary composer to make your first outcome concrete.</p></section>}<Composer compact /></section>; }

function GoalWorkspace() {
  const { goalId, tab } = useParams({ from: "/app/goals/$goalId/$tab" });
  const goal = useQuery({ queryKey: ["goal", goalId], queryFn: async () => { const { data, error } = await api.api.v1.goals({ id: goalId }).get(); if (error) throw new Error("This goal could not be loaded."); return data as unknown as Goal & { milestones: Array<{ id: string; title: string; completedAt?: string | null }>; actions: Action[]; decisions: Array<{ id: string; title: string; rationale?: string | null }>; updates: Array<{ id: string; body: string; createdAt: string }>; history: Array<{ id: string; type: string; createdAt: string }> }; }, retry: false });
  if (goal.isPending) return <section className="page"><Loading /></section>; if (goal.isError) return <section className="page"><ErrorState error={goal.error} retry={() => goal.refetch()} /></section>;
  const data = goal.data; const tabs = ["overview", "plan", "timeline", "context", "history"] as const;
  const body = tab === "plan" ? <ol className="milestones">{data.milestones.length ? data.milestones.map((milestone) => <li key={milestone.id}>{milestone.title}{milestone.completedAt ? " — complete" : ""}</li>) : <li>No milestones have been formed yet.</li>}</ol> : tab === "timeline" ? <section><h2>Execution</h2>{data.actions.length ? <div className="stack">{data.actions.map((action) => <article key={action.id} className="agenda"><span className={`pill ${action.status}`}>{action.status}</span><div><b>{action.title}</b><p>{action.rationale}</p></div></article>)}</div> : <p>No execution actions are needed yet.</p>}</section> : tab === "context" ? <section><h2>Decisions and updates</h2><div className="stack">{[...data.decisions.map((decision) => ({ id: decision.id, title: decision.title, copy: decision.rationale })), ...data.updates.map((update) => ({ id: update.id, title: "Update", copy: update.body }))].map((item) => <article className="attention" key={item.id}><b>{item.title}</b><p>{item.copy}</p></article>) || <p>No supporting context yet.</p>}</div></section> : tab === "history" ? <section><h2>Plan history</h2><div className="stack">{data.history.map((event) => <article className="attention" key={event.id}><b>{event.type.replace(".", " ")}</b><p>{new Date(event.createdAt).toLocaleString()}</p></article>)}</div></section> : <section className="panel current"><p className="eyebrow">Current strategy</p><h2>{data.plan?.summary ?? "Give Linnet one sentence about what success looks like."}</h2><p>{data.why ?? data.description ?? "The outcome remains stable while Linnet changes the execution layer."}</p></section>;
  return <section className="page"><Link to="/app/goals" className="back">← All goals</Link><header className="goal-header"><span className={`pill ${data.risk}`}>{data.risk.replace("_", " ")}</span><h1>{data.title}</h1><p>{data.why}</p></header><div className="tabs">{tabs.map((name) => <Link key={name} to="/app/goals/$goalId/$tab" params={{ goalId, tab: name }} activeProps={{ className: "active" }}>{name[0].toUpperCase() + name.slice(1)}</Link>)}</div><section className="panel">{body}</section><Composer goalId={goalId} /></section>;
}

function Inbox() {
  const client = useQueryClient();
  const inbox = useQuery({ queryKey: ["inbox"], queryFn: async () => { const [inboxResponse, proposalResponse] = await Promise.all([api.api.v1.inbox.get(), api.api.v1.proposals.get()]); if (inboxResponse.error || proposalResponse.error) throw new Error("The secretary audit could not be loaded."); return { captures: inboxResponse.data as unknown as Array<{ id: string; body: string; status: string; createdAt: string }>, proposals: proposalResponse.data as unknown as Proposal[] }; }, retry: false });
  const act = useMutation({ mutationFn: async ({ id, kind }: { id: string; kind: "confirm" | "reject" | "undo" }) => { const result = kind === "confirm" ? await api.api.v1.proposals({ id }).confirm.post() : kind === "reject" ? await api.api.v1.proposals({ id }).reject.post() : await api.api.v1.proposals({ id }).undo.post(); if (result.error) throw new Error("Linnet could not apply that decision."); }, onSuccess: () => client.invalidateQueries() });
  if (inbox.isPending) return <section className="page"><Loading /></section>; if (inbox.isError) return <section className="page"><ErrorState error={inbox.error} retry={() => inbox.refetch()} /></section>;
  return <section className="page"><header className="page-head"><div><p className="eyebrow">Every change is inspectable</p><h1>Inbox</h1></div></header><Composer compact />{inbox.data.proposals.length ? <div className="stack">{inbox.data.proposals.map((proposal) => <article key={proposal.id} className="panel proposal"><div className="row"><span className={`pill ${proposal.status}`}>{proposal.status}</span><time>{new Date(proposal.createdAt).toLocaleString()}</time></div><h2>{proposal.rationale}</h2><ul>{proposal.operations.map((operation) => <li key={operation.id}>{operation.kind.replaceAll("_", " ")}</li>)}</ul>{proposal.status === "pending" && <div className="hero-actions">{proposal.requiresConfirmation ? <button className="primary" onClick={() => act.mutate({ id: proposal.id, kind: "confirm" })}>Confirm change</button> : <button className="primary" onClick={() => act.mutate({ id: proposal.id, kind: "confirm" })}>Apply</button>}<button className="quiet" onClick={() => act.mutate({ id: proposal.id, kind: "reject" })}>Dismiss</button></div>}{proposal.status === "applied" && <button className="quiet" onClick={() => act.mutate({ id: proposal.id, kind: "undo" })}>Undo</button>}</article>)}</div> : <section className="panel empty"><h2>Your inbox is quiet.</h2><p>Captures, secretary changes, and confirmation requests will appear here.</p></section>}</section>;
}

const rootRoute = createRootRoute({ component: () => <Outlet /> });
const landingRoute = createRoute({ getParentRoute: () => rootRoute, path: "/", component: Landing });
const appRoute = createRoute({ getParentRoute: () => rootRoute, path: "app", component: AppShell });
const nowRoute = createRoute({ getParentRoute: () => appRoute, path: "/", component: Now });
const goalsRoute = createRoute({ getParentRoute: () => appRoute, path: "goals", component: Goals });
const goalRoute = createRoute({ getParentRoute: () => appRoute, path: "goals/$goalId/$tab", component: GoalWorkspace });
const inboxRoute = createRoute({ getParentRoute: () => appRoute, path: "inbox", component: Inbox });
const routeTree = rootRoute.addChildren([landingRoute, appRoute.addChildren([nowRoute, goalsRoute, goalRoute, inboxRoute])]);
const router = createRouter({ routeTree });
declare module "@tanstack/react-router" { interface Register { router: typeof router } }

createRoot(document.getElementById("root")!).render(<QueryClientProvider client={queryClient}><RouterProvider router={router} /></QueryClientProvider>);
