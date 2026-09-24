import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from 'react'

const STORAGE_KEY = 'pharmalink-app-settings'

const DEFAULT_SETTINGS = {
  language: 'en',
  theme: 'system',
  textSize: 'default',
}

const VALID_LANGUAGES = ['en']
const VALID_THEMES = ['light', 'dark', 'system']
const VALID_TEXT_SIZES = ['small', 'default', 'large']

const AppSettingsContext = createContext(null)

function getStoredSettings() {
  try {
    const stored = localStorage.getItem(STORAGE_KEY)

    if (!stored) {
      return DEFAULT_SETTINGS
    }

    const parsed = JSON.parse(stored)

    return {
      language: VALID_LANGUAGES.includes(parsed.language)
        ? parsed.language
        : DEFAULT_SETTINGS.language,

      theme: VALID_THEMES.includes(parsed.theme)
        ? parsed.theme
        : DEFAULT_SETTINGS.theme,

      textSize: VALID_TEXT_SIZES.includes(parsed.textSize)
        ? parsed.textSize
        : DEFAULT_SETTINGS.textSize,
    }
  } catch {
    return DEFAULT_SETTINGS
  }
}

function getSystemTheme() {
  if (
    typeof window !== 'undefined' &&
    window.matchMedia('(prefers-color-scheme: dark)').matches
  ) {
    return 'dark'
  }

  return 'light'
}

export function AppSettingsProvider({ children }) {
  const [settings, setSettings] = useState(getStoredSettings)
  const [systemTheme, setSystemTheme] = useState(getSystemTheme)

  /*
   * Persist settings whenever they change.
   */
  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(settings))
  }, [settings])

  /*
   * Watch the operating system theme.
   *
   * This matters when the user selects "System".
   */
  useEffect(() => {
    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)')

    const handleSystemThemeChange = (event) => {
      setSystemTheme(event.matches ? 'dark' : 'light')
    }

    setSystemTheme(mediaQuery.matches ? 'dark' : 'light')

    mediaQuery.addEventListener('change', handleSystemThemeChange)

    return () => {
      mediaQuery.removeEventListener('change', handleSystemThemeChange)
    }
  }, [])

  const resolvedTheme =
    settings.theme === 'system'
      ? systemTheme
      : settings.theme

  /*
   * Apply global application settings.
   */
  useEffect(() => {
    const root = document.documentElement

    root.dataset.theme = resolvedTheme
    root.dataset.textSize = settings.textSize
    root.lang = settings.language

    root.classList.toggle('dark', resolvedTheme === 'dark')
  }, [
    resolvedTheme,
    settings.textSize,
    settings.language,
  ])

  const setTheme = useCallback((theme) => {
    if (!VALID_THEMES.includes(theme)) {
      return
    }

    setSettings((current) => ({
      ...current,
      theme,
    }))
  }, [])

  const setTextSize = useCallback((textSize) => {
    if (!VALID_TEXT_SIZES.includes(textSize)) {
      return
    }

    setSettings((current) => ({
      ...current,
      textSize,
    }))
  }, [])

  const setLanguage = useCallback((language) => {
    if (!VALID_LANGUAGES.includes(language)) {
      return
    }

    setSettings((current) => ({
      ...current,
      language,
    }))
  }, [])

  const value = useMemo(
    () => ({
      language: settings.language,
      theme: settings.theme,
      resolvedTheme,
      textSize: settings.textSize,

      setLanguage,
      setTheme,
      setTextSize,
    }),
    [
      settings.language,
      settings.theme,
      settings.textSize,
      resolvedTheme,
      setLanguage,
      setTheme,
      setTextSize,
    ],
  )

  return (
    <AppSettingsContext.Provider value={value}>
      {children}
    </AppSettingsContext.Provider>
  )
}

export function useAppSettings() {
  const context = useContext(AppSettingsContext)

  if (!context) {
    throw new Error(
      'useAppSettings must be used inside AppSettingsProvider',
    )
  }

  return context
}