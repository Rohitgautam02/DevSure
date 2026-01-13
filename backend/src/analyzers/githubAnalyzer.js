/**
 * GitHub Repository Analyzer
 * 
 * Analyzes GitHub repositories for:
 * - Security vulnerabilities (npm audit)
 * - Outdated dependencies (npm outdated)
 * - Code quality (ESLint)
 * - Project structure
 * - Package.json analysis
 */

const { exec, spawn } = require('child_process');
const { promisify } = require('util');
const fs = require('fs').promises;
const path = require('path');
const crypto = require('crypto');

const execAsync = promisify(exec);

// Temp directory for cloning repos
const TEMP_DIR = process.env.TEMP_DIR || '/tmp/devsure-repos';

// Maximum repo size to analyze (100MB)
const MAX_REPO_SIZE_MB = 100;

// Timeout for operations (5 minutes)
const OPERATION_TIMEOUT = 300000;

/**
 * Parse GitHub URL to extract owner and repo
 */
const parseGitHubUrl = (url) => {
  const patterns = [
    /github\.com\/([^\/]+)\/([^\/\s\.]+)/,
    /github\.com:([^\/]+)\/([^\/\s\.]+)/
  ];

  for (const pattern of patterns) {
    const match = url.match(pattern);
    if (match) {
      return {
        owner: match[1],
        repo: match[2].replace('.git', ''),
        isValid: true
      };
    }
  }

  return { isValid: false };
};

/**
 * Check if URL is a GitHub repo
 */
const isGitHubRepo = (url) => {
  return url.includes('github.com') && parseGitHubUrl(url).isValid;
};

/**
 * Analyze a GitHub repository
 * 
 * SCORING PHILOSOPHY: Pessimistic by default
 * - Start at BASE score (50)
 * - EARN points only with evidence
 * - NEVER give 100/100
 * - ALWAYS suggest improvements
 */
const analyzeGitHubRepo = async (repoUrl) => {
  const result = {
    success: false,
    repoInfo: parseGitHubUrl(repoUrl),
    repoType: 'application', // application, library, framework, cli, monorepo
    analysisConfidence: 'LOW', // LOW, MEDIUM, HIGH
    analysisDepth: [],  // What was actually analyzed
    isMonorepo: false,  // Whether multiple package.json found
    packagesAnalyzed: [], // List of packages analyzed
    stack: {
      detected: false,
      framework: null,
      language: null,
      hasTypeScript: false,
      hasESLint: false,
      hasTests: false,
      hasCICD: false,
      hasReadme: false,
      hasLicense: false,
      hasEnvExample: false,
      hasProperStructure: false
    },
    security: {
      analyzed: false,
      vulnerabilities: {
        critical: 0,
        high: 0,
        moderate: 0,
        low: 0,
        total: 0
      },
      details: []
    },
    dependencies: {
      analyzed: false,
      total: 0,
      outdated: 0,
      majorUpdatesNeeded: 0,
      outdatedList: []
    },
    codeQuality: {
      analyzed: false,
      eslintConfigured: false,
      eslintErrors: 0,
      eslintWarnings: 0,
      issues: []
    },
    typescript: {
      analyzed: false,
      configured: false,
      errors: 0
    },
    scores: {
      security: 50,      // Start at 50, not 100
      codeQuality: 50,
      maintenance: 50,
      overall: 50
    },
    rawMetrics: {},      // Raw numbers for transparency
    suggestions: [],
    plainEnglishSummary: [],  // For non-technical users
    priorityActions: [],      // What to fix first
    error: null
  };

  if (!result.repoInfo.isValid) {
    result.error = 'Invalid GitHub URL';
    return result;
  }

  const tempId = crypto.randomBytes(8).toString('hex');
  const repoDir = path.join(TEMP_DIR, tempId);

  try {
    console.log(`[GitHub] Analyzing: ${repoUrl}`);

    // Create temp directory
    await fs.mkdir(TEMP_DIR, { recursive: true });

    // Clone the repository (shallow clone for speed)
    console.log(`[GitHub] Cloning to: ${repoDir}`);
    await execAsync(`git clone --depth 1 ${repoUrl} ${repoDir}`, {
      timeout: OPERATION_TIMEOUT
    });

    // STEP 1: Find all package.json files (handles monorepos)
    const packageJsonPaths = await findPackageJsonFiles(repoDir);
    console.log(`[GitHub] Found ${packageJsonPaths.length} package.json file(s)`);
    
    if (packageJsonPaths.length === 0) {
      // Check for non-Node.js projects
      await analyzeNonNodeProject(repoDir, result);
    } else {
      // Analyze each package.json location
      for (const pkgPath of packageJsonPaths) {
        const pkgDir = path.dirname(pkgPath);
        const relativePath = path.relative(repoDir, pkgDir) || 'root';
        console.log(`[GitHub] Analyzing: ${relativePath}`);
        
        await analyzePackageJson(pkgDir, result);
        
        // Install and audit if this is a Node.js project
        if (result.stack.detected) {
          console.log(`[GitHub] Installing dependencies in ${relativePath}...`);
          try {
            await execAsync('npm install --ignore-scripts 2>/dev/null', {
              cwd: pkgDir,
              timeout: OPERATION_TIMEOUT
            });
            
            // Run security audit on this package
            await runSecurityAudit(pkgDir, result);
            
            // Check for outdated packages
            await checkOutdatedPackages(pkgDir, result);
            
            // Run ESLint
            await runESLint(pkgDir, result);
          } catch (e) {
            console.log(`[GitHub] npm install failed in ${relativePath}: ${e.message}`);
          }
        }
      }
      
      // Run TypeScript check on the whole repo
      await runTypeScriptCheck(repoDir, result);
    }
    
    // Check for common project files (README, LICENSE, CI/CD)
    await checkProjectStructure(repoDir, result);
    
    // Generate plain English summary
    generatePlainEnglishSummary(result);

    // Calculate final scores (PESSIMISTIC)
    calculateScores(result);
    
    // ALWAYS add suggestions (never "no improvements needed")
    addMandatorySuggestions(result);
    
    // Add priority actions for non-technical users
    generatePriorityActions(result);

    result.success = true;
    console.log(`[GitHub] ✅ Analysis complete (Confidence: ${result.analysisConfidence})`);

  } catch (error) {
    console.error(`[GitHub] ❌ Error:`, error.message);
    result.error = error.message;
  } finally {
    // Cleanup: Remove cloned repo
    try {
      await fs.rm(repoDir, { recursive: true, force: true });
      console.log(`[GitHub] Cleaned up: ${repoDir}`);
    } catch (e) {
      console.error(`[GitHub] Cleanup warning:`, e.message);
    }
  }

  return result;
};

