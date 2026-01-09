'use client'

import { useState, useEffect } from 'react'
import { useRouter, useParams } from 'next/navigation'
import Link from 'next/link'
import { useAuth } from '@/lib/AuthContext'
import api from '@/lib/api'
import { 
  Shield, ArrowLeft, ExternalLink, AlertCircle, CheckCircle, 
  AlertTriangle, Info, Zap, Lock, BarChart3, Clock, Download
} from 'lucide-react'

interface Issue {
  severity: 'critical' | 'major' | 'minor' | 'info'
  category: string
  title: string
  description: string
  impact: string
}

interface Suggestion {
  priority: 'critical' | 'high' | 'medium' | 'low' | 'info'
  title: string
  description: string
  category: string
}

interface Metrics {
  reachable: boolean
  statusCode: number | null
  responseTimeMs: number | null
  contentType: string
  hasSSL: boolean
  serverInfo: string
  redirects: number
  finalUrl: string
  analysisTimeMs: number
}

interface Report {
  overallScore: number
  performanceScore: number
  errorScore: number
  durabilityScore: number
  issues: Issue[]
  suggestions: Suggestion[]
  metrics: Metrics
  analyzedAt: string
  analysisTimeMs: number
}

interface Project {
  id: string
  projectName: string
  inputUrl: string
  status: string
  createdAt: string
}

export default function ReportPage() {
  const router = useRouter()
  const params = useParams()
  const { isAuthenticated, isLoading: authLoading } = useAuth()
  
  const [project, setProject] = useState<Project | null>(null)
  const [report, setReport] = useState<Report | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    if (!authLoading && !isAuthenticated) {
      router.push('/login')
    }
  }, [authLoading, isAuthenticated, router])

  useEffect(() => {
    if (isAuthenticated && params.id) {
      fetchReport()
    }
  }, [isAuthenticated, params.id])

  const fetchReport = async () => {
    try {
      const response = await api.get(`/projects/${params.id}/report`)
      setProject(response.data.project)
      setReport(response.data.report)
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to load report')
    } finally {
      setIsLoading(false)
    }
  }

  if (authLoading || isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
      </div>
    )
  }

  if (error || !project || !report) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <AlertCircle className="w-16 h-16 text-danger-500 mx-auto mb-4" />
          <h2 className="text-xl font-bold text-gray-900 mb-2">Report Not Available</h2>
          <p className="text-gray-600 mb-6">{error || 'The analysis is still in progress.'}</p>
          <Link href="/dashboard" className="btn-primary">
            <ArrowLeft className="w-5 h-5 mr-2" />
            Back to Dashboard
          </Link>
        </div>
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
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Back Link */}
        <Link 
          href="/dashboard" 
          className="inline-flex items-center text-sm text-gray-600 hover:text-gray-900 mb-6"
        >
          <ArrowLeft className="w-4 h-4 mr-1" />
          Back to Dashboard
        </Link>

        {/* Project Info */}
        <div className="card mb-6">
          <div className="flex justify-between items-start">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">{project.projectName}</h1>
              <a 
                href={project.inputUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="text-primary-600 hover:text-primary-700 flex items-center gap-1 mt-2"
              >
                {project.inputUrl}
                <ExternalLink className="w-4 h-4" />
              </a>
            </div>
            <div className="text-right text-sm text-gray-500">
              <div className="flex items-center gap-1">
                <Clock className="w-4 h-4" />
                Analyzed {new Date(report.analyzedAt).toLocaleString()}
              </div>
              <div className="mt-1">
                Analysis took {(report.analysisTimeMs / 1000).toFixed(2)}s
              </div>
            </div>
          </div>
        </div>

        {/* Scores Grid */}
        <div className="grid md:grid-cols-4 gap-4 mb-8">
          <ScoreCard 
            title="Overall Score" 
            score={report.overallScore} 
            icon={<BarChart3 className="w-6 h-6" />}
            isMain
          />
          <ScoreCard 
            title="Performance" 
            score={report.performanceScore} 
            icon={<Zap className="w-6 h-6" />}
          />
          <ScoreCard 
            title="Error Score" 
            score={report.errorScore} 
            icon={<AlertCircle className="w-6 h-6" />}
          />
          <ScoreCard 
            title="Durability" 
            score={report.durabilityScore} 
            icon={<Lock className="w-6 h-6" />}
          />
        </div>

        {/* Metrics */}
        <div className="card mb-8">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Analysis Metrics</h2>
          <div className="grid md:grid-cols-3 lg:grid-cols-6 gap-4">
            <MetricItem 
              label="Status Code" 
              value={report.metrics.statusCode || 'N/A'} 
              status={report.metrics.statusCode === 200 ? 'success' : 'warning'}
            />
            <MetricItem 
              label="Response Time" 
              value={`${report.metrics.responseTimeMs || 0}ms`}
              status={report.metrics.responseTimeMs && report.metrics.responseTimeMs < 1000 ? 'success' : 'warning'}
            />
            <MetricItem 
              label="HTTPS" 
              value={report.metrics.hasSSL ? 'Yes' : 'No'}
              status={report.metrics.hasSSL ? 'success' : 'danger'}
            />
            <MetricItem 
              label="Reachable" 
              value={report.metrics.reachable ? 'Yes' : 'No'}
              status={report.metrics.reachable ? 'success' : 'danger'}
            />
            <MetricItem 
              label="Redirects" 
              value={report.metrics.redirects}
              status={report.metrics.redirects === 0 ? 'success' : 'info'}
            />
            <MetricItem 
              label="Content Type" 
              value={report.metrics.contentType?.split(';')[0] || 'Unknown'}
            />
          </div>
        </div>

        {/* Issues */}
        <div className="card mb-8">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">
            Issues Found ({report.issues.length})
          </h2>
          {report.issues.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              <CheckCircle className="w-12 h-12 text-success-500 mx-auto mb-3" />
              <p>No issues found! Your project looks healthy.</p>
            </div>
          ) : (
            <div className="space-y-4">
              {report.issues.map((issue, index) => (
                <IssueCard key={index} issue={issue} />
              ))}
            </div>
          )}
        </div>

        {/* Suggestions */}
        <div className="card">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">
            Improvement Suggestions ({report.suggestions.length})
          </h2>
          {report.suggestions.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              <CheckCircle className="w-12 h-12 text-success-500 mx-auto mb-3" />
              <p>Great job! No improvements needed.</p>
            </div>
          ) : (
            <div className="space-y-3">
              {report.suggestions.map((suggestion, index) => (
                <SuggestionCard key={index} suggestion={suggestion} />
              ))}
            </div>
          )}
        </div>
      </main>
    </div>
  )
}

