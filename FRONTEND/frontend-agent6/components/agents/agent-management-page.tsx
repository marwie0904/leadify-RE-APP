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
import { ChatPreviewModal } from "@/components/agents/chat-preview-modal"
import { FacebookIntegration } from "@/components/agents/facebook-integration"
import { useAuth } from "@/contexts/auth-context"
import { toast } from "sonner"
import { apiCall } from "@/lib/api"

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

// Helper function to check if documents API is available
async function checkDocumentsApiAvailability(agentId: string, authHeaders: Record<string, string>): Promise<boolean> {
  try {
    const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001"
    const url = `${API_BASE_URL}/api/agents/${agentId}/documents`

    const response = await fetch(url, {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
        ...authHeaders,
      },
    })

    // If we get any response (even 404 for no documents), the endpoint exists
    // Only return false if we get HTML error page or network error
    if (response.status === 404) {
      // 404 might mean no documents, not that endpoint doesn't exist
      // Check if response is HTML (which indicates endpoint doesn't exist)
      const contentType = response.headers.get("content-type")
      if (contentType && contentType.includes("text/html")) {
        return false
      }
      // JSON 404 means endpoint exists but no documents found
      return true
    }

    // Any other status code means the endpoint exists
    return response.status < 500
  } catch (error) {
    console.error("Documents API availability check failed:", error)
    return false
  }
}