/**
 * Find all package.json files in a repo (handles monorepos)
 */
const findPackageJsonFiles = async (repoDir) => {
  const packageJsonPaths = [];
  
  // Check root first
  try {
    const rootPkg = path.join(repoDir, 'package.json');
    await fs.access(rootPkg);
    packageJsonPaths.push(rootPkg);
  } catch (e) {}
  
  // Check common monorepo patterns
  const commonDirs = ['frontend', 'backend', 'client', 'server', 'web', 'api', 'app', 'packages'];
  
  for (const dir of commonDirs) {
    try {
      const pkgPath = path.join(repoDir, dir, 'package.json');
      await fs.access(pkgPath);
      packageJsonPaths.push(pkgPath);
      console.log(`[GitHub] Found package.json in ${dir}/`);
    } catch (e) {}
  }
  
  // Also check packages/* for Lerna/Nx style monorepos
  try {
    const packagesDir = path.join(repoDir, 'packages');
    const entries = await fs.readdir(packagesDir, { withFileTypes: true });
    for (const entry of entries) {
      if (entry.isDirectory()) {
        try {
          const pkgPath = path.join(packagesDir, entry.name, 'package.json');
          await fs.access(pkgPath);
          packageJsonPaths.push(pkgPath);
          console.log(`[GitHub] Found package.json in packages/${entry.name}/`);
        } catch (e) {}
      }
    }
  } catch (e) {}
  
  return packageJsonPaths;
};

/**
 * Analyze non-Node.js projects (Python, Go, etc.)
 */
const analyzeNonNodeProject = async (repoDir, result) => {
  console.log(`[GitHub] No package.json found, checking for other project types...`);
  
  // Check for Python
  try {
    await fs.access(path.join(repoDir, 'requirements.txt'));
    result.stack.detected = true;
    result.stack.language = 'Python';
    result.stack.framework = 'Unknown';
    result.suggestions.push({
      priority: 'info',
      category: 'analysis',
      title: 'Python project detected',
      description: 'Full Python analysis is coming soon. Currently only Node.js is fully supported.'
    });
    return;
  } catch (e) {}
  
  // Check for Go
  try {
    await fs.access(path.join(repoDir, 'go.mod'));
    result.stack.detected = true;
    result.stack.language = 'Go';
    result.stack.framework = 'Unknown';
    result.suggestions.push({
      priority: 'info',
      category: 'analysis',
      title: 'Go project detected',
      description: 'Full Go analysis is coming soon. Currently only Node.js is fully supported.'
    });
    return;
  } catch (e) {}
  
  // No recognized project type
  result.suggestions.push({
    priority: 'high',
    category: 'analysis',
    title: 'Project type not recognized',
    description: 'Could not find package.json, requirements.txt, or go.mod. Analysis is limited.'
  });
};

/**
 * Generate plain English summary for non-technical users
 */
const generatePlainEnglishSummary = (result) => {
  const summary = [];
  
  // Overall health
  if (result.security.vulnerabilities.total > 0) {
    const critHigh = result.security.vulnerabilities.critical + result.security.vulnerabilities.high;
    if (critHigh > 0) {
      summary.push({
        icon: '🚨',
        title: 'Security Issues Found',
        plain: `Your project has ${critHigh} serious security problem${critHigh > 1 ? 's' : ''} that should be fixed immediately.`,
        action: 'Run "npm audit fix" in your terminal to automatically fix most issues.'
      });
    } else {
      summary.push({
        icon: '⚠️',
        title: 'Minor Security Warnings',
        plain: `Your project has ${result.security.vulnerabilities.total} minor security warnings.`,
        action: 'These are low priority but worth reviewing when you have time.'
      });
    }
  } else if (result.security.analyzed) {
    summary.push({
      icon: '✅',
      title: 'No Security Issues',
      plain: 'No known security vulnerabilities were found in your dependencies.',
      action: 'Keep dependencies updated to maintain this.'
    });
  }
  
  // Tests
  if (!result.stack.hasTests) {
    summary.push({
      icon: '⚠️',
      title: 'No Tests Detected',
      plain: 'Your project doesn\'t have automated tests. This means bugs could slip through unnoticed.',
      action: 'Consider adding tests with Jest or Vitest to catch bugs before users do.'
    });
  }
  
  // TypeScript
  if (!result.stack.hasTypeScript && result.stack.language === 'JavaScript') {
    summary.push({
      icon: '💡',
      title: 'No TypeScript',
      plain: 'Your project uses JavaScript without TypeScript. This is fine for small projects.',
      action: 'For larger projects, TypeScript helps catch errors before they happen.'
    });
  }
  
  // Outdated deps
  if (result.dependencies.outdated > 10) {
    summary.push({
      icon: '📦',
      title: 'Many Outdated Packages',
      plain: `${result.dependencies.outdated} of your packages are outdated. Old packages may have bugs or security issues.`,
      action: 'Run "npm update" to update safely, or "npm outdated" to see what\'s old.'
    });
  }
  
  result.plainEnglishSummary = summary;
};

/**
 * Generate priority action items for non-technical users
 */
