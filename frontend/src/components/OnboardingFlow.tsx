import { useState, useEffect } from "react";
import {
  Zap,
  MessageSquare,
  FileText,
  Brain,
  Settings,
  ChevronRight,
  ChevronLeft,
  Check,
  Sparkles,
  Shield,
  Cpu,
} from "lucide-react";

interface OnboardingStep {
  id: string;
  title: string;
  description: string;
  icon: React.ReactNode;
  content: React.ReactNode;
}

interface OnboardingFlowProps {
  isOpen: boolean;
  onComplete: () => void;
}

const ONBOARDING_KEY = "nexus_onboarding_completed";

export function useOnboarding(): {
  showOnboarding: boolean;
  setShowOnboarding: (show: boolean) => void;
  completeOnboarding: () => void;
} {
  const [showOnboarding, setShowOnboarding] = useState(false);

  useEffect(() => {
    const completed = localStorage.getItem(ONBOARDING_KEY);
    if (!completed) {
      setShowOnboarding(true);
    }
  }, []);

  const completeOnboarding = (): void => {
    localStorage.setItem(ONBOARDING_KEY, "true");
    setShowOnboarding(false);
  };

  return { showOnboarding, setShowOnboarding, completeOnboarding };
}

export default function OnboardingFlow({
  isOpen,
  onComplete,
}: OnboardingFlowProps): React.ReactElement | null {
  const [currentStep, setCurrentStep] = useState(0);

  const steps: OnboardingStep[] = [
    {
      id: "welcome",
      title: "Welcome to Nexus AI",
      description: "Your personal AI operating system",
      icon: <Zap className="text-white" size={32} />,
      content: (
        <div className="space-y-4">
          <p className="text-muted-foreground">
            Nexus AI is a powerful, privacy-first AI assistant that runs
            entirely on your local machine. No cloud, no data sharing - just you
            and your AI.
          </p>
          <div className="grid grid-cols-2 gap-4 mt-6">
            <div className="flex items-center gap-3 p-3 bg-muted rounded-lg">
              <Shield className="text-green-500" size={20} />
              <span className="text-sm">100% Private</span>
            </div>
            <div className="flex items-center gap-3 p-3 bg-muted rounded-lg">
              <Cpu className="text-blue-500" size={20} />
              <span className="text-sm">Local AI</span>
            </div>
            <div className="flex items-center gap-3 p-3 bg-muted rounded-lg">
              <Brain className="text-purple-500" size={20} />
              <span className="text-sm">Smart Memory</span>
            </div>
            <div className="flex items-center gap-3 p-3 bg-muted rounded-lg">
              <Sparkles className="text-amber-500" size={20} />
              <span className="text-sm">Document AI</span>
            </div>
          </div>
        </div>
      ),
    },
    {
      id: "chat",
      title: "Intelligent Chat",
      description: "Have conversations with context",
      icon: <MessageSquare className="text-white" size={32} />,
      content: (
        <div className="space-y-4">
          <p className="text-muted-foreground">
            Chat with AI that remembers your preferences and learns from your
            conversations. Smart model routing automatically selects the best AI
            for each task.
          </p>
          <ul className="space-y-3 mt-6">
            <li className="flex items-start gap-3">
              <Check className="text-green-500 mt-1" size={16} />
              <span className="text-sm">
                Contextual responses based on your documents
              </span>
            </li>
            <li className="flex items-start gap-3">
              <Check className="text-green-500 mt-1" size={16} />
              <span className="text-sm">
                Upload files directly in chat for analysis
              </span>
            </li>
            <li className="flex items-start gap-3">
              <Check className="text-green-500 mt-1" size={16} />
              <span className="text-sm">
                Streaming responses for real-time feedback
              </span>
            </li>
            <li className="flex items-start gap-3">
              <Check className="text-green-500 mt-1" size={16} />
              <span className="text-sm">
                Keyboard shortcuts for power users
              </span>
            </li>
          </ul>
        </div>
      ),
    },
    {
      id: "documents",
      title: "Document Intelligence",
      description: "Your knowledge base, AI-powered",
      icon: <FileText className="text-white" size={32} />,
      content: (
        <div className="space-y-4">
          <p className="text-muted-foreground">
            Upload documents and let Nexus understand them. Ask questions, get
            summaries, and find information instantly across all your files.
          </p>
          <ul className="space-y-3 mt-6">
            <li className="flex items-start gap-3">
              <Check className="text-green-500 mt-1" size={16} />
              <span className="text-sm">
                PDF, Word, Excel, PowerPoint, and more
              </span>
            </li>
            <li className="flex items-start gap-3">
              <Check className="text-green-500 mt-1" size={16} />
              <span className="text-sm">
                OCR for scanned documents and images
              </span>
            </li>
            <li className="flex items-start gap-3">
              <Check className="text-green-500 mt-1" size={16} />
              <span className="text-sm">
                Semantic search across all documents
              </span>
            </li>
            <li className="flex items-start gap-3">
              <Check className="text-green-500 mt-1" size={16} />
              <span className="text-sm">
                Auto-summarization of long documents
              </span>
            </li>
          </ul>
        </div>
      ),
    },
    {
      id: "memory",
      title: "Persistent Memory",
      description: "AI that remembers you",
      icon: <Brain className="text-white" size={32} />,
      content: (
        <div className="space-y-4">
          <p className="text-muted-foreground">
            Nexus learns your preferences, facts about you, and important
            details from your conversations. It uses this memory to provide
            personalized responses.
          </p>
          <ul className="space-y-3 mt-6">
            <li className="flex items-start gap-3">
              <Check className="text-green-500 mt-1" size={16} />
              <span className="text-sm">
                Automatic fact extraction from conversations
              </span>
            </li>
            <li className="flex items-start gap-3">
              <Check className="text-green-500 mt-1" size={16} />
              <span className="text-sm">
                Preference learning for better responses
              </span>
            </li>
            <li className="flex items-start gap-3">
              <Check className="text-green-500 mt-1" size={16} />
              <span className="text-sm">
                Full control over what's remembered
              </span>
            </li>
            <li className="flex items-start gap-3">
              <Check className="text-green-500 mt-1" size={16} />
              <span className="text-sm">Export and backup your memories</span>
            </li>
          </ul>
        </div>
      ),
    },
    {
      id: "setup",
      title: "Quick Setup",
      description: "Get started in seconds",
      icon: <Settings className="text-white" size={32} />,
      content: (
        <div className="space-y-4">
          <p className="text-muted-foreground">
            Nexus is ready to use! Make sure Ollama is running to enable AI
            features. You can customize settings anytime.
          </p>
          <div className="bg-muted rounded-lg p-4 mt-6 space-y-3">
            <h4 className="font-medium">Quick Tips:</h4>
            <ul className="space-y-2 text-sm text-muted-foreground">
              <li>
                • Press{" "}
                <kbd className="px-1.5 py-0.5 bg-background rounded border">
                  ⌘ K
                </kbd>{" "}
                to open command palette
              </li>
              <li>
                • Press{" "}
                <kbd className="px-1.5 py-0.5 bg-background rounded border">
                  ?
                </kbd>{" "}
                to see all keyboard shortcuts
              </li>
              <li>• Drag & drop files anywhere to upload</li>
              <li>• Use the sidebar to switch between features</li>
            </ul>
          </div>
        </div>
      ),
    },
  ];

  const handleNext = (): void => {
    if (currentStep < steps.length - 1) {
      setCurrentStep(currentStep + 1);
    } else {
      onComplete();
    }
  };

  const handlePrev = (): void => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1);
    }
  };

  const handleSkip = (): void => {
    onComplete();
  };

  if (!isOpen) return null;

  const step = steps[currentStep];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-background">
      <div className="w-full max-w-2xl p-8">
        {/* Progress */}
        <div className="flex items-center justify-center gap-2 mb-8">
          {steps.map((_, idx) => (
            <div
              key={idx}
              className={`h-2 rounded-full transition-all ${
                idx === currentStep
                  ? "w-8 bg-nexus-500"
                  : idx < currentStep
                    ? "w-2 bg-nexus-500/50"
                    : "w-2 bg-muted"
              }`}
            />
          ))}
        </div>

        {/* Content */}
        <div className="text-center mb-8">
          <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-nexus-500 to-nexus-700 flex items-center justify-center mx-auto mb-6">
            {step.icon}
          </div>
          <h1 className="text-3xl font-bold mb-2">{step.title}</h1>
          <p className="text-lg text-muted-foreground">{step.description}</p>
        </div>

        <div className="bg-card rounded-xl border border-border p-6 mb-8">
          {step.content}
        </div>

        {/* Actions */}
        <div className="flex items-center justify-between">
          <button
            onClick={handleSkip}
            className="text-muted-foreground hover:text-foreground transition-colors"
          >
            Skip
          </button>

          <div className="flex items-center gap-3">
            {currentStep > 0 && (
              <button
                onClick={handlePrev}
                className="flex items-center gap-2 px-4 py-2 rounded-lg bg-muted hover:bg-muted/80 transition-colors"
              >
                <ChevronLeft size={16} />
                Back
              </button>
            )}
            <button
              onClick={handleNext}
              className="flex items-center gap-2 px-6 py-2 rounded-lg bg-nexus-500 text-white hover:bg-nexus-600 transition-colors"
            >
              {currentStep === steps.length - 1 ? "Get Started" : "Next"}
              <ChevronRight size={16} />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
