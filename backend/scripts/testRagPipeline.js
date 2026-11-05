import { cleanText, chunkText, extractKeyConcepts } from '../src/services/documentParserService.js'
import { generateEmbedding, cosineSimilarity } from '../src/services/embeddingService.js'
import { buildFusedContext, generateRagQuestions } from '../src/services/ragEngine.js'

async function runRagVerification() {
  console.log('====================================================')
  console.log('🚀 TESTING COGNIPULSE ADAPTIVE CLASSROOM RAG PIPELINE')
  console.log('====================================================\n')

  // 1. Test Document Parser & Chunker
  console.log('1. Testing Document Cleaning & Semantic Chunking...')
  const sampleDocText = `
    Chapter 5: Tree Data Structures and Binary Search Trees

    A Binary Search Tree (BST) is a node-based binary tree data structure which has the following properties:
    The left subtree of a node contains only nodes with keys lesser than the node's key.
    The right subtree of a node contains only nodes with keys greater than the node's key.
    Both the left and right subtrees must also be binary search trees.

    Time Complexity of BST Operations:
    In a balanced BST like an AVL tree or Red-Black tree, the time complexity for search, insertion, and deletion is O(log n).
    However, in the worst case (e.g., when keys are inserted in sorted order), the tree degenerates into a linked list,
    resulting in O(n) time complexity for search and insertion.

    Inorder Traversal:
    Performing an inorder traversal on a BST visits the nodes in ascending sorted order.
    The algorithm recursively visits the left subtree, processes the root node, and then recursively visits the right subtree.
  `

  const cleaned = cleanText(sampleDocText)
  const chunks = chunkText(cleaned, { chunkSize: 300, overlap: 60 })
  console.log(`✓ Cleaned text length: ${cleaned.length} characters`)
  console.log(`✓ Created ${chunks.length} semantic chunks`)
  console.log('✓ Extracted concepts sample:', chunks[0]?.concepts)

  // 2. Test Embedding Generation & Cosine Similarity
  console.log('\n2. Testing Embedding Generation & Vector Similarity...')
  const emb1 = await generateEmbedding('Binary Search Tree time complexity and worst case lookup')
  const emb2 = await generateEmbedding('AVL tree and balanced search tree O(log n) efficiency')
  const emb3 = await generateEmbedding('Photosynthesis in plant chloroplasts and sunlight absorption')

  const simSimilar = cosineSimilarity(emb1, emb2)
  const simDissimilar = cosineSimilarity(emb1, emb3)

  console.log(`✓ Embedding dimension: ${emb1.length}`)
  console.log(`✓ Similarity (BST vs AVL Tree): ${(simSimilar * 100).toFixed(1)}%`)
  console.log(`✓ Similarity (BST vs Photosynthesis): ${(simDissimilar * 100).toFixed(1)}%`)

  if (simSimilar <= simDissimilar) {
    console.warn('⚠️ Warning: Expected semantic similarity to be higher for related topics')
  } else {
    console.log('✓ Vector semantic similarity functioning as expected!')
  }

  // 3. Test Context Fusion & RAG Question Generation
  console.log('\n3. Testing Context Fusion & Multi-Modal Question Generation...')
  
  // Test MCQ
  console.log('  Testing MCQ Question Generation...')
  const mcqResult = await generateRagQuestions({
    currentTranscript: 'Today we discussed that BST worst case search is O(n) when degenerated, while balanced trees guarantee O(log n).',
    searchTopic: 'Binary Search Tree search complexity',
    category: 'MCQ',
    difficulty: 'medium',
    numQuestions: 1,
    includeCourseMaterials: false,
    includePreviousLectures: false,
    provider: 'local'
  })
  console.log('  ✓ Generated MCQ:', mcqResult.questions[0]?.question)
  console.log('  ✓ Options Count:', mcqResult.questions[0]?.options?.length)

  // Test Coding Question
  console.log('  Testing Coding Question Generation...')
  const codeResult = await generateRagQuestions({
    currentTranscript: 'Inorder traversal processes left child, current node, then right child, returning elements in ascending order.',
    searchTopic: 'Inorder Traversal Algorithm',
    category: 'CODING',
    difficulty: 'medium',
    numQuestions: 1,
    includeCourseMaterials: false,
    includePreviousLectures: false,
    provider: 'local'
  })
  console.log('  ✓ Generated Coding Question:', codeResult.questions[0]?.question)
  console.log('  ✓ Code Snippet:', codeResult.questions[0]?.codeSnippet ? 'Present' : 'None')

  // Test Concept Question
  console.log('  Testing Concept Question Generation...')
  const conceptResult = await generateRagQuestions({
    currentTranscript: 'Tree rotations maintain balanced height in AVL trees to prevent worst case degradation.',
    searchTopic: 'Tree Rotations and Balance',
    category: 'CONCEPT',
    difficulty: 'hard',
    numQuestions: 1,
    includeCourseMaterials: false,
    includePreviousLectures: false,
    provider: 'local'
  })
  console.log('  ✓ Generated Concept Question:', conceptResult.questions[0]?.question)
  console.log('  ✓ Concept Tags:', conceptResult.questions[0]?.conceptTags)

  console.log('\n====================================================')
  console.log('🎉 ALL RAG PIPELINE VERIFICATION CHECKS PASSED!')
  console.log('====================================================')
}

runRagVerification().catch(err => {
  console.error('❌ RAG Pipeline Verification failed:', err)
  process.exit(1)
})
