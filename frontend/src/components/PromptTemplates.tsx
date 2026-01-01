import { useState, useMemo } from "react";
import {
  FileText,
  Mail,
  Code,
  Lightbulb,
  MessageSquare,
  BookOpen,
  Briefcase,
  Heart,
  Search,
  X,
  Star,
  StarOff,
} from "lucide-react";

export interface PromptTemplate {
  id: string;
  name: string;
  description: string;
  category: string;
  icon: React.ReactNode;
  prompt: string;
  variables: string[];
  isFavorite?: boolean;
}

const DEFAULT_TEMPLATES: PromptTemplate[] = [
  // Writing
  {
    id: "write-email",
    name: "Professional Email",
    description: "Compose a professional email",
    category: "Writing",
    icon: <Mail size={18} />,
    prompt:
      "Write a professional email about {topic}. The tone should be {tone} and addressed to {recipient}.",
    variables: ["topic", "tone", "recipient"],
  },
  {
    id: "write-summary",
    name: "Summarize Text",
    description: "Create a concise summary",
    category: "Writing",
    icon: <FileText size={18} />,
    prompt:
      "Summarize the following text in {length} sentences, focusing on the key points:\n\n{text}",
    variables: ["length", "text"],
  },
  {
    id: "write-blog",
    name: "Blog Post",
    description: "Generate a blog post outline or draft",
    category: "Writing",
    icon: <BookOpen size={18} />,
    prompt:
      "Write a {style} blog post about {topic}. Include an engaging introduction, {sections} main sections, and a conclusion with a call to action.",
    variables: ["style", "topic", "sections"],
  },

  // Coding
  {
    id: "code-explain",
    name: "Explain Code",
    description: "Get a detailed code explanation",
    category: "Coding",
    icon: <Code size={18} />,
    prompt:
      "Explain the following {language} code in detail. Break down what each part does and why:\n\n```{language}\n{code}\n```",
    variables: ["language", "code"],
  },
  {
    id: "code-review",
    name: "Code Review",
    description: "Get feedback on your code",
    category: "Coding",
    icon: <Code size={18} />,
    prompt:
      "Review the following {language} code for best practices, potential bugs, performance issues, and security concerns:\n\n```{language}\n{code}\n```",
    variables: ["language", "code"],
  },
  {
    id: "code-convert",
    name: "Convert Code",
    description: "Convert code between languages",
    category: "Coding",
    icon: <Code size={18} />,
    prompt:
      "Convert the following {from_language} code to {to_language}. Maintain the same functionality and add comments explaining key differences:\n\n```{from_language}\n{code}\n```",
    variables: ["from_language", "to_language", "code"],
  },

  // Ideas
  {
    id: "idea-brainstorm",
    name: "Brainstorm Ideas",
    description: "Generate creative ideas",
    category: "Ideas",
    icon: <Lightbulb size={18} />,
    prompt:
      "Brainstorm {count} creative ideas for {topic}. Consider different perspectives and be innovative.",
    variables: ["count", "topic"],
  },
  {
    id: "idea-pros-cons",
    name: "Pros and Cons",
    description: "Analyze pros and cons",
    category: "Ideas",
    icon: <Lightbulb size={18} />,
    prompt:
      "Create a comprehensive pros and cons list for {decision}. Consider {aspects} aspects of the decision.",
    variables: ["decision", "aspects"],
  },

  // Communication
  {
    id: "comm-response",
    name: "Draft Response",
    description: "Craft a thoughtful response",
    category: "Communication",
    icon: <MessageSquare size={18} />,
    prompt:
      "Help me write a {tone} response to the following message. I want to {goal}:\n\n{message}",
    variables: ["tone", "goal", "message"],
  },
  {
    id: "comm-feedback",
    name: "Give Feedback",
    description: "Structure constructive feedback",
    category: "Communication",
    icon: <MessageSquare size={18} />,
    prompt:
      "Help me give constructive feedback about {topic}. The feedback should be {tone} and actionable. Key points I want to address: {points}",
    variables: ["topic", "tone", "points"],
  },

  // Business
  {
    id: "biz-proposal",
    name: "Business Proposal",
    description: "Write a business proposal",
    category: "Business",
    icon: <Briefcase size={18} />,
    prompt:
      "Write a {style} business proposal for {project}. Include problem statement, proposed solution, timeline, and expected outcomes.",
    variables: ["style", "project"],
  },
  {
    id: "biz-meeting",
    name: "Meeting Agenda",
    description: "Create a meeting agenda",
    category: "Business",
    icon: <Briefcase size={18} />,
    prompt:
      "Create a meeting agenda for a {duration} minute meeting about {topic}. Include {sections} main discussion points and time allocations.",
    variables: ["duration", "topic", "sections"],
  },

  // Personal
  {
    id: "personal-letter",
    name: "Personal Letter",
    description: "Write a heartfelt letter",
    category: "Personal",
    icon: <Heart size={18} />,
    prompt:
      "Help me write a {occasion} letter to {recipient}. I want to express {feelings} and the tone should be {tone}.",
    variables: ["occasion", "recipient", "feelings", "tone"],
  },
];