const generatePriorityActions = (result) => {
  const actions = [];
  
  // Priority 1: Critical security
  if (result.security.vulnerabilities.critical > 0) {
    actions.push({
      priority: 1,
      urgency: 'Do this now',
      title: 'Fix critical security vulnerabilities',
      command: 'npm audit fix --force',
      timeEstimate: '5 minutes',
      impact: 'Prevents hackers from exploiting known weaknesses'
    });
  }
  
  // Priority 2: High security
  if (result.security.vulnerabilities.high > 0) {
    actions.push({
      priority: 2,
      urgency: 'Do this today',
      title: 'Fix high severity vulnerabilities',
      command: 'npm audit fix',
      timeEstimate: '10 minutes',
      impact: 'Reduces security risk significantly'
    });
  }
  
  // Priority 3: Add tests
  if (!result.stack.hasTests) {
    actions.push({
      priority: 3,
      urgency: 'Do this week',
      title: 'Add automated tests',
      command: 'npm install -D jest',
      timeEstimate: '2-4 hours',
      impact: 'Catches bugs before users find them'
    });
  }
  
  // Priority 4: Add ESLint
  if (!result.stack.hasESLint) {
    actions.push({
      priority: 4,
      urgency: 'Nice to have',
      title: 'Add code linting',
      command: 'npm install -D eslint && npx eslint --init',
      timeEstimate: '30 minutes',
      impact: 'Catches common mistakes automatically'
    });
  }
  
  // Priority 5: Update deps
  if (result.dependencies.outdated > 5) {
    actions.push({
      priority: 5,
      urgency: 'When you have time',
      title: 'Update outdated packages',
      command: 'npm update',
      timeEstimate: '15 minutes',
      impact: 'Gets bug fixes and security patches'
    });
  }
  
  // Always at least one action
  if (actions.length === 0) {
    actions.push({
      priority: 1,
      urgency: 'Keep it up',
      title: 'Maintain regular updates',
      command: 'npm outdated',
      timeEstimate: 'Weekly check',
      impact: 'Keeps your project healthy over time'
    });
  }
  
  result.priorityActions = actions;
};

/**
 * Analyze package.json for project info
 */
const analyzePackageJson = async (repoDir, result) => {
  try {
    const packageJsonPath = path.join(repoDir, 'package.json');
    const content = await fs.readFile(packageJsonPath, 'utf8');
    const pkg = JSON.parse(content);

    result.stack.detected = true;
    result.stack.language = 'JavaScript';

    // ============================================
    // REPO TYPE DETECTION (Critical for correct scoring)
    // ============================================
    result.repoType = detectRepoType(pkg, repoDir);
    console.log(`[GitHub] Detected repo type: ${result.repoType}`);

    // Check for TypeScript
    if (pkg.devDependencies?.typescript || pkg.dependencies?.typescript) {
      result.stack.hasTypeScript = true;
      result.stack.language = 'TypeScript';
    }

    // Check for tsconfig
    try {
      await fs.access(path.join(repoDir, 'tsconfig.json'));
      result.stack.hasTypeScript = true;
      result.stack.language = 'TypeScript';
    } catch (e) {}

    // Detect framework
    const deps = { ...pkg.dependencies, ...pkg.devDependencies };
    
    if (deps.next) result.stack.framework = 'Next.js';
    else if (deps.react) result.stack.framework = 'React';
    else if (deps.vue) result.stack.framework = 'Vue.js';
    else if (deps['@angular/core']) result.stack.framework = 'Angular';
    else if (deps.express) result.stack.framework = 'Express.js';
    else if (deps.fastify) result.stack.framework = 'Fastify';
    else if (deps.svelte) result.stack.framework = 'Svelte';
    else if (deps.nuxt) result.stack.framework = 'Nuxt.js';

    // Check for ESLint
    result.stack.hasESLint = !!(deps.eslint || deps['@eslint/js']);

    // Check for tests
    result.stack.hasTests = !!(
      deps.jest || 
      deps.mocha || 
      deps.vitest || 
      deps['@testing-library/react'] ||
      pkg.scripts?.test
    );

    // Count dependencies
    result.dependencies.total = Object.keys(pkg.dependencies || {}).length + 
                                Object.keys(pkg.devDependencies || {}).length;
    
    // Store production vs dev dependency counts for libraries
    result.dependencies.production = Object.keys(pkg.dependencies || {}).length;
    result.dependencies.dev = Object.keys(pkg.devDependencies || {}).length;

    // Add suggestions based on missing best practices (only for applications)
    if (result.repoType === 'application') {
      if (!result.stack.hasTypeScript) {
        result.suggestions.push({
          priority: 'medium',
          category: 'code-quality',
          title: 'Consider using TypeScript',
          description: 'TypeScript can help catch errors early and improve code maintainability.'
        });
      }

      if (!result.stack.hasESLint) {
        result.suggestions.push({
          priority: 'high',
          category: 'code-quality',
          title: 'Add ESLint for code quality',
          description: 'ESLint helps maintain consistent code style and catches common errors.'
        });
      }

      if (!result.stack.hasTests) {
        result.suggestions.push({
          priority: 'high',
          category: 'maintenance',
          title: 'Add automated tests',
          description: 'Tests help ensure your code works correctly and prevents regressions.'
        });
      }
    }

  } catch (error) {
    console.log(`[GitHub] No package.json found or invalid: ${error.message}`);
    result.stack.detected = false;
  }
};

/**
 * Detect repository type: library, application, framework, cli, or monorepo
 * This is CRITICAL for correct scoring - libraries have different rules than apps
 */
const detectRepoType = (pkg, repoDir) => {
  // Check for CLI tool (has bin field)
  if (pkg.bin) {
    return 'cli';
  }
  
  // Check for library indicators
  const isLibrary = 
    // Has main/module/exports (library entry points)
    (pkg.main || pkg.module || pkg.exports) &&
    // Does NOT have typical app entry points
    !pkg.scripts?.start?.includes('node server') &&
    !pkg.scripts?.start?.includes('node app') &&
    !pkg.scripts?.start?.includes('node src/index') &&
    !pkg.scripts?.start?.includes('next') &&
    !pkg.scripts?.start?.includes('react-scripts') &&
    !pkg.scripts?.dev?.includes('next') &&
    // Has build output typically for libraries
    (pkg.scripts?.build?.includes('rollup') || 
     pkg.scripts?.build?.includes('tsc') ||
     pkg.scripts?.build?.includes('webpack') ||
     pkg.scripts?.prepublish ||
     pkg.scripts?.prepublishOnly);
  
  if (isLibrary) {
    // Check if it's a framework (provides structure for apps)
    const frameworkKeywords = ['express', 'fastify', 'koa', 'hapi', 'nest', 'next', 'nuxt', 'gatsby'];
    const name = (pkg.name || '').toLowerCase();
    const isFramework = frameworkKeywords.some(kw => name.includes(kw)) && pkg.main;
    
    return isFramework ? 'framework' : 'library';
  }
  
  // Check for monorepo
  if (pkg.workspaces || pkg.lpierna || pkg.private === true && !pkg.main) {
    return 'monorepo';
  }
  
  // Default: application
  return 'application';
};

