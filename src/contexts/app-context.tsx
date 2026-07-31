import {
  createContext,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from "react"

import {
  getCurrentMembership,
  getCurrentUser,
  getCurrentWorkspace,
} from "@/repositories"
import type { Environment, Membership, User, Workspace } from "@/types"

const ENVIRONMENT_STORAGE_KEY = "relayops.environment"

interface AppContextValue {
  workspace: Workspace | null
  user: User | null
  membership: Membership | null
  environment: Environment
  setEnvironment: (environment: Environment) => void
}

const AppContext = createContext<AppContextValue | null>(null)

function readStoredEnvironment(): Environment {
  const stored = localStorage.getItem(ENVIRONMENT_STORAGE_KEY)
  return stored === "sandbox" ? "sandbox" : "production"
}

export function AppProvider({ children }: { children: ReactNode }) {
  const [workspace, setWorkspace] = useState<Workspace | null>(null)
  const [user, setUser] = useState<User | null>(null)
  const [membership, setMembership] = useState<Membership | null>(null)
  const [environment, setEnvironmentState] = useState<Environment>(readStoredEnvironment)

  useEffect(() => {
    let cancelled = false
    Promise.all([getCurrentWorkspace(), getCurrentUser(), getCurrentMembership()])
      .then(([ws, u, m]) => {
        if (cancelled) return
        setWorkspace(ws)
        setUser(u)
        setMembership(m)
      })
      .catch(() => {
        // Fixture-backed today; a failed load leaves the shell in its skeleton state.
      })
    return () => {
      cancelled = true
    }
  }, [])

  const setEnvironment = (env: Environment) => {
    setEnvironmentState(env)
    localStorage.setItem(ENVIRONMENT_STORAGE_KEY, env)
  }

  return (
    <AppContext.Provider
      value={{ workspace, user, membership, environment, setEnvironment }}
    >
      {children}
    </AppContext.Provider>
  )
}

export function useApp(): AppContextValue {
  const ctx = useContext(AppContext)
  if (!ctx) throw new Error("useApp must be used within AppProvider")
  return ctx
}