interface PromptTemplatesProps {
  onSelectTemplate: (template: PromptTemplate, filledPrompt: string) => void;
}

export default function PromptTemplates({
  onSelectTemplate,
}: PromptTemplatesProps): React.ReactElement {
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [selectedTemplate, setSelectedTemplate] =
    useState<PromptTemplate | null>(null);
  const [variableValues, setVariableValues] = useState<Record<string, string>>(
    {},
  );
  const [favorites, setFavorites] = useState<Set<string>>(() => {
    const saved = localStorage.getItem("nexus_favorite_templates");
    return saved ? new Set(JSON.parse(saved)) : new Set();
  });

  const categories = useMemo(() => {
    const cats = new Set(DEFAULT_TEMPLATES.map((t) => t.category));
    return Array.from(cats);
  }, []);

  const filteredTemplates = useMemo(() => {
    return DEFAULT_TEMPLATES.filter((template) => {
      const matchesSearch =
        searchQuery === "" ||
        template.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        template.description.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesCategory =
        selectedCategory === null || template.category === selectedCategory;
      return matchesSearch && matchesCategory;
    }).map((t) => ({ ...t, isFavorite: favorites.has(t.id) }));
  }, [searchQuery, selectedCategory, favorites]);

  const toggleFavorite = (id: string): void => {
    const newFavorites = new Set(favorites);
    if (newFavorites.has(id)) {
      newFavorites.delete(id);
    } else {
      newFavorites.add(id);
    }
    setFavorites(newFavorites);
    localStorage.setItem(
      "nexus_favorite_templates",
      JSON.stringify(Array.from(newFavorites)),
    );
  };

  const handleSelectTemplate = (template: PromptTemplate): void => {
    setSelectedTemplate(template);
    setVariableValues({});
  };

  const handleUseTemplate = (): void => {
    if (!selectedTemplate) return;

    let filledPrompt = selectedTemplate.prompt;
    for (const variable of selectedTemplate.variables) {
      const value = variableValues[variable] || `[${variable}]`;
      filledPrompt = filledPrompt.replace(
        new RegExp(`{${variable}}`, "g"),
        value,
      );
    }

    onSelectTemplate(selectedTemplate, filledPrompt);
    setSelectedTemplate(null);
    setVariableValues({});
  };

  const allVariablesFilled = selectedTemplate?.variables.every(
    (v) => variableValues[v] && variableValues[v].trim() !== "",
  );

  return (
    <div className="h-full flex flex-col">
      {/* Header */}
      <div className="p-4 border-b border-border">
        <h2 className="text-lg font-semibold mb-3">Prompt Templates</h2>

        {/* Search */}
        <div className="relative mb-3">
          <Search
            size={16}
            className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground"
          />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search templates..."
            className="w-full pl-9 pr-4 py-2 bg-muted rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-nexus-500"
          />
        </div>

        {/* Category Filters */}
        <div className="flex flex-wrap gap-2">
          <button
            onClick={() => setSelectedCategory(null)}
            className={`px-3 py-1 text-xs rounded-full transition-colors ${
              selectedCategory === null
                ? "bg-nexus-500 text-white"
                : "bg-muted text-muted-foreground hover:text-foreground"
            }`}
          >
            All
          </button>
          {categories.map((cat) => (
            <button
              key={cat}
              onClick={() => setSelectedCategory(cat)}
              className={`px-3 py-1 text-xs rounded-full transition-colors ${
                selectedCategory === cat
                  ? "bg-nexus-500 text-white"
                  : "bg-muted text-muted-foreground hover:text-foreground"
              }`}
            >
              {cat}
            </button>
          ))}
        </div>
      </div>

      {/* Template List */}
      <div className="flex-1 overflow-y-auto p-4">
        {/* Favorites Section */}
        {favorites.size > 0 &&
          selectedCategory === null &&
          searchQuery === "" && (
            <div className="mb-6">
              <h3 className="text-sm font-medium text-muted-foreground mb-2">
                Favorites
              </h3>
              <div className="space-y-2">
                {filteredTemplates
                  .filter((t) => t.isFavorite)
                  .map((template) => (
                    <TemplateCard
                      key={template.id}
                      template={template}
                      isSelected={selectedTemplate?.id === template.id}
                      onSelect={handleSelectTemplate}
                      onToggleFavorite={toggleFavorite}
                    />
                  ))}
              </div>
            </div>
          )}

        {/* All Templates */}
        <div className="space-y-2">
          {filteredTemplates
            .filter(
              (t) =>
                !t.isFavorite ||
                selectedCategory !== null ||
                searchQuery !== "",
            )
            .map((template) => (
              <TemplateCard
                key={template.id}
                template={template}
                isSelected={selectedTemplate?.id === template.id}
                onSelect={handleSelectTemplate}
                onToggleFavorite={toggleFavorite}
              />
            ))}
        </div>

        {filteredTemplates.length === 0 && (
          <div className="text-center text-muted-foreground py-8">
            No templates found
          </div>
        )}
      </div>

      {/* Variable Input Panel */}
      {selectedTemplate && (
        <div className="border-t border-border p-4 bg-muted/30">
          <div className="flex items-center justify-between mb-3">
            <h3 className="font-medium">{selectedTemplate.name}</h3>
            <button
              onClick={() => setSelectedTemplate(null)}
              className="p-1 hover:bg-muted rounded"
            >
              <X size={16} className="text-muted-foreground" />
            </button>
          </div>

          <div className="space-y-3 mb-4">
            {selectedTemplate.variables.map((variable) => (
              <div key={variable}>
                <label className="block text-sm text-muted-foreground mb-1 capitalize">
                  {variable.replace(/_/g, " ")}
                </label>
                {variable === "text" ||
                variable === "code" ||
                variable === "message" ? (
                  <textarea
                    value={variableValues[variable] || ""}
                    onChange={(e) =>
                      setVariableValues((prev) => ({
                        ...prev,
                        [variable]: e.target.value,
                      }))
                    }
                    className="w-full px-3 py-2 bg-background rounded-lg border border-border text-sm focus:outline-none focus:ring-2 focus:ring-nexus-500 resize-none"
                    rows={3}
                    placeholder={`Enter ${variable}...`}
                  />
                ) : (
                  <input
                    type="text"
                    value={variableValues[variable] || ""}
                    onChange={(e) =>
                      setVariableValues((prev) => ({
                        ...prev,
                        [variable]: e.target.value,
                      }))
                    }
                    className="w-full px-3 py-2 bg-background rounded-lg border border-border text-sm focus:outline-none focus:ring-2 focus:ring-nexus-500"
                    placeholder={`Enter ${variable}...`}
                  />
                )}
              </div>
            ))}
          </div>

          <button
            onClick={handleUseTemplate}
            disabled={!allVariablesFilled}
            className="w-full py-2 bg-nexus-500 text-white rounded-lg hover:bg-nexus-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            Use Template
          </button>
        </div>
      )}
    </div>
  );
}

