import React, { useState, useEffect } from 'react'
import { useToast } from '../../contexts/toast'

interface Source {
  id: string
  name: string
  thumbnailURL: string
  displayId?: string
}

interface DesktopPickerDialogProps {
  isOpen: boolean
  onClose: () => void
  onSourceSelect: (sourceId: string, sourceName: string) => void
  type: 'screen' | 'window'
}

const DesktopPickerDialog: React.FC<DesktopPickerDialogProps> = ({
  isOpen,
  onClose,
  onSourceSelect,
  type
}) => {
  const { showToast } = useToast()
  const [sources, setSources] = useState<Source[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [selectedSourceId, setSelectedSourceId] = useState<string | null>(null)

  useEffect(() => {
    if (isOpen) {
      fetchSources()
    }
  }, [isOpen, type])

  const fetchSources = async () => {
    setIsLoading(true)
    try {
      if (window.electronAPI) {
        // Get sources based on type
        // @ts-ignore - The API is defined in the preload script
        const fetchedSources = type === 'screen' 
          ? await window.electronAPI.getScreenSources()
          : await window.electronAPI.getApplicationSources()
          
        setSources(fetchedSources)
        
        // Auto-select the first source if available
        if (fetchedSources.length > 0 && !selectedSourceId) {
          setSelectedSourceId(fetchedSources[0].id)
        }
      } else {
        showToast('Error', 'Electron API is not available', 'error')
      }
    } catch (error) {
      console.error('Error fetching sources:', error)
      showToast('Error', 'Failed to get available sources', 'error')
    } finally {
      setIsLoading(false)
    }
  }

  const handleSelect = () => {
    if (selectedSourceId) {
      const selectedSource = sources.find(source => source.id === selectedSourceId)
      if (selectedSource) {
        onSourceSelect(selectedSourceId, selectedSource.name)
      }
    }
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50">
      <div className="bg-neutral-900 rounded-lg shadow-xl w-[90%] max-w-3xl max-h-[90vh] overflow-hidden flex flex-col">
        <div className="flex justify-between items-center p-4 border-b border-neutral-700">
          <h2 className="text-lg font-medium text-white">
            {type === 'screen' ? 'Select Screen to Share' : 'Select Application Window'}
          </h2>
          <button 
            onClick={onClose}
            className="text-neutral-400 hover:text-white transition-colors"
            aria-label="Close"
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <line x1="18" y1="6" x2="6" y2="18"></line>
              <line x1="6" y1="6" x2="18" y2="18"></line>
            </svg>
          </button>
        </div>
        
        <div className="p-4 overflow-y-auto flex-grow">
          {isLoading ? (
            <div className="flex justify-center items-center h-64">
              <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
            </div>
          ) : sources.length === 0 ? (
            <div className="text-center py-12">
              <p className="text-neutral-400">No {type === 'screen' ? 'screens' : 'application windows'} available</p>
              <button 
                onClick={fetchSources}
                className="mt-4 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-md transition-colors"
              >
                Refresh
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
              {sources.map(source => (
                <div 
                  key={source.id} 
                  className={`cursor-pointer rounded-lg overflow-hidden border-2 transition-all ${
                    selectedSourceId === source.id 
                      ? 'border-blue-500 shadow-lg shadow-blue-500/20' 
                      : 'border-transparent hover:border-neutral-600'
                  }`}
                  onClick={() => setSelectedSourceId(source.id)}
                >
                  <div className="relative aspect-video bg-black overflow-hidden">
                    <img 
                      src={source.thumbnailURL} 
                      alt={source.name}
                      className="w-full h-full object-contain"
                    />
                  </div>
                  <div className="p-2 bg-neutral-800">
                    <p className="text-sm text-white truncate" title={source.name}>
                      {source.name}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
        
        <div className="p-4 border-t border-neutral-700 flex justify-between">
          <button
            onClick={fetchSources}
            className="px-4 py-2 bg-neutral-700 hover:bg-neutral-600 text-white rounded-md transition-colors flex items-center"
          >
            <span className="mr-2">🔄</span>
            Refresh
          </button>
          <div className="flex gap-3">
            <button
              onClick={onClose}
              className="px-4 py-2 bg-neutral-700 hover:bg-neutral-600 text-white rounded-md transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={handleSelect}
              disabled={!selectedSourceId || isLoading}
              className={`px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-800 disabled:opacity-50 text-white rounded-md transition-colors`}
            >
              Share {selectedSourceId ? sources.find(s => s.id === selectedSourceId)?.name : ''}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

export default DesktopPickerDialog 