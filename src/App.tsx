import {
  FormEvent,
  ReactNode,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react"

type IconName = "clock" | "minus" | "plus" | "play" | "pause" | "stop" | "calendar" | "award" | "check" | "leaf" | "settings" | "chevron-left" | "chevron-right" | "close"

function Icon({ name, size = 18 }: {
  name: IconName
  size?: number
}) {
  const paths: Record<IconName, ReactNode> = {
    clock: (
      <>
        <circle cx="12" cy="12" r="9" />
        <path d="M12 7v5l3 2" />
      </>
    ),
    minus: <path d="M5 12h14" />,
    plus: <path d="M12 5v14M5 12h14" />,
    play: <path d="m9 7 8 5-8 5V7Z" />,
    pause: (
      <>
        <path d="M9 8v8" />
        <path d="M15 8v8" />
      </>
    ),
    stop: <rect x="7" y="7" width="10" height="10" rx="2" />,
    calendar: (
      <>
        <rect x="4" y="5" width="16" height="15" rx="3" />
        <path d="M8 3v4M16 3v4M4 10h16" />
      </>
    ),
    award: (
      <>
        <circle cx="12" cy="9" r="5" />
        <path d="m8.5 13-1 8 4.5-2.5 4.5 2.5-1-8" />
        <path d="m10.2 9 1.2 1.2L14 7.8" />
      </>
    ),
    check: <path d="m6 12 4 4 8-8" />,
    leaf: (
      <path d="M19 4C11 4 6 8 6 14c0 2 1 4 3 5 1-5 4-8 8-10-3 2-5 5-6 9 6 0 9-4 8-14Z" />
    ),
    settings: (
      <>
        <circle cx="12" cy="12" r="3" />
        <path
          d="M19 13.5v-3l-2-.7-.6-1.4.9-1.9-2.1-2.1-1.9.9-1.4-.6L11 3H8l-.7 2-1.4.6L4 4.7 1.9 6.8l.9 1.9-.6 1.4-2 .7v3l2 .7.6 1.4-.9 1.9L4 19.9l1.9-.9 1.4.6.7 2h3l.7-2 1.4-.6 1.9.9 2.1-2.1-.9-1.9.6-1.4 2.2-1Z"
          transform="scale(.85) translate(2 2)"
        />
      </>
    ),
    close: <path d="m7 7 10 10M17 7 7 17" />,
    "chevron-left": <path d="m14 6-6 6 6 6" />,
    "chevron-right": <path d="m10 6 6 6-6 6" />,
  }

  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      {paths[name]}
    </svg>
  )
}

function formatTime(seconds: number) {
  const hours = Math.floor(seconds / 3600)
  const minutes = Math.floor((seconds % 3600) / 60)
  const secs = seconds % 60
  return [hours, minutes, secs]
    .map((value) => String(value).padStart(2, "0"))
    .join(":")
}

type FocusSession = {
  id: string
  finishedAt: string
  seconds: number
  note: string
  rating: number
}

const HISTORY_KEY = "pausa-history"
const THEME_KEY = "pausa-theme"
const ratingLabels = ["Nada", "Poco", "Bien", "Mucho", "Excelente"]
const themeOptions = [
  { id: "forest", label: "Bosque", color: "#1f4a3b" },
  { id: "ocean", label: "Océano", color: "#275c70" },
  { id: "clay", label: "Arcilla", color: "#8a4f3d" },
  { id: "lavender", label: "Lavanda", color: "#5d527d" },
] as const
type ThemeId = (typeof themeOptions)[number]["id"]

function readTheme(): ThemeId {
  const theme = localStorage.getItem(THEME_KEY)
  return themeOptions.some((option) => option.id === theme)
    ? (theme as ThemeId)
    : "forest"
}