/**
 * Run npm audit for security vulnerabilities
 */
const runSecurityAudit = async (repoDir, result) => {
  try {
    console.log(`[GitHub] Running npm audit...`);
    const { stdout } = await execAsync('npm audit --json 2>/dev/null || true', {
      cwd: repoDir,
      timeout: 60000
    });

    if (stdout) {
      const audit = JSON.parse(stdout);
      
      if (audit.metadata?.vulnerabilities) {
        const vulns = audit.metadata.vulnerabilities;
        result.security.vulnerabilities = {
          critical: vulns.critical || 0,
          high: vulns.high || 0,
          moderate: vulns.moderate || 0,
          low: vulns.low || 0,
          total: vulns.total || 0
        };
        result.security.analyzed = true;  // Mark as analyzed
        
        console.log(`[GitHub] All vulnerabilities: ${vulns.total || 0} total (${vulns.critical || 0} critical, ${vulns.high || 0} high)`);
      }

      // Extract vulnerability details
      if (audit.vulnerabilities) {
        for (const [name, vuln] of Object.entries(audit.vulnerabilities)) {
          if (result.security.details.length < 10) {
            result.security.details.push({
              package: name,
              severity: vuln.severity,
              title: vuln.via?.[0]?.title || 'Vulnerability detected',
              fixAvailable: vuln.fixAvailable
            });
          }
        }
      }
    } else {
      console.log(`[GitHub] npm audit returned no output`);
    }

    // Also run audit for production dependencies only (important for libraries)
    console.log(`[GitHub] Running npm audit for production deps only...`);
    const { stdout: prodStdout } = await execAsync('npm audit --omit=dev --json 2>/dev/null || true', {
      cwd: repoDir,
      timeout: 60000
    });

    if (prodStdout) {
      try {
        const prodAudit = JSON.parse(prodStdout);
        if (prodAudit.metadata?.vulnerabilities) {
          const prodVulns = prodAudit.metadata.vulnerabilities;
          result.security.productionVulns = {
            critical: prodVulns.critical || 0,
            high: prodVulns.high || 0,
            moderate: prodVulns.moderate || 0,
            low: prodVulns.low || 0,
            total: prodVulns.total || 0
          };
          console.log(`[GitHub] Production-only vulnerabilities: ${prodVulns.total || 0} total`);
        }
      } catch (e) {
        // If production audit fails, assume same as all vulns
        result.security.productionVulns = result.security.vulnerabilities;
      }
    } else {
      // Default to zero if no output (means no production vulns)
      result.security.productionVulns = {
        critical: 0,
        high: 0,
        moderate: 0,
        low: 0,
        total: 0
      };
    }

  } catch (error) {
    console.log(`[GitHub] npm audit failed: ${error.message}`);
    result.security.analyzed = false;
  }
};

/**
 * Check for outdated packages
 */
const checkOutdatedPackages = async (repoDir, result) => {
  try {
    console.log(`[GitHub] Checking outdated packages...`);
    const { stdout } = await execAsync('npm outdated --json 2>/dev/null || true', {
      cwd: repoDir,
      timeout: 60000
    });

    if (stdout && stdout.trim()) {
      const outdated = JSON.parse(stdout);
      const packages = Object.entries(outdated);
      
      result.dependencies.outdated = packages.length;
      result.dependencies.analyzed = true;  // Mark as analyzed
      
      console.log(`[GitHub] Outdated packages: ${packages.length}`);
      
      // Get top 10 most outdated
      result.dependencies.outdatedList = packages.slice(0, 10).map(([name, info]) => ({
        package: name,
        current: info.current,
        wanted: info.wanted,
        latest: info.latest,
        type: info.type
      }));

      if (result.dependencies.outdated > 10) {
        result.suggestions.push({
          priority: 'medium',
          category: 'maintenance',
          title: 'Update outdated dependencies',
          description: `${result.dependencies.outdated} packages are outdated. Run 'npm update' to update them.`
        });
      } else if (result.dependencies.outdated > 0) {
        result.suggestions.push({
          priority: 'low',
          category: 'maintenance',
          title: `${result.dependencies.outdated} packages can be updated`,
          description: 'Consider updating to latest versions for bug fixes and improvements.'
        });
      }
    } else {
      // No output means all packages are up to date
      result.dependencies.analyzed = true;
      result.dependencies.outdated = 0;
    }

  } catch (error) {
    console.log(`[GitHub] npm outdated failed: ${error.message}`);
    result.dependencies.analyzed = false;
  }
};

/**
 * Run ESLint analysis
 */
const runESLint = async (repoDir, result) => {
  try {
    console.log(`[GitHub] Running ESLint...`);
    
    // Determine ESLint command based on configuration
    let eslintCmd;
    if (result.stack.hasESLint) {
      // Project has ESLint - use its config
      eslintCmd = 'npx eslint . --ext .js,.jsx,.ts,.tsx --format json --max-warnings 10000 2>/dev/null || true';
    } else {
      // No ESLint config - create a temporary inline config that supports modern JS/React
      // This prevents false positives like "import is reserved"
      const inlineConfig = JSON.stringify({
        env: {
          browser: true,
          node: true,
          es2021: true
        },
        parserOptions: {
          ecmaVersion: 2021,
          sourceType: 'module',
          ecmaFeatures: {
            jsx: true
          }
        },
        rules: {
          'no-unused-vars': 'warn',
          'no-undef': 'error',
          'no-console': 'off'
        }
      });
      
      // Write temp config file
      const tempConfigPath = path.join(repoDir, '.eslintrc.devsure.json');
      await fs.writeFile(tempConfigPath, inlineConfig);
      
      eslintCmd = `npx eslint . --ext .js,.jsx,.ts,.tsx --format json --config .eslintrc.devsure.json --max-warnings 10000 2>/dev/null || true`;
    }
    
    const { stdout, stderr } = await execAsync(eslintCmd, {
      cwd: repoDir,
      timeout: 120000
    });

    if (stdout && stdout.trim()) {
      try {
        const eslintResults = JSON.parse(stdout);
        
        let totalErrors = 0;
        let totalWarnings = 0;
        const issues = [];

        for (const file of eslintResults) {
          totalErrors += file.errorCount || 0;
          totalWarnings += file.warningCount || 0;

          // Collect first few issues per file
          for (const msg of (file.messages || []).slice(0, 3)) {
            if (issues.length < 20) {
              issues.push({
                file: file.filePath.replace(repoDir, ''),
                line: msg.line,
                severity: msg.severity === 2 ? 'error' : 'warning',
                message: msg.message,
                rule: msg.ruleId
              });
            }
          }
        }

        result.codeQuality.eslintErrors = totalErrors;
        result.codeQuality.eslintWarnings = totalWarnings;
        result.codeQuality.issues = issues;
        result.codeQuality.analyzed = true;  // Mark as analyzed

        console.log(`[GitHub] ESLint: ${totalErrors} errors, ${totalWarnings} warnings`);

        if (totalErrors > 0) {
          result.suggestions.push({
            priority: 'high',
            category: 'code-quality',
            title: `Fix ${totalErrors} ESLint errors`,
            description: 'ESLint errors indicate potential bugs or code quality issues.'
          });
        }
        
        if (totalWarnings > 5) {
          result.suggestions.push({
            priority: 'medium',
            category: 'code-quality',
            title: `Address ${totalWarnings} ESLint warnings`,
            description: 'Warnings may indicate code smell or potential issues.'
          });
        }

      } catch (e) {
        console.log(`[GitHub] ESLint JSON parse error: ${e.message}`);
        result.codeQuality.analyzed = false;
      }
    } else {
      console.log(`[GitHub] ESLint returned no output`);
      result.codeQuality.analyzed = false;
    }
    
    // Clean up temp config if we created one
    if (!result.stack.hasESLint) {
      try {
        await fs.unlink(path.join(repoDir, '.eslintrc.devsure.json'));
      } catch (e) {
        // Ignore cleanup errors
      }
    }

  } catch (error) {
    console.log(`[GitHub] ESLint failed: ${error.message}`);
    result.codeQuality.analyzed = false;
  }
};

