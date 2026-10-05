import {
  FormEvent,
  ReactNode,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react"

type IconName = "clock" | "minus" | "plus" | "play" | "pause" | "stop" | "calendar" | "check" | "leaf" | "settings" | "chevron-left" | "chevron-right" | "close"

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
const ratingLabels = ["Nada", "Poco", "Bien", "Mucho", "Excelente"]

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
  onClose,
  onSave,
  error,
}: {
  elapsed: number
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

function Dashboard({ name }: { name: string }) {
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
  const [status, setStatus] = useState<"idle" | "running" | "paused">("idle")
  const [showCompletion, setShowCompletion] = useState(false)
  const [history, setHistory] = useState<FocusSession[]>(readHistory)
  const [showCalendar, setShowCalendar] = useState(false)
  const [finishedAt, setFinishedAt] = useState("")
  const [saveError, setSaveError] = useState("")
  const [legacySessions] = useState(() => {
    const count = Number(localStorage.getItem("pausa-sessions") || 0)
    return Number.isInteger(count) && count > 0 ? count : 0
  })
  const sessions = legacySessions + history.length
  const todaySessions = history.filter(
    (session) => dateKey(new Date(session.finishedAt)) === dateKey(new Date()),
  )
  const streak = currentStreak(history)

  useEffect(() => {
    if (status !== "running") return
    const timer = window.setInterval(() => {
      setRemaining((current) => {
        if (current <= 1) {
          window.clearInterval(timer)
          setStatus("idle")
          setFinishedAt(new Date().toISOString())
          setShowCompletion(true)
          return 0
        }
        return current - 1
      })
    }, 1000)
    return () => window.clearInterval(timer)
  }, [status])

  const progress = useMemo(
    () => Math.min(100, ((duration - remaining) / duration) * 100),
    [duration, remaining],
  )
  const elapsed = duration - remaining

  function changeDuration(minutes: number) {
    if (status !== "idle") return
    const next = Math.min(8 * 3600, Math.max(15 * 60, duration + minutes * 60))
    setDuration(next)
    setRemaining(next)
  }

  function finishSession() {
    setStatus("idle")
    setFinishedAt(new Date().toISOString())
    setShowCompletion(true)
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
            className="icon-btn"
            aria-label="Abrir calendario de concentración"
            title="Calendario de concentración"
            onClick={() => setShowCalendar(true)}
            aria-haspopup="dialog"
          >
            <Icon name="calendar" />
          </button>
          <div className="avatar">{name.slice(0, 1).toUpperCase()}</div>
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
            <div className="timer-display">
              <p>{formatTime(remaining)}</p>
              <span>
                HORAS&nbsp;&nbsp;&nbsp;&nbsp;MINUTOS&nbsp;&nbsp;&nbsp;SEGUNDOS
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
                onClick={() => setStatus("running")}
              >
                <Icon name="play" />
                Empezar sesión
              </button>
            ) : (
              <>
                <button
                  className="primary-btn start-btn"
                  onClick={() =>
                    setStatus(status === "running" ? "paused" : "running")
                  }
                >
                  <Icon name={status === "running" ? "pause" : "play"} />
                  {status === "running" ? "Pausar" : "Continuar"}
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
    </main>
  )
}

export default function App() {
  const [name, setName] = useState(
    () => localStorage.getItem("pausa-name") || "",
  )

  function completeLogin(value: string) {
    localStorage.setItem("pausa-name", value)
    setName(value)
  }

  return (
    <div className="desktop">
      {name ? <Dashboard name={name} /> : <Login onComplete={completeLogin} />}
    </div>
  )
}