function dateKey(date: Date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`
}

function readHistory(): FocusSession[] {
  try {
    const value: unknown = JSON.parse(localStorage.getItem(HISTORY_KEY) || "[]")
    if (!Array.isArray(value)) return []
    return value.filter(
      (session): session is FocusSession =>
        session !== null &&
        typeof session === "object" &&
        typeof session.id === "string" &&
        typeof session.finishedAt === "string" &&
        Number.isFinite(new Date(session.finishedAt).getTime()) &&
        typeof session.seconds === "number" &&
        Number.isFinite(session.seconds) &&
        session.seconds >= 0 &&
        typeof session.note === "string" &&
        Number.isInteger(session.rating) &&
        session.rating >= 1 &&
        session.rating <= 5,
    )
  } catch {
    return []
  }
}

function totalSeconds(sessions: FocusSession[]) {
  return sessions.reduce((total, session) => total + session.seconds, 0)
}

function averageRating(sessions: FocusSession[]) {
  return sessions.length
    ? sessions.reduce((total, session) => total + session.rating, 0) /
        sessions.length
    : 0
}

function formatHours(seconds: number) {
  return `${(seconds / 3600).toLocaleString("es-ES", { minimumFractionDigits: 2, maximumFractionDigits: 2 })} h`
}

function formatRating(rating: number) {
  return rating.toLocaleString("es-ES", { maximumFractionDigits: 1 })
}

function currentStreak(history: FocusSession[]) {
  const days = new Set(
    history.map((session) => dateKey(new Date(session.finishedAt))),
  )
  const day = new Date()
  if (!days.has(dateKey(day))) day.setDate(day.getDate() - 1)
  let streak = 0
  while (days.has(dateKey(day))) {
    streak += 1
    day.setDate(day.getDate() - 1)
  }
  return streak
}

const weeklyBadges = [
  {
    weeks: 1,
    title: "Semana en marcha",
    description: "Completa tu primera semana activa.",
  },
  {
    weeks: 2,
    title: "Ritmo sostenible",
    description: "Mantén dos semanas activas consecutivas.",
  },
  {
    weeks: 4,
    title: "Constancia mensual",
    description: "Encadena cuatro semanas activas.",
  },
  {
    weeks: 8,
    title: "Hábito consolidado",
    description: "Sostén tu ritmo durante ocho semanas.",
  },
]

function weekKey(date: Date) {
  const monday = new Date(date)
  monday.setHours(12, 0, 0, 0)
  monday.setDate(monday.getDate() - ((monday.getDay() + 6) % 7))
  return dateKey(monday)
}

function moveWeek(key: string, amount: number) {
  const date = new Date(`${key}T12:00:00`)
  date.setDate(date.getDate() + amount * 7)
  return dateKey(date)
}

function weeklyFocusStats(history: FocusSession[]) {
  const activeDays = new Map<string, Set<string>>()
  for (const session of history) {
    const date = new Date(session.finishedAt)
    const key = weekKey(date)
    const days = activeDays.get(key) || new Set<string>()
    days.add(dateKey(date))
    activeDays.set(key, days)
  }

  const qualifyingWeeks = new Set(
    [...activeDays.entries()]
      .filter(([, days]) => days.size >= 3)
      .map(([key]) => key),
  )
  const thisWeek = weekKey(new Date())
  let cursor = qualifyingWeeks.has(thisWeek)
    ? thisWeek
    : moveWeek(thisWeek, -1)
  let current = 0

  while (qualifyingWeeks.has(cursor)) {
    current += 1
    cursor = moveWeek(cursor, -1)
  }

  let best = 0
  let sequence = 0
  let previous = ""
  for (const key of [...qualifyingWeeks].sort()) {
    sequence = previous && moveWeek(previous, 1) === key ? sequence + 1 : 1
    best = Math.max(best, sequence)
    previous = key
  }

  return {
    activeDaysThisWeek: activeDays.get(thisWeek)?.size || 0,
    currentStreak: current,
    bestStreak: best,
  }
}

function CalendarModal({
  history,
  onClose,
}: {
  history: FocusSession[]
  onClose: () => void
}) {
  const dialogRef = useRef<HTMLDialogElement>(null)
  const now = new Date()
  const [month, setMonth] = useState(
    () => new Date(now.getFullYear(), now.getMonth(), 1),
  )
  const [selectedDay, setSelectedDay] = useState(() => dateKey(now))
  const todayKey = dateKey(now)

  useEffect(() => {
    const dialog = dialogRef.current
    const previouslyFocused = document.activeElement as HTMLElement | null
    dialog?.showModal()
    return () => {
      dialog?.close()
      previouslyFocused?.focus()
    }
  }, [])

  const days = useMemo(() => {
    const grouped = new Map<string, FocusSession[]>()
    for (const session of history) {
      const key = dateKey(new Date(session.finishedAt))
      grouped.set(key, [...(grouped.get(key) || []), session])
    }
    return grouped
  }, [history])
  const monthPrefix = dateKey(month).slice(0, 7)
  const monthlySessions = history.filter((session) =>
    dateKey(new Date(session.finishedAt)).startsWith(monthPrefix),
  )
  const activeDays = [...days.keys()].filter((day) =>
    day.startsWith(monthPrefix),
  ).length
  const selectedSessions = [...(days.get(selectedDay) || [])].sort((a, b) =>
    b.finishedAt.localeCompare(a.finishedAt),
  )
  const selectedDate = new Date(`${selectedDay}T12:00:00`)
  const monthLabel = month.toLocaleDateString("es-ES", {
    month: "long",
    year: "numeric",
  })
  const offset = (month.getDay() + 6) % 7
  const dayCount = new Date(
    month.getFullYear(),
    month.getMonth() + 1,
    0,
  ).getDate()
  const cellCount = Math.ceil((offset + dayCount) / 7) * 7

  function changeMonth(delta: number) {
    const next = new Date(month.getFullYear(), month.getMonth() + delta, 1)
    setMonth(next)
    setSelectedDay(dateKey(next))
  }

  function goToToday() {
    setMonth(new Date(now.getFullYear(), now.getMonth(), 1))
    setSelectedDay(todayKey)
  }

  return (
    <dialog
      ref={dialogRef}
      className="modal calendar-modal"
      aria-labelledby="calendar-title"
      onCancel={onClose}
      onClick={(event) => {
        if (event.target !== event.currentTarget) return
        const bounds = event.currentTarget.getBoundingClientRect()
        if (
          event.clientX < bounds.left ||
          event.clientX > bounds.right ||
          event.clientY < bounds.top ||
          event.clientY > bounds.bottom
        )
          onClose()
      }}
    >
      <button
        className="icon-btn modal-close"
        onClick={onClose}
        aria-label="Cerrar calendario"
        autoFocus
      >
        <Icon name="close" />
      </button>
      <p className="eyebrow">TU TIEMPO, CON PERSPECTIVA</p>
      <h2 id="calendar-title">Tu calendario de foco</h2>
      <p className="modal-subtitle">
        Cada sesión cuenta. Mira todo lo que has avanzado.
      </p>
      <div className="calendar-stats">
        <article>
          <small>TIEMPO DE FOCO</small>
          <strong>{formatHours(totalSeconds(monthlySessions))}</strong>
        </article>
        <article>
          <small>DÍAS ACTIVOS</small>
          <strong>
            {activeDays}
            <span> / {dayCount}</span>
          </strong>
        </article>
        <article>
          <small>PRODUCTIVIDAD</small>
          <strong>
            {monthlySessions.length
              ? `${formatRating(averageRating(monthlySessions))} / 5`
              : "—"}
          </strong>
        </article>
      </div>
      <div className="calendar-layout">
        <section className="calendar-pane" aria-label="Calendario mensual">
          <div className="calendar-navigation">
            <div className="month-navigation">
              <button
                className="icon-btn"
                onClick={() => changeMonth(-1)}
                aria-label="Mes anterior"
              >
                <Icon name="chevron-left" />
              </button>
              <h3 aria-live="polite">{monthLabel}</h3>
              <button
                className="icon-btn"
                onClick={() => changeMonth(1)}
                aria-label="Mes siguiente"
              >
                <Icon name="chevron-right" />
              </button>
            </div>
            <button className="quiet-btn" onClick={goToToday}>
              Hoy
            </button>
          </div>
          <div className="calendar-weekdays" aria-hidden="true">
            {["L", "M", "X", "J", "V", "S", "D"].map((day, index) => (
              <span key={index}>{day}</span>
            ))}
          </div>
          <div className="calendar-grid">
            {Array.from({ length: cellCount }, (_, index) => {
              const day = index - offset + 1
              if (day < 1 || day > dayCount) return <span key={index} />
              const date = new Date(month.getFullYear(), month.getMonth(), day)
              const key = dateKey(date)
              const sessions = days.get(key) || []
              const rating = averageRating(sessions)
              return (
                <button
                  key={index}
                  className={`calendar-day ${
                    sessions.length ? `score-${Math.round(rating)}` : ""
                  } ${key === selectedDay ? "selected" : ""}`}
                  onClick={() => setSelectedDay(key)}
                  aria-pressed={key === selectedDay}
                  aria-current={key === todayKey ? "date" : undefined}
                  aria-label={`${date.toLocaleDateString("es-ES", { day: "numeric", month: "long", year: "numeric" })}: ${
                    sessions.length
                      ? `${sessions.length} sesiones, ${formatHours(totalSeconds(sessions))}, productividad ${formatRating(rating)} de 5`
                      : "sin sesiones"
                  }`}
                >
                  <span>{day}</span>
                  <small>
                    {sessions.length
                      ? `${formatRating(rating)}/5`
                      : key === todayKey
                        ? "hoy"
                        : ""}
                  </small>
                </button>
              )
            })}
          </div>
          <div className="calendar-legend" aria-label="Escala de productividad">
            {ratingLabels.map((label, index) => (
              <span key={label}>
                <i className={`score-${index + 1}`} />
                <span>
                  {index + 1} · {label}
                </span>
              </span>
            ))}
          </div>
          <p className="calendar-footnote">
            El color refleja la media de las valoraciones del día, redondeada.
            Los días sin sesiones no tienen color.
          </p>
        </section>
        <section
          className="day-detail"
          aria-label="Detalle del día"
          aria-live="polite"
        >
          <p className="eyebrow">TUS AVANCES</p>
          <h3>
            {selectedDate.toLocaleDateString("es-ES", {
              day: "numeric",
              month: "long",
            })}
          </h3>
          {selectedSessions.length ? (
            <>
              <div className="day-total">
                <Icon name="clock" />
                <strong>{formatHours(totalSeconds(selectedSessions))}</strong>
                <span>
                  {selectedSessions.length}{" "}
                  {selectedSessions.length === 1 ? "sesión" : "sesiones"}
                </span>
              </div>
              <p className="day-average">
                Productividad media:{" "}
                <strong>
                  {formatRating(averageRating(selectedSessions))} / 5
                </strong>
              </p>
              <div className="session-list">
                {selectedSessions.map((session) => (
                  <article className="session-entry" key={session.id}>
                    <div className="session-meta">
                      <span>
                        {new Date(session.finishedAt).toLocaleTimeString(
                          "es-ES",
                          { hour: "2-digit", minute: "2-digit" },
                        )}{" "}
                        · {formatHours(session.seconds)}
                      </span>
                      <span className={`score-badge score-${session.rating}`}>
                        {session.rating}/5 · {ratingLabels[session.rating - 1]}
                      </span>
                    </div>
                    <p>
                      {session.note ||
                        "Sin notas. También cuenta haber dedicado tiempo a concentrarte."}
                    </p>
                  </article>
                ))}
              </div>
            </>
          ) : (
            <div className="calendar-empty">
              <span className="success-mark">
                <Icon name="leaf" size={24} />
              </span>
              <strong>Un día sin registros</strong>
              <p>
                Las sesiones que guardes aparecerán aquí, junto a tus avances y
                tu valoración.
              </p>
            </div>
          )}
        </section>
      </div>
      <p className="calendar-privacy">
        <Icon name="check" size={14} />
        Tu historial se guarda solo en este dispositivo.
      </p>
    </dialog>
  )
}

function BadgesModal({
  history,
  onClose,
}: {
  history: FocusSession[]
  onClose: () => void
}) {
  const dialogRef = useRef<HTMLDialogElement>(null)
  const stats = weeklyFocusStats(history)
  const earned = weeklyBadges.filter(
    (badge) => stats.bestStreak >= badge.weeks,
  ).length
  const nextBadge = weeklyBadges.find(
    (badge) => stats.bestStreak < badge.weeks,
  )

  useEffect(() => {
    const dialog = dialogRef.current
    const previouslyFocused = document.activeElement as HTMLElement | null
    dialog?.showModal()
    return () => {
      dialog?.close()
      previouslyFocused?.focus()
    }
  }, [])

  return (
    <dialog
      ref={dialogRef}
      className="modal badges-modal"
      aria-labelledby="badges-title"
      onCancel={onClose}
      onClick={(event) => {
        if (event.target !== event.currentTarget) return
        const bounds = event.currentTarget.getBoundingClientRect()
        if (
          event.clientX < bounds.left ||
          event.clientX > bounds.right ||
          event.clientY < bounds.top ||
          event.clientY > bounds.bottom
        )
          onClose()
      }}
    >
      <button
        className="icon-btn modal-close"
        onClick={onClose}
        aria-label="Cerrar insignias"
        autoFocus
      >
        <Icon name="close" />
      </button>

      <p className="eyebrow">UN RITMO QUE PUEDAS MANTENER</p>
      <h2 id="badges-title">Insignias de constancia</h2>
      <p className="modal-subtitle">
        No necesitas trabajar todos los días. Una semana activa se consigue al
        concentrarte en 3 días distintos; el resto puede ser descanso.
      </p>

      <section className="weekly-progress">
        <span className="weekly-award">
          <Icon name="award" size={25} />
        </span>
        <div className="weekly-copy">
          <small>ESTA SEMANA</small>
          <strong>
            {stats.activeDaysThisWeek} de 3 días de foco
          </strong>
          <div className="weekly-progress-track" aria-hidden="true">
            <span
              style={{
                width: `${Math.min(100, (stats.activeDaysThisWeek / 3) * 100)}%`,
              }}
            />
          </div>
        </div>
        <div className="weekly-streak">
          <strong>{stats.currentStreak}</strong>
          <small>
            {stats.currentStreak === 1 ? "semana seguida" : "semanas seguidas"}
          </small>
        </div>
      </section>

      <div className="badges-heading">
        <div>
          <strong>Tu colección</strong>
          <small>
            {earned} de {weeklyBadges.length} desbloqueadas
          </small>
        </div>
        <span>Mejor racha: {stats.bestStreak} semanas</span>
      </div>

      <section className="badges-grid" aria-label="Colección de insignias">
        {weeklyBadges.map((badge) => {
          const isEarned = stats.bestStreak >= badge.weeks
          return (
            <article
              key={badge.weeks}
              className={`badge-card ${isEarned ? "earned" : "locked"}`}
            >
              <span className="badge-medallion">
                <Icon name={isEarned ? "award" : "clock"} size={22} />
              </span>
              <div>
                <small>
                  {isEarned
                    ? "DESBLOQUEADA"
                    : `${badge.weeks} ${badge.weeks === 1 ? "SEMANA" : "SEMANAS"}`}
                </small>
                <strong>{badge.title}</strong>
                <p>{badge.description}</p>
              </div>
            </article>
          )
        })}
      </section>

      <p className="badges-note">
        <Icon name="leaf" size={15} />
        {nextBadge
          ? `Tu siguiente insignia llega al alcanzar ${nextBadge.weeks} ${nextBadge.weeks === 1 ? "semana activa" : "semanas activas seguidas"}.`
          : "Has completado toda la colección. Mantén un ritmo que también deje espacio para descansar."}
      </p>
    </dialog>
  )
}

function Login({ onComplete }: { onComplete: (name: string) => void }) {
  const [name, setName] = useState("")
  const [password, setPassword] = useState("")

  function handleSubmit(event: FormEvent) {
    event.preventDefault()
    if (name.trim() && password.length >= 4) onComplete(name.trim())
  }

  return (
    <main className="app-shell login-shell">
      <section className="login-brand">
        <div className="logo light-logo">
          <Icon name="leaf" size={20} />
        </div>
        <div>
          <p className="eyebrow light">TIEMPO CON INTENCIÓN</p>
          <p className="brand-name">Pausa</p>
        </div>
        <div className="brand-message">
          <span className="brand-rule" />
          <p>Tu trabajo importa.</p>
          <p>Tu tiempo también.</p>
        </div>
        <p className="brand-footnote">
          Un espacio tranquilo para avanzar con foco.
        </p>
      </section>

      <section className="login-panel">
        <div className="login-content">
          <p className="eyebrow">PRIMER ACCESO</p>
          <h1>Empecemos por ti.</h1>
          <p className="lead">
            Crea tu perfil local. La próxima vez te recibiremos directamente en
            tu espacio.
          </p>
          <form onSubmit={handleSubmit}>
            <label>
              <span>Tu nombre</span>
              <input
                value={name}
                onChange={(event) => setName(event.target.value)}
                placeholder="¿Cómo te llamas?"
                autoComplete="name"
                required
              />
            </label>
            <label>
              <span>Contraseña</span>
              <input
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                type="password"
                placeholder="Mínimo 4 caracteres"
                minLength={4}
                autoComplete="new-password"
                required
              />
            </label>
            <button className="primary-btn wide" type="submit">
              Crear mi espacio
              <span>→</span>
            </button>
          </form>
          <div className="privacy-note">
            <Icon name="check" size={15} />
            <span>Tus datos se guardan únicamente en este dispositivo.</span>
          </div>
        </div>
      </section>
    </main>
  )
}

function CompletionModal({
  elapsed,
  extra,
  onClose,
  onSave,
  error,
}: {
  elapsed: number
  extra: number
  onClose: () => void
  onSave: (note: string, rating: number) => void
  error: string
}) {
  const [note, setNote] = useState("")
  const [rating, setRating] = useState(0)

  return (
    <div className="modal-backdrop" role="presentation">
      <section
        className="modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby="session-title"
      >
        <button
          className="icon-btn modal-close"
          onClick={onClose}
          aria-label="Cerrar sin guardar"
        >
          <Icon name="close" />
        </button>
        <div className="success-mark">
          <Icon name="check" size={26} />
        </div>
        <p className="eyebrow">SESIÓN COMPLETADA</p>
        <h2 id="session-title">Buen trabajo. ¿Cómo ha ido?</h2>
        <p className="modal-subtitle">
          Has dedicado <strong>{formatHours(elapsed)}</strong> a avanzar.
        </p>
        {extra > 0 && (
          <p className="extra-summary">
            <Icon name="clock" size={15} />
            Incluye <strong>{formatHours(extra)}</strong> de tiempo extra.
          </p>
        )}
        <label className="note-label">
          <span>¿Qué has conseguido?</span>
          <textarea
            value={note}
            onChange={(event) => setNote(event.target.value)}
            placeholder="Escribe un breve resumen de tus avances..."
          />
        </label>
        <fieldset>
          <legend>¿Cómo de productiva ha sido la sesión?</legend>
          <div className="rating-row">
            {ratingLabels.map((item, index) => (
              <button
                type="button"
                key={item}
                className={`rating score-${index + 1} ${
                  rating === index + 1 ? "active" : ""
                }`}
                onClick={() => setRating(index + 1)}
                aria-label={`${index + 1} de 5: ${item}`}
                aria-pressed={rating === index + 1}
              >
                <span>{index + 1}</span>
                <small>{item}</small>
              </button>
            ))}
          </div>
        </fieldset>
        {error && (
          <p className="save-error" role="alert">
            {error}
          </p>
        )}
        {!rating && (
          <p className="rating-hint">
            Selecciona una valoración para guardar tu sesión.
          </p>
        )}
        <button
          className="primary-btn wide"
          disabled={!rating}
          onClick={() => onSave(note, rating)}
        >
          Guardar sesión
        </button>
      </section>
    </div>
  )
}

function Dashboard({
  name,
  theme,
  onThemeChange,
}: {
  name: string
  theme: ThemeId
  onThemeChange: (theme: ThemeId) => void
}) {
  const defaultDuration = 2 * 60 * 60
  const today = useMemo(
    () =>
      new Intl.DateTimeFormat("es-ES", {
        weekday: "long",
        day: "numeric",
        month: "long",
      })
        .format(new Date())
        .toLocaleUpperCase("es-ES"),
    [],
  )
  const [duration, setDuration] = useState(defaultDuration)
  const [remaining, setRemaining] = useState(defaultDuration)
  const [status, setStatus] = useState<
    "idle" | "running" | "paused" | "overtime"
  >("idle")
  const [showCompletion, setShowCompletion] = useState(false)
  const [history, setHistory] = useState<FocusSession[]>(readHistory)
  const [showCalendar, setShowCalendar] = useState(false)
  const [showBadges, setShowBadges] = useState(false)
  const [showProfile, setShowProfile] = useState(false)
  const [finishedAt, setFinishedAt] = useState("")
  const [saveError, setSaveError] = useState("")
  const deadlineRef = useRef<number | null>(null)
  const notifiedRef = useRef(false)
  const audioContextRef = useRef<AudioContext | null>(null)
  const profileRef = useRef<HTMLDivElement>(null)
  const [legacySessions] = useState(() => {
    const count = Number(localStorage.getItem("pausa-sessions") || 0)
    return Number.isInteger(count) && count > 0 ? count : 0
  })
  const sessions = legacySessions + history.length
  const todaySessions = history.filter(
    (session) => dateKey(new Date(session.finishedAt)) === dateKey(new Date()),
  )
  const streak = currentStreak(history)
  const weeklyStats = useMemo(() => weeklyFocusStats(history), [history])
  const earnedBadges = weeklyBadges.filter(
    (badge) => weeklyStats.bestStreak >= badge.weeks,
  ).length

  useEffect(() => {
    if (status !== "running" && status !== "overtime") return

    if (deadlineRef.current === null) {
      deadlineRef.current = Date.now() + remaining * 1000
    }

    function syncWithClock() {
      if (deadlineRef.current === null) return
      const next = Math.ceil((deadlineRef.current - Date.now()) / 1000)
      setRemaining(next)

      if (next <= 0 && !notifiedRef.current) {
        notifiedRef.current = true
        setStatus("overtime")
        announceCompletedTime()
      }
    }

    syncWithClock()
    const timer = window.setInterval(syncWithClock, 250)
    window.addEventListener("focus", syncWithClock)
    document.addEventListener("visibilitychange", syncWithClock)

    return () => {
      window.clearInterval(timer)
      window.removeEventListener("focus", syncWithClock)
      document.removeEventListener("visibilitychange", syncWithClock)
    }
  }, [status])

  useEffect(() => {
    if (!showProfile) return

    function closeProfile(event: MouseEvent) {
      if (
        event.target instanceof Node &&
        !profileRef.current?.contains(event.target)
      ) {
        setShowProfile(false)
      }
    }

    function closeOnEscape(event: KeyboardEvent) {
      if (event.key === "Escape") setShowProfile(false)
    }

    document.addEventListener("mousedown", closeProfile)
    document.addEventListener("keydown", closeOnEscape)
    return () => {
      document.removeEventListener("mousedown", closeProfile)
      document.removeEventListener("keydown", closeOnEscape)
    }
  }, [showProfile])

  const progress = useMemo(
    () => Math.min(100, ((duration - remaining) / duration) * 100),
    [duration, remaining],
  )
  const elapsed = duration - remaining
  const extra = Math.max(0, -remaining)

  function changeDuration(minutes: number) {
    if (status !== "idle") return
    const next = Math.min(8 * 3600, Math.max(15 * 60, duration + minutes * 60))
    setDuration(next)
    setRemaining(next)
  }

  function startSession() {
    prepareAlerts()
    notifiedRef.current = false
    deadlineRef.current = Date.now() + remaining * 1000
    setStatus("running")
  }

  function togglePause() {
    if (status === "running" || status === "overtime") {
      if (deadlineRef.current !== null) {
        setRemaining(
          Math.ceil((deadlineRef.current - Date.now()) / 1000),
        )
      }
      deadlineRef.current = null
      setStatus("paused")
      return
    }

    deadlineRef.current = Date.now() + remaining * 1000
    setStatus(remaining <= 0 ? "overtime" : "running")
  }

  function finishSession() {
    if (
      (status === "running" || status === "overtime") &&
      deadlineRef.current !== null
    ) {
      setRemaining(
        Math.ceil((deadlineRef.current - Date.now()) / 1000),
      )
    }
    deadlineRef.current = null
    setStatus("idle")
    setFinishedAt(new Date().toISOString())
    setShowCompletion(true)
  }

  function prepareAlerts() {
    if (!audioContextRef.current) {
      audioContextRef.current = new AudioContext()
    }
    if (audioContextRef.current.state === "suspended") {
      audioContextRef.current.resume().catch(() => undefined)
    }
    if ("Notification" in window && Notification.permission === "default") {
      Notification.requestPermission().catch(() => undefined)
    }
  }

  function playCompletionSound() {
    const context = audioContextRef.current
    if (!context) return

    function playChime() {
      if (!context) return
      const start = context.currentTime
      ;[659.25, 783.99, 987.77].forEach((frequency, index) => {
        const oscillator = context.createOscillator()
        const gain = context.createGain()
        const noteStart = start + index * 0.16
        oscillator.type = "sine"
        oscillator.frequency.value = frequency
        gain.gain.setValueAtTime(0.0001, noteStart)
        gain.gain.exponentialRampToValueAtTime(0.16, noteStart + 0.025)
        gain.gain.exponentialRampToValueAtTime(0.0001, noteStart + 0.42)
        oscillator.connect(gain)
        gain.connect(context.destination)
        oscillator.start(noteStart)
        oscillator.stop(noteStart + 0.44)
      })
    }

    if (context.state === "suspended") {
      context.resume().then(playChime).catch(() => undefined)
    } else {
      playChime()
    }
  }

  function announceCompletedTime() {
    playCompletionSound()
    if ("Notification" in window && Notification.permission === "granted") {
      try {
        const notification = new Notification("Tiempo completado", {
          body: "Has alcanzado tu objetivo. El tiempo extra seguirá contando hasta que finalices la sesión.",
        })
        notification.onclick = () => window.focus()
      } catch {
        // El aviso sonoro sigue funcionando si el sistema bloquea notificaciones.
      }
    }
  }

  function saveSession(note: string, rating: number) {
    const session: FocusSession = {
      id: crypto.randomUUID(),
      finishedAt,
      seconds: elapsed,
      note: note.trim(),
      rating,
    }
    const next = [...history, session]
    try {
      localStorage.setItem(HISTORY_KEY, JSON.stringify(next))
    } catch {
      setSaveError(
        "No se ha podido guardar la sesión. Comprueba el espacio disponible y vuelve a intentarlo. Tus avances siguen aquí.",
      )
      return
    }
    setHistory(next)
    closeCompletion()
  }

  function closeCompletion() {
    deadlineRef.current = null
    notifiedRef.current = false
    setSaveError("")
    setShowCompletion(false)
    setDuration(defaultDuration)
    setRemaining(defaultDuration)
  }

  return (
    <main className="app-shell dashboard-shell">
      <header className="topbar">
        <div className="brand-lockup">
          <div className="logo">
            <Icon name="leaf" size={18} />
          </div>
          <span>Pausa</span>
        </div>
        <div className="topbar-actions">
          <button
            className="icon-btn badge-trigger"
            aria-label={`Abrir insignias. ${earnedBadges} desbloqueadas`}
            title="Insignias de constancia"
            onClick={() => setShowBadges(true)}
            aria-haspopup="dialog"
          >
            <Icon name="award" />
            {earnedBadges > 0 && (
              <span className="badge-count">{earnedBadges}</span>
            )}
          </button>
          <button
            className="icon-btn"
            aria-label="Abrir calendario de concentración"
            title="Calendario de concentración"
            onClick={() => setShowCalendar(true)}
            aria-haspopup="dialog"
          >
            <Icon name="calendar" />
          </button>
          <div className="profile-control" ref={profileRef}>
            <button
              className="avatar"
              aria-label="Abrir personalización y perfil"
              aria-expanded={showProfile}
              aria-controls="profile-panel"
              onClick={() => setShowProfile((current) => !current)}
              title="Tu perfil"
            >
              {name.slice(0, 1).toUpperCase()}
            </button>
            {showProfile && (
              <section
                className="profile-popover"
                id="profile-panel"
                aria-label="Perfil y personalización"
              >
                <header className="profile-heading">
                  <span className="profile-avatar">
                    {name.slice(0, 1).toUpperCase()}
                  </span>
                  <div>
                    <strong>{name}</strong>
                    <small>Perfil local de Pausa</small>
                  </div>
                </header>

                <div className="profile-stats" aria-label="Tu resumen">
                  <span>
                    <strong>{sessions}</strong>
                    <small>sesiones</small>
                  </span>
                  <span>
                    <strong>{formatHours(totalSeconds(history))}</strong>
                    <small>de foco</small>
                  </span>
                  <span>
                    <strong>{streak}</strong>
                    <small>racha</small>
                  </span>
                </div>

                <div className="theme-picker">
                  <p>COLOR DE LA INTERFAZ</p>
                  <div className="theme-options">
                    {themeOptions.map((option) => (
                      <button
                        key={option.id}
                        className={theme === option.id ? "selected" : ""}
                        onClick={() => onThemeChange(option.id)}
                        aria-pressed={theme === option.id}
                      >
                        <i style={{ background: option.color }} />
                        <span>{option.label}</span>
                        {theme === option.id && <Icon name="check" size={14} />}
                      </button>
                    ))}
                  </div>
                </div>

                <button
                  className="profile-calendar-btn"
                  onClick={() => {
                    setShowProfile(false)
                    setShowCalendar(true)
                  }}
                >
                  <Icon name="calendar" size={17} />
                  <span>
                    <strong>Historial de concentración</strong>
                    <small>Consulta tus sesiones y avances</small>
                  </span>
                  <Icon name="chevron-right" size={16} />
                </button>

                <p className="profile-privacy">
                  <Icon name="check" size={13} />
                  Tus preferencias y datos siguen solo en este dispositivo.
                </p>
              </section>
            )}
          </div>
        </div>
      </header>

      <div className="dashboard-content">
        <section className="welcome-row">
          <div>
            <p className="eyebrow">{today}</p>
            <h1>Hola, {name}.</h1>
            <p className="lead">¿En qué quieres avanzar hoy?</p>
          </div>
          <div className="streak">
            <span className="streak-icon">
              <Icon name="leaf" size={17} />
            </span>
            <div>
              <strong>
                {streak} {streak === 1 ? "día" : "días"}
              </strong>
              <small>
                {streak ? "de foco seguido" : "tu ritmo empieza hoy"}
              </small>
            </div>
          </div>
        </section>

        <section className="focus-card">
          <div className="focus-topline">
            <div>
              <p className="eyebrow">SESIÓN DE CONCENTRACIÓN</p>
              <span className={`status-pill ${status}`}>
                <span />
                {status === "running"
                  ? "En marcha"
                  : status === "overtime"
                    ? "Tiempo extra"
                  : status === "paused"
                    ? "En pausa"
                    : "Listo para empezar"}
              </span>
            </div>
            <button
              className="quiet-btn"
              onClick={() => setShowCalendar(true)}
              aria-haspopup="dialog"
              aria-label="Ver las sesiones de hoy en el calendario"
            >
              <Icon name="calendar" size={16} />
              Hoy
            </button>
          </div>

          <div className="timer-zone">
            <button
              className="timer-adjust"
              onClick={() => changeDuration(-15)}
              disabled={status !== "idle"}
              aria-label="Restar 15 minutos"
            >
              <Icon name="minus" />
              <span>15 min</span>
            </button>
            <div
              className={`timer-display ${remaining <= 0 && status !== "idle" ? "is-overtime" : ""}`}
            >
              <p>
                {remaining <= 0 && status !== "idle" ? "+" : ""}
                {formatTime(Math.abs(remaining))}
              </p>
              <span>
                {remaining <= 0 && status !== "idle"
                  ? "TIEMPO EXTRA · PULSA FINALIZAR CUANDO TERMINES"
                  : "HORAS    MINUTOS    SEGUNDOS"}
              </span>
            </div>
            <button
              className="timer-adjust"
              onClick={() => changeDuration(15)}
              disabled={status !== "idle"}
              aria-label="Añadir 15 minutos"
            >
              <Icon name="plus" />
              <span>15 min</span>
            </button>
          </div>

          <div className="progress-track">
            <span style={{ width: `${progress}%` }} />
          </div>

          <div className="timer-actions">
            {status === "idle" ? (
              <button
                className="primary-btn start-btn"
                onClick={startSession}
              >
                <Icon name="play" />
                Empezar sesión
              </button>
            ) : (
              <>
                <button
                  className="primary-btn start-btn"
                  onClick={togglePause}
                >
                  <Icon
                    name={
                      status === "running" || status === "overtime"
                        ? "pause"
                        : "play"
                    }
                  />
                  {status === "running" || status === "overtime"
                    ? "Pausar"
                    : "Continuar"}
                </button>
                <button className="secondary-btn" onClick={finishSession}>
                  <Icon name="stop" />
                  Finalizar
                </button>
              </>
            )}
          </div>
          <p className="helper">
            {status === "idle"
              ? "Puedes ajustar el tiempo antes de comenzar"
              : status === "paused"
                ? "Tómate un respiro. Tu progreso está guardado."
                : status === "overtime"
                  ? "Objetivo cumplido. El tiempo extra se sumará a tu sesión."
                  : "Una cosa cada vez. Nosotros cuidamos del tiempo."}
          </p>
        </section>

        <section className="summary-grid">
          <article>
            <span className="summary-icon">
              <Icon name="clock" />
            </span>
            <div>
              <small>FOCO HOY</small>
              <strong>
                {formatHours(totalSeconds(todaySessions) + elapsed)}
              </strong>
            </div>
          </article>
          <article>
            <span className="summary-icon">
              <Icon name="check" />
            </span>
            <div>
              <small>SESIONES</small>
              <strong>{sessions}</strong>
            </div>
          </article>
          <article className="intention-card">
            <div>
              <small>RECORDATORIO</small>
              <strong>Avanzar es mejor que hacerlo perfecto.</strong>
            </div>
            <Icon name="leaf" size={24} />
          </article>
        </section>
      </div>

      {showCompletion && (
        <CompletionModal
          elapsed={elapsed}
          extra={extra}
          onClose={closeCompletion}
          onSave={saveSession}
          error={saveError}
        />
      )}
      {showCalendar && (
        <CalendarModal
          history={history}
          onClose={() => setShowCalendar(false)}
        />
      )}
      {showBadges && (
        <BadgesModal
          history={history}
          onClose={() => setShowBadges(false)}
        />
      )}
    </main>
  )
}

export default function App() {
  const [name, setName] = useState(
    () => localStorage.getItem("pausa-name") || "",
  )
  const [theme, setTheme] = useState<ThemeId>(readTheme)

  function completeLogin(value: string) {
    localStorage.setItem("pausa-name", value)
    setName(value)
  }

  function changeTheme(value: ThemeId) {
    localStorage.setItem(THEME_KEY, value)
    setTheme(value)
  }

  return (
    <div className="desktop" data-theme={theme}>
      {name ? (
        <Dashboard
          name={name}
          theme={theme}
          onThemeChange={changeTheme}
        />
      ) : (
        <Login onComplete={completeLogin} />
      )}
    </div>
  )
}
