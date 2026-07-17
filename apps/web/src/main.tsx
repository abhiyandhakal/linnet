import { QueryClient, QueryClientProvider, useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { createRoot } from "react-dom/client";
import { createApi } from "@linnet/api-client";
import { createAuthClient } from "better-auth/react";
import "./styles.css";

const apiUrl = import.meta.env.VITE_API_URL ?? "http://localhost:3000";
const authClient = createAuthClient({ baseURL: apiUrl });
const api = createApi({ baseUrl: apiUrl, credentials: "include", getHeaders: () => ({}) });
const client = new QueryClient();

type Goal = { id: string; title: string; why?: string | null; targetDate?: string | null; risk: "on_track" | "watch" | "at_risk"; plan?: { summary: string; revision: number } | null };
const demoGoals: Goal[] = [{ id: "demo", title: "Make Linnet your dependable secretary", why: "A calmer way to keep direction when life gets noisy.", targetDate: "2026-09-01", risk: "watch", plan: { summary: "Establish the first private beta loop.", revision: 1 } }];

function useGoals() {
  return useQuery({ queryKey: ["goals"], queryFn: async () => {
    const { data, error } = await api.v1.goals.get();
    if (error) throw error;
    return data as Goal[];
  }, retry: false });
}

function Composer({ goalId }: { goalId?: string }) {
  const queryClient = useQueryClient();
  const mutation = useMutation({
    mutationFn: async (body: string) => {
      const { data, error } = await api.v1.inbox.post({ body, goalId, clientMutationId: crypto.randomUUID() });
      if (error) throw error; return data;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["now"] })
  });
  return <form className="composer" onSubmit={(event) => { event.preventDefault(); const field = new FormData(event.currentTarget).get("message")?.toString().trim(); if (field) { mutation.mutate(field); event.currentTarget.reset(); } }}>
    <textarea name="message" required placeholder={goalId ? "Update this goal or ask Linnet to adjust the plan…" : "Tell Linnet what changed, what you need, or what is on your mind…"} />
    <div><span>{mutation.isPending ? "Linnet is thinking…" : "Linnet will show what changed and why."}</span><button type="submit">Send to Linnet</button></div>
  </form>;
}

function GoalCard({ goal, onSelect }: { goal: Goal; onSelect: () => void }) {
  return <button className="goal-card" onClick={onSelect}><div className="row"><span className={`pill ${goal.risk}`}>{goal.risk.replace("_", " ")}</span><span className="date">{goal.targetDate ? new Date(goal.targetDate).toLocaleDateString(undefined, { month: "short", day: "numeric" }) : "No target date"}</span></div><h3>{goal.title}</h3><p>{goal.plan?.summary ?? goal.why ?? "Linnet is ready to form a plan."}</p><div className="progress"><i style={{ width: goal.risk === "on_track" ? "72%" : goal.risk === "watch" ? "46%" : "24%" }} /></div></button>;
}

function Now({ onSelect }: { onSelect: (goal: Goal) => void }) {
  const goals = useGoals();
  const items = goals.data?.length ? goals.data : demoGoals;
  const primary = items[0];
  return <section className="page"><header className="welcome"><p className="eyebrow">Friday, July 17</p><h1>Direction, not inventory.</h1><p>Your day should make the plan move.</p></header><div className="hero-card"><p className="eyebrow">Today’s highest-leverage outcome</p><h2>{primary.title}</h2><p>{primary.plan?.summary ?? primary.why}</p><div className="hero-actions"><button onClick={() => onSelect(primary)}>See the plan</button><button className="quiet">Start a focus block</button></div></div><div className="grid two"><section className="panel"><div className="section-head"><h2>Needs attention</h2><span>01</span></div><article className="attention"><b>Plan confidence needs a check</b><p>One focused update will let Linnet recalibrate the next move.</p></article></section><section className="panel"><div className="section-head"><h2>Today</h2><span>Breathing room protected</span></div><article className="agenda"><time>09:30</time><div><b>Focused work</b><p>Linnet-managed block</p></div></article><article className="agenda"><time>16:00</time><div><b>Reflect and update</b><p>Five minutes is enough</p></div></article></section></div></section>;
}

