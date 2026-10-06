// File: admin-web/src/components/ui/Select.jsx
//
// Styled dropdown that replaces the native <select>, whose open
// option list is drawn by the OS and can't be styled.
//
// - Keyboard: ↑ ↓ Home End Enter Space Esc, type a letter to jump
// - Optional search box for long lists (`searchable`)
// - Options can have a second line (`description`)
// - Rendered in a portal with fixed positioning, so modals and
//   scrolling cards don't clip it; flips upward when needed.
//
// Usage:
// <Select
//   value={form.dosage_unit}
//   onChange={(value) => setField('dosage_unit', value)}
//   options={[{ value: 'mg', label: 'mg' }]}
//   aria-label="Dosage unit"
// />
//
// <Select
//   searchable
//   value={form.medicine_id}
//   onChange={...}
//   options={[{ value: '12', label: 'Biogesic', description: 'Paracetamol · 500 mg' }]}
// />

import {
  useCallback,
  useEffect,
  useId,
  useMemo,
  useRef,
  useState,
} from 'react'
import { createPortal } from 'react-dom'

import './Select.css'

const LIST_MAX_HEIGHT = 300
const OPTION_HEIGHT = 38
const SEARCH_HEIGHT = 52
const VIEWPORT_GAP = 8

function ChevronIcon() {
  return (
    <svg
      className="ui-select-chevron"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <polyline points="6 9 12 15 18 9" />
    </svg>
  )
}

function CheckIcon() {
  return (
    <svg
      className="ui-select-check"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2.5"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <polyline points="20 6 9 17 4 12" />
    </svg>
  )
}

function SearchIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <circle cx="11" cy="11" r="7" />
      <path d="m20 20-3.5-3.5" />
    </svg>
  )
}

function optionText(option) {
  return `${option.label} ${option.description || ''} ${
    option.keywords || ''
  }`.toLowerCase()
}

