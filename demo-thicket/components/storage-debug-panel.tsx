import { useState } from 'react'

import { exportSessionData, importSessionData, resetAllSessionData } from '../data'

export function StorageDebugPanel() {
  const [isOpen, setIsOpen] = useState(false)
  const [importData, setImportData] = useState('')
  const [message, setMessage] = useState('')

  if (import.meta.env.PROD) {
    return null
  }

  const handleReset = () => {
    if (confirm('Are you sure you want to reset all session data? This will clear all courses, enrollments, and messages you have created.')) {
      resetAllSessionData()
      setMessage('Session data reset successfully. Refresh the page to see changes.')
      setTimeout(() => {
        window.location.reload()
      }, 1500)
    }
  }

  const handleExport = () => {
    const data = exportSessionData()
    const json = JSON.stringify(data, null, 2)
    const blob = new Blob([json], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `marketplace-session-${new Date().toISOString().split('T')[0]}.json`
    a.click()
    URL.revokeObjectURL(url)
    setMessage('Session data exported successfully.')
  }

  const handleImport = () => {
    try {
      const data = JSON.parse(importData)
      importSessionData(data)
      setMessage('Session data imported successfully. Refresh the page to see changes.')
      setImportData('')
      setTimeout(() => {
        window.location.reload()
      }, 1500)
    } catch (error) {
      setMessage(`Import failed: ${error instanceof Error ? error.message : 'Invalid JSON'}`)
    }
  }

  const handleEnableDebug = () => {
    if (typeof window !== 'undefined') {
      localStorage.setItem('marketplace_debug', 'true')
      setMessage('Debug mode enabled. Check console for storage operations.')
    }
  }

  const handleDisableDebug = () => {
    if (typeof window !== 'undefined') {
      localStorage.removeItem('marketplace_debug')
      setMessage('Debug mode disabled.')
    }
  }

  const isDebugEnabled = typeof window !== 'undefined' && localStorage.getItem('marketplace_debug') === 'true'

  return (
    <div className="fixed bottom-4 right-4 z-50">
      {isOpen ? (
        <div className="bg-white rounded-lg shadow-2xl border border-gray-200 w-96 max-h-[600px] overflow-y-auto">
          <div className="sticky top-0 bg-white border-b border-gray-200 p-4 flex justify-between items-center">
            <h3 className="font-semibold text-gray-900">Storage Manager</h3>
            <button
              onClick={() => setIsOpen(false)}
              className="text-gray-400 hover:text-gray-600"
            >
              ✕
            </button>
          </div>

          <div className="p-4 space-y-4">
            {message && (
              <div className="p-3 bg-blue-50 border border-blue-200 rounded text-sm text-blue-800">
                {message}
              </div>
            )}

            <div className="space-y-2">
              <h4 className="font-medium text-gray-900 text-sm">Session Data Management</h4>
              <div className="space-y-2">
                <button
                  onClick={handleReset}
                  className="w-full px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700 text-sm font-medium"
                >
                  Reset All Session Data
                </button>
                <button
                  onClick={handleExport}
                  className="w-full px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700 text-sm font-medium"
                >
                  Export Session Data
                </button>
              </div>
            </div>

            <div className="space-y-2">
              <h4 className="font-medium text-gray-900 text-sm">Import Session Data</h4>
              <textarea
                value={importData}
                onChange={(e) => setImportData(e.target.value)}
                placeholder="Paste JSON data here..."
                className="w-full h-32 px-3 py-2 border border-gray-300 rounded text-sm font-mono"
              />
              <button
                onClick={handleImport}
                disabled={!importData.trim()}
                className="w-full px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed text-sm font-medium"
              >
                Import Data
              </button>
            </div>

            <div className="space-y-2">
              <h4 className="font-medium text-gray-900 text-sm">Debug Mode</h4>
              <div className="flex items-center justify-between p-3 bg-gray-50 rounded">
                <span className="text-sm text-gray-700">
                  Debug Logging: {isDebugEnabled ? 'ON' : 'OFF'}
                </span>
                <button
                  onClick={isDebugEnabled ? handleDisableDebug : handleEnableDebug}
                  className={`px-3 py-1 rounded text-xs font-medium ${
                    isDebugEnabled
                      ? 'bg-yellow-600 text-white hover:bg-yellow-700'
                      : 'bg-gray-600 text-white hover:bg-gray-700'
                  }`}
                >
                  {isDebugEnabled ? 'Disable' : 'Enable'}
                </button>
              </div>
              {isDebugEnabled && (
                <p className="text-xs text-gray-500">
                  All storage operations will be logged to the browser console.
                </p>
              )}
            </div>

            <div className="pt-2 border-t border-gray-200">
              <p className="text-xs text-gray-500">
                This panel is only visible in development mode.
              </p>
            </div>
          </div>
        </div>
      ) : (
        <button
          onClick={() => setIsOpen(true)}
          className="bg-gray-900 text-white px-4 py-2 rounded-full shadow-lg hover:bg-gray-800 text-sm font-medium"
          title="Storage Manager"
        >
          💾 Storage
        </button>
      )}
    </div>
  )
}
