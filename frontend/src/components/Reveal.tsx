import { useRef, useEffect, useState } from 'react'

interface Props {
  children: React.ReactNode
  delay?: number
  className?: string
  from?: 'bottom' | 'fade'
}

export default function Reveal({ children, delay = 0, className = '', from = 'bottom' }: Props) {
  const ref = useRef<HTMLDivElement>(null)
  const [visible, setVisible] = useState(false)

  useEffect(() => {
    const el = ref.current
    if (!el) return
    const obs = new IntersectionObserver(
      ([entry]) => { if (entry.isIntersecting) { setVisible(true); obs.disconnect() } },
      { threshold: 0.08, rootMargin: '0px 0px -16px 0px' }
    )
    obs.observe(el)
    return () => obs.disconnect()
  }, [])

  const initial = from === 'fade' ? 'none' : 'translateY(24px)'

  return (
    <div
      ref={ref}
      className={className}
      style={{
        opacity: visible ? 1 : 0,
        transform: visible ? 'none' : initial,
        transition: `opacity 0.5s ease ${delay}ms, transform 0.5s ease ${delay}ms`,
        willChange: 'opacity, transform',
      }}
    >
      {children}
    </div>
  )
}
