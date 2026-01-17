'use client'

import { useState, useEffect } from 'react'
import { useRouter, useParams } from 'next/navigation'
import Link from 'next/link'
import { useAuth } from '@/lib/AuthContext'
import api from '@/lib/api'
import { 
  Shield, ArrowLeft, ExternalLink, AlertCircle, CheckCircle, CheckCircle2,
  AlertTriangle, Info, Zap, Lock, BarChart3, Clock, Eye,
  Code, Package, GitBranch, Bug, Globe, Gauge, 
  Search, ShieldCheck, Activity
} from 'lucide-react'

interface Issue {
  severity: 'critical' | 'major' | 'minor' | 'info'
  category: string
  title: string
  description: string
  impact?: string
}

interface Suggestion {
  priority: 'critical' | 'high' | 'medium' | 'low' | 'info'
  title: string
  description: string
  category: string
}

interface CoreWebVitals {
  lcp: string | null
  fcp: string | null
  cls: string | null
  tbt: number | null
  si: string | null
  tti: string | null
}

interface LighthouseDetails {
  opportunities?: Array<{
    title: string
    displayValue?: string
    score: number
  }>
  diagnostics?: Array<{
    title: string
    displayValue?: string
  }>
}

interface PlainEnglishItem {
  icon: string
  title: string
  plain: string
  action: string
}

interface PriorityAction {
  priority: number
  urgency: string
  title: string
  command: string
  timeEstimate: string
  impact: string
}

interface GitHubAnalysis {
  success: boolean
  analysisConfidence?: 'LOW' | 'MEDIUM' | 'HIGH'
  analysisDepth?: string[]
  isMonorepo?: boolean
  packagesAnalyzed?: string[]
  repoType?: 'application' | 'library' | 'framework' | 'cli' | 'monorepo'
  plainEnglishSummary?: PlainEnglishItem[]
  priorityActions?: PriorityAction[]
  rawMetrics?: {
    eslintErrors: number
    eslintWarnings: number
    vulnerabilities: {
      critical: number
      high: number
      moderate: number
      low: number
      total: number
    }
    outdatedDeps: number
    totalDeps: number
    hasTests: boolean
    hasTypeScript: boolean
    hasESLint: boolean
  }
  stack?: {
    detected: boolean
    framework: string | null
    language: string
    hasTypeScript: boolean
    hasESLint: boolean
    hasTests: boolean
    hasCICD?: boolean
    hasReadme?: boolean
    hasLicense?: boolean
  }
  security?: {
    analyzed?: boolean
    vulnerabilities: {
      critical: number
      high: number
      moderate: number
      low: number
      total: number
    }
    details: Array<{
      package: string
      severity: string
      title: string
      fixAvailable?: boolean | { name: string; version: string }
    }>
  }
  dependencies?: {
    analyzed?: boolean
    total: number
    outdated: number
    outdatedList: Array<{
      package: string
      current: string
      latest: string
    }>
  }
  codeQuality?: {
    analyzed?: boolean
    eslintErrors: number
    eslintWarnings: number
    issues: Array<{
      file: string
      line: number
      message: string
      severity: string
      rule: string | null
    }>
  }
  scores?: {
    security: number
    codeQuality: number
    testing: number
    dependencies: number
    hygiene: number
    overall: number
    rawTotal: number
    confidenceMultiplier: number
    maxPossible: number
  }
  scoreDetails?: {
    security: { earned: number; max: number; details: string[] }
    codeQuality: { earned: number; max: number; details: string[] }
    testing: { earned: number; max: number; details: string[] }
    dependencies: { earned: number; max: number; details: string[] }
    hygiene: { earned: number; max: number; details: string[] }
  }
  verdict?: {
    emoji: string
    label: string
    reason: string
    color: string
  }
}

interface Metrics {
  reachable?: boolean
  statusCode?: number | null
  responseTimeMs?: number | null
  contentType?: string
  hasSSL?: boolean
  redirects?: number
}

interface Report {
  overallScore: number
  performanceScore: number
  errorScore: number
  durabilityScore: number
  lighthousePerformance: number | null
  lighthouseAccessibility: number | null
  lighthouseBestPractices: number | null
  lighthouseSeo: number | null
  coreWebVitals: CoreWebVitals | null
  lighthouseDetails: LighthouseDetails | null
  githubAnalysis: GitHubAnalysis | null
  codeQualityScore: number | null
  securityScore: number | null
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
  inputType?: string
  status: string
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
      