interface TemplateCardProps {
  template: PromptTemplate;
  isSelected: boolean;
  onSelect: (template: PromptTemplate) => void;
  onToggleFavorite: (id: string) => void;
}

function TemplateCard({
  template,
  isSelected,
  onSelect,
  onToggleFavorite,
}: TemplateCardProps): React.ReactElement {
  return (
    <div
      onClick={() => onSelect(template)}
      className={`p-3 rounded-lg cursor-pointer transition-colors ${
        isSelected
          ? "bg-nexus-500/10 border border-nexus-500"
          : "bg-muted hover:bg-muted/80 border border-transparent"
      }`}
    >
      <div className="flex items-start gap-3">
        <div
          className={`mt-0.5 ${isSelected ? "text-nexus-500" : "text-muted-foreground"}`}
        >
          {template.icon}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <span className="font-medium">{template.name}</span>
            <span className="text-xs px-2 py-0.5 bg-background rounded text-muted-foreground">
              {template.category}
            </span>
          </div>
          <p className="text-sm text-muted-foreground mt-0.5">
            {template.description}
          </p>
        </div>
        <button
          onClick={(e) => {
            e.stopPropagation();
            onToggleFavorite(template.id);
          }}
          className="p-1 hover:bg-background rounded"
        >
          {template.isFavorite ? (
            <Star size={16} className="text-amber-500 fill-amber-500" />
          ) : (
            <StarOff size={16} className="text-muted-foreground" />
          )}
        </button>
      </div>
    </div>
  );
}
