import React, { useRef, useState, DragEvent } from 'react'
import { UploadCloud, Trash2 } from 'lucide-react'

const UploadPage: React.FC = () => {
  const [files, setFiles] = useState<File[]>([])
  const inputRef = useRef<HTMLInputElement | null>(null)

  const handleFiles = (selected: FileList | null) => {
    if (!selected) return
    setFiles((prev) => [...prev, ...Array.from(selected)])
  }

  const onDrop = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault()
    handleFiles(e.dataTransfer.files)
  }

  const onSelectClick = () => {
    inputRef.current?.click()
  }

  const removeFile = (index: number) => {
    setFiles((prev) => prev.filter((_, i) => i !== index))
  }

  const upload = () => {
    // stub: replace with real upload logic
    console.log('Uploading', files)
    alert(`Uploading ${files.length} file(s)`)
  }

  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-6">
      <div
        className="w-full max-w-md p-6 border-2 border-dashed border-gray-600 rounded-lg text-center text-gray-400 hover:border-gray-400 cursor-pointer"
        onClick={onSelectClick}
        onDragOver={(e) => e.preventDefault()}
        onDrop={onDrop}
      >
        <UploadCloud className="mx-auto mb-4 w-12 h-12 text-gray-500" />
        <p className="mb-2">Drag & drop files here</p>
        <p className="underline">or click to select</p>
        <input
          ref={inputRef}
          type="file"
          multiple
          className="hidden"
          onChange={(e) => handleFiles(e.target.files)}
        />
      </div>

      {files.length > 0 && (
        <div className="w-full max-w-md mt-6 bg-gray-700 rounded-lg p-4">
          <h2 className="text-gray-200 font-medium mb-2">Selected Files</h2>
          <ul className="space-y-2 max-h-48 overflow-y-auto">
            {files.map((file, idx) => (
              <li
                key={idx}
                className="flex justify-between items-center bg-gray-800 rounded px-3 py-2"
              >
                <span className="truncate text-gray-300">{file.name}</span>
                <button onClick={() => removeFile(idx)}>
                  <Trash2 className="w-5 h-5 text-red-400 hover:text-red-600" />
                </button>
              </li>
            ))}
          </ul>
          <button
            onClick={upload}
            disabled={files.length === 0}
            className="mt-4 w-full px-4 py-2 bg-blue-600 text-white font-semibold rounded hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Upload {files.length} File{files.length > 1 ? 's' : ''}
          </button>
        </div>
      )}
    </div>
  )
}

export default UploadPage
