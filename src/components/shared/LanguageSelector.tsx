import React from "react"
import { CustomDropdown } from "./CustomDropdown"

// Define window global variable
declare global {
  interface Window {
    __LANGUAGE__: string;
  }
}

interface LanguageSelectorProps {
  currentLanguage: string;
  setLanguage: (language: string) => void;
}

// Language options grouped by category
const languageOptions = [
  {
    label: "General Purpose",
    options: [
      { value: "python", label: "Python" },
      { value: "javascript", label: "JavaScript" },
      { value: "typescript", label: "TypeScript" },
      { value: "c", label: "C" },
      { value: "cpp", label: "C++" },
      { value: "csharp", label: "C#" },
      { value: "java", label: "Java" },
      { value: "go", label: "Go" },
      { value: "ruby", label: "Ruby" },
      { value: "rust", label: "Rust" },
      { value: "swift", label: "Swift" },
      { value: "php", label: "PHP" },
      { value: "kotlin", label: "Kotlin" },
      { value: "scala", label: "Scala" },
    ]
  },
  // {
  //   label: "Functional",
  //   options: [
  //     { value: "haskell", label: "Haskell" },
  //     { value: "elixir", label: "Elixir" },
  //   ]
  // },
  // {
  //   label: "Database",
  //   options: [
  //     { value: "sql", label: "SQL" },
  //     { value: "mysql", label: "MySQL" },
  //     { value: "postgresql", label: "PostgreSQL" },
  //     { value: "sqlite", label: "SQLite" },
  //     { value: "mongodb", label: "MongoDB" },
  //     { value: "redis", label: "Redis" },
  //   ]
  // },
  // {
  //   label: "Web Technologies",
  //   options: [
  //     { value: "html", label: "HTML" },
  //     { value: "css", label: "CSS" },
  //     { value: "react", label: "React" },
  //     { value: "vue", label: "Vue" },
  //     { value: "angular", label: "Angular" },
  //     { value: "svelte", label: "Svelte" },
  //     { value: "nextjs", label: "Next.js" },
  //     { value: "graphql", label: "GraphQL" },
  //     { value: "vanilla-js", label: "Vanilla JS" },
  //   ]
  // },
  // {
  //   label: "Scripting & Tools",
  //   options: [
  //     { value: "bash", label: "Bash" },
  //     { value: "powershell", label: "PowerShell" },
  //     { value: "yaml", label: "YAML" },
  //     { value: "json", label: "JSON" },
  //     { value: "markdown", label: "Markdown" },
  //   ]
  // }
];

export const LanguageSelector: React.FC<LanguageSelectorProps> = ({
  currentLanguage,
  setLanguage
}) => {
  const handleLanguageChange = (newLanguage: string) => {
    window.__LANGUAGE__ = newLanguage;
    setLanguage(newLanguage);
  }

  return (
    <div className="flex items-center justify-between mb-3 px-2 space-y-1">
      <span className="text-[11px] leading-none text-white/90">Language</span>
      <CustomDropdown
        value={currentLanguage}
        onChange={handleLanguageChange}
        options={languageOptions}
        className="min-w-[160px]"
        placeholder="Select a language"
      />
    </div>
  )
}
