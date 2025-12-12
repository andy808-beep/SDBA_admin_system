// __mocks__/next/navigation.js
// Mock for next/navigation module

export const useRouter = jest.fn(() => ({
  push: jest.fn(),
  replace: jest.fn(),
  prefetch: jest.fn(),
  back: jest.fn(),
  pathname: '/',
  query: {},
  asPath: '/',
}))

export const usePathname = jest.fn(() => '/')

export const useSearchParams = jest.fn(() => new URLSearchParams())

export const redirect = jest.fn()

export const notFound = jest.fn()

