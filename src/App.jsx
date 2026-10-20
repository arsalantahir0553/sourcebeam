import { useEffect, useRef, useState } from 'react'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import './App.css'

const API = import.meta.env.VITE_API_BASE_URL || '/api'
const generalSuggestions = [
  ['Learn a concept', 'Explain FastAPI dependency injection with a simple example.'],
  ['Review an API', 'Give me a checklist for reviewing a production REST API.'],
  ['Write Python', 'Show me a clean async SQLAlchemy query and explain it.'],
]

const documentSuggestions = [
  ['Executive summary', 'Summarize the main ideas in the attached documents.'],
  ['Find evidence', 'What are the most important claims, and what evidence supports each one?'],
  ['Spot gaps', 'Which important questions are not answered by the attached documents?'],
]

function SparkIcon() {
  return <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 2.5c.55 5.2 4.3 8.95 9.5 9.5-5.2.55-8.95 4.3-9.5 9.5-.55-5.2-4.3-8.95-9.5-9.5 5.2-.55 8.95-4.3 9.5-9.5Z" /></svg>
}

function SourcebeamLogo() {
  return <img src="/sourcebeam-logo.png" alt="" aria-hidden="true" />
}

function PlusIcon() {
  return <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 5v14M5 12h14" /></svg>
}

function SendIcon() {
  return <svg viewBox="0 0 24 24" aria-hidden="true"><path d="m5 12 14-7-4.5 14-3-5.5L5 12Z" /><path d="m11.5 13.5 3.2-3.2" /></svg>
}

function StopIcon() {
  return <svg viewBox="0 0 24 24" aria-hidden="true"><rect x="7" y="7" width="10" height="10" rx="2" /></svg>
}

function DocumentIcon() {
  return <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M6 3h8l4 4v14H6z" /><path d="M14 3v5h5M9 12h6M9 16h6" /></svg>
}

function UploadIcon() {
  return <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 16V4M7 9l5-5 5 5M5 15v5h14v-5" /></svg>
}

function ImageIcon() {
  return <svg viewBox="0 0 24 24" aria-hidden="true"><rect x="3" y="4" width="18" height="16" rx="3" /><circle cx="9" cy="10" r="2" /><path d="m5.5 18 4.5-4 3 2.5 2.5-3 3 4.5" /></svg>
}

function SourceIcon() {
  return <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M7 4.5h10a2 2 0 0 1 2 2v11a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2v-11a2 2 0 0 1 2-2Z" /><path d="M8.5 9h7M8.5 12.5h7M8.5 16h4" /></svg>
}

function SourcesButton({ sources, onOpen }) {
  const documentCount = new Set(sources.map((source) => source.document_name)).size
  return <button className="sources-trigger" type="button" onClick={onOpen} aria-label={`View ${sources.length} grounded sources`}><span className="sources-trigger-icon"><SourceIcon /></span><span><strong>{sources.length} grounded {sources.length === 1 ? 'source' : 'sources'}</strong><small>{documentCount} {documentCount === 1 ? 'document' : 'documents'} · View evidence</small></span><b aria-hidden="true">↗</b></button>
}

function SourcesDrawer({ sources, onClose }) {
  const documentCount = new Set(sources.map((source) => source.document_name)).size
  return <div className="drawer-backdrop sources-backdrop" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) onClose() }}><aside className="sources-drawer" role="dialog" aria-modal="true" aria-labelledby="sources-title"><header><div><p className="eyebrow">Verified context</p><h2 id="sources-title">Answer sources</h2></div><button type="button" onClick={onClose} aria-label="Close sources">×</button></header><div className="sources-summary"><span><SourceIcon /></span><div><strong>{sources.length} retrieved passages</strong><small>Across {documentCount} {documentCount === 1 ? 'document' : 'documents'}</small></div></div><p className="sources-intro">These are the exact passages Sourcebeam retrieved before generating this answer. Match scores show semantic relevance, not factual certainty.</p><div className="sources-list">{sources.map((source, index) => { const score = Math.round(source.score * 100); return <article className="source-evidence" key={source.chunk_id}><div className="source-card-head"><span className="source-number">{index + 1}</span><div><strong title={source.document_name}>{source.document_name}</strong><small>Page {source.page_number}</small></div><span className="source-score">{score}% match</span></div><div className="score-track" aria-label={`${score}% semantic match`}><span style={{ width: `${score}%` }} /></div><blockquote>{source.excerpt}</blockquote></article> })}</div><footer><span>Grounded with your knowledge base</span><button type="button" onClick={onClose}>Done</button></footer></aside></div>
}

