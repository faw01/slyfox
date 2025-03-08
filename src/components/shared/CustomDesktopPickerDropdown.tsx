import React, { useState, useEffect, useRef, KeyboardEvent } from "react"
import { createPortal } from "react-dom"
import { useToast } from "../../contexts/toast"

interface Source {
  id: string
  name: string
  thumbnailURL: string
  displayId?: string
}

interface CustomDesktopPickerDropdownProps {
  value: string | null
  onChange: (sourceId: string, sourceName: string) => void
  onRefresh?: () => void
  className?: string
  placeholder?: string
  type: 'screen' | 'window'
  isDisabled?: boolean
}

const CustomDesktopPickerDropdown: React.FC<CustomDesktopPickerDropdownProps> = ({
  value,
  onChange,
  onRefresh,
  className = "",
  placeholder = "Select a source",
  type,
  isDisabled = false
}) => {
  const { showToast } = useToast()
  const [isOpen, setIsOpen] = useState(false)
  const [sources, setSources] = useState<Source[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [selectedSourceId, setSelectedSourceId] = useState<string | null>(value)
  const [dropdownPosition, setDropdownPosition] = useState({ top: 0, left: 0, width: 0 })
  const dropdownRef = useRef<HTMLDivElement>(null)
  const optionsRef = useRef<HTMLDivElement>(null)

  // Get source name from ID
  const getSourceName = (id: string | null): string => {
    if (!id) return placeholder
    const source = sources.find(s => s.id === id)
    return source ? source.name : placeholder
  }

  // Fetch sources when component mounts or when dropdown opens
  useEffect(() => {
    if (isOpen) {
      fetchSources()
    }
  }, [isOpen, type])

  const fetchSources = async () => {
    setIsLoading(true);
    setSources([]);
    
    try {
      // Check if window.electronAPI exists
      if (!window.electronAPI) {
        showToast('Error', 'Electron API is not available', 'error');
        return;
      }
      
      let fetchedSources: Source[] = [];
      
      if (type === 'screen') {
        try {
          // Use type assertion to avoid TypeScript errors
          const electronAPI = window.electronAPI as any;
          
          // Check if the function exists before calling it
          if (typeof electronAPI.getScreenSources === 'function') {
            const screenSources = await electronAPI.getScreenSources();
            
            if (screenSources && Array.isArray(screenSources) && screenSources.length > 0) {
              fetchedSources = screenSources;
            } else {
              showToast('No Screens', 'No screens available to capture', 'neutral');
            }
          } else {
            showToast('Error', 'Screen source API is not available', 'error');
          }
        } catch (error) {
          console.error('Error fetching screen sources:', error);
          showToast('Error', 'Failed to get screen sources', 'error');
        }
      } else {
        try {
          // Use type assertion to avoid TypeScript errors
          const electronAPI = window.electronAPI as any;
          
          // Check if the function exists before calling it
          if (typeof electronAPI.getApplicationSources === 'function') {
            const appSources = await electronAPI.getApplicationSources();
            
            if (appSources && Array.isArray(appSources) && appSources.length > 0) {
              fetchedSources = appSources;
            } else {
              showToast('No Applications', 'No application windows available to capture', 'neutral');
            }
          } else {
            showToast('Error', 'Application source API is not available', 'error');
          }
        } catch (error) {
          console.error('Error fetching application sources:', error);
          showToast('Error', 'Failed to get application sources', 'error');
        }
      }
      
      // Update sources state
      setSources(fetchedSources);
      
      // Auto-select the first source if available and none is selected
      if (fetchedSources.length > 0 && !selectedSourceId) {
        setSelectedSourceId(fetchedSources[0].id);
        if (onChange) {
          onChange(fetchedSources[0].id, fetchedSources[0].name);
        }
      }
    } catch (error) {
      console.error('Error in fetchSources:', error);
      showToast('Error', `Failed to get ${type === 'screen' ? 'screens' : 'applications'}`, 'error');
    } finally {
      setIsLoading(false);
    }
  }

  // Update dropdown position when it opens
  useEffect(() => {
    if (isOpen && dropdownRef.current) {
      const rect = dropdownRef.current.getBoundingClientRect()
      const windowHeight = window.innerHeight
      const windowWidth = window.innerWidth
      
      // Calculate appropriate dropdown width - use at least 300px or the width of the dropdown trigger
      const dropdownWidth = Math.max(rect.width, 300)
      
      // Calculate available space
      const spaceBelow = windowHeight - rect.bottom - 20 // 20px buffer
      const spaceAbove = rect.top - 20 // 20px buffer
      
      // Set a reasonable max height (70vh or available space)
      const maxHeight = Math.min(windowHeight * 0.7, Math.max(spaceBelow, spaceAbove))
      
      // Determine if dropdown should open upward or downward
      const openUpward = spaceBelow < 300 && spaceAbove > spaceBelow
      
      // Calculate position
      let top = openUpward 
        ? Math.max(10, rect.top - maxHeight) // Open upward
        : rect.bottom // Open downward
      
      // Ensure the dropdown doesn't go off-screen horizontally
      let left = rect.left
      if (left + dropdownWidth > windowWidth - 10) {
        left = windowWidth - dropdownWidth - 10 // 10px buffer from the right edge
      }
      
      // Set the dropdown position and dimensions
      setDropdownPosition({
        top: top + window.scrollY,
        left: left + window.scrollX,
        width: dropdownWidth
      })
      
      // Update CSS variable for max height
      document.documentElement.style.setProperty('--dropdown-max-height', `${maxHeight}px`)
    }
  }, [isOpen, sources])
  
  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      // Check if optionsRef exists and contains the click target
      if (optionsRef.current && optionsRef.current.contains(event.target as Node)) {
        return; // Don't close if clicking inside the dropdown options
      }
      
      // Close if clicking outside the dropdown ref (but not if clicking in the options)
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    
    document.addEventListener("mousedown", handleClickOutside)
    return () => {
      document.removeEventListener("mousedown", handleClickOutside)
    }
  }, [])
  
  // Handle dropdown toggle
  const toggleDropdown = () => {
    if (isDisabled) return
    setIsOpen(!isOpen)
  }
  
  // Handle source selection
  const handleSelect = (source: Source) => {
    setSelectedSourceId(source.id);
    onChange(source.id, source.name);
    // Close the dropdown after a short delay to ensure the click event is fully processed
    setTimeout(() => setIsOpen(false), 50);
  }
  
  // Handle refresh button
  const handleRefresh = (e: React.MouseEvent) => {
    // Prevent this click from closing the dropdown
    e.stopPropagation();
    e.preventDefault();
    
    // Fetch new sources
    fetchSources();
    if (onRefresh) onRefresh();
  }
  
  // Handle keyboard navigation
  const handleKeyDown = (e: KeyboardEvent<HTMLDivElement>) => {
    if (isDisabled) return
    
    if (!isOpen && (e.key === "Enter" || e.key === " " || e.key === "ArrowDown")) {
      e.preventDefault()
      setIsOpen(true)
      return
    }
    
    if (!isOpen) return
    
    switch (e.key) {
      case "Escape":
        e.preventDefault()
        setIsOpen(false)
        break
      
      case "Enter":
      case " ":
        e.preventDefault()
        if (selectedSourceId) {
          const selectedSource = sources.find(s => s.id === selectedSourceId)
          if (selectedSource) {
            handleSelect(selectedSource)
          }
        }
        break
    }
  }

  // Handle wheel event to enable scrolling
  const handleWheel = (e: React.WheelEvent<HTMLDivElement>) => {
    // Prevent the wheel event from propagating to parent elements
    e.stopPropagation();
  };

  const getButtonLabel = () => {
    if (value) {
      return getSourceName(value)
    }
    return type === 'screen' ? 'Select Screen to Share' : 'Select Application Window'
  }

  return (
    <div 
      ref={dropdownRef}
      className={`relative ${className}`}
      onKeyDown={handleKeyDown}
      tabIndex={isDisabled ? -1 : 0}
      aria-expanded={isOpen}
      aria-haspopup="listbox"
      role="combobox"
    >
      {/* Dropdown button */}
      <button
        type="button"
        className={`min-w-full flex items-center justify-between px-3 py-1.5 bg-black/20 hover:bg-black/30 border border-white/10 rounded-md text-[11px] text-white/90 transition-colors ${
          isDisabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'
        }`}
        onClick={toggleDropdown}
        disabled={isDisabled}
        aria-label={value ? `Selected: ${getSourceName(value)}` : placeholder}
      >
        <span className="truncate flex items-center">
          {type === 'screen' ? (
            <svg 
              xmlns="http://www.w3.org/2000/svg" 
              className="w-3.5 h-3.5 mr-1.5 text-white/70" 
              viewBox="0 0 24 24" 
              fill="none" 
              stroke="currentColor" 
              strokeWidth="2" 
              strokeLinecap="round" 
              strokeLinejoin="round"
            >
              <rect x="2" y="3" width="20" height="14" rx="2" ry="2" />
              <path d="M8 21h8" />
              <path d="M12 17v4" />
            </svg>
          ) : (
            <svg 
              xmlns="http://www.w3.org/2000/svg" 
              className="w-3.5 h-3.5 mr-1.5 text-white/70" 
              viewBox="0 0 24 24" 
              fill="none" 
              stroke="currentColor" 
              strokeWidth="2" 
              strokeLinecap="round" 
              strokeLinejoin="round"
            >
              <rect x="2" y="3" width="20" height="14" rx="2" ry="2" />
              <line x1="8" y1="21" x2="16" y2="21" />
              <line x1="12" y1="17" x2="12" y2="21" />
            </svg>
          )}
          {getButtonLabel()}
        </span>
        <svg 
          className={`w-3 h-3 transition-transform duration-150 ${isOpen ? 'rotate-180' : ''}`} 
          xmlns="http://www.w3.org/2000/svg" 
          viewBox="0 0 20 20" 
          fill="currentColor"
        >
          <path 
            fillRule="evenodd" 
            d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" 
            clipRule="evenodd" 
          />
        </svg>
      </button>
      
      {/* Dropdown options */}
      {isOpen && createPortal(
        <div
          ref={optionsRef}
          className="fixed z-50 overflow-hidden flex flex-col bg-black/90 border border-white/10 rounded-md shadow-lg"
          style={{
            top: `${dropdownPosition.top}px`,
            left: `${dropdownPosition.left}px`,
            width: `${dropdownPosition.width}px`,
            maxWidth: '90vw',
            maxHeight: 'var(--dropdown-max-height, 70vh)'
          }}
          role="listbox"
          aria-label={`${type === 'screen' ? 'Screen' : 'Application window'} options`}
          onWheel={handleWheel}
          onClick={(e) => e.stopPropagation()} // Prevent clicks from reaching document
        >
          <div className="sticky top-0 px-3 py-1.5 border-b border-white/10 flex justify-between items-center backdrop-blur-md bg-black/80 z-10">
            <h3 className="text-[10px] font-medium text-white/70">
              {type === 'screen' ? 'Select Screen to Share' : 'Select Application Window'}
            </h3>
            <button
              onClick={handleRefresh}
              className="p-0.5 text-white/60 hover:text-white/90 hover:bg-white/10 rounded transition-colors"
              title="Refresh sources"
            >
              <svg 
                xmlns="http://www.w3.org/2000/svg" 
                className="h-3.5 w-3.5" 
                viewBox="0 0 24 24" 
                fill="none" 
                stroke="currentColor" 
                strokeWidth="2" 
                strokeLinecap="round" 
                strokeLinejoin="round"
              >
                <path d="M21.5 2v6h-6M2.5 22v-6h6M2 11.5a10 10 0 0 1 18.8-4.3M22 12.5a10 10 0 0 1-18.8 4.2" />
              </svg>
            </button>
          </div>
          
          <div 
            className="p-2 overflow-y-auto overscroll-contain flex-grow"
            style={{ maxHeight: 'calc(var(--dropdown-max-height, 70vh) - 35px)' }} // 35px is approx header height
            onWheel={e => e.stopPropagation()}
          >
            {isLoading ? (
              <div className="flex justify-center items-center py-6">
                <div className="animate-spin rounded-full h-6 w-6 border-2 border-t-2 border-b-2 border-white/20 border-t-blue-500"></div>
              </div>
            ) : sources.length === 0 ? (
              <div className="text-center py-6">
                <p className="text-[11px] text-white/50 mb-2">
                  No {type === 'screen' ? 'screens' : 'application windows'} available
                </p>
                <button 
                  onClick={handleRefresh}
                  className="px-2 py-1 bg-blue-600/80 hover:bg-blue-600 text-[10px] text-white rounded transition-colors"
                >
                  Refresh
                </button>
              </div>
            ) : (
              <div className="grid grid-cols-1 gap-2">
                {sources.map(source => (
                  <button
                    key={source.id}
                    type="button"
                    className={`p-1.5 rounded transition-all ${
                      selectedSourceId === source.id 
                        ? 'bg-white/20 text-white' 
                        : 'text-white/70 hover:bg-white/10 hover:text-white/90'
                    }`}
                    onClick={(e) => {
                      e.stopPropagation();
                      handleSelect(source);
                    }}
                  >
                    <div className="flex items-center space-x-2">
                      <div className="relative aspect-video w-20 bg-black/40 overflow-hidden rounded">
                        {source.thumbnailURL ? (
                          <img 
                            src={source.thumbnailURL} 
                            alt={source.name}
                            className="w-full h-full object-contain"
                          />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center text-white/50">
                            {type === 'screen' ? 'Screen' : 'Window'}
                          </div>
                        )}
                      </div>
                      <div className="flex-1 text-left">
                        <p className="text-[11px] font-medium truncate" title={source.name}>
                          {source.name}
                        </p>
                        <p className="text-[10px] text-white/50">
                          {type === 'screen' ? 'Screen' : 'Application Window'}
                        </p>
                      </div>
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>,
        document.body
      )}
    </div>
  )
}

export default CustomDesktopPickerDropdown 