function Goals({ onSelect }: { onSelect: (goal: Goal) => void }) {
  const goals = useGoals(); const items = goals.data?.length ? goals.data : demoGoals;
  return <section className="page"><header className="page-head"><div><p className="eyebrow">Your active direction</p><h1>Goals</h1></div><button className="primary" onClick={() => document.getElementById("global-composer")?.scrollIntoView({ behavior: "smooth" })}>Create with Linnet</button></header><div className="goal-list">{items.map((goal) => <GoalCard key={goal.id} goal={goal} onSelect={() => onSelect(goal)} />)}</div></section>;
}

function GoalWorkspace({ goal, back }: { goal: Goal; back: () => void }) {
  return <section className="page"><button className="back" onClick={back}>← All goals</button><header className="goal-header"><span className={`pill ${goal.risk}`}>{goal.risk.replace("_", " ")}</span><h1>{goal.title}</h1><p>{goal.why}</p></header><div className="tabs"><button className="active">Overview</button><button>Plan</button><button>Timeline</button><button>Context</button><button>History</button></div><div className="grid goal-grid"><section className="panel current"><p className="eyebrow">Current strategy</p><h2>{goal.plan?.summary ?? "Turn this outcome into a small, credible plan."}</h2><p>Linnet maintains the execution layer, so the stable outcome stays clear even when individual actions change.</p><button className="primary">Start the next move</button></section><section className="panel"><p className="eyebrow">Plan revision</p><h2>Revision {goal.plan?.revision ?? 0}</h2><ol className="milestones"><li>Define the meaningful finish state</li><li>Identify the current bottleneck</li><li>Schedule the smallest next move</li></ol></section></div><Composer goalId={goal.id === "demo" ? undefined : goal.id} /></section>;
}

function SimplePage({ title, description }: { title: string; description: string }) { return <section className="page"><header className="page-head"><div><p className="eyebrow">Linnet keeps this connected to your plans</p><h1>{title}</h1></div></header><section className="panel empty"><h2>{description}</h2><p>This surface is ready for live data as soon as the API is connected to PostgreSQL and your invited Google account.</p></section></section>; }

function Calendar() {
  const connect = useMutation({ mutationFn: async () => { const { data, error } = await api.v1.calendar.google.connect.post(); if (error) throw error; return data; }, onSuccess: (data) => { window.location.assign(data.url); } });
  return <section className="page"><header className="page-head"><div><p className="eyebrow">Availability informs the plan</p><h1>Calendar</h1></div></header><section className="panel empty"><h2>Protect your attention, then schedule it.</h2><p>Linnet reads availability and only creates or changes calendar blocks it owns.</p><button className="primary" onClick={() => connect.mutate()}>{connect.isPending ? "Preparing Google…" : "Connect Google Calendar"}</button>{connect.isError && <p>Calendar connection could not start. Confirm the Google OAuth values in your environment.</p>}</section></section>;
}

function SignIn() { return <main className="landing"><div className="brand">linnet</div><div className="landing-copy"><p className="eyebrow">Private beta</p><h1>A secretary for your direction.</h1><p>Goals stay stable. Plans adapt. Linnet keeps the next meaningful move in view.</p><button className="primary" onClick={() => authClient.signIn.social({ provider: "google", callbackURL: window.location.origin })}>Continue with Google</button></div><aside><span>01</span><h2>Goal → plan → progress</h2><p>Not another task list. A living picture of what matters and what moves it forward.</p></aside></main> }

function App() {
  const session = authClient.useSession();
  const [section, setSection] = React.useState("Now"); const [selected, setSelected] = React.useState<Goal | null>(null);
  if (!session.data) return <SignIn />;
  const content = selected ? <GoalWorkspace goal={selected} back={() => setSelected(null)} /> : section === "Now" ? <Now onSelect={setSelected} /> : section === "Goals" ? <Goals onSelect={setSelected} /> : section === "Calendar" ? <Calendar /> : <SimplePage title={section} description={section === "Inbox" ? "A quiet place for every loose thread." : "Reviews describe changes in direction, not task trivia."} />;
  return <div className="app-shell"><aside className="sidebar"><div className="brand">linnet</div><nav>{["Now", "Goals", "Calendar", "Review", "Inbox"].map((item) => <button key={item} className={!selected && section === item ? "selected" : ""} onClick={() => { setSelected(null); setSection(item); }}>{item}</button>)}</nav><div className="profile"><span>{session.data.user.name?.slice(0, 1)}</span><button onClick={() => authClient.signOut()}>Sign out</button></div></aside><main className="content">{content}<div id="global-composer"><Composer /></div></main></div>;
}

import React from "react";
createRoot(document.getElementById("root")!).render(<QueryClientProvider client={client}><App /></QueryClientProvider>);
