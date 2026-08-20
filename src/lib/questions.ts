import { useCallback, useEffect, useState } from "preact/hooks";
import { attendee } from "./auth";
import { supabase } from "./supabase";

/**
 * Day-3 discussion questions (spec §3.6). Public read (even for guests --
 * RLS only hides `hidden` rows), verified-attendee submit + upvote. Vote
 * counts are computed client-side from `question_votes`; at conference
 * scale (dozens of questions, ~100 attendees) that's cheap and avoids a
 * separate aggregate view.
 */
export interface QuestionRow {
  id: string;
  attendee_id: string;
  body: string;
  created_at: string;
  hidden: boolean;
  attendees: { name: string | null } | null;
}

export function useQuestions() {
  const [questions, setQuestions] = useState<QuestionRow[]>([]);
  const [voteCounts, setVoteCounts] = useState<Map<string, number>>(new Map());
  const [myVotes, setMyVotes] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    const [{ data: qData, error: qErr }, { data: vData, error: vErr }] = await Promise.all([
      supabase
        .from("questions")
        // "attendees!questions_attendee_id_fkey" disambiguates the embed --
        // question_votes has FKs to both questions and attendees, which
        // creates an implicit many-to-many bridge between them on top of
        // this table's own direct FK, so plain `attendees(name)` is
        // ambiguous to PostgREST (HTTP 300) and silently returns nothing.
        .select("*, attendees!questions_attendee_id_fkey(name)")
        .order("created_at", { ascending: true }),
      supabase.from("question_votes").select("question_id, attendee_id"),
    ]);
    if (qErr) console.error("Failed to load questions", qErr);
    if (vErr) console.error("Failed to load question votes", vErr);
    setError(qErr?.message ?? vErr?.message ?? null);

    // RLS lets admins see hidden rows too (needed for the moderation page),
    // but that means an admin viewing this public-facing page would see a
    // different, misleading picture of what attendees actually see. Filter
    // client-side so this page is always the true attendee view regardless
    // of who's signed in -- moderation (AdminModeration.tsx) is the one
    // place hidden questions should actually show up.
    setQuestions(((qData as QuestionRow[]) ?? []).filter((q) => !q.hidden));

    const counts = new Map<string, number>();
    const mine = new Set<string>();
    const myId = attendee.value?.id;
    for (const v of vData ?? []) {
      counts.set(v.question_id, (counts.get(v.question_id) ?? 0) + 1);
      if (myId && v.attendee_id === myId) mine.add(v.question_id);
    }
    setVoteCounts(counts);
    setMyVotes(mine);
    setLoading(false);
  }, []);

  useEffect(() => {
    load();
    const channel = supabase
      .channel("questions-live")
      .on("postgres_changes", { event: "*", schema: "public", table: "questions" }, load)
      .on("postgres_changes", { event: "*", schema: "public", table: "question_votes" }, load)
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [load]);

  async function submit(body: string): Promise<{ error: string | null }> {
    const a = attendee.value;
    if (!a) return { error: "Verify your email first." };
    const trimmed = body.trim();
    if (!trimmed) return { error: "Question can't be empty." };
    const { error } = await supabase.from("questions").insert({ attendee_id: a.id, body: trimmed });
    return { error: error?.message ?? null };
  }

  async function toggleVote(questionId: string) {
    const a = attendee.value;
    if (!a) return;
    if (myVotes.has(questionId)) {
      const { error } = await supabase
        .from("question_votes")
        .delete()
        .eq("question_id", questionId)
        .eq("attendee_id", a.id);
      if (error) console.error("Failed to remove vote", error);
    } else {
      const { error } = await supabase
        .from("question_votes")
        .insert({ question_id: questionId, attendee_id: a.id });
      if (error) console.error("Failed to add vote", error);
    }
  }

  const sorted = [...questions].sort((a, b) => {
    const diff = (voteCounts.get(b.id) ?? 0) - (voteCounts.get(a.id) ?? 0);
    return diff !== 0 ? diff : a.created_at.localeCompare(b.created_at);
  });

  return { questions: sorted, voteCounts, myVotes, loading, error, submit, toggleVote };
}
