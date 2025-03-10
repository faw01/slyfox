/**
 * CustomDropdown - A custom dropdown implementation that ensures proper content protection
 * 
 * This component replaces native HTML select elements with a fully application-rendered alternative.
 * It's designed to be compatible with Electron's content protection feature, ensuring dropdowns
 * are properly hidden during screen sharing or screen recording when content protection is enabled.
 * 
 * The component supports option groups, similar to the native select element's optgroup functionality.
 */

import React, { useState, useEffect, useRef, KeyboardEvent } from "react"
import { createPortal } from "react-dom"

export interface Option {
  value: string;
  label: string;
  title?: string;
}

export interface OptionGroup {
  label: string;
  options: Option[];
}

export interface CustomDropdownProps {
  value: string;
  onChange: (value: string) => void;
  options: OptionGroup[];
  className?: string;
  placeholder?: string;
}

export const CustomDropdown: React.FC<CustomDropdownProps> = ({
  value,
  onChange,
  options,
  className = "",
  placeholder = "Select an option"
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [highlightedIndex, setHighlightedIndex] = useState(-1);
  const [dropdownPosition, setDropdownPosition] = useState({ top: 0, left: 0, width: 0 });
  const dropdownRef = useRef<HTMLDivElement>(null);
  const optionsRef = useRef<HTMLDivElement>(null);
  
  // Find the option with the current value
  const findSelectedOption = (): Option | undefined => {
    for (const group of options) {
      for (const option of group.options) {
        if (option.value === value) {
          return option;
        }
      }
    }
    return undefined;
  };

  const selectedOption = findSelectedOption();
  
  // Flatten all options for keyboard navigation
  const allOptions = options.flatMap(group => group.options);
  
  // Get the current total index for an option based on its group
  const getOptionIndex = (groupIndex: number, optionIndex: number): number => {
    let totalIndex = 0;
    for (let i = 0; i < groupIndex; i++) {
      totalIndex += options[i].options.length;
    }
    return totalIndex + optionIndex;
  };
  
  // Update dropdown position when it opens
  useEffect(() => {
    if (isOpen && dropdownRef.current) {
      const rect = dropdownRef.current.getBoundingClientRect();
      const windowHeight = window.innerHeight;
      const windowWidth = window.innerWidth;
      
      // Estimate the height of the dropdown based on options count
      const estimatedItemHeight = 28; // Average height of an option in pixels
      const estimatedGroupHeaderHeight = 24; // Average height of a group header in pixels
      const totalOptionsCount = options.reduce((sum, group) => sum + group.options.length, 0);
      const totalGroupsCount = options.length;
      const estimatedHeight = (totalOptionsCount * estimatedItemHeight) + 
                              (totalGroupsCount * estimatedGroupHeaderHeight);
      
      // Calculate available space below and above the dropdown
      const spaceBelow = windowHeight - rect.bottom;
      const spaceAbove = rect.top;
      
      // Determine if dropdown should open upward or downward
      const openUpward = estimatedHeight > spaceBelow && spaceAbove > spaceBelow;
      
      // Calculate position
      let top = openUpward 
        ? Math.max(5, rect.top - estimatedHeight) // Keep within viewport, at least 5px from top
        : rect.bottom;
      
      // Ensure the dropdown doesn't go off-screen horizontally
      let left = rect.left;
      if (left + rect.width > windowWidth) {
        left = windowWidth - rect.width - 10; // 10px buffer
      }
      
      // Set the dropdown position
      setDropdownPosition({
        top: top + window.scrollY,
        left: left + window.scrollX,
        width: Math.max(rect.width, 160) // Minimum width of 160px
      });
    }
  }, [isOpen, options]);
  
  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    
    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);
  
  // Handle dropdown toggle
  const toggleDropdown = () => {
    setIsOpen(!isOpen);
    if (!isOpen) {
      // Find and highlight the current selected option when opening
      const index = allOptions.findIndex(option => option.value === value);
      setHighlightedIndex(index);
    }
  };
  
  // Handle option selection
  const handleSelect = (option: Option) => {
    onChange(option.value);
    setIsOpen(false);
  };
  
  // Handle keyboard navigation
  const handleKeyDown = (e: KeyboardEvent<HTMLDivElement>) => {
    if (!isOpen && (e.key === "Enter" || e.key === " " || e.key === "ArrowDown")) {
      e.preventDefault();
      setIsOpen(true);
      return;
    }
    
    if (!isOpen) return;
    
    switch (e.key) {
      case "Escape":
        e.preventDefault();
        setIsOpen(false);
        break;
      
      case "ArrowDown":
        e.preventDefault();
        setHighlightedIndex(prev => {
          const nextIndex = prev < allOptions.length - 1 ? prev + 1 : 0;
          
          // Scroll to the highlighted option
          const highlightedOption = optionsRef.current?.querySelector(`[data-index="${nextIndex}"]`);
          highlightedOption?.scrollIntoView({ block: "nearest" });
          
          return nextIndex;
        });
        break;
      
      case "ArrowUp":
        e.preventDefault();
        setHighlightedIndex(prev => {
          const nextIndex = prev > 0 ? prev - 1 : allOptions.length - 1;
          
          // Scroll to the highlighted option
          const highlightedOption = optionsRef.current?.querySelector(`[data-index="${nextIndex}"]`);
          highlightedOption?.scrollIntoView({ block: "nearest" });
          
          return nextIndex;
        });
        break;
      
      case "Enter":
      case " ":
        e.preventDefault();
        if (highlightedIndex >= 0 && highlightedIndex < allOptions.length) {
          handleSelect(allOptions[highlightedIndex]);
        }
        break;
      
      default:
        // Handle typing the first letter of an option
        const key = e.key.toLowerCase();
        if (key.length === 1 && key.match(/[a-z0-9]/)) {
          const nextOption = allOptions.findIndex((option, index) => 
            index > highlightedIndex && option.label.toLowerCase().startsWith(key)
          );
          
          if (nextOption !== -1) {
            setHighlightedIndex(nextOption);
            // Scroll to the highlighted option
            const highlightedOption = optionsRef.current?.querySelector(`[data-index="${nextOption}"]`);
            highlightedOption?.scrollIntoView({ block: "nearest" });
          } else {
            // If no option found after current position, start from the beginning
            const firstOption = allOptions.findIndex(option => 
              option.label.toLowerCase().startsWith(key)
            );
            
            if (firstOption !== -1) {
              setHighlightedIndex(firstOption);
              // Scroll to the highlighted option
              const highlightedOption = optionsRef.current?.querySelector(`[data-index="${firstOption}"]`);
              highlightedOption?.scrollIntoView({ block: "nearest" });
            }
          }
        }
        break;
    }
  };

  return (
    <div 
      ref={dropdownRef}
      className={`relative ${className}`}
      onKeyDown={handleKeyDown}
      tabIndex={0}
      aria-expanded={isOpen}
      aria-haspopup="listbox"
      role="combobox"
    >
      {/* Dropdown button */}
      <button
        type="button"
        className="min-w-full flex items-center justify-between px-3 py-1.5 bg-black/20 hover:bg-black/30 border border-white/10 rounded-md text-[11px] text-white/90 select-none cursor-default"
        onClick={toggleDropdown}
        aria-label={selectedOption ? `Selected: ${selectedOption.label}` : placeholder}
      >
        <span className="truncate select-none cursor-default">
          {selectedOption ? selectedOption.label : placeholder}
        </span>
        <svg 
          className={`w-3 h-3 transition-transform duration-150 ${isOpen ? 'rotate-180' : ''}`} 
          xmlns="http://www.w3.org/2000/svg" 
          viewBox="0 0 20 20" 
          fill="currentColor"
        >
          <path fillRule="evenodd" d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clipRule="evenodd" />
        </svg>
      </button>
      
      {/* Dropdown options - rendered in a portal to allow extending beyond app boundaries */}
      {isOpen && createPortal(
        <div 
          ref={optionsRef}
          className="fixed z-50 bg-black/90 border border-white/10 rounded-md shadow-lg overflow-y-auto"
          style={{
            top: `${dropdownPosition.top}px`,
            left: `${dropdownPosition.left}px`,
            width: `${dropdownPosition.width}px`,
            maxHeight: '600px', // Set a 600px max height limit
          }}
          role="listbox"
        >
          {options.map((group, groupIndex) => (
            <div key={group.label} className="mb-1 last:mb-0">
              <div className="px-2 py-1 text-[9px] uppercase font-semibold text-white/50 select-none cursor-default">
                {group.label}
              </div>
              {group.options.map((option, optionIndex) => {
                const totalIndex = getOptionIndex(groupIndex, optionIndex);
                return (
                  <div
                    key={option.value}
                    onClick={() => handleSelect(option)}
                    onMouseEnter={() => setHighlightedIndex(totalIndex)}
                    className={`px-3 py-1.5 text-[11px] cursor-default transition-colors select-none ${
                      option.value === value 
                        ? 'bg-white/20 text-white' 
                        : highlightedIndex === totalIndex 
                          ? 'bg-white/10 text-white/90' 
                          : 'text-white/70 hover:bg-white/10 hover:text-white/90'
                    }`}
                    role="option"
                    aria-selected={option.value === value}
                    title={option.title}
                    data-index={totalIndex}
                    tabIndex={-1}
                  >
                    {option.label}
                  </div>
                );
              })}
            </div>
          ))}
          
          {/* Show when no options */}
          {options.length === 0 && (
            <div className="px-3 py-2 text-[11px] text-white/50">No options available</div>
          )}
        </div>,
        document.body
      )}
    </div>
  );
}; 