      const reportData = response.data.report
      setReport({
        ...reportData,
        coreWebVitals: reportData.coreWebVitals ? 
          (typeof reportData.coreWebVitals === 'string' ? JSON.parse(reportData.coreWebVitals) : reportData.coreWebVitals) : null,
        lighthouseDetails: reportData.lighthouseDetails ? 
          (typeof reportData.lighthouseDetails === 'string' ? JSON.parse(reportData.lighthouseDetails) : reportData.lighthouseDetails) : null,
        githubAnalysis: reportData.githubAnalysis ? 
          (typeof reportData.githubAnalysis === 'string' ? JSON.parse(reportData.githubAnalysis) : reportData.githubAnalysis) : null
      })
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to load report')
    } finally {
      setIsLoading(false)
    }
  }

  const isGitHubAnalysis = project?.inputUrl?.includes('github.com') || 
    (report?.githubAnalysis && Object.keys(report.githubAnalysis).length > 0 && report.githubAnalysis.success)

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
          <p className="text-gray-600 mb-6">{error || 'Analysis in progress.'}</p>
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
      <header className="bg-white border-b border-gray-100">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <Link href="/dashboard" className="flex items-center gap-2">
              <Shield className="w-8 h-8 text-primary-600" />
              <span className="text-xl font-bold text-gray-900">DevSure</span>
            </Link>
            <div className="flex items-center gap-2">
              {isGitHubAnalysis ? (
                <span className="badge bg-gray-800 text-white">
                  <GitBranch className="w-3 h-3 mr-1" />
                  GitHub Analysis
                </span>
              ) : (
                <span className="badge bg-primary-100 text-primary-700">
                  <Globe className="w-3 h-3 mr-1" />
                  Deployment Analysis
                </span>
              )}
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <Link href="/dashboard" className="inline-flex items-center text-sm text-gray-600 hover:text-gray-900 mb-6">
          <ArrowLeft className="w-4 h-4 mr-1" />
          Back to Dashboard
        </Link>

        {/* Project Info */}
        <div className="card mb-6">
          <div className="flex justify-between items-start">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">{project.projectName}</h1>
              <a href={project.inputUrl} target="_blank" rel="noopener noreferrer"
                className="text-primary-600 hover:text-primary-700 flex items-center gap-1 mt-2">
                {project.inputUrl}
                <ExternalLink className="w-4 h-4" />
              </a>
            </div>
            <div className="text-right text-sm text-gray-500">
              <div className="flex items-center gap-1">
                <Clock className="w-4 h-4" />
                {new Date(report.analyzedAt).toLocaleString()}
              </div>
              <div className="mt-1">Analysis took {(report.analysisTimeMs / 1000).toFixed(1)}s</div>
            </div>
          </div>
        </div>

        {/* Overall Score */}
        <div className="card mb-6 text-center bg-gradient-to-r from-primary-50 to-primary-100 border-primary-200">
          <h2 className="text-lg font-medium text-gray-700 mb-2">
            {isGitHubAnalysis ? 'Code Readiness Score' : 'Deployment Health Score'}
          </h2>
          <div className={`text-6xl font-bold ${getScoreColor(report.overallScore)}`}>
            {report.overallScore}
            <span className="text-2xl text-gray-400">/95</span>
          </div>
          
          {/* Verdict Badge */}
          {report.githubAnalysis?.verdict && (
            <div className={`inline-flex items-center gap-2 mt-3 px-4 py-2 rounded-full ${
              report.githubAnalysis.verdict.color === 'danger' ? 'bg-danger-100 text-danger-700' :
              report.githubAnalysis.verdict.color === 'warning' ? 'bg-warning-100 text-warning-700' :
              report.githubAnalysis.verdict.color === 'info' ? 'bg-primary-100 text-primary-700' :
              'bg-success-100 text-success-700'
            }`}>
              <span className="text-xl">{report.githubAnalysis.verdict.emoji}</span>
              <span className="font-semibold">{report.githubAnalysis.verdict.label}</span>
            </div>
          )}
          
          {/* Repo Type Badge */}
          {report.githubAnalysis?.repoType && report.githubAnalysis.repoType !== 'application' && (
            <div className="inline-flex items-center gap-2 ml-2 mt-3 px-3 py-1 rounded-full bg-gray-100 text-gray-600 text-sm">
              <Package className="w-4 h-4" />
              <span className="capitalize">{report.githubAnalysis.repoType}</span>
            </div>
          )}
          
          <p className="text-gray-600 mt-2">
            {report.githubAnalysis?.verdict?.reason || getScoreLabel(report.overallScore)}
          </p>
          <p className="text-xs text-gray-400 mt-1">
            {isGitHubAnalysis 
              ? 'Based on security, code quality, testing, dependencies & hygiene' 
              : 'Based on server health, performance, and security headers'}
          </p>
          
          {/* Analysis Confidence */}
          {report.githubAnalysis?.analysisConfidence && (
            <div className="mt-4 inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white border border-gray-200">
              <span className="text-xs text-gray-500">Analysis Confidence:</span>
              <span className={`text-xs font-bold ${
                report.githubAnalysis.analysisConfidence === 'HIGH' ? 'text-success-600' :
                report.githubAnalysis.analysisConfidence === 'MEDIUM' ? 'text-warning-600' :
                'text-danger-600'
              }`}>
                {report.githubAnalysis.analysisConfidence}
              </span>
            </div>
          )}
        </div>

        {/* LOW CONFIDENCE WARNING BANNER */}
        {isGitHubAnalysis && report.githubAnalysis?.analysisConfidence === 'LOW' && (
          <div className="card mb-6 bg-warning-50 border-warning-200">
            <div className="flex items-start gap-3">
              <AlertTriangle className="w-5 h-5 text-warning-600 flex-shrink-0 mt-0.5" />
              <div>
                <p className="font-medium text-warning-800">Limited Analysis Depth</p>
                <p className="text-sm text-warning-700 mt-1">
                  This repository could not be deeply analyzed because required tooling is missing. 
                  Scores reflect analysis limitations, not necessarily project quality.
                </p>
              </div>
            </div>
          </div>
        )}

        {/* ANALYSIS COVERAGE - What was actually analyzed */}
        {isGitHubAnalysis && report.githubAnalysis && (
          <div className="card mb-6">
            <h2 className="text-sm font-semibold text-gray-700 mb-3 flex items-center gap-2">
              <BarChart3 className="w-4 h-4" />
              Analysis Coverage
            </h2>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <CoverageItem 
                label="Code Quality" 
                analyzed={report.githubAnalysis.codeQuality?.analyzed || false}
                reason={report.githubAnalysis.stack?.hasESLint ? 'ESLint ran' : 'No ESLint config'}
              />
              <CoverageItem 
                label="Security" 
                analyzed={report.githubAnalysis.security?.analyzed || false}
                reason={report.githubAnalysis.security?.analyzed ? 'npm audit ran' : 'Audit failed'}
              />
              <CoverageItem 
                label="Dependencies" 
                analyzed={report.githubAnalysis.dependencies?.analyzed || false}
                reason={(report.githubAnalysis.dependencies?.total || 0) > 0 ? 'Deps found' : 'No deps'}
              />
              <CoverageItem 
                label="Tests" 
                analyzed={report.githubAnalysis.stack?.hasTests || false}
                reason={report.githubAnalysis.stack?.hasTests ? 'Tests detected' : 'No tests'}
              />
            </div>
          </div>
        )}

        {/* PLAIN ENGLISH SUMMARY - For non-technical users */}
        {isGitHubAnalysis && report.githubAnalysis?.plainEnglishSummary && report.githubAnalysis.plainEnglishSummary.length > 0 && (
          <div className="card mb-6 bg-gradient-to-r from-blue-50 to-indigo-50 border-blue-200">
            <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
              💬 What This Means (Plain English)
            </h2>
            <div className="space-y-4">
              {report.githubAnalysis.plainEnglishSummary.map((item, i) => (
                <div key={i} className="bg-white p-4 rounded-lg border border-blue-100">
                  <div className="flex items-start gap-3">
                    <span className="text-2xl">{item.icon}</span>
                    <div className="flex-1">
                      <h3 className="font-semibold text-gray-900">{item.title}</h3>
                      <p className="text-gray-600 mt-1">{item.plain}</p>
                      <p className="text-sm text-primary-600 mt-2 font-medium">
                        👉 {item.action}
                      </p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* PRIORITY ACTIONS - What to fix first */}
        {isGitHubAnalysis && report.githubAnalysis?.priorityActions && report.githubAnalysis.priorityActions.length > 0 && (
          <div className="card mb-6 bg-gradient-to-r from-amber-50 to-orange-50 border-amber-200">
            <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
              🎯 What To Fix First
            </h2>
            <div className="space-y-3">
              {report.githubAnalysis.priorityActions.map((action, i) => (
                <div key={i} className="bg-white p-4 rounded-lg border border-amber-100 flex items-start gap-4">
                  <div className="flex-shrink-0 w-8 h-8 rounded-full bg-amber-100 flex items-center justify-center font-bold text-amber-700">
                    {action.priority}
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <h3 className="font-semibold text-gray-900">{action.title}</h3>
                      <span className={`text-xs px-2 py-0.5 rounded-full ${
                        action.urgency === 'Do this now' ? 'bg-danger-100 text-danger-700' :
                        action.urgency === 'Do this today' ? 'bg-warning-100 text-warning-700' :
                        action.urgency === 'Do this week' ? 'bg-primary-100 text-primary-700' :
                        'bg-gray-100 text-gray-600'
                      }`}>
                        {action.urgency}
                      </span>
                      <span className="text-xs text-gray-400">~{action.timeEstimate}</span>
                    </div>
                    <p className="text-sm text-gray-500 mt-1">{action.impact}</p>
                    <div className="mt-2 bg-gray-800 text-green-400 px-3 py-2 rounded font-mono text-sm">
                      $ {action.command}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Scores Grid */}
        {isGitHubAnalysis ? (
          <>
            {/* New 5-Category Scoring */}
            {report.githubAnalysis?.scores && (
              <div className="mb-8">
                <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
                  <BarChart3 className="w-5 h-5 text-primary-600" />
                  Score Breakdown
                  <span className="text-xs text-gray-500 font-normal ml-2">
                    (Earned Points / Max Points)
                  </span>
                </h2>
                <div className="grid md:grid-cols-5 gap-4">
                  <ScoreCategory 
                    title="Security" 
                    earned={report.githubAnalysis.scores?.security ?? 0} 
                    max={30} 
                    icon="🔐" 
                    details={report.githubAnalysis.scoreDetails?.security?.details || []}
                  />
                  <ScoreCategory 
                    title="Code Quality" 
                    earned={report.githubAnalysis.scores?.codeQuality ?? 0} 
                    max={25} 
                    icon="🧹" 
                    details={report.githubAnalysis.scoreDetails?.codeQuality?.details || []}
                  />
                  <ScoreCategory 
                    title="Testing" 
                    earned={report.githubAnalysis.scores?.testing ?? 0} 
                    max={20} 
                    icon="🧪" 
                    details={report.githubAnalysis.scoreDetails?.testing?.details || []}
                  />
                  <ScoreCategory 
                    title="Dependencies" 
                    earned={report.githubAnalysis.scores?.dependencies ?? 0} 
                    max={10} 
                    icon="📦" 
                    details={report.githubAnalysis.scoreDetails?.dependencies?.details || []}
                  />
                  <ScoreCategory 
                    title="Hygiene" 
                    earned={report.githubAnalysis.scores?.hygiene ?? 0} 
                    max={10} 
                    icon="📁" 
                    details={report.githubAnalysis.scoreDetails?.hygiene?.details || []}
                  />
                </div>
                {(report.githubAnalysis.scores?.confidenceMultiplier ?? 1) < 1 && (
                  <p className="text-xs text-gray-500 mt-2 text-center">
                    Confidence multiplier applied: ×{report.githubAnalysis.scores?.confidenceMultiplier ?? 1} 
                    (Raw: {report.githubAnalysis.scores?.rawTotal ?? 0} → Adjusted: {report.githubAnalysis.scores?.overall ?? 0})
                  </p>
                )}
              </div>
            )}
          </>
        ) : (
          <>
            {report.lighthousePerformance !== null && (
              <div className="mb-8">
                <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
                  <Gauge className="w-5 h-5 text-primary-600" />
                  Lighthouse Scores
                </h2>
                <div className="grid md:grid-cols-4 gap-4">
                  <ScoreCard title="Performance" score={report.lighthousePerformance} icon={<Zap className="w-6 h-6" />} />
                  <ScoreCard title="Accessibility" score={report.lighthouseAccessibility || 0} icon={<Eye className="w-6 h-6" />} />
                  <ScoreCard title="Best Practices" score={report.lighthouseBestPractices || 0} icon={<CheckCircle className="w-6 h-6" />} />
                  <ScoreCard title="SEO" score={report.lighthouseSeo || 0} icon={<Search className="w-6 h-6" />} />
                </div>
              </div>
            )}

            {report.coreWebVitals && Object.keys(report.coreWebVitals).length > 0 && (
              <div className="card mb-8">
                <h2 className="text-lg font-semibold text-gray-900 mb-4">Core Web Vitals</h2>
                <div className="grid md:grid-cols-3 lg:grid-cols-6 gap-4">
                  <WebVitalItem label="LCP" value={report.coreWebVitals.lcp || '-'} unit="s" threshold={{ good: 2.5, poor: 4.0 }} />
                  <WebVitalItem label="FCP" value={report.coreWebVitals.fcp || '-'} unit="s" threshold={{ good: 1.8, poor: 3.0 }} />
                  <WebVitalItem label="CLS" value={report.coreWebVitals.cls || '-'} unit="" threshold={{ good: 0.1, poor: 0.25 }} />
                  <WebVitalItem label="TBT" value={report.coreWebVitals.tbt?.toString() || '-'} unit="ms" threshold={{ good: 200, poor: 600 }} />
                  <WebVitalItem label="SI" value={report.coreWebVitals.si || '-'} unit="s" threshold={{ good: 3.4, poor: 5.8 }} />
                  <WebVitalItem label="TTI" value={report.coreWebVitals.tti || '-'} unit="s" threshold={{ good: 3.8, poor: 7.3 }} />
                </div>
              </div>
            )}

            <div className="card mb-8">
              <h2 className="text-lg font-semibold text-gray-900 mb-4">Server Metrics</h2>
              <div className="grid md:grid-cols-3 lg:grid-cols-6 gap-4">
                <MetricItem label="Status Code" value={report.metrics.statusCode?.toString() || 'N/A'} 
                  status={report.metrics.statusCode === 200 ? 'success' : 'warning'} />
                <MetricItem label="Response Time" value={`${report.metrics.responseTimeMs || 0}ms`}
                  status={report.metrics.responseTimeMs && report.metrics.responseTimeMs < 1000 ? 'success' : 'warning'} />
                <MetricItem label="HTTPS" value={report.metrics.hasSSL ? 'Yes' : 'No'}
                  status={report.metrics.hasSSL ? 'success' : 'danger'} />
                <MetricItem label="Reachable" value={report.metrics.reachable ? 'Yes' : 'No'}
                  status={report.metrics.reachable ? 'success' : 'danger'} />
                <MetricItem label="Redirects" value={report.metrics.redirects?.toString() || '0'}
                  status={report.metrics.redirects === 0 ? 'success' : 'info'} />
                <MetricItem label="Content Type" value={report.metrics.contentType?.split(';')[0] || 'Unknown'} />
              </div>
            </div>
          </>
        )}

        {/* GitHub Analysis Sections */}
        {isGitHubAnalysis && report.githubAnalysis && (
          <>
            {report.githubAnalysis.stack?.detected && (
              <div className="card mb-8">
                <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
                  <Code className="w-5 h-5 text-primary-600" />
                  Technology Stack
                </h2>
                <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-4">
                  <div className="p-4 bg-gray-50 rounded-lg">
                    <div className="text-sm text-gray-500">Language</div>
                    <div className="font-semibold text-gray-900">{report.githubAnalysis.stack.language}</div>
                  </div>
                  <div className="p-4 bg-gray-50 rounded-lg">
                    <div className="text-sm text-gray-500">Framework</div>
                    <div className="font-semibold text-gray-900">{report.githubAnalysis.stack.framework || 'None'}</div>
                  </div>
                  <div className="p-4 bg-gray-50 rounded-lg">
                    <div className="text-sm text-gray-500">TypeScript</div>
                    <div className={`font-semibold ${report.githubAnalysis.stack.hasTypeScript ? 'text-success-600' : 'text-gray-400'}`}>
                      {report.githubAnalysis.stack.hasTypeScript ? '✓ Yes' : '✗ No'}
                    </div>
                  </div>
                  <div className="p-4 bg-gray-50 rounded-lg">
                    <div className="text-sm text-gray-500">Tests</div>
                    <div className={`font-semibold ${report.githubAnalysis.stack.hasTests ? 'text-success-600' : 'text-warning-600'}`}>
                      {report.githubAnalysis.stack.hasTests ? '✓ Yes' : '✗ No'}
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Raw Metrics Section - Transparency */}
            {report.githubAnalysis.rawMetrics && (
              <div className="card mb-8 bg-gray-50">
                <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
                  <BarChart3 className="w-5 h-5 text-gray-600" />
                  Raw Analysis Data
                </h2>
                <p className="text-xs text-gray-500 mb-4">What we actually measured (no interpretation)</p>
                <div className="grid md:grid-cols-3 lg:grid-cols-4 gap-4">
                  <div className="p-3 bg-white rounded-lg border">
                    <div className="text-xs text-gray-500">ESLint Errors</div>
                    <div className={`text-xl font-bold ${(report.githubAnalysis.rawMetrics?.eslintErrors || 0) > 0 ? 'text-danger-600' : 'text-gray-400'}`}>
                      {report.githubAnalysis.rawMetrics?.eslintErrors ?? 0}
                    </div>
                  </div>
                  <div className="p-3 bg-white rounded-lg border">
                    <div className="text-xs text-gray-500">ESLint Warnings</div>
                    <div className={`text-xl font-bold ${(report.githubAnalysis.rawMetrics?.eslintWarnings || 0) > 5 ? 'text-warning-600' : 'text-gray-400'}`}>
                      {report.githubAnalysis.rawMetrics?.eslintWarnings ?? 0}
                    </div>
                  </div>
                  <div className="p-3 bg-white rounded-lg border">
                    <div className="text-xs text-gray-500">Vulnerabilities</div>
                    <div className={`text-xl font-bold ${(report.githubAnalysis.rawMetrics?.vulnerabilities?.total || 0) > 0 ? 'text-danger-600' : 'text-gray-400'}`}>
                      {report.githubAnalysis.rawMetrics?.vulnerabilities?.total ?? 0}
                    </div>
                  </div>
                  <div className="p-3 bg-white rounded-lg border">
                    <div className="text-xs text-gray-500">Outdated Packages</div>
                    <div className={`text-xl font-bold ${(report.githubAnalysis.rawMetrics?.outdatedDeps || 0) > 5 ? 'text-warning-600' : 'text-gray-400'}`}>
                      {report.githubAnalysis.rawMetrics?.outdatedDeps ?? 0}
                    </div>
                  </div>
                  <div className="p-3 bg-white rounded-lg border">
                    <div className="text-xs text-gray-500">Has Tests</div>
                    <div className={`text-xl font-bold ${report.githubAnalysis.rawMetrics?.hasTests ? 'text-success-600' : 'text-danger-600'}`}>
                      {report.githubAnalysis.rawMetrics?.hasTests ? 'Yes' : 'No'}
                    </div>
                  </div>
                  <div className="p-3 bg-white rounded-lg border">
                    <div className="text-xs text-gray-500">TypeScript</div>
                    <div className={`text-xl font-bold ${report.githubAnalysis.rawMetrics?.hasTypeScript ? 'text-success-600' : 'text-gray-400'}`}>
                      {report.githubAnalysis.rawMetrics?.hasTypeScript ? 'Yes' : 'No'}
                    </div>
                  </div>
                  <div className="p-3 bg-white rounded-lg border">
                    <div className="text-xs text-gray-500">ESLint Configured</div>
                    <div className={`text-xl font-bold ${report.githubAnalysis.rawMetrics?.hasESLint ? 'text-success-600' : 'text-gray-400'}`}>
                      {report.githubAnalysis.rawMetrics?.hasESLint ? 'Yes' : 'No'}
                    </div>
                  </div>
                  <div className="p-3 bg-white rounded-lg border">
                    <div className="text-xs text-gray-500">Total Dependencies</div>
                    <div className="text-xl font-bold text-gray-600">
                      {report.githubAnalysis.rawMetrics?.totalDeps ?? 0}
                    </div>
                  </div>
                </div>
                
                {/* Analysis Depth */}
                {report.githubAnalysis.analysisDepth && report.githubAnalysis.analysisDepth.length > 0 && (
                  <div className="mt-4 pt-4 border-t">
                    <div className="text-xs text-gray-500 mb-2">Analysis methods used:</div>
                    <div className="flex flex-wrap gap-2">
                      {report.githubAnalysis.analysisDepth.map((method, i) => (
                        <span key={i} className="text-xs bg-gray-200 text-gray-700 px-2 py-1 rounded">
                          {method}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}

            {report.githubAnalysis?.security?.vulnerabilities?.total > 0 && (
              <div className="card mb-8">
                <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
                  <ShieldCheck className="w-5 h-5 text-danger-600" />
                  Security Vulnerabilities
                </h2>
                <div className="grid md:grid-cols-4 gap-4 mb-4">
                  <VulnBadge severity="critical" count={report.githubAnalysis.security?.vulnerabilities?.critical ?? 0} />
                  <VulnBadge severity="high" count={report.githubAnalysis.security?.vulnerabilities?.high ?? 0} />
                  <VulnBadge severity="moderate" count={report.githubAnalysis.security?.vulnerabilities?.moderate ?? 0} />
                  <VulnBadge severity="low" count={report.githubAnalysis.security?.vulnerabilities?.low ?? 0} />
                </div>
                {report.githubAnalysis.security?.details?.length > 0 && (
                  <div className="mt-4">
                    <h3 className="text-sm font-semibold text-gray-700 mb-3">🔍 Vulnerable Packages</h3>
                    <div className="space-y-3 max-h-80 overflow-y-auto">
                      {report.githubAnalysis.security.details.slice(0, 10).map((vuln, i) => (
                        <div key={i} className={`p-3 rounded-lg border-l-4 ${
                          vuln.severity === 'critical' ? 'bg-danger-50 border-danger-600' :
                          vuln.severity === 'high' ? 'bg-danger-50 border-danger-400' :
                          vuln.severity === 'moderate' ? 'bg-warning-50 border-warning-500' :
                          'bg-gray-50 border-gray-400'
                        }`}>
                          <div className="flex items-start justify-between gap-2">
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2 mb-1">
                                <code className="text-sm font-mono font-semibold text-gray-800">{vuln.package}</code>
                                <span className={`text-xs px-2 py-0.5 rounded ${
                                  vuln.severity === 'critical' ? 'bg-danger-100 text-danger-700' :
                                  vuln.severity === 'high' ? 'bg-danger-100 text-danger-600' :
                                  vuln.severity === 'moderate' ? 'bg-warning-100 text-warning-700' :
                                  'bg-gray-200 text-gray-600'
                                }`}>
                                  {vuln.severity}
                                </span>
                              </div>
                              <p className="text-sm text-gray-700">{vuln.title}</p>
                              {vuln.fixAvailable && (
                                <div className="mt-2 text-xs text-success-700 flex items-center gap-1">
                                  <CheckCircle2 className="w-3 h-3" />
                                  {typeof vuln.fixAvailable === 'object' 
                                    ? `Fix: update to ${vuln.fixAvailable.name}@${vuln.fixAvailable.version}`
                                    : 'Fix available via npm audit fix'}
                                </div>
                              )}
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                    <p className="text-xs text-gray-500 mt-3 text-center">
                      Run <code className="bg-gray-100 px-1 rounded">npm audit fix</code> to auto-fix where possible
                    </p>
                  </div>
                )}
              </div>
            )}

            {report.githubAnalysis.dependencies && report.githubAnalysis.dependencies.outdated > 0 && (
              <div className="card mb-8">
                <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
                  <Package className="w-5 h-5 text-warning-600" />
                  Outdated Dependencies ({report.githubAnalysis.dependencies.outdated})
                </h2>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="text-left text-gray-500 border-b">
                        <th className="pb-2">Package</th>
                        <th className="pb-2">Current</th>
                        <th className="pb-2">Latest</th>
                      </tr>
                    </thead>
                    <tbody>
                      {report.githubAnalysis.dependencies.outdatedList.map((dep, i) => (
                        <tr key={i} className="border-b border-gray-100">
                          <td className="py-2 font-mono">{dep.package}</td>
                          <td className="py-2 text-danger-600">{dep.current}</td>
                          <td className="py-2 text-success-600">{dep.latest}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {report.githubAnalysis.codeQuality && 
             (report.githubAnalysis.codeQuality.eslintErrors > 0 || report.githubAnalysis.codeQuality.eslintWarnings > 0) && (
              <div className="card mb-8">
                <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
                  <Bug className="w-5 h-5 text-warning-600" />
                  Code Quality (ESLint)
                </h2>
                <div className="grid md:grid-cols-2 gap-4 mb-4">
                  <div className="p-4 bg-danger-50 rounded-lg">
                    <div className="text-sm text-danger-700">Errors</div>
                    <div className="text-2xl font-bold text-danger-600">{report.githubAnalysis.codeQuality.eslintErrors}</div>
                  </div>
                  <div className="p-4 bg-warning-50 rounded-lg">
                    <div className="text-sm text-warning-700">Warnings</div>
                    <div className="text-2xl font-bold text-warning-600">{report.githubAnalysis.codeQuality.eslintWarnings}</div>
                  </div>
                </div>
                
                {/* Actual Code Issues */}
                {report.githubAnalysis.codeQuality.issues && report.githubAnalysis.codeQuality.issues.length > 0 && (
                  <div className="mt-4">
                    <h3 className="text-sm font-semibold text-gray-700 mb-3">📍 Issues Found in Code</h3>
                    <div className="space-y-2 max-h-96 overflow-y-auto">
                      {report.githubAnalysis.codeQuality.issues.map((issue, i) => (
                        <div key={i} className={`p-3 rounded-lg border-l-4 ${
                          issue.severity === 'error' 
                            ? 'bg-danger-50 border-danger-500' 
                            : 'bg-warning-50 border-warning-500'
                        }`}>
                          <div className="flex items-start justify-between gap-2">
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2 mb-1">
                                <code className="text-xs bg-gray-200 px-2 py-0.5 rounded font-mono text-gray-800 truncate max-w-xs">
                                  {issue.file}
                                </code>
                                <span className="text-xs text-gray-500 flex-shrink-0">Line {issue.line}</span>
                              </div>
                              <p className="text-sm text-gray-800">{issue.message}</p>
                              {issue.rule && (
                                <span className="text-xs text-gray-500 mt-1 inline-block">
                                  Rule: <code className="text-gray-600">{issue.rule}</code>
                                </span>
                              )}
                            </div>
                            <span className={`text-xs px-2 py-1 rounded flex-shrink-0 ${
                              issue.severity === 'error'
                                ? 'bg-danger-100 text-danger-700'
                                : 'bg-warning-100 text-warning-700'
                            }`}>
                              {issue.severity}
                            </span>
                          </div>
                        </div>
                      ))}
                    </div>
                    {report.githubAnalysis.codeQuality.eslintErrors + report.githubAnalysis.codeQuality.eslintWarnings > 20 && (
                      <p className="text-xs text-gray-500 mt-3 text-center">
                        Showing first 20 issues. Run <code className="bg-gray-100 px-1 rounded">npx eslint .</code> locally for full report.
                      </p>
                    )}
                  </div>
                )}
              </div>
            )}
          </>
        )}

        {/* Lighthouse Opportunities */}
        {report.lighthouseDetails?.opportunities && report.lighthouseDetails.opportunities.length > 0 && (
          <div className="card mb-8">
            <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
              <Zap className="w-5 h-5 text-warning-600" />
              Performance Opportunities
            </h2>
            <div className="space-y-3">
              {report.lighthouseDetails.opportunities.map((opp, i) => (
                <div key={i} className="p-3 bg-gray-50 rounded-lg flex justify-between items-center">
                  <span className="font-medium text-gray-900">{opp.title}</span>
                  {opp.displayValue && <span className="text-sm text-warning-600 font-medium">{opp.displayValue}</span>}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Issues */}
        <div className="card mb-8">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">
            Issues Detected ({report.issues.length})
          </h2>
          {report.issues.length === 0 ? (
            isGitHubAnalysis && report.githubAnalysis?.analysisConfidence === 'LOW' ? (
              <div className="text-center py-8">
                <AlertTriangle className="w-12 h-12 text-warning-500 mx-auto mb-3" />
                <p className="font-medium text-gray-700">Insufficient Analysis Data</p>
                <p className="text-sm text-gray-500 mt-2">
                  Issues could not be detected due to limited analysis depth.
                </p>
                <div className="mt-4 text-xs text-gray-400 space-y-1">
                  {!report.githubAnalysis?.stack?.hasESLint && <p>• ESLint not configured</p>}
                  {!report.githubAnalysis?.stack?.hasTests && <p>• No test framework detected</p>}
                  {report.githubAnalysis?.dependencies?.total === 0 && <p>• No dependencies found to audit</p>}
                </div>
              </div>
            ) : (
              <div className="text-center py-8 text-gray-500">
                <CheckCircle className="w-12 h-12 text-success-500 mx-auto mb-3" />
                <p>No critical issues detected at current analysis depth.</p>
              </div>
            )
          ) : (
            <div className="space-y-4">
              {report.issues.map((issue, i) => <IssueCard key={i} issue={issue} />)}
            </div>
          )}
        </div>

        {/* Suggestions - Always have at least one */}
        <div className="card">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Improvement Suggestions ({report.suggestions.length})</h2>
          {report.suggestions.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              <Info className="w-12 h-12 text-warning-500 mx-auto mb-3" />
              <p>Analysis complete. Consider expanding test coverage and documentation.</p>
              <p className="text-xs text-gray-400 mt-2">Every project has room for improvement.</p>
            </div>
          ) : (
            <div className="space-y-3">
              {report.suggestions.map((s, i) => <SuggestionCard key={i} suggestion={s} />)}
            </div>
          )}
        </div>
      </main>
    </div>
  )
}

function getScoreColor(score: number): string {
  if (score >= 80) return 'text-success-600'
  if (score >= 50) return 'text-warning-600'
  return 'text-danger-600'
}

function getScoreLabel(score: number): string {
  // Pessimistic, honest labels - never say "Excellent"
  if (score >= 85) return '✓ Above Average'
  if (score >= 70) return '→ Room for Improvement'
  if (score >= 50) return '⚠️ Needs Work'
  if (score >= 30) return '⚡ Significant Issues'
  return '🚨 Critical Issues'
}

function ScoreCard({ title, score, icon }: { title: string; score: number; icon: React.ReactNode }) {
  const bg = score >= 80 ? 'bg-success-50' : score >= 50 ? 'bg-warning-50' : 'bg-danger-50'
  return (
    <div className="card">
      <div className="flex items-center gap-3 mb-3">
        <div className={`p-2 rounded-lg ${bg}`}>
          <div className={getScoreColor(score)}>{icon}</div>
        </div>
        <span className="text-sm font-medium text-gray-600">{title}</span>
      </div>
      <div className={`text-4xl font-bold ${getScoreColor(score)}`}>
        {score}<span className="text-lg text-gray-400">/95</span>
      </div>
      <p className="text-xs text-gray-400 mt-1">Max score is 95 (perfection is theoretical)</p>
    </div>
  )
}

function WebVitalItem({ label, value, unit, threshold }: { 
  label: string; value: string; unit: string; threshold: { good: number; poor: number } 
}) {
  const numValue = parseFloat(value)
  let color = 'bg-success-50 text-success-600'
  if (!isNaN(numValue)) {
    if (numValue > threshold.poor) color = 'bg-danger-50 text-danger-600'
    else if (numValue > threshold.good) color = 'bg-warning-50 text-warning-600'
  }
  return (
    <div className={`p-3 rounded-lg ${color}`}>
      <div className="text-xs opacity-70 mb-1">{label}</div>
      <div className="text-xl font-bold">{value}{unit}</div>
    </div>
  )
}

function MetricItem({ label, value, status }: { label: string; value: string; status?: string }) {
  const colors: Record<string, string> = {
    success: 'text-success-600', warning: 'text-warning-600', danger: 'text-danger-600', info: 'text-primary-600'
  }
  return (
    <div>
      <div className="text-xs text-gray-500 mb-1">{label}</div>
      <div className={`font-semibold ${status ? colors[status] : 'text-gray-900'}`}>{value}</div>
    </div>
  )
}

function CoverageItem({ label, analyzed, reason }: { label: string; analyzed: boolean; reason: string }) {
  return (
    <div className={`p-3 rounded-lg border ${analyzed ? 'bg-success-50 border-success-200' : 'bg-gray-50 border-gray-200'}`}>
      <div className="flex items-center gap-2">
        {analyzed ? (
          <CheckCircle className="w-4 h-4 text-success-600" />
        ) : (
          <AlertCircle className="w-4 h-4 text-gray-400" />
        )}
        <span className={`text-sm font-medium ${analyzed ? 'text-success-700' : 'text-gray-500'}`}>
          {label}
        </span>
      </div>
      <p className={`text-xs mt-1 ${analyzed ? 'text-success-600' : 'text-gray-400'}`}>
        {reason}
      </p>
    </div>
  )
}

function VulnBadge({ severity, count }: { severity: string; count: number }) {
  const colors: Record<string, string> = {
    critical: 'bg-danger-100 text-danger-800 border-danger-200',
    high: 'bg-warning-100 text-warning-800 border-warning-200',
    moderate: 'bg-yellow-100 text-yellow-800 border-yellow-200',
    low: 'bg-gray-100 text-gray-800 border-gray-200'
  }
  return (
    <div className={`p-3 rounded-lg border ${colors[severity] || colors.low}`}>
      <div className="text-xs uppercase">{severity}</div>
      <div className="text-2xl font-bold">{count}</div>
    </div>
  )
}

function IssueCard({ issue }: { issue: Issue }) {
  const config: Record<string, { bg: string; border: string; badge: string }> = {
    critical: { bg: 'bg-danger-50', border: 'border-danger-200', badge: 'badge-danger' },
    major: { bg: 'bg-warning-50', border: 'border-warning-200', badge: 'badge-warning' },
    minor: { bg: 'bg-primary-50', border: 'border-primary-200', badge: 'badge-info' },
    info: { bg: 'bg-gray-50', border: 'border-gray-200', badge: 'badge bg-gray-100 text-gray-600' }
  }
  const c = config[issue.severity] || config.info
  return (
    <div className={`p-4 rounded-lg border ${c.bg} ${c.border}`}>
      <div className="flex items-center gap-2 mb-1">
        <h4 className="font-semibold text-gray-900">{issue.title}</h4>
        <span className={c.badge}>{issue.severity}</span>
        <span className="badge bg-gray-100 text-gray-600">{issue.category}</span>
      </div>
      <p className="text-sm text-gray-700">{issue.description}</p>
      {issue.impact && <p className="text-sm text-gray-500 mt-1"><strong>Impact:</strong> {issue.impact}</p>}
    </div>
  )
}

function SuggestionCard({ suggestion }: { suggestion: Suggestion }) {
  const badges: Record<string, string> = {
    critical: 'badge-danger', high: 'badge-warning', medium: 'badge-info', 
    low: 'badge bg-gray-100 text-gray-600', info: 'badge-success'
  }
  return (
    <div className="p-4 bg-gray-50 rounded-lg border border-gray-200">
      <div className="flex items-center gap-2 mb-2">
        <CheckCircle className="w-5 h-5 text-primary-600" />
        <h4 className="font-medium text-gray-900">{suggestion.title}</h4>
        <span className={badges[suggestion.priority] || badges.medium}>{suggestion.priority}</span>
      </div>
      <p className="text-sm text-gray-600 ml-7">{suggestion.description}</p>
    </div>
  )
}
function ScoreCategory({ 
  title, 
  earned, 
  max, 
  icon, 
  details 
}: { 
  title: string
  earned: number
  max: number
  icon: string
  details: string[]
}) {
  const percentage = max > 0 ? Math.round((earned / max) * 100) : 0
  const getColor = () => {
    if (percentage >= 80) return { bg: 'bg-success-50', border: 'border-success-200', bar: 'bg-success-500', text: 'text-success-700' }
    if (percentage >= 60) return { bg: 'bg-primary-50', border: 'border-primary-200', bar: 'bg-primary-500', text: 'text-primary-700' }
    if (percentage >= 40) return { bg: 'bg-warning-50', border: 'border-warning-200', bar: 'bg-warning-500', text: 'text-warning-700' }
    return { bg: 'bg-danger-50', border: 'border-danger-200', bar: 'bg-danger-500', text: 'text-danger-700' }
  }
  const colors = getColor()
  
  return (
    <div className={`p-4 rounded-lg border ${colors.bg} ${colors.border}`}>
      <div className="flex items-center gap-2 mb-2">
        <span className="text-xl">{icon}</span>
        <span className="font-medium text-gray-800">{title}</span>
      </div>
      <div className="flex items-baseline gap-1 mb-2">
        <span className={`text-2xl font-bold ${colors.text}`}>{earned}</span>
        <span className="text-sm text-gray-500">/ {max}</span>
      </div>
      <div className="w-full bg-gray-200 rounded-full h-2 mb-3">
        <div 
          className={`${colors.bar} h-2 rounded-full transition-all duration-300`} 
          style={{ width: `${percentage}%` }}
        />
      </div>
      {details.length > 0 && (
        <div className="space-y-1">
          {details.slice(0, 3).map((detail, i) => (
            <p key={i} className="text-xs text-gray-600 truncate" title={detail}>
              {detail}
            </p>
          ))}
          {details.length > 3 && (
            <p className="text-xs text-gray-400">+{details.length - 3} more...</p>
          )}
        </div>
      )}
    </div>
  )
}