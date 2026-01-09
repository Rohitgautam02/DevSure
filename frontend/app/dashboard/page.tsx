'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { useAuth } from '@/lib/AuthContext'
import api from '@/lib/api'
import { 
  Shield, Plus, ExternalLink, Clock, CheckCircle, 
  XCircle, Loader2, LogOut, RefreshCw, Trash2
} from 'lucide-react'

interface Project {
  id: string
  projectName: string
  inputUrl: string
  status: 'PENDING' | 'ANALYZING' | 'DONE' | 'FAILED'
  overallScore: number | null
  analyzedAt: string | null
  createdAt: string
}

export default function DashboardPage() {
  const router = useRouter()
  const { user, isAuthenticated, isLoading: authLoading, logout } = useAuth()
  
  const [projects, setProjects] = useState<Project[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [showSubmitModal, setShowSubmitModal] = useState(false)

  // Redirect if not authenticated
  useEffect(() => {
    if (!authLoading && !isAuthenticated) {
      router.push('/login')
    }
  }, [authLoading, isAuthenticated, router])

  // Fetch projects
  useEffect(() => {
    if (isAuthenticated) {
      fetchProjects()
      // Poll for updates every 5 seconds
      const interval = setInterval(fetchProjects, 5000)
      return () => clearInterval(interval)
    }
  }, [isAuthenticated])

  const fetchProjects = async () => {
    try {
      const response = await api.get('/projects')
      setProjects(response.data.projects)
    } catch (error) {
      console.error('Failed to fetch projects:', error)
    } finally {
      setIsLoading(false)
    }
  }

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this project?')) return
    
    try {
      await api.delete(`/projects/${id}`)
      setProjects(projects.filter(p => p.id !== id))
    } catch (error) {
      console.error('Failed to delete project:', error)
    }
  }

  const handleLogout = () => {
    logout()
    router.push('/')
  }

  if (authLoading || !isAuthenticated) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white border-b border-gray-100">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <Link href="/dashboard" className="flex items-center gap-2">
              <Shield className="w-8 h-8 text-primary-600" />
              <span className="text-xl font-bold text-gray-900">DevSure</span>
            </Link>
            <div className="flex items-center gap-4">
              <span className="text-sm text-gray-600">
                {user?.email}
              </span>
              <button
                onClick={handleLogout}
                className="btn-secondary text-sm"
              >
                <LogOut className="w-4 h-4 mr-2" />
                Logout
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Page Header */}
        <div className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Your Projects</h1>
            <p className="text-gray-600 mt-1">Analyze and monitor your deployments</p>
          </div>
          <button
            onClick={() => setShowSubmitModal(true)}
            className="btn-primary"
          >
            <Plus className="w-5 h-5 mr-2" />
            New Analysis
          </button>
        </div>

        {/* Projects List */}
        {isLoading ? (
          <div className="card flex items-center justify-center py-12">
            <Loader2 className="w-8 h-8 text-primary-600 animate-spin" />
          </div>
        ) : projects.length === 0 ? (
          <div className="card text-center py-12">
            <Shield className="w-16 h-16 text-gray-300 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">No projects yet</h3>
            <p className="text-gray-600 mb-6">Submit a URL to start analyzing your first project</p>
            <button
              onClick={() => setShowSubmitModal(true)}
              className="btn-primary"
            >
              <Plus className="w-5 h-5 mr-2" />
              Submit Your First URL
            </button>
          </div>
        ) : (
          <div className="grid gap-4">
            {projects.map((project) => (
              <ProjectCard 
                key={project.id} 
                project={project} 
                onDelete={() => handleDelete(project.id)}
              />
            ))}
          </div>
        )}
      </main>

      {/* Submit Modal */}
      {showSubmitModal && (
        <SubmitModal 
          onClose={() => setShowSubmitModal(false)}
          onSubmit={() => {
            setShowSubmitModal(false)
            fetchProjects()
          }}
        />
      )}
    </div>
  )
}

