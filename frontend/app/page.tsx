'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { useAuth } from '@/lib/AuthContext'
import { Shield, ArrowRight, CheckCircle, Zap, Lock, BarChart3 } from 'lucide-react'

export default function HomePage() {
  const { isAuthenticated, isLoading } = useAuth()

  const features = [
    {
      icon: <CheckCircle className="w-6 h-6" />,
      title: 'Error Detection',
      description: 'Find bugs, broken routes, and server errors instantly.'
    },
    {
      icon: <Zap className="w-6 h-6" />,
      title: 'Performance Analysis',
      description: 'Measure response times and identify bottlenecks.'
    },
    {
      icon: <Lock className="w-6 h-6" />,
      title: 'Security Check',
      description: 'Verify HTTPS, security headers, and best practices.'
    },
    {
      icon: <BarChart3 className="w-6 h-6" />,
      title: 'Health Score',
      description: 'Get an overall score to track improvement over time.'
    }
  ]

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
      </div>
    )
  }

  return (
    <div className="min-h-screen">
      {/* Header */}
      <header className="bg-white border-b border-gray-100">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center gap-2">
              <Shield className="w-8 h-8 text-primary-600" />
              <span className="text-xl font-bold text-gray-900">DevSure</span>
            </div>
            <nav className="flex items-center gap-4">
              {isAuthenticated ? (
                <Link href="/dashboard" className="btn-primary">
                  Dashboard
                  <ArrowRight className="w-4 h-4 ml-2" />
                </Link>
              ) : (
                <>
                  <Link href="/login" className="btn-secondary">
                    Login
                  </Link>
                  <Link href="/register" className="btn-primary">
                    Get Started
                    <ArrowRight className="w-4 h-4 ml-2" />
                  </Link>
                </>
              )}
            </nav>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className="py-20 bg-gradient-to-br from-primary-50 to-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h1 className="text-4xl md:text-6xl font-extrabold text-gray-900 mb-6">
            Make Sure Your Project is{' '}
            <span className="text-primary-600">Production-Ready</span>
          </h1>
          <p className="text-xl text-gray-600 max-w-3xl mx-auto mb-10">
            DevSure analyzes your deployed project for errors, performance issues, 
            and security vulnerabilities. Get actionable insights to improve your code.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link href="/register" className="btn-primary text-lg px-8 py-3">
              Start Free Analysis
              <ArrowRight className="w-5 h-5 ml-2" />
            </Link>
            <Link href="#features" className="btn-secondary text-lg px-8 py-3">
              Learn More
            </Link>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section id="features" className="py-20 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-3xl font-bold text-gray-900 mb-4">
              Complete Project Health Check
            </h2>
            <p className="text-lg text-gray-600 max-w-2xl mx-auto">
              One platform to analyze everything about your deployment
            </p>
          </div>
          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-8">
            {features.map((feature, index) => (
              <div key={index} className="card hover:shadow-md transition-shadow">
                <div className="w-12 h-12 bg-primary-100 rounded-lg flex items-center justify-center text-primary-600 mb-4">
                  {feature.icon}
                </div>
                <h3 className="text-lg font-semibold text-gray-900 mb-2">
                  {feature.title}
                </h3>
                <p className="text-gray-600">
                  {feature.description}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* How It Works Section */}
      <section className="py-20 bg-gray-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-3xl font-bold text-gray-900 mb-4">
              How It Works
            </h2>
          </div>
          <div className="grid md:grid-cols-3 gap-8">
            <div className="text-center">
              <div className="w-16 h-16 bg-primary-600 rounded-full flex items-center justify-center text-white text-2xl font-bold mx-auto mb-4">
                1
              </div>
              <h3 className="text-xl font-semibold mb-2">Submit Your URL</h3>
              <p className="text-gray-600">
                Paste your deployment URL (Vercel, Netlify, AWS, etc.)
              </p>
            </div>
            <div className="text-center">
              <div className="w-16 h-16 bg-primary-600 rounded-full flex items-center justify-center text-white text-2xl font-bold mx-auto mb-4">
                2
              </div>
              <h3 className="text-xl font-semibold mb-2">Automatic Analysis</h3>
              <p className="text-gray-600">
                Our engine tests your project for 50+ potential issues
              </p>
            </div>
            <div className="text-center">
              <div className="w-16 h-16 bg-primary-600 rounded-full flex items-center justify-center text-white text-2xl font-bold mx-auto mb-4">
                3
              </div>
              <h3 className="text-xl font-semibold mb-2">Get Actionable Report</h3>
              <p className="text-gray-600">
                View detailed issues, scores, and improvement suggestions
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 bg-primary-600">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h2 className="text-3xl font-bold text-white mb-6">
            Ready to Improve Your Project?
          </h2>
          <p className="text-xl text-primary-100 mb-8">
            Join developers who trust DevSure for project quality assurance
          </p>
          <Link href="/register" className="inline-flex items-center px-8 py-3 bg-white text-primary-600 font-semibold rounded-lg hover:bg-gray-100 transition-colors">
            Get Started Free
            <ArrowRight className="w-5 h-5 ml-2" />
          </Link>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-gray-900 text-gray-400 py-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col md:flex-row justify-between items-center">
            <div className="flex items-center gap-2 mb-4 md:mb-0">
              <Shield className="w-6 h-6 text-primary-400" />
              <span className="text-lg font-bold text-white">DevSure</span>
            </div>
            <p className="text-sm">
              © 2024 DevSure. All rights reserved. Patent Pending.
            </p>
          </div>
        </div>
      </footer>
    </div>
  )
}
