import { supabase } from "../integrations/supabase/client";

export type Feature = "doubt" | "interview" | "communication";

export type Thread = {
  id: string;
  title: string;
  mode: string | null;
  updated_at: string;
};

export type Message = {
  id: string;
  role: "user" | "assistant" | "system";
  content: string;
  created_at: string;
};

export async function listThreads(feature: Feature): Promise<Thread[]> {
  const { data, error } = await supabase
    .from("threads")
    .select("id, title, mode, updated_at")
    .eq("feature", feature)
    .order("updated_at", { ascending: false });

  if (error) {
    throw new Error(error.message);
  }

  return data ?? [];
}

export async function createThread(
  feature: Feature,
  mode?: string,
): Promise<{ id: string }> {
  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (userError || !user) {
    throw new Error("You must be signed in");
  }

  const title = defaultTitleFor(feature, mode);

  const { data, error } = await supabase
    .from("threads")
    .insert({
      user_id: user.id,
      feature,
      mode: mode ?? null,
      title,
    })
    .select("id")
    .single();

  if (error || !data) {
    throw new Error(error?.message ?? "Failed to create chat");
  }

  return {
    id: data.id,
  };
}

export async function deleteThread(id: string): Promise<void> {
  const { error } = await supabase.from("threads").delete().eq("id", id);

  if (error) {
    throw new Error(error.message);
  }
}

export async function getThreadMessages(threadId: string) {
  const { data: thread, error: threadError } = await supabase
    .from("threads")
    .select("id, feature, mode, title")
    .eq("id", threadId)
    .maybeSingle();

  if (threadError) {
    throw new Error(threadError.message);
  }

  if (!thread) {
    throw new Error("Thread not found");
  }

  const { data: messages, error: messagesError } = await supabase
    .from("messages")
    .select("id, role, content, created_at")
    .eq("thread_id", threadId)
    .order("created_at", {
      ascending: true,
    });

  if (messagesError) {
    throw new Error(messagesError.message);
  }

  return {
    thread,
    messages: (messages ?? []) as Message[],
  };
}

function defaultTitleFor(feature: Feature, mode?: string): string {
  if (feature === "doubt") {
    return "New Doubt";
  }

  if (feature === "interview") {
    if (mode === "technical") {
      return "Technical Interview";
    }

    if (mode === "hr") {
      return "HR Interview";
    }

    return "Mock Interview";
  }

  if (feature === "communication") {
    return "Communication Practice";
  }

  return "New Chat";
}
