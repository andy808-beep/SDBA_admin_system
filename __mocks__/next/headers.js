// __mocks__/next/headers.js
// Mock for next/headers module

export const cookies = jest.fn(() => ({
  get: jest.fn(),
  getAll: jest.fn(() => []),
  set: jest.fn(),
  delete: jest.fn(),
  has: jest.fn(),
}))

export const headers = jest.fn(() => ({
  get: jest.fn(),
  getAll: jest.fn(() => []),
  has: jest.fn(),
}))

