module.exports = {
  ci: {
    collect: {
      startServerCommand: "pnpm --filter qiyun-console start",
      startServerReadyPattern: "Ready",
      startServerReadyTimeout: 120000,
      url: ["http://localhost:3000/login", "http://localhost:3000/trial"],
      numberOfRuns: 2,
      settings: {
        chromeFlags: "--no-sandbox --disable-dev-shm-usage",
      },
    },
    assert: {
      assertions: {
        "categories:accessibility": ["error", { minScore: 0.9 }],
        "categories:best-practices": ["error", { minScore: 0.85 }],
        "categories:seo": ["error", { minScore: 0.85 }],
        "first-contentful-paint": ["error", { maxNumericValue: 2500 }],
        "speed-index": ["error", { maxNumericValue: 3500 }],
        "cumulative-layout-shift": ["error", { maxNumericValue: 0.1 }],
        "max-potential-fid": ["error", { maxNumericValue: 250 }],
        "server-response-time": ["error", { maxNumericValue: 800 }],
      },
    },
    upload: { target: "filesystem", outputDir: ".lighthouseci/reports" },
  },
};