/**
 * INDUSTRY-ALIGNED SCORING SYSTEM
 * 
 * CORE PRINCIPLE: Scores must be EARNED, not assumed
 * - Start from 0, add points with evidence
 * - Max score: 95 (perfection is theoretical)
 * 
 * CATEGORIES (Total: 95 points max):
 * - Security: 0-30 points (highest priority)
 * - Code Quality: 0-25 points
 * - Testing & Reliability: 0-20 points
 * - Dependencies & Maintenance: 0-10 points
 * - Project Hygiene: 0-10 points
 * 
 * CONFIDENCE MULTIPLIER:
 * - HIGH (≥80% coverage): ×1.0
 * - MEDIUM (40-79%): ×0.85
 * - LOW (<40%): ×0.7
 */
const calculateScores = (result) => {
  const scores = {
    security: { earned: 0, max: 30, details: [] },
    codeQuality: { earned: 0, max: 25, details: [] },
    testing: { earned: 0, max: 20, details: [] },
    dependencies: { earned: 0, max: 10, details: [] },
    hygiene: { earned: 0, max: 10, details: [] }
  };

  const isLibrary = result.repoType === 'library' || result.repoType === 'framework' || result.repoType === 'cli';
  const vulns = result.security.vulnerabilities;
  
  // For libraries: only count production vulnerabilities (not devDependencies)
  // This is a critical distinction - library devDeps don't affect users
  const effectiveVulns = isLibrary ? {
    critical: result.security.productionVulns?.critical || 0,
    high: result.security.productionVulns?.high || 0,
    moderate: result.security.productionVulns?.moderate || 0,
    low: result.security.productionVulns?.low || 0,
    total: result.security.productionVulns?.total || 0
  } : vulns;

  // ============================================
  // 1️⃣ SECURITY (0-30 points) - FAIL-FIRST
  // ============================================
  if (result.security.analyzed) {
    result.analysisDepth.push('security-audit');
    
    // For libraries, note that we're only counting production deps
    if (isLibrary && vulns.total > 0 && effectiveVulns.total === 0) {
      scores.security.details.push(`ℹ️ ${vulns.total} vulnerabilities in devDependencies (not counted for libraries)`);
    }
    
    // No critical vulnerabilities = +10
    if (effectiveVulns.critical === 0) {
      scores.security.earned += 10;
      scores.security.details.push('✓ No critical vulnerabilities (+10)');
    } else {
      scores.security.details.push(`✗ ${effectiveVulns.critical} critical vulnerabilities (0)`);
    }
    
    // No high vulnerabilities = +10
    if (effectiveVulns.high === 0) {
      scores.security.earned += 10;
      scores.security.details.push('✓ No high vulnerabilities (+10)');
    } else {
      scores.security.details.push(`✗ ${effectiveVulns.high} high vulnerabilities (0)`);
    }
    
    // No moderate vulnerabilities = +5
    if (effectiveVulns.moderate === 0) {
      scores.security.earned += 5;
      scores.security.details.push('✓ No moderate vulnerabilities (+5)');
    } else {
      scores.security.earned += 2;
      scores.security.details.push(`⚠ ${effectiveVulns.moderate} moderate vulnerabilities (+2)`);
    }
    
    // Clean slate bonus = +5
    if (effectiveVulns.total === 0) {
      scores.security.earned += 5;
      scores.security.details.push('✓ Zero vulnerabilities (+5 bonus)');
    }
    
    // HARD CAPS - critical/high issues limit max score (only for production deps)
    if (effectiveVulns.critical > 0) {
      scores.security.earned = Math.min(scores.security.earned, 10);
      result.suggestions.push({
        priority: 'critical',
        category: 'security',
        title: `Fix ${effectiveVulns.critical} critical vulnerabilities`,
        description: isLibrary 
          ? 'Critical vulnerabilities in production dependencies affect all users of this library.'
          : 'Critical vulnerabilities must be fixed immediately.'
      });
    } else if (effectiveVulns.high > 0) {
      scores.security.earned = Math.min(scores.security.earned, 20);
      result.suggestions.push({
        priority: 'high',
        category: 'security',
        title: `Fix ${effectiveVulns.high} high severity vulnerabilities`,
        description: isLibrary
          ? 'High severity issues in production dependencies should be addressed promptly.'
          : 'High severity issues should be addressed promptly.'
      });
    }
  } else {
    scores.security.earned = 5;
    scores.security.details.push('⚠ Security audit could not run (+5 base)');
  }

  // ============================================
  // 2️⃣ CODE QUALITY (0-25 points)
  // ============================================
  
  // For libraries: if they have their own ESLint config, they likely pass their own linting
  // Running our generic config on their code gives false positives
  if (isLibrary && result.stack.hasESLint) {
    // Libraries with ESLint configured get credit for having code quality practices
    scores.codeQuality.earned += 15; // Base for having linting configured
    scores.codeQuality.details.push('✓ ESLint configured in project (+15)');
    scores.codeQuality.details.push('ℹ️ Library uses its own ESLint configuration');
    result.analysisDepth.push('eslint-config-detected');
  } else if (result.codeQuality.analyzed) {
    result.analysisDepth.push('eslint');
    
    // Linter configured = +5
    if (result.stack.hasESLint) {
      scores.codeQuality.earned += 5;
      scores.codeQuality.details.push('✓ ESLint configured (+5)');
    }
    
    // Linter ran successfully = +5
    scores.codeQuality.earned += 5;
    scores.codeQuality.details.push('✓ Linter analysis completed (+5)');
    
    const errors = result.codeQuality.eslintErrors || 0;
    const warnings = result.codeQuality.eslintWarnings || 0;
    
    // Zero errors = +10
    if (errors === 0) {
      scores.codeQuality.earned += 10;
      scores.codeQuality.details.push('✓ Zero linter errors (+10)');
    } else if (errors <= 5) {
      scores.codeQuality.earned += 5;
      scores.codeQuality.details.push(`⚠ ${errors} linter errors (+5)`);
    } else {
      scores.codeQuality.details.push(`✗ ${errors} linter errors (0)`);
      if (!isLibrary) {
        result.suggestions.push({
          priority: 'high',
          category: 'code-quality',
          title: `Fix ${errors} ESLint errors`,
          description: 'ESLint errors indicate potential bugs or code quality issues.'
        });
      }
    }
    
    // Warnings under control = +5
    if (warnings <= 10) {
      scores.codeQuality.earned += 5;
      scores.codeQuality.details.push(`✓ Warnings under control (${warnings} ≤ 10) (+5)`);
    } else if (warnings <= 25) {
      scores.codeQuality.earned += 2;
      scores.codeQuality.details.push(`⚠ ${warnings} warnings (+2)`);
    } else {
      scores.codeQuality.details.push(`✗ ${warnings} warnings (0)`);
    }
  } else if (!result.stack.hasESLint) {
    scores.codeQuality.earned = 5;
    scores.codeQuality.details.push('⚠ No linter configured (+5 base)');
    if (!isLibrary) {
      result.suggestions.push({
        priority: 'high',
        category: 'code-quality',
        title: 'Add ESLint for code quality',
        description: 'ESLint helps maintain consistent code style and catches common errors.'
      });
    }
  }
  
  // TypeScript bonus
  if (result.stack.hasTypeScript) {
    scores.codeQuality.earned = Math.min(scores.codeQuality.max, scores.codeQuality.earned + 3);
    scores.codeQuality.details.push('✓ TypeScript in use (+3 bonus)');
  }

  // ============================================
  // 3️⃣ TESTING & RELIABILITY (0-20 points)
  // ============================================
  if (result.stack.hasTests) {
    scores.testing.earned += 10;
    scores.testing.details.push('✓ Test framework detected (+10)');
    
    // Estimate additional points (would need actual test run for accuracy)
    scores.testing.earned += 5;
    scores.testing.details.push('⚠ Test coverage not measured (+5 estimated)');
  } else {
    scores.testing.earned = 0;
    scores.testing.details.push('✗ No tests detected (0)');
    result.suggestions.push({
      priority: 'high',
      category: 'testing',
      title: 'Add automated tests',
      description: 'Tests help ensure your code works correctly and prevents regressions.'
    });
  }
  
  // CI/CD bonus
  if (result.stack.hasCICD) {
    scores.testing.earned = Math.min(scores.testing.max, scores.testing.earned + 5);
    scores.testing.details.push('✓ CI/CD configured (+5)');
  }

  // ============================================
  // 4️⃣ DEPENDENCIES & MAINTENANCE (0-10 points)
  // ============================================
  if (result.dependencies.analyzed) {
    result.analysisDepth.push('dependencies');
    
    // Package manager detected = +2
    scores.dependencies.earned += 2;
    scores.dependencies.details.push('✓ Package manager detected (+2)');
    
    // No vulnerable dependencies = +4 (use effectiveVulns for libraries)
    if (effectiveVulns.total === 0) {
      scores.dependencies.earned += 4;
      scores.dependencies.details.push('✓ No vulnerable dependencies (+4)');
    } else if (effectiveVulns.critical === 0 && effectiveVulns.high === 0) {
      scores.dependencies.earned += 2;
      scores.dependencies.details.push('⚠ Only low/moderate vulnerabilities (+2)');
    }
    
    // Outdated check - more lenient for libraries (they often have intentional version constraints)
    const outdated = result.dependencies.outdated || 0;
    if (isLibrary) {
      // Libraries often intentionally keep certain versions for compatibility
      if (outdated === 0) {
        scores.dependencies.earned += 4;
        scores.dependencies.details.push('✓ All dependencies up to date (+4)');
      } else if (outdated <= 10) {
        scores.dependencies.earned += 3;
        scores.dependencies.details.push(`⚠ ${outdated} outdated packages (+3) - common for libraries`);
      } else {
        scores.dependencies.earned += 2;
        scores.dependencies.details.push(`⚠ ${outdated} outdated packages (+2) - may be intentional for compatibility`);
      }
    } else {
      if (outdated === 0) {
        scores.dependencies.earned += 4;
        scores.dependencies.details.push('✓ All dependencies up to date (+4)');
      } else if (outdated <= 5) {
        scores.dependencies.earned += 2;
        scores.dependencies.details.push(`⚠ ${outdated} outdated packages (+2)`);
      } else {
        scores.dependencies.details.push(`✗ ${outdated} outdated packages (0)`);
      }
    }
  } else {
    scores.dependencies.earned = 2;
    scores.dependencies.details.push('⚠ Dependencies not analyzed (+2 base)');
  }

  // ============================================
  // 5️⃣ PROJECT HYGIENE (0-10 points)
  // ============================================
  if (result.stack.hasReadme) {
    scores.hygiene.earned += 2;
    scores.hygiene.details.push('✓ README exists (+2)');
  } else {
    scores.hygiene.details.push('✗ No README (0)');
    result.suggestions.push({
      priority: 'medium',
      category: 'hygiene',
      title: 'Add a README',
      description: 'A README helps others understand your project.'
    });
  }
  
  if (result.stack.hasLicense) {
    scores.hygiene.earned += 2;
    scores.hygiene.details.push('✓ License present (+2)');
  }
  
  if (result.stack.hasEnvExample) {
    scores.hygiene.earned += 2;
    scores.hygiene.details.push('✓ Environment config (.env.example) (+2)');
  }
  
  if (result.stack.hasCICD) {
    scores.hygiene.earned += 2;
    scores.hygiene.details.push('✓ CI config present (+2)');
  }
  
  if (result.stack.hasProperStructure) {
    scores.hygiene.earned += 2;
    scores.hygiene.details.push('✓ Proper folder structure (+2)');
  }

  // ============================================
  // CONFIDENCE MULTIPLIER
  // ============================================
  const checksRun = [
    result.security.analyzed,
    result.codeQuality.analyzed,
    result.dependencies.analyzed
  ].filter(Boolean).length;
  
  const coveragePercent = (checksRun / 3) * 100;
  let confidenceMultiplier = 1.0;
  
  if (coveragePercent >= 80) {
    result.analysisConfidence = 'HIGH';
    confidenceMultiplier = 1.0;
  } else if (coveragePercent >= 40) {
    result.analysisConfidence = 'MEDIUM';
    confidenceMultiplier = 0.85;
  } else {
    result.analysisConfidence = 'LOW';
    confidenceMultiplier = 0.7;
  }

  // ============================================
  // FINAL SCORES
  // ============================================
  const rawTotal = 
    scores.security.earned + 
    scores.codeQuality.earned + 
    scores.testing.earned + 
    scores.dependencies.earned + 
    scores.hygiene.earned;
  
  const adjustedTotal = Math.round(rawTotal * confidenceMultiplier);
  
  result.scores = {
    security: scores.security.earned,
    codeQuality: scores.codeQuality.earned,
    testing: scores.testing.earned,
    dependencies: scores.dependencies.earned,
    hygiene: scores.hygiene.earned,
    overall: Math.min(95, adjustedTotal),
    rawTotal: rawTotal,
    confidenceMultiplier: confidenceMultiplier,
    maxPossible: 95
  };
  
  result.scoreDetails = scores;
  result.verdict = getVerdict(result.scores, result.repoType);
  
  // Store raw metrics for transparency
  result.rawMetrics = {
    eslintErrors: result.codeQuality.eslintErrors || 0,
    eslintWarnings: result.codeQuality.eslintWarnings || 0,
    vulnerabilities: vulns,
    effectiveVulnerabilities: effectiveVulns,
    outdatedDeps: result.dependencies.outdated || 0,
    totalDeps: result.dependencies.total || 0,
    hasTests: result.stack.hasTests,
    hasTypeScript: result.stack.hasTypeScript,
    hasESLint: result.stack.hasESLint,
    repoType: result.repoType
  };
};