export function AgentManagementPage({ agent, onAgentUpdated }: AgentManagementPageProps) {
  const { getAuthHeaders } = useAuth()
  const [formData, setFormData] = useState({
    name: agent.name,
    tone: agent.tone,
    language: agent.language,
    openingMessage: agent.openingMessage || "Hello! How can I help you today?",
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

  // Conversation Reference Documents state
  const [conversationReferenceFiles, setConversationReferenceFiles] = useState<File[]>([])
  const [conversationReferenceDocuments, setConversationReferenceDocuments] = useState<AgentDocument[]>([])
  const [loadingConversationReferenceDocuments, setLoadingConversationReferenceDocuments] = useState(false)
  const [loadingConversationReferenceUpload, setLoadingConversationReferenceUpload] = useState(false)

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

  useEffect(() => {
    setFormData({
      name: agent.name,
      tone: agent.tone,
      language: agent.language,
      openingMessage: agent.openingMessage || "Hello! How can I help you today?",
    })

    // Reset chat preview state first, then load stored conversation for this agent
    setPreviewMessages([])
    
    // Load conversationId from localStorage for this agent
    const storedConversationId = loadConversationId(agent.id)
    console.log("[Agent Management] Loading agent", agent.id, "with stored conversationId:", storedConversationId)
    setPreviewConversationId(storedConversationId)

    // Check API availability and fetch documents
    checkAndFetchDocuments()
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

  // Function to clear conversation data (useful for starting fresh conversations)
  const clearConversationData = () => {
    updatePreviewConversationId(null)
    setPreviewMessages([])
    console.log("[Agent Management] Cleared conversation data for agent:", agent.id)
  }


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

  const fetchExistingDocuments = async (authHeaders?: Record<string, string>) => {
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
      const transformedDocuments: AgentDocument[] = documentsData.map((doc: AgentDocument, index: number) => ({
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
      const transformedDocuments: AgentDocument[] = documentsData.map((doc: AgentDocument, index: number) => ({
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
    fetchConversationReferenceDocuments();
  }, [agent.id]);

  // Fetch conversation reference documents for this agent
  const fetchConversationReferenceDocuments = async () => {
    setLoadingConversationReferenceDocuments(true)
    try {
      const authHeaders = await getAuthHeaders();
      const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001";
      const url = `${API_BASE_URL}/api/agents/${agent.id}/conversation-references`;
      
      console.log("[Conversation Reference] Fetching from:", url);
      
      const response = await fetch(url, {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
          ...authHeaders,
        },
      });
      
      if (!response.ok) {
        if (response.status === 404) {
          // No conversation references found
          setConversationReferenceDocuments([]);
          return;
        }
        throw new Error(`Failed to fetch conversation references: ${response.status}`);
      }
      
      const data = await response.json();
      console.log("[Conversation Reference] API Response:", data);
      
      // Transform the response to match our interface
      const imagesData = data.images || [];
      const transformedDocuments: AgentDocument[] = imagesData.map((img: AgentDocument, index: number) => ({
        id: img.id || `conversation-ref-${index}`,
        name: img.file_name || `Conversation Reference ${index + 1}`,
        size: 0, // Size not provided in API response
        status: img.upload_status === "completed" ? "ready" : img.upload_status === "processing" ? "processing" : "error",
        storagePath: img.storage_url || "",
        createdAt: img.created_at || new Date().toISOString(),
        updatedAt: img.processed_at || img.created_at || new Date().toISOString(),
      }));
      
      setConversationReferenceDocuments(transformedDocuments);
    } catch (error) {
      console.error("[Conversation Reference] Error fetching documents:", error);
      setConversationReferenceDocuments([]);
      // Don't show toast error for 404s
      if (!(error instanceof Error && error.message.includes("404"))) {
        toast.error("Failed to load conversation references");
      }
    } finally {
      setLoadingConversationReferenceDocuments(false);
    }
  };

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
          tone: formData.tone,
          language: formData.language,
          openingMessage: formData.openingMessage,
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
        uploadFormData.append("file", file);
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

  // Handle conversation reference image uploads
  const handleConversationReferenceFilesChange = async (newFiles: File[]) => {
    setConversationReferenceFiles(newFiles);
    if (newFiles.length > 0) {
      setLoadingConversationReferenceUpload(true);
      
      try {
        const authHeaders = await getAuthHeaders();
        const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001";
        const uploadFormData = new FormData();
        
        console.log("[Conversation Reference] Uploading files:", newFiles.map(f => f.name));
        
        // Add all files with the correct field name 'images'
        newFiles.forEach((file) => {
          uploadFormData.append("images", file);
        });
        
        const uploadResponse = await fetch(`${API_BASE_URL}/api/agents/${agent.id}/conversation-references`, {
          method: "POST",
          headers: { ...authHeaders },
          body: uploadFormData,
        });
        
        if (!uploadResponse.ok) {
          const errorText = await uploadResponse.text();
          console.error("[Conversation Reference] Upload failed:", errorText);
          throw new Error(`Upload failed: ${uploadResponse.status} ${uploadResponse.statusText}`);
        }
        
        const result = await uploadResponse.json();
        console.log("[Conversation Reference] Upload result:", result);
        
        if (result.success) {
          const processedCount = result.processed?.length || 0;
          const failedCount = result.failed?.length || 0;
          
          if (processedCount > 0) {
            toast.success(`Successfully processed ${processedCount} conversation reference image(s)`);
          }
          
          if (failedCount > 0) {
            const failedNames = result.failed.map((f: { file_name: string }) => f.file_name).join(", ");
            toast.error(`Failed to process ${failedCount} image(s): ${failedNames}`);
          }
          
          // Refresh the list to show new uploads
          fetchConversationReferenceDocuments();
        } else {
          throw new Error(result.message || "Upload failed");
        }
        
      } catch (error) {
        console.error("[Conversation Reference] Upload error:", error);
        toast.error("Conversation reference image upload failed.");
      } finally {
        setLoadingConversationReferenceUpload(false);
        setConversationReferenceFiles([]);
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
      newFiles.forEach((file, idx) => {
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

      <Card>
        <CardHeader>
          <CardTitle>Agent Configuration</CardTitle>
        </CardHeader>
        <CardContent>
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
              <Label htmlFor="tone">Tone *</Label>
              <Select
                value={formData.tone}
                onValueChange={(value) =>
                  setFormData({ ...formData, tone: value as "Professional" | "Friendly" | "Neutral" })
                }
                disabled={loading}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select tone" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Professional">Professional</SelectItem>
                  <SelectItem value="Friendly">Friendly</SelectItem>
                  <SelectItem value="Neutral">Neutral</SelectItem>
                </SelectContent>
              </Select>
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

            <div className="space-y-2">
              <Label htmlFor="openingMessage">Opening Message</Label>
              <Textarea
                id="openingMessage"
                value={formData.openingMessage}
                onChange={(e) => setFormData({ ...formData, openingMessage: e.target.value })}
                placeholder="e.g., Hello! How can I help you today?"
                rows={2}
                disabled={loading}
              />
              <p className="text-xs text-muted-foreground">
                This message will be sent automatically when a new conversation starts.
              </p>
            </div>

            <div className="flex justify-end">
              <Button type="submit" disabled={loading || !formData.name.trim()}>
                {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                {loading ? "Saving..." : "Save Configuration"}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>

      {/* Facebook Integration Section */}
      <FacebookIntegration agentId={agent.id} agentName={agent.name} />

      <Card>
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

              <div className="space-y-2">
                <Label>Upload New Documents (PDFs)</Label>
                <FileUpload
                  files={filesToUpload}
                  onFilesChange={handleFilesChange}
                  accept="application/pdf"
                  multiple
                  maxFiles={5}
                />
                <Alert>
                  <Info className="h-4 w-4" />
                  <AlertDescription className="text-sm">
                    {documentsApiAvailable
                      ? "Upload up to 5 PDF files. These will be processed and added to your agent's knowledge base."
                      : "Upload up to 5 PDF files. Note: Document management API is not fully available yet, so uploaded files may not be visible in the existing documents list."}
                  </AlertDescription>
                </Alert>
              </div>

              {/* Always show the documents section, even if API might not be fully available */}
              {existingDocuments.length > 0 ? (
                <div className="space-y-2">
                  <h4 className="text-sm font-medium">Existing Documents ({existingDocuments.length}):</h4>
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
                            {doc.updatedAt !== doc.createdAt && (
                              <>
                                <span>•</span>
                                <span>Updated {new Date(doc.updatedAt).toLocaleDateString()}</span>
                              </>
                            )}
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
                <div className="text-center p-6 text-muted-foreground">
                  <FileText className="h-12 w-12 mx-auto mb-3 opacity-50" />
                  <p className="text-sm font-medium">
                    {loadingDocuments ? "Loading documents..." : "No documents found"}
                  </p>
                  <p className="text-xs">
                    {loadingDocuments
                      ? "Please wait while we check for existing documents..."
                      : documentsApiAvailable
                        ? "Upload PDF files above to add them to your agent's knowledge base"
                        : "The document management API is still being developed"}
                  </p>
                </div>
              )}

              {/* Add a manual refresh button */}
              <div className="flex justify-center pt-2">
                <Button
                  onClick={() => checkAndFetchDocuments()}
                  variant="outline"
                  size="sm"
                  disabled={loadingDocuments}
                  className="flex items-center space-x-2"
                >
                  {loadingDocuments ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
                  <span>{loadingDocuments ? "Loading..." : "Refresh Documents"}</span>
                </Button>
              </div>
            </>
          )}
        </CardContent>
      </Card>

      {/* Estimation Documents Section */}
      <Card>
        <CardHeader>
          <CardTitle>Estimation Documents</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label>Upload Estimation Documents (PDFs)</Label>
            <FileUpload
              files={estimationFiles}
              onFilesChange={handleEstimationFilesChange}
              accept="application/pdf"
              multiple
              maxFiles={5}
            />
            <Alert>
              <Info className="h-4 w-4" />
              <AlertDescription className="text-sm">
                Upload up to 5 PDF files for property estimation purposes. These documents will be processed separately from the agent's knowledge base.
              </AlertDescription>
            </Alert>
            {loadingEstimationUpload && (
              <div className="flex items-center justify-center p-4">
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
                <span className="text-sm text-muted-foreground">Uploading estimation documents...</span>
              </div>
            )}
          </div>
          {loadingEstimationDocuments ? (
            <div className="flex items-center justify-center p-8">
              <Loader2 className="h-6 w-6 animate-spin mr-2" />
              <span className="text-sm text-muted-foreground">Loading estimation documents...</span>
            </div>
          ) : estimationDocuments.length > 0 ? (
            <div className="space-y-2">
              <h4 className="text-sm font-medium">Existing Estimation Documents ({estimationDocuments.length}):</h4>
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
                        {doc.updatedAt !== doc.createdAt && (
                          <>
                            <span>•</span>
                            <span>Updated {new Date(doc.updatedAt).toLocaleDateString()}</span>
                          </>
                        )}
                      </div>
                    </div>
                  </div>
                  {/* Download/Remove buttons can be added here if needed */}
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center p-6 text-muted-foreground">
              <FileText className="h-12 w-12 mx-auto mb-3 opacity-50" />
              <p className="text-sm font-medium">No estimation documents found</p>
            </div>
          )}
        </CardContent>
      </Card>

        <CardHeader>
          <CardTitle>Conversation Reference Images</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <Alert>
            <Info className="h-4 w-4" />
            <AlertDescription className="text-sm">
              Upload images of past conversations to make your AI responses more natural. 
              The system automatically extracts text, creates embeddings, and integrates them into the chat system.
            </AlertDescription>
          </Alert>
          
          <div className="space-y-2">
            <Label>Upload Conversation Screenshots (Images)</Label>
            <FileUpload
              files={conversationReferenceFiles}
              onFilesChange={handleConversationReferenceFilesChange}
              accept="image/jpeg,image/png,image/webp"
              multiple
              maxFiles={10}
            />
            <Alert>
              <Info className="h-4 w-4" />
              <AlertDescription className="text-sm">
                Upload up to 10 image files (JPEG, PNG, WebP) of conversation screenshots. 
                The AI will automatically extract text from these images and use them to provide more natural, 
                context-aware responses based on past conversation patterns.
                <br />
                <strong>Processing:</strong> Each image takes 5-10 seconds to process and embed into the system.
              </AlertDescription>
            </Alert>
            {loadingConversationReferenceUpload && (
              <div className="flex items-center justify-center p-4">
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
                <span className="text-sm text-muted-foreground">Processing conversation reference images...</span>
              </div>
            )}
          </div>
          
          {loadingConversationReferenceDocuments ? (
            <div className="flex items-center justify-center p-8">
              <Loader2 className="h-6 w-6 animate-spin mr-2" />
              <span className="text-sm text-muted-foreground">Loading conversation reference images...</span>
            </div>
          ) : conversationReferenceDocuments.length > 0 ? (
            <div className="space-y-2">
              <h4 className="text-sm font-medium">Existing Conversation Reference Images ({conversationReferenceDocuments.length}):</h4>
              {conversationReferenceDocuments.map((doc) => (
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
                        {doc.updatedAt !== doc.createdAt && (
                          <>
                            <span>•</span>
                            <span>Updated {new Date(doc.updatedAt).toLocaleDateString()}</span>
                          </>
                        )}
                      </div>
                    </div>
                  </div>
                  {/* Download/Remove buttons can be added here when API is ready */}
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center p-6 text-muted-foreground">
              <FileText className="h-12 w-12 mx-auto mb-3 opacity-50" />
              <p className="text-sm font-medium">No conversation reference images found</p>
              <p className="text-xs">Upload conversation screenshots above to help train your AI agent with real conversation patterns.</p>
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Agent Chat Preview</CardTitle>
        </CardHeader>
        <CardContent>
          <Button 
            onClick={handleChatPreview} 
            disabled={agent.status !== "ready"}
          >
            <MessageSquare className="mr-2 h-4 w-4" />
            Open Chat Preview
          </Button>
          {agent.status !== "ready" && (
            <p className="text-sm text-muted-foreground mt-2">
              Chat preview is available once the agent status is "ready". Current status: <Badge>{agent.status}</Badge>
            </p>
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