async function apiFetch(path, options = {}) {
  const isFormData = options.body instanceof FormData
  const response = await fetch(`${API}${path}`, {
    credentials: 'include',
    ...options,
    headers: options.body && !isFormData ? { 'Content-Type': 'application/json', ...options.headers } : options.headers,
  })
  if (!response.ok) {
    let detail = `Request failed (${response.status})`
    try {
      const body = await response.json()
      detail = typeof body.detail === 'string' ? body.detail : detail
    } catch {
      // Use the status-based fallback for non-JSON errors.
    }
    const error = new Error(detail)
    error.status = response.status
    throw error
  }
  return response.status === 204 ? null : response.json()
}

function AuthScreen({ onAuthenticated }) {
  const [mode, setMode] = useState('login')
  const [form, setForm] = useState({ email: '', display_name: '', password: '' })
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)

  const submit = async (event) => {
    event.preventDefault()
    setBusy(true)
    setError('')
    try {
      const body = mode === 'register' ? form : { email: form.email, password: form.password }
      const result = await apiFetch(`/auth/${mode}`, { method: 'POST', body: JSON.stringify(body) })
      onAuthenticated(result.user)
    } catch (requestError) {
      setError(requestError.message)
    } finally {
      setBusy(false)
    }
  }

  return (
    <main className="auth-page">
      <section className="auth-story">
        <div className="brand auth-brand"><span className="brand-mark"><SourcebeamLogo /></span><div><strong>Sourcebeam</strong><span>AI workspace</span></div></div>
        <div className="auth-copy">
          <span className="eyebrow">Private by design</span>
          <h1>Your ideas,<br />in conversation.</h1>
          <p>A focused Gemini workspace backed by FastAPI and PostgreSQL. Conversations stay tied to your account.</p>
        </div>
        <div className="auth-proof"><span /> Secure HttpOnly session <span /> Saved chat history</div>
      </section>
      <section className="auth-form-panel">
        <form className="auth-card" onSubmit={submit}>
          <div className="auth-card-mark"><SparkIcon /></div>
          <p className="eyebrow">{mode === 'login' ? 'Welcome back' : 'Create your workspace'}</p>
          <h2>{mode === 'login' ? 'Sign in to Sourcebeam' : 'Start a new account'}</h2>
          <p className="auth-subtitle">{mode === 'login' ? 'Continue your saved conversations.' : 'Your chats will be private to this account.'}</p>
          {mode === 'register' && <label>Name<input value={form.display_name} onChange={(e) => setForm({ ...form, display_name: e.target.value })} minLength="2" maxLength="80" autoComplete="name" required /></label>}
          <label>Email<input type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} autoComplete="email" required /></label>
          <label>Password<input type="password" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} minLength={mode === 'register' ? 10 : 1} maxLength="128" autoComplete={mode === 'login' ? 'current-password' : 'new-password'} required /></label>
          {error && <div className="form-error" role="alert">{error}</div>}
          <button className="auth-submit" disabled={busy}>{busy ? 'Please wait…' : mode === 'login' ? 'Sign in' : 'Create account'}</button>
          <button className="auth-switch" type="button" onClick={() => { setMode(mode === 'login' ? 'register' : 'login'); setError('') }}>
            {mode === 'login' ? 'New here? Create an account' : 'Already have an account? Sign in'}
          </button>
        </form>
      </section>
    </main>
  )
}

function CodeBlock({ children }) {
  const [copied, setCopied] = useState(false)
  const language = (children?.props?.className || '').replace('language-', '') || 'code'
  const code = String(children?.props?.children || '').replace(/\n$/, '')
  const copyCode = async () => {
    await navigator.clipboard.writeText(code)
    setCopied(true)
    window.setTimeout(() => setCopied(false), 1400)
  }
  return <div className="code-block"><div className="code-toolbar"><span>{language}</span><button type="button" onClick={copyCode}>{copied ? 'Copied' : 'Copy'}</button></div><pre>{children}</pre></div>
}