/**
 * Determine verdict based on scores and repo type
 */
const getVerdict = (scores, repoType = 'application') => {
  const isLibrary = repoType === 'library' || repoType === 'framework' || repoType === 'cli';
  
  // For libraries, use different verdict labels
  if (isLibrary) {
    if (scores.security < 15) {
      return {
        emoji: '🚨',
        label: 'Security Issues',
        reason: 'Production dependencies have security vulnerabilities',
        color: 'danger'
      };
    }
    
    if (scores.overall < 40) {
      return {
        emoji: '⚠️',
        label: 'Needs Attention',
        reason: 'Some areas need improvement',
        color: 'warning'
      };
    }
    
    if (scores.overall < 55) {
      return {
        emoji: '📦',
        label: 'Functional Library',
        reason: 'Basic library functionality in place',
        color: 'info'
      };
    }
    
    if (scores.overall < 70) {
      return {
        emoji: '✅',
        label: 'Good Library',
        reason: 'Well-maintained library',
        color: 'success'
      };
    }
    
    if (scores.overall < 85) {
      return {
        emoji: '🚀',
        label: 'Production-Grade',
        reason: 'High-quality, production-ready library',
        color: 'success'
      };
    }
    
    return {
      emoji: '🏆',
      label: 'Excellent Library',
      reason: 'Exceptional quality, industry-leading practices',
      color: 'success'
    };
  }
  
  // For applications - existing logic
  // Check for blockers first
  if (scores.security < 15) {
    return {
      emoji: '🚨',
      label: 'Not Production Ready',
      reason: 'Critical security issues must be fixed',
      color: 'danger'
    };
  }
  
  if (scores.testing < 5) {
    return {
      emoji: '⚠️',
      label: 'Not Interview Ready',
      reason: 'No tests detected - add tests to demonstrate professionalism',
      color: 'warning'
    };
  }
  
  if (scores.overall < 25) {
    return {
      emoji: '🚫',
      label: 'Beginner Level',
      reason: 'Significant improvements needed',
      color: 'danger'
    };
  }
  
  if (scores.overall < 40) {
    return {
      emoji: '⚠️',
      label: 'Needs Work',
      reason: 'Address major issues before sharing',
      color: 'warning'
    };
  }
  
  if (scores.overall < 55) {
    return {
      emoji: '📈',
      label: 'Developing',
      reason: 'Good foundation, keep improving',
      color: 'info'
    };
  }
  
  if (scores.overall < 70) {
    return {
      emoji: '✅',
      label: 'Acceptable',
      reason: 'Meets basic quality standards',
      color: 'success'
    };
  }
  
  if (scores.overall < 85) {
    return {
      emoji: '🚀',
      label: 'Production Ready',
      reason: 'Good quality, ready for deployment',
      color: 'success'
    };
  }
  
  return {
    emoji: '🏆',
    label: 'Excellent',
    reason: 'Exceptional quality (rare)',
    color: 'success'
  };
};

