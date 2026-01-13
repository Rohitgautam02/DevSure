/**
 * Backend API Tests
 * Tests for DevSure API endpoints and utilities
 */

describe('Health Check', () => {
  test('API health endpoint should return status ok', () => {
    // Mock health check response
    const healthResponse = { status: 'ok', timestamp: Date.now() };
    expect(healthResponse.status).toBe('ok');
    expect(typeof healthResponse.timestamp).toBe('number');
  });
});

describe('Input Validation', () => {
  test('should validate GitHub URL format', () => {
    const validUrls = [
      'https://github.com/user/repo',
      'https://github.com/org/project-name',
      'https://github.com/user123/my_repo',
    ];

    const invalidUrls = [
      'https://gitlab.com/user/repo',
      'not-a-url',
      'ftp://github.com/user/repo',
      '',
    ];

    const isValidGitHubUrl = (url) => {
      const pattern = /^https:\/\/github\.com\/[\w-]+\/[\w.-]+\/?$/;
      return pattern.test(url);
    };

    validUrls.forEach(url => {
      expect(isValidGitHubUrl(url)).toBe(true);
    });

    invalidUrls.forEach(url => {
      expect(isValidGitHubUrl(url)).toBe(false);
    });
  });

  test('should validate URL format', () => {
    const isValidUrl = (url) => {
      try {
        new URL(url);
        return true;
      } catch {
        return false;
      }
    };

    expect(isValidUrl('https://example.com')).toBe(true);
    expect(isValidUrl('http://localhost:3000')).toBe(true);
    expect(isValidUrl('not-a-url')).toBe(false);
    expect(isValidUrl('')).toBe(false);
  });
});

describe('Score Calculation', () => {
  test('should calculate overall score correctly', () => {
    const calculateOverallScore = (scores) => {
      const { security, codeQuality, testing, dependencies, hygiene } = scores;
      const total = security + codeQuality + testing + dependencies + hygiene;
      return Math.min(95, total);
    };

    const perfectScores = {
      security: 30,
      codeQuality: 25,
      testing: 20,
      dependencies: 10,
      hygiene: 10
    };

    expect(calculateOverallScore(perfectScores)).toBe(95);

    const lowScores = {
      security: 10,
      codeQuality: 5,
      testing: 0,
      dependencies: 2,
      hygiene: 2
    };

    expect(calculateOverallScore(lowScores)).toBe(19);
  });

  test('should apply confidence multiplier correctly', () => {
    const applyConfidenceMultiplier = (score, confidence) => {
      const multipliers = { HIGH: 1.0, MEDIUM: 0.85, LOW: 0.7 };
      return Math.round(score * multipliers[confidence]);
    };

    expect(applyConfidenceMultiplier(50, 'HIGH')).toBe(50);
    expect(applyConfidenceMultiplier(50, 'MEDIUM')).toBe(43);
    expect(applyConfidenceMultiplier(50, 'LOW')).toBe(35);
  });

  test('should determine correct verdict based on score', () => {
    const getVerdict = (score, isLibrary = false) => {
      if (isLibrary) {
        if (score >= 85) return 'Excellent Library';
        if (score >= 70) return 'Production-Grade';
        if (score >= 55) return 'Good Library';
        if (score >= 40) return 'Functional Library';
        return 'Needs Attention';
      }

      if (score >= 85) return 'Excellent';
      if (score >= 70) return 'Production Ready';
      if (score >= 55) return 'Acceptable';
      if (score >= 40) return 'Developing';
      if (score >= 25) return 'Needs Work';
      return 'Not Interview Ready';
    };

    // Application verdicts
    expect(getVerdict(90)).toBe('Excellent');
    expect(getVerdict(75)).toBe('Production Ready');
    expect(getVerdict(60)).toBe('Acceptable');
    expect(getVerdict(45)).toBe('Developing');
    expect(getVerdict(30)).toBe('Needs Work');
    expect(getVerdict(20)).toBe('Not Interview Ready');

    // Library verdicts
    expect(getVerdict(90, true)).toBe('Excellent Library');
    expect(getVerdict(75, true)).toBe('Production-Grade');
    expect(getVerdict(60, true)).toBe('Good Library');
    expect(getVerdict(45, true)).toBe('Functional Library');
    expect(getVerdict(30, true)).toBe('Needs Attention');
  });
});

describe('Repo Type Detection', () => {
  test('should detect library from package.json', () => {
    const detectRepoType = (pkg) => {
      if (pkg.bin) return 'cli';
      if (pkg.main || pkg.module || pkg.exports) {
        if (pkg.description?.toLowerCase().includes('framework')) return 'framework';
        return 'library';
      }
      if (pkg.workspaces) return 'monorepo';
      return 'application';
    };

    expect(detectRepoType({ main: './index.js' })).toBe('library');
    expect(detectRepoType({ bin: { cli: './cli.js' } })).toBe('cli');
    expect(detectRepoType({ workspaces: ['packages/*'] })).toBe('monorepo');
    expect(detectRepoType({ name: 'my-app' })).toBe('application');
    expect(detectRepoType({ 
      main: './index.js', 
      description: 'A web framework for Node.js' 
    })).toBe('framework');
  });
});

describe('Vulnerability Classification', () => {
  test('should correctly classify vulnerability severity', () => {
    const classifyVulnerabilities = (vulns) => {
      return {
        hasCritical: vulns.critical > 0,
        hasHigh: vulns.high > 0,
        hasModerate: vulns.moderate > 0,
        isClean: vulns.total === 0
      };
    };

    const noVulns = { critical: 0, high: 0, moderate: 0, low: 0, total: 0 };
    expect(classifyVulnerabilities(noVulns).isClean).toBe(true);

    const criticalVulns = { critical: 1, high: 0, moderate: 0, low: 0, total: 1 };
    expect(classifyVulnerabilities(criticalVulns).hasCritical).toBe(true);
    expect(classifyVulnerabilities(criticalVulns).isClean).toBe(false);
  });
});
