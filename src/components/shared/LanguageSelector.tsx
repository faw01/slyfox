import React from "react"

interface LanguageSelectorProps {
  currentLanguage: string
  setLanguage: (language: string) => void
}

export const LanguageSelector: React.FC<LanguageSelectorProps> = ({
  currentLanguage,
  setLanguage
}) => {
  const handleLanguageChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const newLanguage = e.target.value
    window.__LANGUAGE__ = newLanguage
    setLanguage(newLanguage)
  }

  return (
    <div className="mb-3 px-2 space-y-1">
      <div className="flex items-center justify-between">
        <span className="text-[11px] leading-none text-white/90">Programming Language</span>
        <select
          value={currentLanguage}
          onChange={handleLanguageChange}
          className="bg-white/10 rounded px-2 py-1 text-[11px] leading-none outline-none border border-white/10 focus:border-white/20"
        >
          <optgroup label="General Purpose">
            <option value="python">Python</option>
            <option value="python3">Python3</option>
            <option value="java">Java</option>
            <option value="cpp">C++</option>
            <option value="c">C</option>
            <option value="csharp">C#</option>
            <option value="javascript">JavaScript</option>
            <option value="typescript">TypeScript</option>
            <option value="ruby">Ruby</option>
            <option value="go">Go</option>
            <option value="rust">Rust</option>
            <option value="swift">Swift</option>
            <option value="kotlin">Kotlin</option>
            <option value="scala">Scala</option>
            <option value="php">PHP</option>
            <option value="dart">Dart</option>
          </optgroup>
          <optgroup label="Functional">
            <option value="racket">Racket</option>
            <option value="erlang">Erlang</option>
            <option value="elixir">Elixir</option>
          </optgroup>
          <optgroup label="Database">
            <option value="mysql">MySQL</option>
            <option value="mssql">MS SQL Server</option>
            <option value="oracle">Oracle SQL</option>
            <option value="postgresql">PostgreSQL</option>
          </optgroup>
          <optgroup label="Web Technologies">
            <option value="vanillajs">Vanilla JS</option>
            <option value="react">React</option>
          </optgroup>
          <optgroup label="Scripting & Tools">
            <option value="bash">Bash</option>
            <option value="pandas">Pandas</option>
          </optgroup>
        </select>
      </div>
    </div>
  )
}