/**
 * Check project structure for best practices
 */
const checkProjectStructure = async (repoDir, result) => {
  // Check for README
  try {
    await fs.access(path.join(repoDir, 'README.md'));
    result.stack.hasReadme = true;
  } catch (e) {
    // Also check for readme.md (lowercase)
    try {
      await fs.access(path.join(repoDir, 'readme.md'));
      result.stack.hasReadme = true;
    } catch (e2) {}
  }
  
  // Check for LICENSE
  try {
    await fs.access(path.join(repoDir, 'LICENSE'));
    result.stack.hasLicense = true;
  } catch (e) {
    try {
      await fs.access(path.join(repoDir, 'LICENSE.md'));
      result.stack.hasLicense = true;
    } catch (e2) {}
  }
  
  // Check for .env.example or similar
  try {
    await fs.access(path.join(repoDir, '.env.example'));
    result.stack.hasEnvExample = true;
  } catch (e) {
    try {
      await fs.access(path.join(repoDir, '.env.sample'));
      result.stack.hasEnvExample = true;
    } catch (e2) {
      try {
        await fs.access(path.join(repoDir, 'env.example'));
        result.stack.hasEnvExample = true;
      } catch (e3) {}
    }
  }
  
  // Check for CI/CD
  try {
    await fs.access(path.join(repoDir, '.github/workflows'));
    result.stack.hasCICD = true;
  } catch (e) {
    try {
      await fs.access(path.join(repoDir, '.gitlab-ci.yml'));
      result.stack.hasCICD = true;
    } catch (e2) {
      try {
        await fs.access(path.join(repoDir, '.travis.yml'));
        result.stack.hasCICD = true;
      } catch (e3) {
        try {
          await fs.access(path.join(repoDir, 'Jenkinsfile'));
          result.stack.hasCICD = true;
        } catch (e4) {}
      }
    }
  }
  
  // Check for proper folder structure (src/, tests/, etc.)
  let structureScore = 0;
  const goodFolders = ['src', 'lib', 'app', 'components', 'pages', 'tests', 'test', '__tests__', 'spec'];
  
  try {
    const entries = await fs.readdir(repoDir);
    for (const folder of goodFolders) {
      if (entries.includes(folder)) {
        structureScore++;
      }
    }
    // Consider proper structure if at least 2 good folders exist
    result.stack.hasProperStructure = structureScore >= 2;
  } catch (e) {}
};

