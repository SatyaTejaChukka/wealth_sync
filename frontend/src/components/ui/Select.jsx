import React, { useState, useRef, useEffect } from 'react';
import { ChevronDown, Check } from 'lucide-react';
import { cn } from '../../lib/utils';

export function Select({ options, value, onChange = () => {}, placeholder = "Select option", className, size = "default", searchable = false }) {
  const [isOpen, setIsOpen] = useState(false);
  const [search, setSearch] = useState('');
  const containerRef = useRef(null);
  const searchInputRef = useRef(null);

  const selectedOption = options.find(opt => opt.value === value);

  // Close when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (containerRef.current && !containerRef.current.contains(event.target)) {
        setIsOpen(false);
        setSearch('');
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleSelect = (optionValue) => {
    onChange(optionValue);
    setIsOpen(false);
    setSearch('');
  };

  const sizes = {
      default: "h-12 text-sm",
      sm: "h-8 text-xs px-2"
  };

  useEffect(() => {
     if (isOpen && searchable) {
         setTimeout(() => {
            searchInputRef.current?.focus();
         }, 50);
     }
  }, [isOpen, searchable]);

  const filteredOptions = options.filter(opt => 
     opt.label.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className={cn("relative w-full", className)} ref={containerRef}>
      <button
        type="button"
        onClick={() => {
          setIsOpen((prev) => {
            const next = !prev;
            if (!next) {
              setSearch('');
            }
            return next;
          });
        }}
        className={cn(
          "w-full flex items-center justify-between rounded-xl px-4 transition-all duration-200 border",
          sizes[size] || sizes.default,
          isOpen 
            ? "border-emerald-500/50 ring-1 ring-emerald-500/30 bg-zinc-900/80" 
            : "border-zinc-800 bg-zinc-950/50 hover:border-zinc-700 hover:bg-zinc-900/50",
          "text-white"
        )}
      >
        <span className={cn(!selectedOption && "text-zinc-500", "truncate mr-2")}>
          {selectedOption ? selectedOption.label : placeholder}
        </span>
        <ChevronDown 
          size={size === 'sm' ? 14 : 16} 
          className={cn("text-zinc-500 transition-transform duration-200 shrink-0", isOpen && "rotate-180")} 
        />
      </button>

      {isOpen && (
          <div className="absolute z-9999 w-full mt-2 overflow-hidden bg-[#09090b] border border-white/10 rounded-xl shadow-xl shadow-black/50 backdrop-blur-xl animate-fade-in">
            {searchable && (
                <div className="p-2 border-b border-white/5 sticky top-0 bg-[#09090b] z-10">
                    <input
                        ref={searchInputRef}
                        type="text"
                        className="w-full bg-zinc-900/50 border border-zinc-800 rounded-lg px-3 py-1.5 text-sm text-white focus:outline-hidden focus:border-emerald-500/50 transition-colors placeholder:text-zinc-600"
                        placeholder="Search..."
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                        onClick={(e) => e.stopPropagation()}
                    />
                </div>
            )}
            
            <div className="max-h-60 overflow-y-auto py-1 custom-scrollbar">
              {filteredOptions.length === 0 ? (
                  <div className="px-4 py-3 text-xs text-zinc-500 text-center">
                      No results found
                  </div>
              ) : (
                  filteredOptions.map((option) => (
                    <button
                      key={option.value}
                      type="button"
                      onClick={() => handleSelect(option.value)}
                      className={cn(
                        "w-full flex items-center justify-between px-4 py-2.5 text-sm transition-colors",
                        option.value === value 
                          ? "bg-emerald-500/10 text-emerald-400 font-medium" 
                          : "text-zinc-300 hover:bg-white/5 hover:text-white"
                      )}
                    >
                      <span>{option.label}</span>
                      {option.value === value && <Check size={14} className="text-emerald-400" />}
                    </button>
                  ))
              )}
            </div>
          </div>
        )}
    </div>
  );
}
