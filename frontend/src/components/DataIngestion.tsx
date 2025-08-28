import { useState } from 'react'
import { Upload, Database, FileText, X, Check, AlertCircle } from 'lucide-react'
import api from '../services/api'
import toast from 'react-hot-toast'

interface DataIngestionProps {
  selectedPersona: string
}

const DataIngestion = ({ selectedPersona }: DataIngestionProps) => {
  const [text, setText] = useState('')
  const [isProcessing, setIsProcessing] = useState(false)
  const [result, setResult] = useState<{ success: boolean; message: string } | null>(null)

  const handleIngest = async () => {
    if (!text.trim()) {
      toast.error('Please enter some text to ingest')
      return
    }

    setIsProcessing(true)
    setResult(null)

    try {
      const response = await api.ingestData({
        text: text.trim(),
        persona: selectedPersona,
      })

      const chunksProcessed = response.data?.chunks_processed ?? response.data?.chunksCreated ?? 0
      const serverMessage = response.data?.message

      setResult({
        success: true,
        message: serverMessage || `Successfully processed ${chunksProcessed} text chunks into embeddings`,
      })
      toast.success('Data ingested successfully!')
      setText('')
    } catch (error: any) {
      console.error('Ingestion error:', error)
      const errorMessage = error.response?.data?.detail || 'Failed to ingest data'
      setResult({
        success: false,
        message: errorMessage,
      })
      toast.error(errorMessage)
    } finally {
      setIsProcessing(false)
    }
  }

  const getCharacterCount = () => text.length
  const getWordCount = () => text.trim().split(/\s+/).filter(word => word.length > 0).length

  return (
    <div className="w-full max-w-[768px] mx-auto mt-6 space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-foreground mb-2">Data Ingestion</h1>
        <p className="text-muted">
          Add training data to enhance the {selectedPersona} persona's knowledge base.
          The text will be processed into embeddings and stored for contextual retrieval.
        </p>
      </div>

      {/* BigQuery Schema Info */}
      <div className="bg-blue-50 border border-blue-200 rounded-xl p-4">
        <div className="flex items-center gap-2 mb-3">
          <Database className="h-5 w-5 text-blue-600" />
          <h2 className="text-lg font-semibold text-foreground">BigQuery Schema</h2>
        </div>
        <p className="text-sm font-mono text-muted mb-3">
          Table: discovery-flow.persona.embeddings
        </p>
        <div className="flex flex-wrap gap-2">
          <span className="bg-blue-100 text-blue-800 text-xs px-2 py-1 rounded">id: STRING</span>
          <span className="bg-blue-100 text-blue-800 text-xs px-2 py-1 rounded">text: STRING</span>
          <span className="bg-blue-100 text-blue-800 text-xs px-2 py-1 rounded">embedding: ARRAY&lt;FLOAT64&gt;</span>
          <span className="bg-blue-100 text-blue-800 text-xs px-2 py-1 rounded">persona: STRING</span>
          <span className="bg-blue-100 text-blue-800 text-xs px-2 py-1 rounded">created_at: TIMESTAMP</span>
        </div>
      </div>

      {/* Text Input Area */}
      <div className="bg-card border border-border rounded-xl p-4">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <FileText className="h-5 w-5 text-muted" />
            <h2 className="text-lg font-semibold text-foreground">Training Text</h2>
          </div>
          <div className="flex items-center gap-4">
            <span className={`text-sm ${getCharacterCount() > 0 ? 'text-accent' : 'text-muted'}`}>
              {getCharacterCount()} characters
            </span>
            <span className={`text-sm ${getWordCount() > 0 ? 'text-accent' : 'text-muted'}`}>
              {getWordCount()} words
            </span>
            {text && (
              <button
                onClick={() => setText('')}
                className="text-muted hover:text-destructive transition-colors"
                disabled={isProcessing}
              >
                <X className="h-4 w-4" />
              </button>
            )}
          </div>
        </div>
        
        <textarea
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder="Paste your training text here. This could be articles, transcripts, documents, or any text that represents the persona's knowledge and speaking style..."
          disabled={isProcessing}
          className="w-full h-64 bg-gray-50 border border-gray-200 rounded-lg p-3 text-sm font-mono resize-none focus:outline-none focus:ring-2 focus:ring-accent focus:border-transparent disabled:opacity-50"
        />
      </div>

      {/* Progress Bar */}
      {isProcessing && (
        <div className="bg-card border border-border rounded-xl p-4">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-10 h-10 rounded-full bg-accent/10 flex items-center justify-center">
              <div className="animate-spin w-5 h-5 border-2 border-accent border-t-transparent rounded-full"></div>
            </div>
            <div>
              <h3 className="font-semibold text-foreground">Processing Text</h3>
              <p className="text-sm text-muted">Generating embeddings and storing in BigQuery...</p>
            </div>
          </div>
          <div className="w-full bg-gray-200 rounded-full h-2">
            <div className="bg-accent h-2 rounded-full animate-pulse w-3/4"></div>
          </div>
        </div>
      )}

      {/* Result Alert */}
      {result && (
        <div className={`border rounded-xl p-4 ${
          result.success 
            ? 'bg-green-50 border-green-200' 
            : 'bg-red-50 border-red-200'
        }`}>
          <div className="flex items-center gap-2">
            {result.success ? (
              <Check className="h-5 w-5 text-green-600" />
            ) : (
              <AlertCircle className="h-5 w-5 text-red-600" />
            )}
            <p className={`text-sm ${result.success ? 'text-green-800' : 'text-red-800'}`}>
              {result.message}
            </p>
          </div>
        </div>
      )}

      {/* Action Buttons */}
      <div className="flex gap-3 justify-end">
        <button
          onClick={() => setText('')}
          disabled={!text || isProcessing}
          className="px-4 py-2 text-sm font-medium text-muted border border-border rounded-lg hover:bg-gray-50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          Clear Text
        </button>
        <button
          onClick={handleIngest}
          disabled={isProcessing || !text.trim()}
          className="px-6 py-2 text-sm font-medium bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
        >
          <Upload className="h-4 w-4" />
          {isProcessing ? 'Processing...' : 'Ingest Data'}
        </button>
      </div>

      {/* Tips Section */}
      <div className="bg-gray-50 border border-gray-200 rounded-xl p-4">
        <h3 className="font-semibold text-foreground mb-3">💡 Tips for Better Results</h3>
        <ul className="space-y-2 text-sm text-muted">
          <li>• Use high-quality, relevant text that represents the persona's knowledge and speaking style</li>
          <li>• Include diverse examples of how the persona communicates and thinks</li>
          <li>• Longer texts (500+ words) generally produce better embeddings</li>
          <li>• Clean, well-structured text works better than raw dumps</li>
        </ul>
      </div>
    </div>
  )
}

export default DataIngestion