/** @type {import('jest').Config} */
const config = {
  roots: ['<rootDir>/tests'],
  testMatch: ['**/*.test.ts', '**/*.test.js'],
  transform: {
    '^.+\\.(ts|tsx)$': ['ts-jest', {
      tsconfig: 'tsconfig.json',
    }],
  },
  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/$1',
  },
  setupFilesAfterEnv: ['<rootDir>/tests/setup.ts'],
  collectCoverageFrom: [
    'app/**/*.{ts,tsx}',
    'lib/**/*.{ts,tsx}',
    '!**/*.d.ts',
    '!**/node_modules/**',
  ],
  coverageDirectory: 'coverage',
  verbose: true,
  testTimeout: 30000,
  projects: [
    {
      displayName: 'unit-api',
      testEnvironment: 'node',
      testMatch: ['<rootDir>/tests/unit/api/**/*.test.ts'],
      transform: {
        '^.+\\.(ts|tsx)$': ['ts-jest', { tsconfig: 'tsconfig.json' }],
      },
      moduleNameMapper: {
        '^@/(.*)$': '<rootDir>/$1',
      },
    },
    {
      displayName: 'unit-extension',
      testEnvironment: 'jsdom',
      testMatch: ['<rootDir>/tests/unit/extension/**/*.test.ts'],
      transform: {
        '^.+\\.(ts|tsx)$': ['ts-jest', { tsconfig: 'tsconfig.json' }],
      },
      moduleNameMapper: {
        '^@/(.*)$': '<rootDir>/$1',
      },
    },
  ],
};

module.exports = config;