/**
 * Run TypeScript compilation check
 */
const runTypeScriptCheck = async (repoDir, result) => {
  if (!result.stack.hasTypeScript) return;
  
  try {
    console.log(`[GitHub] Running TypeScript check...`);
    const { stdout, stderr } = await execAsync(
      'npx tsc --noEmit 2>&1 || true',
      { cwd: repoDir, timeout: 120000 }
    );
    
    result.typescript.analyzed = true;
    result.typescript.configured = true;
    
    // Count TS errors from output
    const errorMatches = (stdout + stderr).match(/error TS\d+/g);
    result.typescript.errors = errorMatches ? errorMatches.length : 0;
    
    if (result.typescript.errors > 0) {
      result.suggestions.push({
        priority: 'high',
        category: 'code-quality',
        title: `Fix ${result.typescript.errors} TypeScript errors`,
        description: 'TypeScript errors may cause runtime issues.'
      });
    }
    
    result.analysisDepth.push('typescript');
  } catch (e) {
    console.log(`[GitHub] TypeScript check skipped: ${e.message}`);
  }
};

/**
 * Deduplicate suggestions by detecting similar topics
 */
const deduplicateSuggestions = (result) => {
  // Define topic keywords to group similar suggestions
  const topicPatterns = [
    { key: 'eslint', patterns: ['eslint', 'linting', 'code quality'] },
    { key: 'typescript', patterns: ['typescript'] },
    { key: 'tests', patterns: ['test', 'testing', 'jest', 'vitest'] },
    { key: 'security', patterns: ['vulnerabilit', 'security', 'audit'] },
    { key: 'outdated', patterns: ['outdated', 'update', 'packages can be updated'] },
  ];
  
  const getTopic = (title) => {
    const lower = title.toLowerCase();
    for (const { key, patterns } of topicPatterns) {
      if (patterns.some(p => lower.includes(p))) return key;
    }
    return title.toLowerCase(); // Fallback to title
  };
  
  const seen = new Map(); // topic -> suggestion
  const dedupedSuggestions = [];
  
  // Keep highest priority suggestion for each topic
  const priorityOrder = { critical: 0, high: 1, medium: 2, low: 3, info: 4 };
  
  for (const s of result.suggestions) {
    const topic = getTopic(s.title);
    const existing = seen.get(topic);
    
    if (!existing) {
      seen.set(topic, s);
      dedupedSuggestions.push(s);
    } else {
      // Keep higher priority one
      const existingPriority = priorityOrder[existing.priority] ?? 5;
      const newPriority = priorityOrder[s.priority] ?? 5;
      if (newPriority < existingPriority) {
        // Replace with higher priority
        const idx = dedupedSuggestions.indexOf(existing);
        if (idx !== -1) dedupedSuggestions[idx] = s;
        seen.set(topic, s);
      }
    }
  }
  
  result.suggestions = dedupedSuggestions;
};

/**
 * Add mandatory suggestions (never show "no improvements needed")
 */
const addMandatorySuggestions = (result) => {
  // Deduplicate first
  deduplicateSuggestions(result);
  
  // Always suggest something
  if (result.suggestions.length === 0) {
    result.suggestions.push({
      priority: 'low',
      category: 'general',
      title: 'Consider adding more documentation',
      description: 'Good documentation improves maintainability.'
    });
  }
  
  // Add analysis limitations notice
  if (result.analysisConfidence !== 'HIGH') {
    result.suggestions.push({
      priority: 'info',
      category: 'analysis',
      title: 'Analysis depth limited',
      description: `Confidence: ${result.analysisConfidence}. Runtime behavior and load testing not performed.`
    });
  }
  
  // Framework-specific suggestions
  if (result.stack.framework === 'Next.js' && !result.stack.hasTests) {
    result.suggestions.push({
      priority: 'medium',
      category: 'testing',
      title: 'Add React Testing Library',
      description: 'Test your Next.js components to prevent UI regressions.'
    });
  }
  
  // Sort by priority
  const priorityOrder = { critical: 0, high: 1, medium: 2, low: 3, info: 4 };
  result.suggestions.sort((a, b) => 
    (priorityOrder[a.priority] || 5) - (priorityOrder[b.priority] || 5)
  );
};

module.exports = {
  analyzeGitHubRepo,
  isGitHubRepo,
  parseGitHubUrl
};