// Project Card Component
function ProjectCard({ project, onDelete }: { project: Project; onDelete: () => void }) {
  const getStatusBadge = () => {
    switch (project.status) {
      case 'PENDING':
        return (
          <span className="badge-info">
            <Clock className="w-3 h-3 mr-1" />
            Pending
          </span>
        )
      case 'ANALYZING':
        return (
          <span className="badge-warning">
            <Loader2 className="w-3 h-3 mr-1 animate-spin" />
            Analyzing
          </span>
        )
      case 'DONE':
        return (
          <span className="badge-success">
            <CheckCircle className="w-3 h-3 mr-1" />
            Complete
          </span>
        )
      case 'FAILED':
        return (
          <span className="badge-danger">
            <XCircle className="w-3 h-3 mr-1" />
            Failed
          </span>
        )
    }
  }

  const getScoreColor = (score: number | null) => {
    if (score === null) return 'text-gray-400'
    if (score >= 80) return 'text-success-600'
    if (score >= 60) return 'text-warning-600'
    return 'text-danger-600'
  }

  return (
    <div className="card hover:shadow-md transition-shadow">
      <div className="flex items-center justify-between">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-3 mb-2">
            <h3 className="text-lg font-semibold text-gray-900 truncate">
              {project.projectName}
            </h3>
            {getStatusBadge()}
          </div>
          <a 
            href={project.inputUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="text-sm text-primary-600 hover:text-primary-700 flex items-center gap-1 truncate"
          >
            {project.inputUrl}
            <ExternalLink className="w-3 h-3 flex-shrink-0" />
          </a>
          <p className="text-xs text-gray-500 mt-2">
            Submitted {new Date(project.createdAt).toLocaleDateString()}
          </p>
        </div>

        <div className="flex items-center gap-6 ml-6">
          {/* Score */}
          {project.status === 'DONE' && project.overallScore !== null && (
            <div className="text-center">
              <div className={`text-3xl font-bold ${getScoreColor(project.overallScore)}`}>
                {project.overallScore}
              </div>
              <div className="text-xs text-gray-500">Score</div>
            </div>
          )}

          {/* Actions */}
          <div className="flex items-center gap-2">
            {project.status === 'DONE' && (
              <Link 
                href={`/report/${project.id}`}
                className="btn-primary text-sm"
              >
                View Report
              </Link>
            )}
            <button
              onClick={onDelete}
              className="p-2 text-gray-400 hover:text-danger-600 hover:bg-danger-50 rounded-lg transition-colors"
            >
              <Trash2 className="w-5 h-5" />
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

// Submit Modal Component
function SubmitModal({ onClose, onSubmit }: { onClose: () => void; onSubmit: () => void }) {
  const [projectName, setProjectName] = useState('')
  const [url, setUrl] = useState('')
  const [error, setError] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setIsSubmitting(true)

    try {
      await api.post('/projects/submit', { projectName, url })
      onSubmit()
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to submit project.')
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-xl max-w-md w-full p-6">
        <h2 className="text-xl font-bold text-gray-900 mb-6">Submit New Project</h2>

        {error && (
          <div className="mb-4 p-3 bg-danger-50 border border-danger-200 rounded-lg text-sm text-danger-600">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Project Name
            </label>
            <input
              type="text"
              value={projectName}
              onChange={(e) => setProjectName(e.target.value)}
              className="input"
              placeholder="My Awesome Project"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Deployment URL
            </label>
            <input
              type="url"
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              className="input"
              placeholder="https://myproject.vercel.app"
              required
            />
            <p className="text-xs text-gray-500 mt-1">
              Must include http:// or https://
            </p>
          </div>

          <div className="flex gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="btn-secondary flex-1"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="btn-primary flex-1"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Submitting...
                </>
              ) : (
                'Start Analysis'
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
