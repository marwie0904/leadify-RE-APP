"use client"

import { Badge } from "@/components/ui/badge"

import type React from "react"

import { useState, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { FileUpload } from "@/components/ui/file-upload"
import { Alert, AlertDescription } from "@/components/ui/alert"
import {
  Info,
  Loader2,
  MessageSquare,
  Download,
  Trash2,
  FileText,
  CheckCircle,
  AlertCircle,
  Clock,
  AlertTriangle,
  RefreshCw,
} from "lucide-react"
import { Textarea } from "@/components/ui/textarea"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { ChatPreviewModal } from "@/components/agents/chat-preview-modal"
import { FacebookIntegration } from "@/components/agents/facebook-integration"
import { CustomBANTConfig } from "@/components/agents/custom-bant-config"
import { CustomBANTQuestions, type BANTQuestion } from "@/components/agents/custom-bant-questions"
import { EnhancedAttachmentUpload, AttachmentFile } from "@/components/attachments/enhanced-attachment-upload"
import { useBANTConfig } from "@/hooks/use-bant-config"
import { useAuth } from "@/contexts/simple-auth-context"
import { toast } from "sonner"

interface Message {
  id: string
  content: string
  sender: string
  timestamp: string
}

interface AIAgent {
  id: string
  name: string
  tone: "Professional" | "Friendly" | "Neutral"
  language: "English" | "Tagalog"
  status: "creating" | "ready" | "error"
  user_id: string
  organization_id: string
  createdAt?: string
  openingMessage?: string
  custom_greeting?: string
}

interface AgentDocument {
  id: string
  name: string
  size: number
  status: "processing" | "ready" | "error"
  storagePath?: string
  createdAt: string
  updatedAt: string
}

interface AgentManagementPageProps {
  agent: AIAgent
  onAgentUpdated: () => void
}


export function AgentManagementPage({ agent, onAgentUpdated }: AgentManagementPageProps) {
  const { getAuthHeaders } = useAuth()
  const { config: bantConfig, saveConfig: saveBantConfig, deleteConfig: deleteBantConfig } = useBANTConfig(agent?.id || '')
  const [formData, setFormData] = useState({
    name: agent.name,
    language: agent.language,
    customGreeting: agent.custom_greeting || "",
  })
  const [filesToUpload, setFilesToUpload] = useState<File[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [showChatPreview, setShowChatPreview] = useState(false)

  const [existingDocuments, setExistingDocuments] = useState<AgentDocument[]>([])
  const [loadingDocuments, setLoadingDocuments] = useState(false)
  const [documentsApiAvailable, setDocumentsApiAvailable] = useState<boolean>(false) // Default to false

  // Estimation documents state
  const [estimationFiles, setEstimationFiles] = useState<File[]>([])
  const [loadingEstimationUpload, setLoadingEstimationUpload] = useState(false)

  // Add state for estimation documents
  const [estimationDocuments, setEstimationDocuments] = useState<AgentDocument[]>([])
  const [loadingEstimationDocuments, setLoadingEstimationDocuments] = useState(false)

  // State for the chat preview modal
  const [previewConversationId, setPreviewConversationId] = useState<string | null>(null)
  const [previewMessages, setPreviewMessages] = useState<Message[]>([])


  // Enhanced attachment state for each document type
  const [enhancedKnowledgeAttachments, setEnhancedKnowledgeAttachments] = useState<AttachmentFile[]>([])
  const [enhancedEstimationAttachments, setEnhancedEstimationAttachments] = useState<AttachmentFile[]>([])

  // Custom BANT Questions state
  const [bantQuestions, setBantQuestions] = useState<BANTQuestion[]>([])
  const [loadingQuestions, setLoadingQuestions] = useState(false)
  const [savingQuestions, setSavingQuestions] = useState(false)

  // Function to get localStorage key for this agent's conversation
  const getConversationStorageKey = (agentId: string) => `chat-preview-conversation-${agentId}`

  // Function to save conversationId to localStorage
  const saveConversationId = (agentId: string, conversationId: string | null) => {
    try {
      const key = getConversationStorageKey(agentId)
      if (conversationId) {
        localStorage.setItem(key, conversationId)
        console.log("[Agent Management] Saved conversationId to localStorage:", conversationId)
      } else {
        localStorage.removeItem(key)
        console.log("[Agent Management] Removed conversationId from localStorage")
      }
    } catch (error) {
      console.warn("[Agent Management] Failed to save conversationId to localStorage:", error)
    }
  }

  // Function to load conversationId from localStorage
  const loadConversationId = (agentId: string): string | null => {
    try {
      const key = getConversationStorageKey(agentId)
      const stored = localStorage.getItem(key)
      if (stored) {
        console.log("[Agent Management] Loaded conversationId from localStorage:", stored)
        return stored
      }
    } catch (error) {
      console.warn("[Agent Management] Failed to load conversationId from localStorage:", error)
    }
    return null
  }

  // Fetch custom BANT questions for the agent
  const fetchBANTQuestions = async () => {
    if (!agent?.id) return
    
    setLoadingQuestions(true)
    try {
      const authHeaders = await getAuthHeaders()
      const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001"
      
      const response = await fetch(`${API_BASE_URL}/api/agents/${agent.id}/bant-questions`, {
        headers: authHeaders
      })
      
      if (response.ok) {
        const data = await response.json()
        setBantQuestions(data.questions || [])
      } else {
        console.error("Failed to fetch BANT questions")
      }
    } catch (error) {
      console.error("Error fetching BANT questions:", error)
    } finally {
      setLoadingQuestions(false)
    }
  }

  // Save custom BANT questions
  const saveBANTQuestions = async (questions: BANTQuestion[]) => {
    if (!agent?.id) return
    
    setSavingQuestions(true)
    try {
      const authHeaders = await getAuthHeaders()
      const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001"
      
      const response = await fetch(`${API_BASE_URL}/api/agents/${agent.id}/bant-questions`, {
        method: "POST",
        headers: {
          ...authHeaders,
          "Content-Type": "application/json"
        },
        body: JSON.stringify({ questions })
      })
      
      if (response.ok) {
        const data = await response.json()
        setBantQuestions(data.questions || questions)
        toast.success("BANT questions saved successfully")
      } else {
        throw new Error("Failed to save BANT questions")
      }
    } catch (error) {
      console.error("Error saving BANT questions:", error)
      toast.error("Failed to save BANT questions")
      throw error
    } finally {
      setSavingQuestions(false)
    }
  }

  useEffect(() => {
    setFormData({
      name: agent.name,
      language: agent.language,
      customGreeting: agent.custom_greeting || "",
    })

    // Reset chat preview state first, then load stored conversation for this agent
    setPreviewMessages([])
    
    // Load conversationId from localStorage for this agent
    const storedConversationId = loadConversationId(agent.id)
    console.log("[Agent Management] Loading agent", agent.id, "with stored conversationId:", storedConversationId)
    setPreviewConversationId(storedConversationId)

    // Check API availability and fetch documents
    checkAndFetchDocuments()
    
    // Load custom BANT questions
    fetchBANTQuestions()
  }, [agent.id]) // Only depend on agent.id to avoid duplicate runs

  // Custom setPreviewConversationId that also saves to localStorage
  const updatePreviewConversationId = (value: React.SetStateAction<string | null>) => {
    const newConversationId = typeof value === 'function' ? value(previewConversationId) : value
    console.log("[Agent Management] Updating conversationId:", {
      agent: agent.id,
      previous: previewConversationId,
      new: newConversationId
    })
    setPreviewConversationId(newConversationId)
    saveConversationId(agent.id, newConversationId)
  }

  // Debug current state when modal is about to open
  const handleChatPreview = () => {
    console.log("[Agent Management] Opening chat preview for agent:", {
      agentId: agent.id,
      currentConversationId: previewConversationId,
      storedInLocalStorage: loadConversationId(agent.id)
    })
    setShowChatPreview(true)
  }

  // Handle document upload when files are selected
  const uploadDocumentsToBackend = async (attachments: AttachmentFile[], type: 'knowledge' | 'estimation') => {
    if (attachments.length === 0) return

    console.log(`[Document Upload] Starting upload for ${attachments.length} ${type} documents`)
    
    try {
      const authHeaders = await getAuthHeaders()
      const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001"
      
      // Create FormData with all files
      const formData = new FormData()
      attachments.forEach((attachment) => {
        formData.append('documents', attachment.file)
      })
      
      // Determine the endpoint based on type
      let endpoint = `${API_BASE_URL}/api/agents/${agent.id}/documents`
      if (type === 'estimation') {
        endpoint = `${API_BASE_URL}/api/estimation/documents`
        formData.append('agentId', agent.id)
      }
      
      const response = await fetch(endpoint, {
        method: 'POST',
        headers: {
          ...authHeaders,
          // Don't set Content-Type for FormData, let browser set it with boundary
        },
        body: formData,
      })
      
      if (!response.ok) {
        throw new Error(`Upload failed: ${response.status} ${response.statusText}`)
      }
      
      const result = await response.json()
      console.log(`[Document Upload] ✅ Successfully uploaded ${type} documents:`, result)
      
      toast.success(`Successfully uploaded ${attachments.length} ${type} document(s)`)
      
      // Refresh the documents list
      if (type === 'knowledge') {
        await fetchExistingDocuments(authHeaders)
      } else if (type === 'estimation') {
        await fetchEstimationDocuments()
      }
      
    } catch (error) {
      console.error(`[Document Upload] Error uploading ${type} documents:`, error)
      toast.error(`Failed to upload ${type} documents. Please try again.`)
    }
  }

  // Watch for changes in attachments and upload automatically
  useEffect(() => {
    if (enhancedKnowledgeAttachments.length > 0 && enhancedKnowledgeAttachments.every(a => a.uploaded)) {
      // Only upload when all files are marked as "uploaded" (simulated by the component)
      const newFiles = enhancedKnowledgeAttachments.filter(a => !existingDocuments.some(d => d.name === a.file.name))
      if (newFiles.length > 0) {
        uploadDocumentsToBackend(newFiles, 'knowledge')
      }
    }
  }, [enhancedKnowledgeAttachments])

  useEffect(() => {
    if (enhancedEstimationAttachments.length > 0 && enhancedEstimationAttachments.every(a => a.uploaded)) {
      const newFiles = enhancedEstimationAttachments.filter(a => !estimationDocuments.some(d => d.name === a.file.name))
      if (newFiles.length > 0) {
        uploadDocumentsToBackend(newFiles, 'estimation')
      }
    }
  }, [enhancedEstimationAttachments])



  const checkAndFetchDocuments = async () => {
    setLoadingDocuments(true)

    try {
      const authHeaders = await getAuthHeaders()

      // Always try to fetch documents first, regardless of API availability check
      await fetchExistingDocuments(authHeaders)

      // If we successfully fetched documents, mark API as available
      setDocumentsApiAvailable(true)
    } catch (error) {
      console.error("Error in checkAndFetchDocuments:", error)

      // Check if it's a 404 (no documents) vs actual API unavailability
      if (error instanceof Error && error.message.includes("404")) {
        // 404 means API exists but no documents found
        setDocumentsApiAvailable(true)
        setExistingDocuments([])
      } else {
        // Other errors might mean API is not available
        setDocumentsApiAvailable(false)
        setExistingDocuments([])
      }
    } finally {
      setLoadingDocuments(false)
    }
  }

  const fetchExistingDocuments = async (authHeaders?: any) => {
    try {
      if (!authHeaders) {
        authHeaders = await getAuthHeaders()
      }

      const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001"
      const url = `${API_BASE_URL}/api/agents/${agent.id}/documents`

      console.log("Fetching documents from:", url)

      const response = await fetch(url, {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
          ...authHeaders,
        },
      })

      console.log("Documents response status:", response.status)

      if (response.status === 404) {
        // 404 might mean no documents found, which is valid
        console.log("No documents found (404)")
        setExistingDocuments([])
        setDocumentsApiAvailable(true)
        return
      }

      if (!response.ok) {
        const errorText = await response.text()
        console.error("Documents API error:", errorText)
        throw new Error(`HTTP ${response.status}: ${response.statusText}`)
      }

      const data = await response.json()
      console.log("Raw documents data:", data)

      // Handle different response structures more comprehensively
      let documentsData = []

      if (Array.isArray(data)) {
        documentsData = data
      } else if (data && typeof data === "object") {
        // Try different possible property names
        documentsData = data.documents || data.data || data.files || data.items || []

        // If still not an array, check if the object itself represents a single document
        if (!Array.isArray(documentsData) && data.id) {
          documentsData = [data]
        }
      }

      console.log("Processed documents data:", documentsData)

      // Transform the data to match our interface
      const transformedDocuments: AgentDocument[] = documentsData.map((doc: any, index: number) => ({
        id: doc.id || doc.document_id || doc._id || `doc-${index}`,
        name: doc.name || doc.filename || doc.file_name || doc.originalName || doc.title || `Document ${index + 1}`,
        size: doc.size || doc.file_size || doc.fileSize || 0,
        status: doc.status || doc.processing_status || "ready",
        storagePath: doc.storagePath || doc.storage_path || doc.path || doc.url,
        createdAt: doc.createdAt || doc.created_at || doc.uploadedAt || doc.timestamp || new Date().toISOString(),
        updatedAt:
          doc.updatedAt ||
          doc.updated_at ||
          doc.modifiedAt ||
          doc.createdAt ||
          doc.created_at ||
          new Date().toISOString(),
      }))

      console.log("Transformed documents:", transformedDocuments)
      setExistingDocuments(transformedDocuments)
      setDocumentsApiAvailable(true)
    } catch (error) {
      console.error("Failed to fetch agent documents:", error)

      // Don't show toast error for 404s
      if (!(error instanceof Error && error.message.includes("404"))) {
        toast.error("Failed to load documents")
      }

      throw error // Re-throw so the caller can handle it
    }
  }

  // Fetch estimation documents for this agent
  const fetchEstimationDocuments = async () => {
    setLoadingEstimationDocuments(true)
    try {
      const authHeaders = await getAuthHeaders();
      const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001";
      const url = `${API_BASE_URL}/api/estimation/documents?agentId=${agent.id}`;
      const response = await fetch(url, {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
          ...authHeaders,
        },
      });
      if (!response.ok) {
        setEstimationDocuments([]);
        throw new Error(`Failed to fetch estimation documents: ${response.status}`);
      }
      const data = await response.json();
      let documentsData = [];
      if (Array.isArray(data)) {
        documentsData = data;
      } else if (data && typeof data === "object") {
        documentsData = data.documents || data.data || data.files || data.items || [];
        if (!Array.isArray(documentsData) && data.id) {
          documentsData = [data];
        }
      }
      const transformedDocuments: AgentDocument[] = documentsData.map((doc: any, index: number) => ({
        id: doc.id || doc.document_id || doc._id || `estimation-doc-${index}`,
        name: doc.name || doc.filename || doc.file_name || doc.originalName || doc.title || `Estimation Document ${index + 1}`,
        size: doc.size || doc.file_size || doc.fileSize || 0,
        status: doc.status || doc.processing_status || "ready",
        storagePath: doc.storagePath || doc.storage_path || doc.path || doc.url,
        createdAt: doc.createdAt || doc.created_at || doc.uploadedAt || doc.timestamp || new Date().toISOString(),
        updatedAt:
          doc.updatedAt ||
          doc.updated_at ||
          doc.modifiedAt ||
          doc.createdAt ||
          doc.created_at ||
          new Date().toISOString(),
      }));
      setEstimationDocuments(transformedDocuments);
    } catch (error) {
      setEstimationDocuments([]);
    } finally {
      setLoadingEstimationDocuments(false);
    }
  };

  // Fetch estimation documents on mount and after upload
  useEffect(() => {
    fetchEstimationDocuments();
  }, [agent.id]);


  const handleUpdateAgent = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError(null)

    try {
      const authHeaders = await getAuthHeaders()
      const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001"

      // Update agent configuration
      const updateResponse = await fetch(`${API_BASE_URL}/api/agents/${agent.id}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          ...authHeaders,
        },
        body: JSON.stringify({
          name: formData.name,
          language: formData.language,
          customGreeting: formData.customGreeting,
        }),
      })

      if (!updateResponse.ok) {
        throw new Error(`Failed to update agent: ${updateResponse.status} ${updateResponse.statusText}`)
      }

      // Document upload is now handled immediately on file selection
      toast.success("Agent updated successfully!");

      onAgentUpdated() // Refresh parent state
    } catch (error) {
      console.error("Failed to update AI agent:", error)
      setError(error instanceof Error ? error.message : "Failed to update AI agent")
      toast.error("Failed to update agent settings.")
    } finally {
      setLoading(false)
    }
  }

  const handleRemoveDocument = async (docId: string) => {
    if (!documentsApiAvailable) {
      toast.error("Document management API is not available yet.")
      return
    }

    try {
      const authHeaders = await getAuthHeaders()
      const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001"

      const response = await fetch(`${API_BASE_URL}/api/agents/${agent.id}/documents/${docId}`, {
        method: "DELETE",
        headers: {
          "Content-Type": "application/json",
          ...authHeaders,
        },
      })

      if (!response.ok) {
        throw new Error(`Failed to remove document: ${response.status} ${response.statusText}`)
      }

      // Remove from local state
      setExistingDocuments((prev) => prev.filter((doc) => doc.id !== docId))
      toast.success("Document removed successfully!")
    } catch (error) {
      console.error("Failed to remove document:", error)
      toast.error("Failed to remove document. Please try again.")
    }
  }

  const handleDownloadDocument = async (docId: string, docName: string) => {
    if (!documentsApiAvailable) {
      toast.error("Document management API is not available yet.")
      return
    }

    try {
      const authHeaders = await getAuthHeaders()
      const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001"

      const response = await fetch(`${API_BASE_URL}/api/agents/${agent.id}/documents/${docId}/download`, {
        headers: authHeaders,
      })

      if (!response.ok) {
        throw new Error("Failed to download document")
      }

      // Create blob and download
      const blob = await response.blob()
      const url = window.URL.createObjectURL(blob)
      const a = document.createElement("a")
      a.href = url
      a.download = docName
      document.body.appendChild(a)
      a.click()
      window.URL.revokeObjectURL(url)
      document.body.removeChild(a)

      toast.success("Document downloaded successfully!")
    } catch (error) {
      console.error("Failed to download document:", error)
      toast.error("Failed to download document. Please try again.")
    }
  }

  const getDocumentStatusIcon = (status: string) => {
    switch (status) {
      case "ready":
        return <CheckCircle className="h-4 w-4 text-green-500" />
      case "processing":
        return <Clock className="h-4 w-4 text-blue-500" />
      case "error":
        return <AlertCircle className="h-4 w-4 text-red-500" />
      default:
        return <FileText className="h-4 w-4" />
    }
  }

  const getDocumentStatusColor = (status: string) => {
    switch (status) {
      case "ready":
        return "bg-green-100 text-green-800"
      case "processing":
        return "bg-blue-100 text-blue-800"
      case "error":
        return "bg-red-100 text-red-800"
      default:
        return "bg-gray-100 text-gray-800"
    }
  }

  // New: Upload files immediately when selected
  const handleFilesChange = async (newFiles: File[]) => {
    setFilesToUpload(newFiles);
    if (newFiles.length > 0) {
      const authHeaders = await getAuthHeaders();
      const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001";
      const uploadFormData = new FormData();
      newFiles.forEach((file, idx) => {
        uploadFormData.append("documents", file);
        console.debug(`[Upload] Appending file #${idx + 1}:`, file);
      });
      try {
        console.debug("[Upload] Sending POST to:", `${API_BASE_URL}/api/agents/${agent.id}/documents`);
        console.debug("[Upload] Headers:", authHeaders);
        // Log FormData keys and values
        for (let pair of uploadFormData.entries()) {
          console.debug(`[Upload] FormData entry:`, pair[0], pair[1]);
        }
        const uploadResponse = await fetch(`${API_BASE_URL}/api/agents/${agent.id}/documents`, {
          method: "POST",
          headers: { ...authHeaders },
          body: uploadFormData,
        });
        console.debug("[Upload] Response status:", uploadResponse.status);
        if (!uploadResponse.ok) {
          const errorText = await uploadResponse.text();
          console.error("[Upload] Upload failed:", errorText);
          throw new Error(`Upload failed: ${uploadResponse.status} ${uploadResponse.statusText}`);
        }
        toast.success("Document(s) uploaded successfully!");
        await fetchExistingDocuments(authHeaders);
        setFilesToUpload([]);
      } catch (error) {
        console.error("[Upload] Document upload failed:", error);
        toast.error("Document upload failed.");
        debugger;
      }
    }
  };

  // After successful upload, refresh the list
  const handleEstimationFilesChange = async (newFiles: File[]) => {
    setEstimationFiles(newFiles);
    if (newFiles.length > 0) {
      setLoadingEstimationUpload(true);
      const authHeaders = await getAuthHeaders();
      const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001";
      const uploadFormData = new FormData();
      newFiles.forEach((file, _idx) => {
        uploadFormData.append("documents", file);
      });
      uploadFormData.append("agentId", agent.id); // Add agentId as required
      try {
        const uploadResponse = await fetch(`${API_BASE_URL}/api/estimation/documents`, {
          method: "POST",
          headers: { ...authHeaders },
          body: uploadFormData,
        });
        if (!uploadResponse.ok) {
          throw new Error(`Upload failed: ${uploadResponse.status} ${uploadResponse.statusText}`);
        }
        toast.success("Estimation document(s) uploaded successfully!");
        setEstimationFiles([]);
        fetchEstimationDocuments(); // Refresh list after upload
      } catch (error) {
        toast.error("Estimation document upload failed.");
      } finally {
        setLoadingEstimationUpload(false);
      }
    }
  };

  return (
    <div className="space-y-6">
      {error && (
        <Alert variant="destructive">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      <Card className="bg-white border-gray-200">
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>Agent Configuration</CardTitle>
          <div className="flex gap-2 pr-4">
            <Button
              variant="outline"
              onClick={handleChatPreview}
              disabled={agent.status !== "ready"}
              size="icon"
              title="Open Chat Preview"
            >
              <MessageSquare className="h-4 w-4" />
            </Button>
            <FacebookIntegration
              agentId={agent.id}
              agentName={agent.name}
              compact={true}
            />
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            {/* Left Column - Configuration Form */}
            <div>
              <form onSubmit={handleUpdateAgent} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="name">Agent Name *</Label>
                  <Input
                    id="name"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    required
                    disabled={loading}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="language">Language *</Label>
                  <Select
                    value={formData.language}
                    onValueChange={(value) => setFormData({ ...formData, language: value as "English" | "Tagalog" })}
                    disabled={loading}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select language" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="English">English</SelectItem>
                      <SelectItem value="Tagalog">Tagalog</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="flex justify-start pt-2">
                  <Button type="submit" disabled={loading || !formData.name.trim()}>
                    {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                    {loading ? "Saving..." : "Save Configuration"}
                  </Button>
                </div>
              </form>
            </div>

            {/* Right Column - Custom Greeting */}
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="customGreeting">Custom Greeting (Optional)</Label>
                <Textarea
                  id="customGreeting"
                  value={formData.customGreeting}
                  onChange={(e) => setFormData({ ...formData, customGreeting: e.target.value })}
                  placeholder="e.g., Hello! I'm Francis, your dedicated real estate assistant. How can I help you find your dream property today?"
                  rows={5}
                  disabled={loading}
                  className="w-full"
                />
                <p className="text-xs text-muted-foreground">
                  This custom greeting will be used when users say hello to your agent. Leave empty to use default greetings.
                </p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Custom BANT Configuration Section */}
      <CustomBANTConfig 
        agentId={agent.id}
        onSave={saveBantConfig}
        onDelete={deleteBantConfig}
        initialConfig={bantConfig}
      />

      {/* Custom BANT Questions Section */}
      <CustomBANTQuestions
        agentId={agent.id}
        onSave={saveBANTQuestions}
        initialQuestions={bantQuestions}
        isLoading={loadingQuestions}
      />

      <Card className="bg-white border-gray-200">
        <CardHeader>
          <CardTitle>Document Management</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {loadingDocuments ? (
            <div className="flex items-center justify-center p-8">
              <Loader2 className="h-6 w-6 animate-spin mr-2" />
              <span className="text-sm text-muted-foreground">Loading documents...</span>
            </div>
          ) : (
            <>
              {!documentsApiAvailable && (
                <Alert>
                  <AlertTriangle className="h-4 w-4" />
                  <AlertDescription className="text-sm">
                    <strong>Document Management API Not Available</strong>
                    <br />
                    The document management features are still being developed. You can upload documents during agent
                    creation, but viewing, downloading, and deleting existing documents is not yet available.
                  </AlertDescription>
                </Alert>
              )}

              <Tabs defaultValue="knowledge" className="w-full">
                <TabsList className="grid w-full grid-cols-2">
                  <TabsTrigger value="knowledge">Knowledge Base</TabsTrigger>
                  <TabsTrigger value="estimation">Estimation Documents</TabsTrigger>
                </TabsList>

                <TabsContent value="knowledge" className="space-y-4">
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    {/* Left side - Document List */}
                    <div className="space-y-2">
                      <h4 className="text-sm font-medium mb-3">Existing Documents ({existingDocuments.length})</h4>
                      {existingDocuments.length > 0 ? (
                        <div className="space-y-2 max-h-[500px] overflow-y-auto pr-2">
                          {existingDocuments.map((doc) => (
                            <div key={doc.id} className="flex items-center justify-between p-3 bg-muted rounded-lg">
                              <div className="flex items-center space-x-3">
                                {getDocumentStatusIcon(doc.status)}
                                <div className="flex-1">
                                  <div className="flex items-center space-x-2">
                                    <span className="text-sm font-medium">{doc.name}</span>
                                    <Badge className={getDocumentStatusColor(doc.status)} variant="outline">
                                      {doc.status}
                                    </Badge>
                                  </div>
                                  <div className="flex items-center space-x-2 text-xs text-muted-foreground mt-1">
                                    <span>{(doc.size / 1024 / 1024).toFixed(2)} MB</span>
                                    <span>•</span>
                                    <span>Uploaded {new Date(doc.createdAt).toLocaleDateString()}</span>
                                  </div>
                                </div>
                              </div>
                              <div className="flex space-x-1">
                                <Button
                                  type="button"
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => handleDownloadDocument(doc.id, doc.name)}
                                  disabled={doc.status !== "ready" || !documentsApiAvailable}
                                  title={doc.status === "ready" ? "Download document" : "Document not ready for download"}
                                >
                                  <Download className="h-4 w-4" />
                                </Button>
                                <Button
                                  type="button"
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => handleRemoveDocument(doc.id)}
                                  disabled={!documentsApiAvailable}
                                  title="Remove document"
                                >
                                  <Trash2 className="h-4 w-4 text-red-500" />
                                </Button>
                              </div>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <div className="text-center p-6 text-muted-foreground bg-muted/50 rounded-lg">
                          <FileText className="h-12 w-12 mx-auto mb-3 opacity-50" />
                          <p className="text-sm font-medium">No documents found</p>
                          <p className="text-xs">Upload documents to add them to your agent's knowledge base</p>
                        </div>
                      )}
                    </div>

                    {/* Right side - Upload Section */}
                    <div className="space-y-2">
                      <Label>Upload Knowledge Base Documents</Label>
                      <EnhancedAttachmentUpload
                        files={enhancedKnowledgeAttachments}
                        onFilesChange={setEnhancedKnowledgeAttachments}
                        maxFiles={10}
                        maxSizePerFile={25}
                        maxTotalSize={100}
                        allowedTypes={[
                          'application/pdf',
                          'text/plain',
                          'application/msword',
                          'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
                          'image/jpeg',
                          'image/png',
                          'image/webp'
                        ]}
                        showPreview={true}
                        allowMultiple={true}
                        disabled={loading}
                      />
                      <Alert>
                        <Info className="h-4 w-4" />
                        <AlertDescription className="text-sm">
                          Upload documents, images, and files to enhance your agent's knowledge base. 
                          Supports PDFs, Word documents, text files, and images with drag-and-drop functionality.
                        </AlertDescription>
                      </Alert>
                    </div>
                  </div>
                </TabsContent>

                <TabsContent value="estimation" className="space-y-4">
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    {/* Left side - Document List */}
                    <div className="space-y-2">
                      <h4 className="text-sm font-medium mb-3">Existing Documents ({estimationDocuments.length})</h4>
                      {estimationDocuments.length > 0 ? (
                        <div className="space-y-2 max-h-[500px] overflow-y-auto pr-2">
                          {estimationDocuments.map((doc) => (
                            <div key={doc.id} className="flex items-center justify-between p-3 bg-muted rounded-lg">
                              <div className="flex items-center space-x-3">
                                {getDocumentStatusIcon(doc.status)}
                                <div className="flex-1">
                                  <div className="flex items-center space-x-2">
                                    <span className="text-sm font-medium">{doc.name}</span>
                                    <Badge className={getDocumentStatusColor(doc.status)} variant="outline">
                                      {doc.status}
                                    </Badge>
                                  </div>
                                  <div className="flex items-center space-x-2 text-xs text-muted-foreground mt-1">
                                    <span>{(doc.size / 1024 / 1024).toFixed(2)} MB</span>
                                    <span>•</span>
                                    <span>Uploaded {new Date(doc.createdAt).toLocaleDateString()}</span>
                                  </div>
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <div className="text-center p-6 text-muted-foreground bg-muted/50 rounded-lg">
                          <FileText className="h-12 w-12 mx-auto mb-3 opacity-50" />
                          <p className="text-sm font-medium">No estimation documents found</p>
                          <p className="text-xs">Upload documents for property valuation</p>
                        </div>
                      )}
                    </div>

                    {/* Right side - Upload Section */}
                    <div className="space-y-2">
                      <Label>Upload Estimation Documents</Label>
                      <EnhancedAttachmentUpload
                        files={enhancedEstimationAttachments}
                        onFilesChange={setEnhancedEstimationAttachments}
                        maxFiles={10}
                        maxSizePerFile={25}
                        maxTotalSize={100}
                        allowedTypes={[
                          'application/pdf',
                          'text/plain',
                          'text/csv',
                          'application/vnd.ms-excel',
                          'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
                          'image/jpeg',
                          'image/png',
                          'image/webp'
                        ]}
                        showPreview={true}
                        allowMultiple={true}
                        disabled={loading || loadingEstimationUpload}
                      />
                      <Alert>
                        <Info className="h-4 w-4" />
                        <AlertDescription className="text-sm">
                          Upload property estimation documents including PDFs, spreadsheets, images, and text files. 
                          These documents will be processed for property valuation purposes and stored separately from the agent's knowledge base.
                        </AlertDescription>
                      </Alert>
                    </div>
                  </div>
                </TabsContent>
              </Tabs>
            </>
          )}
        </CardContent>
      </Card>



      {showChatPreview && (
        <ChatPreviewModal
          agent={agent}
          open={showChatPreview}
          onClose={() => setShowChatPreview(false)}
          messages={previewMessages}
          setMessages={setPreviewMessages}
          conversationId={previewConversationId}
          setConversationId={updatePreviewConversationId}
        />
      )}
    </div>
  )
}
