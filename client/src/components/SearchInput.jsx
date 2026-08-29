import { useState, useEffect, useRef } from 'react';

const SUGGESTIONS = {
  universes: ['Epic Fantasy', 'Cyberpunk', 'Sci-Fi', 'Grimdark', 'Romance', 'Horror', 'Mystery', 'Adventure', 'Historical', 'Thriller'],
  characters: ['Protagonist', 'Antagonist', 'Mentor', 'Sidekick', 'Love Interest', 'Rival', 'Guide'],
  locations: ['Capital City', 'Ancient Ruins', 'Enchanted Forest', 'Mountain Peak', 'Underground', 'Island', 'Desert'],
  codex: ['Character', 'Location', 'Faction', 'Item', 'Event', 'Lore', 'Theme'],
  graveyard: ['Deleted Characters', 'Removed Locations', 'Old Plot Points', 'Unused Items', 'Scrapped Factions'],
  users: ['Architects', 'World Builders', 'Storytellers', 'Creators', 'Designers'],
};

export default function SearchInput({
  value,
  onChange,
  placeholder = 'Search...',
  type = 'universes',
  className = '',
  onClear,
}) {
  const [isOpen, setIsOpen] = useState(false);
  const [filtered, setFiltered] = useState([]);
  const inputRef = useRef(null);
  const containerRef = useRef(null);

  const suggestions = SUGGESTIONS[type] || SUGGESTIONS.universes;

  useEffect(() => {
    if (!value.trim()) {
      setFiltered(suggestions.slice(0, 5));
      return;
    }
    const q = value.toLowerCase();
    const matches = suggestions.filter((s) => s.toLowerCase().includes(q));
    setFiltered(matches.slice(0, 5));
  }, [value, type, suggestions]);

  useEffect(() => {
    function handleClickOutside(e) {
      if (containerRef.current && !containerRef.current.contains(e.target)) {
        setIsOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleSelect = (suggestion) => {
    onChange?.(suggestion);
    setIsOpen(false);
    inputRef.current?.blur();
  };

  return (
    <div ref={containerRef} className={`relative ${className}`}>
      <div className="relative flex items-center">
        <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-on-surface-variant text-[18px] pointer-events-none">
          search
        </span>
        <input
          ref={inputRef}
          type="text"
          value={value}
          onChange={(e) => {
            onChange?.(e.target.value);
            setIsOpen(true);
          }}
          onFocus={() => setIsOpen(true)}
          placeholder={placeholder}
          className="w-full bg-surface-container border border-outline-variant/30 rounded-xl text-on-surface text-sm pl-10 pr-10 py-2.5 focus:outline-none focus:border-primary-container focus:ring-1 focus:ring-primary-container/30 transition-all placeholder:text-on-surface-variant/60"
        />
        {value && (
          <button
            type="button"
            onClick={() => {
              onChange?.('');
              onClear?.();
              inputRef.current?.focus();
            }}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-on-surface-variant hover:text-on-surface transition-colors"
          >
            <span className="material-symbols-outlined text-[18px]">close</span>
          </button>
        )}
      </div>

      {isOpen && filtered.length > 0 && (
        <div className="absolute z-50 mt-2 w-full bg-surface-container border border-outline-variant/30 rounded-xl shadow-2xl overflow-hidden">
          {filtered.map((suggestion, i) => (
            <button
              key={i}
              type="button"
              onClick={() => handleSelect(suggestion)}
              className="w-full text-left px-4 py-2.5 text-sm text-on-surface hover:bg-surface-variant/30 transition-colors flex items-center gap-2"
            >
              <span className="material-symbols-outlined text-[16px] text-on-surface-variant">history</span>
              {suggestion}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