export default function Select({
  id,
  value,
  onChange,
  options = [],
  placeholder = 'Select…',
  disabled = false,
  invalid = false,
  size = 'md',
  searchable = false,
  searchPlaceholder = 'Search…',
  emptyText = 'No matches',
  className = '',
  'aria-label': ariaLabel,
  'aria-labelledby': ariaLabelledBy,
  'aria-describedby': ariaDescribedBy,
}) {
  const autoId = useId()
  const buttonId =
    id || `ui-select-${autoId.replace(/[^a-zA-Z0-9_-]/g, '')}`
  const listId = `${buttonId}-list`

  const buttonRef = useRef(null)
  const popoverRef = useRef(null)
  const listRef = useRef(null)
  const searchRef = useRef(null)
  const typeahead = useRef({ text: '', timer: null })

  const [open, setOpen] = useState(false)
  const [query, setQuery] = useState('')
  const [activeIndex, setActiveIndex] = useState(-1)
  const [position, setPosition] = useState(null)

  const selected =
    options.find(
      (option) => String(option.value) === String(value)
    ) || null

  // Options shown in the list (filtered when searching)
  const visibleOptions = useMemo(() => {
    const term = query.trim().toLowerCase()

    if (!searchable || !term) return options

    return options.filter((option) =>
      optionText(option).includes(term)
    )
  }, [options, query, searchable])

  const selectedVisibleIndex = visibleOptions.findIndex(
    (option) => String(option.value) === String(value)
  )

  // -------------------------------------------------------
  // Positioning
  // -------------------------------------------------------

  const updatePosition = useCallback(() => {
    const rect = buttonRef.current?.getBoundingClientRect()

    if (!rect) return

    const extra = searchable ? SEARCH_HEIGHT : 0

    const wanted = Math.min(
      LIST_MAX_HEIGHT + extra,
      options.length * OPTION_HEIGHT + 12 + extra
    )

    const spaceBelow =
      window.innerHeight - rect.bottom - VIEWPORT_GAP
    const spaceAbove = rect.top - VIEWPORT_GAP

    const placeAbove =
      spaceBelow < wanted && spaceAbove > spaceBelow

    const available = placeAbove ? spaceAbove : spaceBelow

    setPosition({
      left: rect.left,
      minWidth: rect.width,
      top: placeAbove ? undefined : rect.bottom + 4,
      bottom: placeAbove
        ? window.innerHeight - rect.top + 4
        : undefined,
      listMaxHeight: Math.max(
        120,
        Math.min(LIST_MAX_HEIGHT, available - extra)
      ),
    })
  }, [options.length, searchable])

  // -------------------------------------------------------
  // Open / close / choose
  // -------------------------------------------------------

  const openList = (seed = '') => {
    if (disabled || options.length === 0) return

    updatePosition()

    const startQuery = searchable ? seed : ''
    setQuery(startQuery)

    if (startQuery) {
      setActiveIndex(0)
    } else {
      const index = options.findIndex(
        (option) => String(option.value) === String(value)
      )

      setActiveIndex(index >= 0 ? index : 0)
    }

    setOpen(true)
  }

  const closeList = (returnFocus = true) => {
    setOpen(false)
    setQuery('')

    if (returnFocus) buttonRef.current?.focus()
  }

  const choose = (index) => {
    const option = visibleOptions[index]

    if (!option || option.disabled) return

    if (String(option.value) !== String(value)) {
      onChange?.(option.value)
    }

    closeList()
  }

  // Focus the search box when the list opens
  useEffect(() => {
    if (open && searchable) {
      searchRef.current?.focus()
    }
  }, [open, searchable])

  // Close on outside press; follow the trigger on scroll/resize
  useEffect(() => {
    if (!open) return undefined

    const handlePointerDown = (event) => {
      if (
        buttonRef.current?.contains(event.target) ||
        popoverRef.current?.contains(event.target)
      ) {
        return
      }

      setOpen(false)
      setQuery('')
    }

    const handleScroll = (event) => {
      if (popoverRef.current?.contains(event.target)) return

      updatePosition()
    }

    document.addEventListener('pointerdown', handlePointerDown)
    window.addEventListener('resize', updatePosition)
    window.addEventListener('scroll', handleScroll, true)

    return () => {
      document.removeEventListener(
        'pointerdown',
        handlePointerDown
      )
      window.removeEventListener('resize', updatePosition)
      window.removeEventListener('scroll', handleScroll, true)
    }
  }, [open, updatePosition])

  // Keep the highlighted option visible
  useEffect(() => {
    if (!open || activeIndex < 0) return

    listRef.current
      ?.querySelector(`[data-index="${activeIndex}"]`)
      ?.scrollIntoView({ block: 'nearest' })
  }, [open, activeIndex])

  useEffect(
    () => () => clearTimeout(typeahead.current.timer),
    []
  )

  // -------------------------------------------------------
  // Keyboard
  // -------------------------------------------------------

  const handleTypeahead = (character) => {
    const state = typeahead.current

    clearTimeout(state.timer)
    state.text += character.toLowerCase()
    state.timer = setTimeout(() => {
      state.text = ''
    }, 500)

    const currentIndex = options.findIndex(
      (option) => String(option.value) === String(value)
    )

    const start = open ? activeIndex : currentIndex

    const ordered = [
      ...options.slice(start + 1),
      ...options.slice(0, start + 1),
    ]

    const match = ordered.find(
      (option) =>
        !option.disabled &&
        String(option.label)
          .toLowerCase()
          .startsWith(state.text)
    )

    if (!match) return

    const index = options.indexOf(match)

    if (open) {
      setActiveIndex(index)
    } else if (String(match.value) !== String(value)) {
      onChange?.(match.value)
    }
  }

  /** Keys while the list is open (from trigger or search box). */
  const handleListKeys = (event) => {
    const last = visibleOptions.length - 1

    switch (event.key) {
      case 'ArrowDown':
        event.preventDefault()
        setActiveIndex((index) => Math.min(index + 1, last))
        return true

      case 'ArrowUp':
        event.preventDefault()
        setActiveIndex((index) => Math.max(index - 1, 0))
        return true

      case 'Home':
        if (!searchable) {
          event.preventDefault()
          setActiveIndex(0)
          return true
        }
        return false

      case 'End':
        if (!searchable) {
          event.preventDefault()
          setActiveIndex(last)
          return true
        }
        return false

      case 'Enter':
        event.preventDefault()
        choose(activeIndex)
        return true

      case 'Escape':
        // Don't let a surrounding modal close too
        event.preventDefault()
        event.stopPropagation()
        closeList()
        return true

      case 'Tab':
        if (searchable) {
          // focus is in the floating search box; bring it
          // back to the trigger instead of leaving the page
          event.preventDefault()
          closeList()
        } else {
          // let Tab move to the next field as usual
          setOpen(false)
        }
        return true

      default:
        return false
    }
  }

  const handleTriggerKeyDown = (event) => {
    if (disabled) return

    if (open) {
      if (handleListKeys(event)) return

      if (event.key === ' ' && !searchable) {
        event.preventDefault()
        choose(activeIndex)
        return
      }
    } else if (
      ['ArrowDown', 'ArrowUp', 'Enter', ' '].includes(event.key)
    ) {
      event.preventDefault()
      openList()
      return
    }

    const printable =
      event.key.length === 1 &&
      !event.ctrlKey &&
      !event.metaKey &&
      !event.altKey

    if (!printable || event.key === ' ') return

    if (searchable) {
      event.preventDefault()
      openList(event.key)
    } else {
      handleTypeahead(event.key)
    }
  }

  // -------------------------------------------------------
  // Render
  // -------------------------------------------------------

  const triggerClasses = [
    'ui-select',
    size === 'sm' ? 'ui-select--sm' : '',
    open ? 'is-open' : '',
    invalid ? 'is-invalid' : '',
    className,
  ]
    .filter(Boolean)
    .join(' ')

  const activeDescendant =
    open && activeIndex >= 0 && visibleOptions[activeIndex]
      ? `${listId}-${activeIndex}`
      : undefined

  return (
    <>
      <button
        ref={buttonRef}
        id={buttonId}
        type="button"
        role="combobox"
        className={triggerClasses}
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-controls={listId}
        aria-activedescendant={
          searchable ? undefined : activeDescendant
        }
        aria-label={ariaLabel}
        aria-labelledby={ariaLabelledBy}
        aria-describedby={ariaDescribedBy}
        aria-invalid={invalid || undefined}
        disabled={disabled}
        onClick={() => (open ? closeList(false) : openList())}
        onKeyDown={handleTriggerKeyDown}
      >
        <span
          className={`ui-select-value${
            selected ? '' : ' is-placeholder'
          }`}
        >
          {selected ? selected.label : placeholder}
        </span>

        <ChevronIcon />
      </button>

      {open &&
        position &&
        createPortal(
          <div
            ref={popoverRef}
            className={`ui-select-popover${
              size === 'sm' ? ' ui-select-popover--sm' : ''
            }${searchable ? ' is-searchable' : ''}`}
            style={{
              position: 'fixed',
              left: position.left,
              minWidth: position.minWidth,
              top: position.top,
              bottom: position.bottom,
            }}
          >
            {searchable && (
              <div className="ui-select-search">
                <SearchIcon />

                <input
                  ref={searchRef}
                  type="text"
                  role="combobox"
                  aria-expanded="true"
                  aria-controls={listId}
                  aria-autocomplete="list"
                  aria-activedescendant={activeDescendant}
                  aria-label={
                    ariaLabel
                      ? `Search ${ariaLabel.toLowerCase()}`
                      : 'Search options'
                  }
                  placeholder={searchPlaceholder}
                  value={query}
                  onChange={(event) => {
                    setQuery(event.target.value)
                    setActiveIndex(0)
                  }}
                  onKeyDown={handleListKeys}
                  autoComplete="off"
                  spellCheck="false"
                />
              </div>
            )}

            <ul
              ref={listRef}
              id={listId}
              role="listbox"
              aria-label={ariaLabel}
              aria-labelledby={ariaLabelledBy}
              className="ui-select-list"
              style={{ maxHeight: position.listMaxHeight }}
            >
              {visibleOptions.length === 0 ? (
                <li className="ui-select-empty" role="presentation">
                  {emptyText}
                </li>
              ) : (
                visibleOptions.map((option, index) => {
                  const isSelected = index === selectedVisibleIndex
                  const isActive = index === activeIndex

                  return (
                    <li
                      key={String(option.value)}
                      id={`${listId}-${index}`}
                      data-index={index}
                      role="option"
                      aria-selected={isSelected}
                      aria-disabled={option.disabled || undefined}
                      className={[
                        'ui-select-option',
                        isActive ? 'is-active' : '',
                        isSelected ? 'is-selected' : '',
                      ]
                        .filter(Boolean)
                        .join(' ')}
                      onMouseEnter={() => setActiveIndex(index)}
                      // keep focus where it is (trigger or search)
                      onMouseDown={(event) => event.preventDefault()}
                      onClick={() => choose(index)}
                    >
                      <span className="ui-select-option-text">
                        <span className="ui-select-option-label">
                          {option.label}
                        </span>

                        {option.description && (
                          <span className="ui-select-option-description">
                            {option.description}
                          </span>
                        )}
                      </span>

                      {isSelected && <CheckIcon />}
                    </li>
                  )
                })
              )}
            </ul>
          </div>,
          document.body
        )}
    </>
  )
}