// Score Card Component
function ScoreCard({ 
  title, 
  score, 
  icon, 
  isMain = false 
}: { 
  title: string
  score: number
  icon: React.ReactNode
  isMain?: boolean 
}) {
  const getScoreColor = (score: number) => {
    if (score >= 80) return 'text-success-600'
    if (score >= 60) return 'text-warning-600'
    return 'text-danger-600'
  }

  const getScoreBg = (score: number) => {
    if (score >= 80) return 'bg-success-50'
    if (score >= 60) return 'bg-warning-50'
    return 'bg-danger-50'
  }

  return (
    <div className={`card ${isMain ? 'border-2 border-primary-200' : ''}`}>
      <div className="flex items-center gap-3 mb-3">
        <div className={`p-2 rounded-lg ${getScoreBg(score)}`}>
          <div className={getScoreColor(score)}>{icon}</div>
        </div>
        <span className="text-sm font-medium text-gray-600">{title}</span>
      </div>
      <div className={`text-4xl font-bold ${getScoreColor(score)}`}>
        {score}
        <span className="text-lg text-gray-400">/100</span>
      </div>
    </div>
  )
}

// Metric Item Component
function MetricItem({ 
  label, 
  value, 
  status 
}: { 
  label: string
  value: string | number
  status?: 'success' | 'warning' | 'danger' | 'info'
}) {
  const statusColors = {
    success: 'text-success-600',
    warning: 'text-warning-600',
    danger: 'text-danger-600',
    info: 'text-primary-600',
  }

  return (
    <div>
      <div className="text-xs text-gray-500 mb-1">{label}</div>
      <div className={`font-semibold ${status ? statusColors[status] : 'text-gray-900'}`}>
        {value}
      </div>
    </div>
  )
}

// Issue Card Component
function IssueCard({ issue }: { issue: Issue }) {
  const severityConfig = {
    critical: { 
      bg: 'bg-danger-50', 
      border: 'border-danger-200', 
      icon: <AlertCircle className="w-5 h-5 text-danger-600" />,
      badge: 'badge-danger'
    },
    major: { 
      bg: 'bg-warning-50', 
      border: 'border-warning-200', 
      icon: <AlertTriangle className="w-5 h-5 text-warning-600" />,
      badge: 'badge-warning'
    },
    minor: { 
      bg: 'bg-primary-50', 
      border: 'border-primary-200', 
      icon: <Info className="w-5 h-5 text-primary-600" />,
      badge: 'badge-info'
    },
    info: { 
      bg: 'bg-gray-50', 
      border: 'border-gray-200', 
      icon: <Info className="w-5 h-5 text-gray-600" />,
      badge: 'badge bg-gray-100 text-gray-600'
    },
  }

  const config = severityConfig[issue.severity]

  return (
    <div className={`p-4 rounded-lg border ${config.bg} ${config.border}`}>
      <div className="flex items-start gap-3">
        {config.icon}
        <div className="flex-1">
          <div className="flex items-center gap-2 mb-1">
            <h4 className="font-semibold text-gray-900">{issue.title}</h4>
            <span className={config.badge}>{issue.severity}</span>
            <span className="badge bg-gray-100 text-gray-600">{issue.category}</span>
          </div>
          <p className="text-sm text-gray-700 mb-2">{issue.description}</p>
          <p className="text-sm text-gray-500">
            <strong>Impact:</strong> {issue.impact}
          </p>
        </div>
      </div>
    </div>
  )
}

// Suggestion Card Component
function SuggestionCard({ suggestion }: { suggestion: Suggestion }) {
  const priorityConfig = {
    critical: 'badge-danger',
    high: 'badge-warning',
    medium: 'badge-info',
    low: 'badge bg-gray-100 text-gray-600',
    info: 'badge-success',
  }

  return (
    <div className="p-4 bg-gray-50 rounded-lg border border-gray-200">
      <div className="flex items-center gap-2 mb-2">
        <CheckCircle className="w-5 h-5 text-primary-600" />
        <h4 className="font-medium text-gray-900">{suggestion.title}</h4>
        <span className={priorityConfig[suggestion.priority]}>{suggestion.priority}</span>
      </div>
      <p className="text-sm text-gray-600 ml-7">{suggestion.description}</p>
    </div>
  )
}
