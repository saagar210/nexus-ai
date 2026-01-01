import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import {
  Mail,
  FileUser,
  Sparkles,
  PenLine,
  RefreshCw,
  Copy,
  Check,
} from "lucide-react";
import type { WritingMode, WritingResponse } from "../types";
import { generateDrafts, refineDraft } from "../lib/api";

const MODES: {
  id: WritingMode;
  label: string;
  icon: React.ReactNode;
  description: string;
}[] = [
  {
    id: "email_response",
    label: "Email",
    icon: <Mail size={20} />,
    description: "Draft professional emails",
  },
  {
    id: "cover_letter",
    label: "Cover Letter",
    icon: <FileUser size={20} />,
    description: "Job application letters",
  },
  {
    id: "resume",
    label: "Resume",
    icon: <FileUser size={20} />,
    description: "Resume content",
  },
  {
    id: "creative",
    label: "Creative",
    icon: <Sparkles size={20} />,
    description: "Stories, poems, creative writing",
  },
  {
    id: "general",
    label: "General",
    icon: <PenLine size={20} />,
    description: "Any writing task",
  },
];

export default function WritingPage(): React.ReactElement {
  const [selectedMode, setSelectedMode] = useState<WritingMode>("general");
  const [inputText, setInputText] = useState("");
  const [context, setContext] = useState("");
  const [drafts, setDrafts] = useState<string[]>([]);
  const [selectedDraft, setSelectedDraft] = useState(0);
  const [feedback, setFeedback] = useState("");
  const [copied, setCopied] = useState(false);

  const generateMutation = useMutation({
    mutationFn: () =>
      generateDrafts({
        mode: selectedMode,
        input_text: inputText,
        context: context || undefined,
      }),
    onSuccess: (data: WritingResponse) => {
      setDrafts(data.drafts);
      setSelectedDraft(0);
    },
  });

  const refineMutation = useMutation({
    mutationFn: () =>
      refineDraft(drafts[selectedDraft], feedback, selectedMode),
    onSuccess: (data: WritingResponse) => {
      const newDrafts = [...drafts];
      newDrafts[selectedDraft] = data.drafts[0];
      setDrafts(newDrafts);
      setFeedback("");
    },
  });

  const handleCopy = async (): Promise<void> => {
    await navigator.clipboard.writeText(drafts[selectedDraft]);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="h-full flex">
      {/* Mode Selection */}
      <div className="w-64 bg-card border-r border-border p-4">
        <h2 className="font-semibold mb-4">Writing Mode</h2>
        <div className="space-y-2">
          {MODES.map((mode) => (
            <button
              key={mode.id}
              onClick={() => setSelectedMode(mode.id)}
              className={`w-full flex items-center gap-3 p-3 rounded-lg text-left transition-colors ${
                selectedMode === mode.id
                  ? "bg-nexus-500/10 text-nexus-600 border border-nexus-500/30"
                  : "hover:bg-muted"
              }`}
            >
              <div
                className={
                  selectedMode === mode.id
                    ? "text-nexus-500"
                    : "text-muted-foreground"
                }
              >
                {mode.icon}
              </div>
              <div>
                <div className="font-medium text-sm">{mode.label}</div>
                <div className="text-xs text-muted-foreground">
                  {mode.description}
                </div>
              </div>
            </button>
          ))}
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 flex">
        {/* Input Panel */}
        <div className="flex-1 p-6 flex flex-col border-r border-border">
          <h2 className="text-xl font-bold mb-4">
            {MODES.find((m) => m.id === selectedMode)?.label} Assistant
          </h2>

          <div className="space-y-4 flex-1">
            <div>
              <label className="text-sm font-medium text-muted-foreground mb-1 block">
                What do you need?
              </label>
              <textarea
                value={inputText}
                onChange={(e) => setInputText(e.target.value)}
                placeholder={
                  selectedMode === "email_response"
                    ? "Paste the email thread you want to respond to, or describe what you need..."
                    : "Describe what you want to write, or paste content to improve..."
                }
                className="w-full h-40 bg-muted rounded-lg px-4 py-3 focus:outline-none focus:ring-2 focus:ring-nexus-500 resize-none"
              />
            </div>

            <div>
              <label className="text-sm font-medium text-muted-foreground mb-1 block">
                Additional Context (optional)
              </label>
              <textarea
                value={context}
                onChange={(e) => setContext(e.target.value)}
                placeholder="Add any relevant context, tone preferences, or specific requirements..."
                className="w-full h-24 bg-muted rounded-lg px-4 py-3 focus:outline-none focus:ring-2 focus:ring-nexus-500 resize-none"
              />
            </div>

            <button
              onClick={() => generateMutation.mutate()}
              disabled={!inputText.trim() || generateMutation.isPending}
              className="w-full bg-nexus-500 text-white rounded-lg px-4 py-3 font-medium hover:bg-nexus-600 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              {generateMutation.isPending ? (
                <>
                  <RefreshCw size={18} className="animate-spin" />
                  Generating...
                </>
              ) : (
                <>
                  <Sparkles size={18} />
                  Generate Drafts
                </>
              )}
            </button>
          </div>
        </div>

        {/* Output Panel */}
        <div className="flex-1 p-6 flex flex-col">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-bold">Generated Drafts</h2>
            {drafts.length > 0 && (
              <div className="flex items-center gap-2">
                {drafts.map((_, idx) => (
                  <button
                    key={idx}
                    onClick={() => setSelectedDraft(idx)}
                    className={`w-8 h-8 rounded-lg text-sm font-medium ${
                      selectedDraft === idx
                        ? "bg-nexus-500 text-white"
                        : "bg-muted hover:bg-muted/80"
                    }`}
                  >
                    {idx + 1}
                  </button>
                ))}
              </div>
            )}
          </div>

          {drafts.length > 0 ? (
            <div className="flex-1 flex flex-col">
              <div className="flex-1 bg-muted rounded-lg p-4 overflow-auto mb-4">
                <div className="whitespace-pre-wrap">
                  {drafts[selectedDraft]}
                </div>
              </div>

              <div className="flex items-center gap-2 mb-4">
                <button
                  onClick={handleCopy}
                  className="flex items-center gap-2 px-4 py-2 bg-muted rounded-lg hover:bg-muted/80"
                >
                  {copied ? (
                    <Check size={16} className="text-green-500" />
                  ) : (
                    <Copy size={16} />
                  )}
                  {copied ? "Copied!" : "Copy"}
                </button>
              </div>

              <div className="border-t border-border pt-4">
                <label className="text-sm font-medium text-muted-foreground mb-1 block">
                  Refinement Feedback
                </label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={feedback}
                    onChange={(e) => setFeedback(e.target.value)}
                    placeholder="Make it shorter, more formal, add specific details..."
                    className="flex-1 bg-muted rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-nexus-500"
                  />
                  <button
                    onClick={() => refineMutation.mutate()}
                    disabled={!feedback.trim() || refineMutation.isPending}
                    className="bg-nexus-500 text-white rounded-lg px-4 py-2 hover:bg-nexus-600 disabled:opacity-50 flex items-center gap-2"
                  >
                    {refineMutation.isPending ? (
                      <RefreshCw size={16} className="animate-spin" />
                    ) : (
                      <RefreshCw size={16} />
                    )}
                    Refine
                  </button>
                </div>
              </div>
            </div>
          ) : (
            <div className="flex-1 flex items-center justify-center text-muted-foreground">
              <div className="text-center">
                <PenLine size={48} className="mx-auto mb-4 opacity-50" />
                <p>Enter your requirements and generate drafts</p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
