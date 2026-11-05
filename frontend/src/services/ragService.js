import { API_URL } from '../config.js'

/**
 * Client service for CogniPulse RAG Pipeline
 */

function getAuthHeaders(token) {
  return {
    'Authorization': `Bearer ${token}`
  }
}

/**
 * Upload and index course material (PDF, DOCX, TXT, MD)
 */
export async function uploadCourseMaterial(roomId, file, title = '', description = '', token) {
  const formData = new FormData()
  formData.append('file', file)
  formData.append('roomId', roomId)
  if (title) formData.append('title', title)
  if (description) formData.append('description', description)

  const res = await fetch(`${API_URL}/rag/materials/upload`, {
    method: 'POST',
    headers: getAuthHeaders(token),
    body: formData
  })

  const data = await res.json()
  if (!res.ok || !data.success) {
    throw new Error(data.error || 'Failed to upload course material')
  }

  return data
}

/**
 * Fetch all course materials and RAG statistics for a room
 */
export async function fetchCourseMaterials(roomId, token) {
  const res = await fetch(`${API_URL}/rag/materials?roomId=${roomId}`, {
    headers: {
      ...getAuthHeaders(token),
      'Content-Type': 'application/json'
    }
  })

  const data = await res.json()
  if (!res.ok || !data.success) {
    throw new Error(data.error || 'Failed to fetch course materials')
  }

  return data
}

/**
 * Delete a course material
 */
export async function deleteCourseMaterial(materialId, token) {
  const res = await fetch(`${API_URL}/rag/materials/${materialId}`, {
    method: 'DELETE',
    headers: {
      ...getAuthHeaders(token),
      'Content-Type': 'application/json'
    }
  })

  const data = await res.json()
  if (!res.ok || !data.success) {
    throw new Error(data.error || 'Failed to delete material')
  }

  return data
}

/**
 * Perform semantic search across the classroom RAG knowledge base
 */
export async function searchRagKnowledgeBase(roomId, query, options = {}, token) {
  const res = await fetch(`${API_URL}/rag/search`, {
    method: 'POST',
    headers: {
      ...getAuthHeaders(token),
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      roomId,
      query,
      docTypes: options.docTypes || ['course_material', 'previous_lecture', 'current_lecture'],
      topK: options.topK || 5
    })
  })

  const data = await res.json()
  if (!res.ok || !data.success) {
    throw new Error(data.error || 'Search query failed')
  }

  return data
}

/**
 * Generate RAG-enhanced questions (MCQ, Coding, Concept)
 */
export async function generateRagQuestions(config, token) {
  const res = await fetch(`${API_URL}/rag/generate-questions`, {
    method: 'POST',
    headers: {
      ...getAuthHeaders(token),
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(config)
  })

  const data = await res.json()
  if (!res.ok || !data.success) {
    throw new Error(data.error || 'Question generation failed')
  }

  return data
}

/**
 * Fetch Student Learning Profile (ALPS, Weak Concepts, Personalized Recommendations)
 */
export async function fetchStudentRagProfile(studentId, roomId, token) {
  const res = await fetch(`${API_URL}/rag/student-profile/${studentId}/${roomId}`, {
    headers: {
      ...getAuthHeaders(token),
      'Content-Type': 'application/json'
    }
  })

  const data = await res.json()
  if (!res.ok || !data.success) {
    throw new Error(data.error || 'Failed to fetch student learning profile')
  }

  return data.profile
}

/**
 * Fetch Class-wide RAG analytics (Class ALPS, Weak Concepts Heatmap)
 */
export async function fetchClassRagAnalytics(roomId, token) {
  const res = await fetch(`${API_URL}/rag/class-analytics/${roomId}`, {
    headers: {
      ...getAuthHeaders(token),
      'Content-Type': 'application/json'
    }
  })

  const data = await res.json()
  if (!res.ok || !data.success) {
    throw new Error(data.error || 'Failed to fetch class RAG analytics')
  }

  return data
}

/**
 * Trigger student performance analysis recalculation
 */
export async function triggerStudentAnalysis(studentId, roomId, token) {
  const res = await fetch(`${API_URL}/rag/analyze-student`, {
    method: 'POST',
    headers: {
      ...getAuthHeaders(token),
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({ studentId, roomId })
  })

  const data = await res.json()
  if (!res.ok || !data.success) {
    throw new Error(data.error || 'Failed to trigger performance analysis')
  }

  return data.profile
}
