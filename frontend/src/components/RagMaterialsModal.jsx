import React, { useState, useEffect, useRef } from 'react'
import { uploadCourseMaterial, fetchCourseMaterials, deleteCourseMaterial, searchRagKnowledgeBase } from '../services/ragService'

function RagMaterialsModal({ isOpen, onClose, roomId, token }) {
  const [materials, setMaterials] = useState([])
  const [stats, setStats] = useState(null)
  const [isLoading, setIsLoading] = useState(true)
  const [isUploading, setIsUploading] = useState(false)
  const [uploadError, setUploadError] = useState('')
  const [uploadSuccess, setUploadSuccess] = useState('')
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [selectedFile, setSelectedFile] = useState(null)

  // Search test state
  const [searchQuery, setSearchQuery] = useState('')
  const [searchResults, setSearchResults] = useState([])
  const [isSearching, setIsSearching] = useState(false)
  const fileInputRef = useRef(null)

  useEffect(() => {
    if (isOpen && roomId && token) {
      loadMaterials()
    }
  }, [isOpen, roomId, token])

  const loadMaterials = async () => {
    setIsLoading(true)
    try {
      const data = await fetchCourseMaterials(roomId, token)
      setMaterials(data.materials || [])
      setStats(data.stats || null)
    } catch (err) {
      console.error('Error loading materials:', err)
    } finally {
      setIsLoading(false)
    }
  }

  const handleFileChange = (e) => {
    const file = e.target.files?.[0]
    if (file) {
      setSelectedFile(file)
      if (!title) {
        setTitle(file.name.replace(/\.[^/.]+$/, ''))
      }
      setUploadError('')
    }
  }

  const handleUpload = async (e) => {
    e.preventDefault()
    if (!selectedFile) {
      setUploadError('Please select a file to upload (PDF, DOCX, TXT)')
      return
    }

    setIsUploading(true)
    setUploadError('')
    setUploadSuccess('')

    try {
      const result = await uploadCourseMaterial(roomId, selectedFile, title, description, token)
      setUploadSuccess(`Successfully indexed "${result.material.title}" into ${result.chunksCount} vector chunks!`)
      setSelectedFile(null)
      setTitle('')
      setDescription('')
      if (fileInputRef.current) fileInputRef.current.value = ''
      await loadMaterials()
    } catch (err) {
      setUploadError(err.message || 'Failed to upload and index document')
    } finally {
      setIsUploading(false)
    }
  }

  const handleDelete = async (materialId) => {
    if (!window.confirm('Delete this course material and its vector embeddings?')) return
    try {
      await deleteCourseMaterial(materialId, token)
      await loadMaterials()
    } catch (err) {
      alert(err.message || 'Failed to delete material')
    }
  }

  const handleSearch = async (e) => {
    e.preventDefault()
    if (!searchQuery.trim()) return
    setIsSearching(true)
    try {
      const data = await searchRagKnowledgeBase(roomId, searchQuery, { topK: 4 }, token)
      setSearchResults(data.results || [])
    } catch (err) {
      console.error('Search failed:', err)
    } finally {
      setIsSearching(false)
    }
  }

  if (!isOpen) return null

  return (
    <div style={{
      position: 'fixed',
      inset: 0,
      background: 'rgba(0, 0, 0, 0.75)',
      backdropFilter: 'blur(8px)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: 9999,
      padding: '16px'
    }}>
      <div style={{
        background: 'var(--bg-card)',
        color: 'var(--text-primary)',
        width: '100%',
        maxWidth: '840px',
        maxHeight: '90vh',
        borderRadius: '20px',
        border: '1px solid var(--border-color)',
        boxShadow: '0 20px 60px rgba(0,0,0,0.4)',
        display: 'flex',
        flexDirection: 'column',
        overflow: 'hidden'
      }}>
        {/* Modal Header */}
        <div style={{
          padding: '20px 24px',
          borderBottom: '1px solid var(--border-color)',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          background: 'linear-gradient(135deg, rgba(59, 130, 246, 0.08), rgba(99, 102, 241, 0.08))'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div style={{
              width: '40px',
              height: '40px',
              borderRadius: '12px',
              background: 'linear-gradient(135deg, #3b82f6, #6366f1)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '20px',
              color: 'white'
            }}>
              📚
            </div>
            <div>
              <h2 style={{ margin: 0, fontSize: '18px', fontWeight: 700 }}>Classroom Knowledge Base & RAG Materials</h2>
              <p style={{ margin: '2px 0 0', fontSize: '12px', color: 'var(--text-secondary)' }}>
                Upload PDF/DOCX course materials to power intelligent context-fused quiz generation and student recommendations
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            style={{
              background: 'transparent',
              border: 'none',
              fontSize: '24px',
              cursor: 'pointer',
              color: 'var(--text-secondary)',
              lineHeight: 1
            }}
          >
            ×
          </button>
        </div>

        {/* Modal Body */}
        <div style={{ padding: '24px', overflowY: 'auto', flex: 1, display: 'flex', flexDirection: 'column', gap: '24px' }}>
          {/* Stats Bar */}
          {stats && (
            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))',
              gap: '12px'
            }}>
              <div style={{
                background: 'var(--bg-primary)',
                padding: '12px 16px',
                borderRadius: '12px',
                border: '1px solid var(--border-color)'
              }}>
                <div style={{ fontSize: '11px', color: 'var(--text-secondary)', textTransform: 'uppercase', fontWeight: 600 }}>Total Vector Chunks</div>
                <div style={{ fontSize: '20px', fontWeight: 800, color: '#3b82f6', marginTop: '2px' }}>{stats.totalChunks}</div>
              </div>
              <div style={{
                background: 'var(--bg-primary)',
                padding: '12px 16px',
                borderRadius: '12px',
                border: '1px solid var(--border-color)'
              }}>
                <div style={{ fontSize: '11px', color: 'var(--text-secondary)', textTransform: 'uppercase', fontWeight: 600 }}>Course Materials</div>
                <div style={{ fontSize: '20px', fontWeight: 800, color: '#10b981', marginTop: '2px' }}>{stats.materialsCount}</div>
              </div>
              <div style={{
                background: 'var(--bg-primary)',
                padding: '12px 16px',
                borderRadius: '12px',
                border: '1px solid var(--border-color)'
              }}>
                <div style={{ fontSize: '11px', color: 'var(--text-secondary)', textTransform: 'uppercase', fontWeight: 600 }}>Lecture Segments Indexed</div>
                <div style={{ fontSize: '20px', fontWeight: 800, color: '#8b5cf6', marginTop: '2px' }}>
                  {(stats.countsByType?.current_lecture || 0) + (stats.countsByType?.previous_lecture || 0)}
                </div>
              </div>
            </div>
          )}

          {/* Upload Form */}
          <div style={{
            background: 'var(--bg-primary)',
            padding: '20px',
            borderRadius: '16px',
            border: '1px dashed var(--border-color)'
          }}>
            <h3 style={{ margin: '0 0 12px', fontSize: '14px', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span>📤</span> Upload & Index New Document (PDF, DOCX, TXT)
            </h3>
            
            <form onSubmit={handleUpload} style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '12px' }}>
                <div>
                  <label style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text-secondary)', display: 'block', marginBottom: '4px' }}>
                    Document File
                  </label>
                  <input
                    type="file"
                    ref={fileInputRef}
                    onChange={handleFileChange}
                    accept=".pdf,.docx,.txt,.md,.pptx,.csv,.json"
                    style={{
                      width: '100%',
                      padding: '8px',
                      borderRadius: '8px',
                      border: '1px solid var(--border-color)',
                      background: 'var(--bg-card)',
                      color: 'var(--text-primary)',
                      fontSize: '13px'
                    }}
                  />
                </div>
                <div>
                  <label style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text-secondary)', display: 'block', marginBottom: '4px' }}>
                    Document Title
                  </label>
                  <input
                    type="text"
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    placeholder="e.g. Chapter 4 - Binary Search Trees"
                    style={{
                      width: '100%',
                      boxSizing: 'border-box',
                      padding: '8px 12px',
                      borderRadius: '8px',
                      border: '1px solid var(--border-color)',
                      background: 'var(--bg-card)',
                      color: 'var(--text-primary)',
                      fontSize: '13px'
                    }}
                  />
                </div>
              </div>

              {uploadError && (
                <div style={{ padding: '8px 12px', background: 'rgba(239, 68, 68, 0.1)', color: '#ef4444', borderRadius: '8px', fontSize: '12px' }}>
                  {uploadError}
                </div>
              )}
              {uploadSuccess && (
                <div style={{ padding: '8px 12px', background: 'rgba(16, 185, 129, 0.1)', color: '#10b981', borderRadius: '8px', fontSize: '12px' }}>
                  {uploadSuccess}
                </div>
              )}

              <button
                type="submit"
                disabled={isUploading || !selectedFile}
                style={{
                  alignSelf: 'flex-start',
                  padding: '10px 20px',
                  borderRadius: '10px',
                  border: 'none',
                  background: isUploading || !selectedFile ? '#94a3b8' : 'linear-gradient(135deg, #3b82f6, #6366f1)',
                  color: 'white',
                  fontWeight: 600,
                  fontSize: '13px',
                  cursor: isUploading || !selectedFile ? 'not-allowed' : 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px'
                }}
              >
                {isUploading ? '⏳ Parsing & Generating Embeddings...' : '⚡ Upload & Generate Embeddings'}
              </button>
            </form>
          </div>

          {/* Indexed Materials List */}
          <div>
            <h3 style={{ margin: '0 0 12px', fontSize: '14px', fontWeight: 600 }}>
              Indexed Materials ({materials.length})
            </h3>
            {isLoading ? (
              <p style={{ color: 'var(--text-secondary)', fontSize: '13px' }}>Loading materials...</p>
            ) : materials.length === 0 ? (
              <div style={{
                textAlign: 'center',
                padding: '24px',
                background: 'var(--bg-primary)',
                borderRadius: '12px',
                color: 'var(--text-secondary)',
                fontSize: '13px'
              }}>
                No course materials uploaded yet. Upload lecture notes, slides, or chapters above to activate RAG!
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                {materials.map((m) => (
                  <div
                    key={m._id}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      padding: '12px 16px',
                      background: 'var(--bg-primary)',
                      borderRadius: '12px',
                      border: '1px solid var(--border-color)'
                    }}
                  >
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <span style={{ fontSize: '14px' }}>
                          {m.fileType === 'pdf' ? '📄' : (m.fileType === 'docx' ? '📝' : '📑')}
                        </span>
                        <span style={{ fontWeight: 600, fontSize: '14px' }}>{m.title}</span>
                        <span style={{
                          fontSize: '11px',
                          padding: '2px 8px',
                          borderRadius: '12px',
                          background: m.status === 'indexed' ? 'rgba(16, 185, 129, 0.15)' : 'rgba(245, 158, 11, 0.15)',
                          color: m.status === 'indexed' ? '#10b981' : '#f59e0b',
                          fontWeight: 700
                        }}>
                          {m.status === 'indexed' ? `✓ ${m.totalChunks} chunks` : m.status}
                        </span>
                      </div>
                      {m.topics && m.topics.length > 0 && (
                        <div style={{ display: 'flex', gap: '4px', flexWrap: 'wrap', marginTop: '6px' }}>
                          {m.topics.slice(0, 5).map((t, idx) => (
                            <span key={idx} style={{ fontSize: '11px', background: 'var(--bg-card)', padding: '2px 6px', borderRadius: '6px', color: 'var(--text-secondary)' }}>
                              #{t}
                            </span>
                          ))}
                        </div>
                      )}
                    </div>
                    <button
                      onClick={() => handleDelete(m._id)}
                      title="Delete material"
                      style={{
                        background: 'transparent',
                        border: 'none',
                        color: '#ef4444',
                        cursor: 'pointer',
                        padding: '6px',
                        fontSize: '16px'
                      }}
                    >
                      🗑️
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Live RAG Vector Search Tester */}
          <div style={{
            background: 'var(--bg-primary)',
            padding: '16px',
            borderRadius: '16px',
            border: '1px solid var(--border-color)'
          }}>
            <h3 style={{ margin: '0 0 10px', fontSize: '14px', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span>🔍</span> Test RAG Knowledge Retrieval
            </h3>
            <form onSubmit={handleSearch} style={{ display: 'flex', gap: '8px', marginBottom: '12px' }}>
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search concepts across materials & lectures..."
                style={{
                  flex: 1,
                  padding: '8px 12px',
                  borderRadius: '8px',
                  border: '1px solid var(--border-color)',
                  background: 'var(--bg-card)',
                  color: 'var(--text-primary)',
                  fontSize: '13px'
                }}
              />
              <button
                type="submit"
                disabled={isSearching || !searchQuery.trim()}
                style={{
                  padding: '8px 16px',
                  borderRadius: '8px',
                  border: 'none',
                  background: '#3b82f6',
                  color: 'white',
                  fontWeight: 600,
                  fontSize: '13px',
                  cursor: 'pointer'
                }}
              >
                {isSearching ? 'Searching...' : 'Search'}
              </button>
            </form>

            {searchResults.length > 0 && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                {searchResults.map((res, i) => (
                  <div key={i} style={{
                    padding: '10px 12px',
                    background: 'var(--bg-card)',
                    borderRadius: '8px',
                    border: '1px solid var(--border-color)',
                    fontSize: '12px'
                  }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px', fontWeight: 600 }}>
                      <span style={{ color: '#3b82f6' }}>{res.chunk.sourceTitle || res.chunk.docType}</span>
                      <span style={{ color: '#10b981' }}>Similarity: {Math.round(res.score * 100)}%</span>
                    </div>
                    <p style={{ margin: 0, color: 'var(--text-secondary)', lineHeight: 1.4 }}>
                      {res.chunk.text}
                    </p>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Modal Footer */}
        <div style={{
          padding: '16px 24px',
          borderTop: '1px solid var(--border-color)',
          display: 'flex',
          justifyContent: 'flex-end',
          background: 'var(--bg-primary)'
        }}>
          <button
            onClick={onClose}
            style={{
              padding: '8px 20px',
              borderRadius: '8px',
              border: '1px solid var(--border-color)',
              background: 'var(--bg-card)',
              color: 'var(--text-primary)',
              fontWeight: 600,
              fontSize: '13px',
              cursor: 'pointer'
            }}
          >
            Done
          </button>
        </div>
      </div>
    </div>
  )
}

export default RagMaterialsModal