function MarkdownMessage({ content }) {
  return <div className="markdown-body"><ReactMarkdown remarkPlugins={[remarkGfm]} components={{ pre: CodeBlock, a: ({ children, ...props }) => <a {...props} target="_blank" rel="noreferrer">{children}</a> }}>{content}</ReactMarkdown></div>
}

function MessageImages({ images }) {
  if (!images?.length) return null
  return <div className={`message-images ${images.length > 1 ? 'multiple' : ''}`}>{images.map((image) => <a key={image.id} href={`${API}/images/${image.id}/content`} target="_blank" rel="noreferrer" title={`Open ${image.filename}`}><img src={`${API}/images/${image.id}/content`} alt={image.filename} /></a>)}</div>
}

function documentSummary(document) {
  if (document.status === 'ready') return `${document.page_count} pages · ${document.chunk_count} chunks`
  if (document.status === 'processing') return `Processing · ${document.progress || 0}%`
  return document.error || document.status
}

function App() {
  const [user, setUser] = useState(null)
  const [booting, setBooting] = useState(true)
  const [conversations, setConversations] = useState([])
  const [documents, setDocuments] = useState([])
  const [attachedDocumentIds, setAttachedDocumentIds] = useState([])
  const [documentsOpen, setDocumentsOpen] = useState(false)
  const [selectedSources, setSelectedSources] = useState(null)
  const [uploading, setUploading] = useState(false)
  const [uploadingImage, setUploadingImage] = useState(false)
  const [pendingImages, setPendingImages] = useState([])
  const [activeId, setActiveId] = useState(null)
  const [messages, setMessages] = useState([])
  const [prompt, setPrompt] = useState('')
  const [isStreaming, setIsStreaming] = useState(false)
  const [activeModel, setActiveModel] = useState('Gemini')
  const [statusText, setStatusText] = useState('Ready')
  const [pageError, setPageError] = useState('')
  const endRef = useRef(null)
  const textareaRef = useRef(null)
  const abortRef = useRef(null)
  const fileInputRef = useRef(null)
  const imageInputRef = useRef(null)
  const attachedDocuments = documents.filter((document) => attachedDocumentIds.includes(document.id))
  const hasAttachedDocuments = attachedDocuments.length > 0

  const loadConversations = async () => {
    const items = await apiFetch('/conversations')
    setConversations(items)
    return items
  }

  const loadDocuments = async () => {
    const items = await apiFetch('/documents')
    setDocuments(items)
    return items
  }

  useEffect(() => {
    apiFetch('/auth/me')
      .then(async ({ user: currentUser }) => { setUser(currentUser); await Promise.all([loadConversations(), loadDocuments()]) })
      .catch(() => setUser(null))
      .finally(() => setBooting(false))
  }, [])

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: isStreaming ? 'auto' : 'smooth', block: 'end' })
  }, [messages, isStreaming])

  useEffect(() => {
    if (!user || !documents.some((document) => document.status === 'processing')) return undefined
    const timer = window.setTimeout(async () => {
      try {
        const items = await apiFetch('/documents')
        setDocuments(items)
        if (activeId) {
          const attached = await apiFetch(`/conversations/${activeId}/documents`)
          setAttachedDocumentIds(attached.map((document) => document.id))
        }
      } catch (error) {
        setPageError(error.message)
      }
    }, 1200)
    return () => window.clearTimeout(timer)
  }, [activeId, documents, user])

  useEffect(() => {
    if (!selectedSources) return undefined
    const closeOnEscape = (event) => { if (event.key === 'Escape') setSelectedSources(null) }
    window.addEventListener('keydown', closeOnEscape)
    return () => window.removeEventListener('keydown', closeOnEscape)
  }, [selectedSources])

  const onAuthenticated = async (currentUser) => {
    setUser(currentUser)
    setPageError('')
    await Promise.all([loadConversations(), loadDocuments()])
  }

  const selectConversation = async (id) => {
    if (isStreaming || id === activeId) return
    setPageError('')
    try {
      const [conversation, attached] = await Promise.all([
        apiFetch(`/conversations/${id}`),
        apiFetch(`/conversations/${id}/documents`),
      ])
      setActiveId(id)
      setMessages(conversation.messages)
      setPendingImages([])
      setAttachedDocumentIds(attached.map((document) => document.id))
      const lastModel = [...conversation.messages].reverse().find((item) => item.model)?.model
      setActiveModel(lastModel || 'Gemini')
      setStatusText('Ready')
    } catch (error) {
      setPageError(error.message)
    }
  }

  const newConversation = async () => {
    if (isStreaming) return
    setActiveId(null)
    setMessages([])
    setAttachedDocumentIds([])
    setPendingImages([])
    setPrompt('')
    setStatusText('Ready')
    setPageError('')
    requestAnimationFrame(() => textareaRef.current?.focus())
  }

  const createConversation = async () => {
    const created = await apiFetch('/conversations', { method: 'POST', body: '{}' })
    setConversations((current) => [created, ...current])
    setActiveId(created.id)
    setAttachedDocumentIds([])
    return created.id
  }

  const uploadDocument = async (event) => {
    const file = event.target.files?.[0]
    event.target.value = ''
    if (!file) return
    if (file.type && file.type !== 'application/pdf') {
      setPageError('Only PDF files are supported.')
      return
    }
    if (file.size > 15 * 1024 * 1024) {
      setPageError('PDF files are limited to 15 MB.')
      return
    }
    setUploading(true)
    setPageError('')
    try {
      let conversationId = activeId
      if (!conversationId) conversationId = await createConversation()
      const form = new FormData()
      form.append('file', file)
      form.append('conversation_id', conversationId)
      const uploaded = await apiFetch('/documents', { method: 'POST', body: form })
      setDocuments((current) => [uploaded, ...current.filter((item) => item.id !== uploaded.id)])
      if (uploaded.status === 'ready') {
        setAttachedDocumentIds((current) => [...new Set([...current, uploaded.id])])
      }
    } catch (error) {
      setPageError(error.message)
    } finally {
      setUploading(false)
    }
  }

  const uploadImage = async (event) => {
    const file = event.target.files?.[0]
    event.target.value = ''
    if (!file) return
    if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type)) {
      setPageError('Only JPEG, PNG, and WebP images are supported.')
      return
    }
    if (file.size > 8 * 1024 * 1024) {
      setPageError('Images are limited to 8 MB.')
      return
    }
    if (pendingImages.length >= 3) {
      setPageError('You can attach up to 3 images to one message.')
      return
    }
    setUploadingImage(true)
    setPageError('')
    try {
      let conversationId = activeId
      if (!conversationId) conversationId = await createConversation()
      const form = new FormData()
      form.append('file', file)
      const uploaded = await apiFetch(`/conversations/${conversationId}/images`, { method: 'POST', body: form })
      setPendingImages((current) => [...current, uploaded])
    } catch (error) {
      setPageError(error.message)
    } finally {
      setUploadingImage(false)
    }
  }

  const removePendingImage = async (image) => {
    try {
      await apiFetch(`/images/${image.id}`, { method: 'DELETE' })
      setPendingImages((current) => current.filter((item) => item.id !== image.id))
    } catch (error) {
      setPageError(error.message)
    }
  }

  const toggleDocument = async (documentId) => {
    if (!activeId || isStreaming) return
    const attached = attachedDocumentIds.includes(documentId)
    try {
      await apiFetch(`/conversations/${activeId}/documents/${documentId}`, {
        method: attached ? 'DELETE' : 'PUT',
      })
      setAttachedDocumentIds((current) => attached
        ? current.filter((id) => id !== documentId)
        : [...current, documentId])
    } catch (error) {
      setPageError(error.message)
    }
  }

  const removeDocument = async (document) => {
    if (isStreaming || !window.confirm(`Delete “${document.filename}” and its embeddings?`)) return
    try {
      await apiFetch(`/documents/${document.id}`, { method: 'DELETE' })
      setDocuments((current) => current.filter((item) => item.id !== document.id))
      setAttachedDocumentIds((current) => current.filter((id) => id !== document.id))
    } catch (error) {
      setPageError(error.message)
    }
  }

  const removeConversation = async (event, id) => {
    event.stopPropagation()
    if (isStreaming) return
    try {
      await apiFetch(`/conversations/${id}`, { method: 'DELETE' })
      setConversations((current) => current.filter((item) => item.id !== id))
      if (activeId === id) { setActiveId(null); setMessages([]) }
    } catch (error) {
      setPageError(error.message)
    }
  }

  const sendMessage = async (value = prompt) => {
    const cleanPrompt = value.trim()
    if (!cleanPrompt || isStreaming) return
    let conversationId = activeId
    try {
      if (!conversationId) conversationId = await createConversation()
    } catch (error) {
      setPageError(error.message)
      return
    }

    const imagesToSend = pendingImages
    const userMessage = { id: `user-${crypto.randomUUID()}`, role: 'user', content: cleanPrompt, image_attachments: imagesToSend }
    const assistantId = `assistant-${crypto.randomUUID()}`
    setMessages((current) => [...current, userMessage, { id: assistantId, role: 'assistant', content: '', model: '', pending: true }])
    setPrompt('')
    setPendingImages([])
    setIsStreaming(true)
    setStatusText('Thinking')
    setPageError('')
    const controller = new AbortController()
    abortRef.current = controller
    let streamedText = ''

    const updateAssistant = (changes) => setMessages((current) => current.map((message) => message.id === assistantId ? { ...message, ...changes } : message))
    try {
      const response = await fetch(`${API}/conversations/${conversationId}/messages/stream`, {
        method: 'POST', credentials: 'include', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content: cleanPrompt, image_ids: imagesToSend.map((image) => image.id) }), signal: controller.signal,
      })
      if (!response.ok) {
        let detail = `Request failed (${response.status})`
        try { detail = (await response.json()).detail || detail } catch { /* status fallback */ }
        throw new Error(detail)
      }
      if (!response.body) throw new Error('Streaming is unavailable in this browser.')
      const reader = response.body.getReader()
      const decoder = new TextDecoder()
      let buffer = ''
      const processLine = (line) => {
        const event = JSON.parse(line)
        if (event.type === 'start') setStatusText('Thinking')
        if (event.type === 'meta') { setActiveModel(event.model); setStatusText('Streaming'); updateAssistant({ model: event.model }) }
        if (event.type === 'sources') updateAssistant({ citations: event.sources })
        if (event.type === 'delta') { streamedText += event.text; updateAssistant({ content: streamedText, pending: false }) }
        if (event.type === 'done') setStatusText('Complete')
        if (event.type === 'error') throw new Error(event.detail || 'The AI request failed')
      }
      while (true) {
        const { value, done } = await reader.read()
        buffer += decoder.decode(value || new Uint8Array(), { stream: !done })
        const lines = buffer.split('\n')
        buffer = lines.pop() || ''
        lines.filter(Boolean).forEach(processLine)
        if (done) break
      }
      if (buffer.trim()) processLine(buffer)
      if (!streamedText) throw new Error('Gemini returned an empty response.')
      setStatusText('Complete')
      await loadConversations()
    } catch (error) {
      if (error.name === 'AbortError') {
        updateAssistant({ content: streamedText || 'Response stopped.', pending: false, stopped: true })
        setStatusText('Stopped')
      } else {
        updateAssistant({ content: streamedText || error.message, pending: false, error: !streamedText, streamWarning: streamedText ? error.message : '' })
        setStatusText('Error')
      }
    } finally {
      abortRef.current = null
      setIsStreaming(false)
      requestAnimationFrame(() => textareaRef.current?.focus())
    }
  }

  const logout = async () => {
    abortRef.current?.abort()
    await apiFetch('/auth/logout', { method: 'POST' })
    setUser(null); setConversations([]); setDocuments([]); setMessages([]); setActiveId(null); setAttachedDocumentIds([]); setPendingImages([])
  }

  if (booting) return <div className="app-loading"><span><SourcebeamLogo /></span><p>Opening Sourcebeam…</p></div>
  if (!user) return <AuthScreen onAuthenticated={onAuthenticated} />

  return (
    <div className="app-shell">
      <aside className="sidebar">
        <div className="brand"><span className="brand-mark"><SourcebeamLogo /></span><div><strong>Sourcebeam</strong><span>AI workspace</span></div></div>
        <button className="new-chat" type="button" onClick={newConversation}><PlusIcon /> New conversation</button>
        <button className="knowledge-button" type="button" onClick={() => setDocumentsOpen(true)}><DocumentIcon /><span>Knowledge base</span><b>{documents.filter((item) => item.status === 'ready').length}</b></button>
        <div className="side-section">
          <p className="side-label">Conversations</p>
          <div className="history-list">
            {conversations.length === 0 && <p className="empty-history">No saved chats yet.</p>}
            {conversations.map((conversation) => (
              <button className={`history-item ${conversation.id === activeId ? 'active' : ''}`} type="button" key={conversation.id} onClick={() => selectConversation(conversation.id)}>
                <span className="history-icon">✦</span><span className="history-copy"><strong>{conversation.title}</strong><small>{new Date(conversation.updated_at).toLocaleDateString()}</small></span>
                <span className="delete-chat" role="button" tabIndex="0" aria-label={`Delete ${conversation.title}`} onClick={(event) => removeConversation(event, conversation.id)} onKeyDown={(event) => { if (event.key === 'Enter') removeConversation(event, conversation.id) }}>×</span>
              </button>
            ))}
          </div>
        </div>
        <div className="account-card"><span className="account-avatar">{user.display_name.charAt(0).toUpperCase()}</span><span><strong>{user.display_name}</strong><small>{user.email}</small></span><button type="button" onClick={logout}>Sign out</button></div>
        <div className="connection-card"><div className="connection-row"><span className={`status-dot ${statusText === 'Error' ? 'error' : ''}`} /><span>FastAPI connected</span></div><div className="model-row"><span>Active model</span><strong>{activeModel}</strong></div></div>
      </aside>

      <main className="chat-panel">
        <header className="chat-header"><div><div className="eyebrow">Private workspace</div><h1>{conversations.find((item) => item.id === activeId)?.title || 'New conversation'}</h1></div><div className="header-status">{hasAttachedDocuments && <button className="context-badge" type="button" onClick={() => setDocumentsOpen(true)} title={attachedDocuments.map((document) => document.filename).join(', ')}><DocumentIcon />{attachedDocuments.length} {attachedDocuments.length === 1 ? 'source' : 'sources'} active</button>}<div className="live-badge"><span className={isStreaming ? 'pulse' : ''} />{statusText}</div></div></header>
        <section className="conversation" aria-live="polite">
          {pageError && <div className="page-error" role="alert">{pageError}</div>}
          {messages.length === 0 && <div className="empty-state"><div className="intro-orbit"><SparkIcon /></div><p className="eyebrow">{hasAttachedDocuments ? 'Grounded in your documents' : 'Multimodal AI workspace'}</p><h2>{hasAttachedDocuments ? 'Ask your documents anything.' : 'Understand PDFs and images.'}</h2><p>{hasAttachedDocuments ? `Sourcebeam will retrieve evidence from ${attachedDocuments.length} attached ${attachedDocuments.length === 1 ? 'PDF' : 'PDFs'} and cite the pages it used.` : 'Upload a searchable PDF for cited answers, or attach an image to ask about screenshots, charts, diagrams, and photos.'}</p>{!hasAttachedDocuments && <button className="empty-upload" type="button" onClick={() => setDocumentsOpen(true)}><UploadIcon /> Add your first PDF</button>}</div>}
          {messages.map((message) => <article className={`message ${message.role}`} key={message.id}><div className="avatar" aria-hidden="true">{message.role === 'assistant' ? <SparkIcon /> : 'You'}</div><div className="message-column"><div className="message-meta"><strong>{message.role === 'assistant' ? 'Sourcebeam AI' : 'You'}</strong>{message.model && <span>{message.model}</span>}{message.stopped && <span>Stopped</span>}</div><div className={`bubble ${message.error ? 'error' : ''}`}><MessageImages images={message.image_attachments} />{message.content ? message.role === 'assistant' && !message.error ? <MarkdownMessage content={message.content} /> : <p>{message.content}</p> : <div className="typing" aria-label="AI is thinking"><span /><span /><span /></div>}{message.streamWarning && <div className="stream-warning">{message.streamWarning}</div>}{isStreaming && message.id === messages.at(-1)?.id && message.content && <span className="cursor" aria-hidden="true" />}</div>{message.citations?.length > 0 && <SourcesButton sources={message.citations} onOpen={() => setSelectedSources(message.citations)} />}</div></article>)}
          {messages.length === 0 && <div className="suggestions">{(hasAttachedDocuments ? documentSuggestions : generalSuggestions).map(([label, text]) => <button key={label} type="button" onClick={() => sendMessage(text)}><span>{label}</span><p>{text}</p><b>↗</b></button>)}</div>}
          <div ref={endRef} />
        </section>
        <footer className="composer-wrap"><input ref={imageInputRef} type="file" accept="image/jpeg,image/png,image/webp" hidden onChange={uploadImage} />{pendingImages.length > 0 && <div className="pending-images">{pendingImages.map((image) => <div className="pending-image" key={image.id}><img src={`${API}/images/${image.id}/content`} alt={image.filename} /><span><strong>{image.filename}</strong><small>{image.width} × {image.height}</small></span><button type="button" onClick={() => removePendingImage(image)} aria-label={`Remove ${image.filename}`}>×</button></div>)}</div>}<form className="composer" onSubmit={(event) => { event.preventDefault(); sendMessage() }}><button className="image-button" type="button" disabled={isStreaming || uploadingImage || pendingImages.length >= 3} onClick={() => imageInputRef.current?.click()} aria-label="Attach image" title="Attach JPEG, PNG, or WebP"><ImageIcon /></button><textarea ref={textareaRef} value={prompt} onChange={(event) => setPrompt(event.target.value)} onKeyDown={(event) => { if (event.key === 'Enter' && !event.shiftKey) { event.preventDefault(); sendMessage() } }} placeholder={uploadingImage ? 'Uploading image…' : pendingImages.length ? 'Ask about the attached image…' : hasAttachedDocuments ? 'Ask a question about your PDFs…' : 'Message Sourcebeam AI…'} rows="1" maxLength="20000" aria-label="Chat prompt" disabled={isStreaming || uploadingImage} />{isStreaming ? <button className="send-button stop" type="button" onClick={() => abortRef.current?.abort()} aria-label="Stop response"><StopIcon /></button> : <button className="send-button" type="submit" disabled={!prompt.trim() || uploadingImage} aria-label="Send message"><SendIcon /></button>}</form><p className="composer-note">{pendingImages.length ? `${pendingImages.length} image ${pendingImages.length === 1 ? 'attachment' : 'attachments'} · Ask a specific question for the best result.` : hasAttachedDocuments ? `Answers are grounded in ${attachedDocuments.length} active ${attachedDocuments.length === 1 ? 'source' : 'sources'}. Verify important information.` : 'Attach up to 3 images, or ask a general question. Verify important information.'}</p></footer>
      </main>
      {documentsOpen && <div className="drawer-backdrop" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) setDocumentsOpen(false) }}><aside className="document-drawer" role="dialog" aria-modal="true" aria-labelledby="documents-title"><header><div><p className="eyebrow">Retrieval workspace</p><h2 id="documents-title">Knowledge base</h2></div><button type="button" onClick={() => setDocumentsOpen(false)} aria-label="Close knowledge base">×</button></header><p className="drawer-intro">Upload searchable or scanned PDFs. Sourcebeam processes them in the background, retrieves matching passages, and cites the pages it used.</p>{pageError && <div className="page-error" role="alert">{pageError}</div>}<input ref={fileInputRef} type="file" accept="application/pdf,.pdf" hidden onChange={uploadDocument} /><button className="upload-pdf" type="button" disabled={uploading} onClick={() => fileInputRef.current?.click()}><UploadIcon /><span><strong>{uploading ? 'Uploading PDF…' : 'Upload PDF'}</strong><small>Maximum 15 MB · OCR included</small></span></button>{!activeId && <div className="drawer-note">Uploading will start a new conversation and attach the PDF automatically when processing completes.</div>}<div className="document-list">{documents.length === 0 && <div className="empty-documents"><DocumentIcon /><p>No PDFs uploaded yet.</p></div>}{documents.map((document) => { const attached = attachedDocumentIds.includes(document.id); return <div className={`document-item ${attached ? 'attached' : ''}`} key={document.id}><button className="document-toggle" type="button" disabled={!activeId || document.status !== 'ready' || isStreaming} onClick={() => toggleDocument(document.id)} aria-pressed={attached}><span className="document-check">{attached ? '✓' : ''}</span><span><strong>{document.filename}</strong><small>{documentSummary(document)}</small></span></button><button className="document-delete" type="button" onClick={() => removeDocument(document)} aria-label={`Delete ${document.filename}`}>×</button></div>})}</div><footer><span>{attachedDocumentIds.length} attached</span><button type="button" onClick={() => setDocumentsOpen(false)}>Done</button></footer></aside></div>}
      {selectedSources && <SourcesDrawer sources={selectedSources} onClose={() => setSelectedSources(null)} />}
    </div>
  )
}

export default App
