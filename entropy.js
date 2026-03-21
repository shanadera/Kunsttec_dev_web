/**
 * Entropy — calm vs chaos visualization
 * Strong contrast: organized grid vs chaotic disturbance
 */
(function () {
  const dpr = window.devicePixelRatio || 1
  const particleColor = '#ffffff'

  class Particle {
    constructor(x, y, order, bounds) {
      this.x = x
      this.y = y
      this.originalX = x
      this.originalY = y
      this.baseSize = 2
      this.order = order
      this.velocity = {
        x: (Math.random() - 0.5) * 1.5,
        y: (Math.random() - 0.5) * 1.5,
      }
      this.influence = 0
      this.neighbors = []
      this.bounds = bounds
    }

    update(mouse) {
      const { w, h } = this.bounds

      if (mouse) {
        const dx = this.x - mouse.x
        const dy = this.y - mouse.y
        const dist = Math.hypot(dx, dy)
        if (dist > 0 && dist < 180) {
          const strength = (1 - dist / 180) * 0.72
          const pushX = (dx / dist) * strength
          const pushY = (dy / dist) * strength
          this.x += pushX
          this.y += pushY
        }
      }

      if (this.order) {
        const dx = this.originalX - this.x
        const dy = this.originalY - this.y

        const chaosInfluence = { x: 0, y: 0 }
        this.neighbors.forEach((neighbor) => {
          if (!neighbor.order) {
            const distance = Math.hypot(this.x - neighbor.x, this.y - neighbor.y)
            const strength = Math.max(0, 1 - distance / 100)
            chaosInfluence.x += neighbor.velocity.x * strength * 1.6
            chaosInfluence.y += neighbor.velocity.y * strength * 1.6
            this.influence = Math.max(this.influence, strength)
          }
        })

        const orderStrength = 0.05
        const chaosStrength = 0.6
        this.x += dx * orderStrength * (1 - this.influence) + chaosInfluence.x * this.influence * chaosStrength
        this.y += dy * orderStrength * (1 - this.influence) + chaosInfluence.y * this.influence * chaosStrength
        this.influence *= 0.996
      } else {
        this.velocity.x += (Math.random() - 0.5) * 0.5
        this.velocity.y += (Math.random() - 0.5) * 0.5
        this.velocity.x *= 0.91
        this.velocity.y *= 0.91
        this.x += this.velocity.x
        this.y += this.velocity.y

        const chaosLeft = w * 0.28 - 70
        const chaosRight = w * 0.72 + 70
        if (this.x < chaosLeft || this.x > chaosRight) this.velocity.x *= -1
        if (this.y < 0 || this.y > h) this.velocity.y *= -1
        this.x = Math.max(chaosLeft, Math.min(chaosRight, this.x))
        this.y = Math.max(0, Math.min(h, this.y))
      }
    }

    draw(ctx) {
      const alpha = this.order
        ? 0.7 - this.influence * 0.55
        : 0.6
      let size = this.baseSize
      if (this.order) {
        size += this.influence * 1.8
      } else {
        const speed = Math.hypot(this.velocity.x, this.velocity.y)
        size += Math.min(speed * 0.35, 1.5)
      }
      ctx.fillStyle = particleColor + Math.round(Math.max(0.15, alpha) * 255).toString(16).padStart(2, '0')
      ctx.beginPath()
      ctx.arc(this.x, this.y, size, 0, Math.PI * 2)
      ctx.fill()
    }
  }

  function initEntropy(container) {
    if (!container) return

    const canvas = document.createElement('canvas')
    canvas.className = 'entropy-canvas'
    canvas.setAttribute('aria-hidden', 'true')
    container.prepend(canvas)

    const ctx = canvas.getContext('2d')
    if (!ctx) return

    let w = 0
    let h = 0
    let particles = []
    let animationId = 0
    let time = 0
    let mouse = null

    function onMouseMove(e) {
      const rect = container.getBoundingClientRect()
      mouse = {
        x: e.clientX - rect.left,
        y: e.clientY - rect.top,
      }
    }

    function onMouseLeave() {
      mouse = null
    }

    function resize() {
      const rect = container.getBoundingClientRect()
      w = rect.width
      h = rect.height
      if (w < 10 || h < 10) return

      canvas.width = w * dpr
      canvas.height = h * dpr
      canvas.style.width = w + 'px'
      canvas.style.height = h + 'px'
      ctx.setTransform(1, 0, 0, 1, 0, 0)
      ctx.scale(dpr, dpr)

      const gridSize = 25
      const spacingX = w / gridSize
      const spacingY = h / gridSize
      particles = []

      const chaosLeft = w * 0.28
      const chaosRight = w * 0.72
      for (let i = 0; i < gridSize; i++) {
        for (let j = 0; j < gridSize; j++) {
          const x = spacingX * i + spacingX / 2
          const y = spacingY * j + spacingY / 2
          const order = x < chaosLeft || x > chaosRight
          particles.push(new Particle(x, y, order, { w, h }))
        }
      }
    }

    function updateNeighbors() {
      const radius = 165
      particles.forEach((particle) => {
        particle.neighbors = particles.filter((other) => {
          if (other === particle) return false
          const distance = Math.hypot(particle.x - other.x, particle.y - other.y)
          return distance < radius
        })
      })
    }

    function animate() {
      if (w < 10 || h < 10) {
        animationId = requestAnimationFrame(animate)
        return
      }

      ctx.clearRect(0, 0, w, h)

      if (time % 30 === 0) updateNeighbors()

      particles.forEach((particle) => {
        particle.update(mouse)
        particle.draw(ctx)

        particle.neighbors.forEach((neighbor) => {
          const distance = Math.hypot(particle.x - neighbor.x, particle.y - neighbor.y)
          if (distance < 55) {
            const crossZone = particle.order !== neighbor.order
            const alpha = crossZone ? 0.22 * (1 - distance / 55) : 0.1 * (1 - distance / 55)
            ctx.strokeStyle = particleColor + Math.round(alpha * 255).toString(16).padStart(2, '0')
            ctx.lineWidth = 0.5
            ctx.beginPath()
            ctx.moveTo(particle.x, particle.y)
            ctx.lineTo(neighbor.x, neighbor.y)
            ctx.stroke()
          }
        })
      })

      time++
      animationId = requestAnimationFrame(animate)
    }

    resize()
    const ro = new ResizeObserver(() => {
      resize()
    })
    ro.observe(container)
    container.addEventListener('mousemove', onMouseMove)
    container.addEventListener('mouseleave', onMouseLeave)
    animate()

    return () => {
      ro.disconnect()
      container.removeEventListener('mousemove', onMouseMove)
      container.removeEventListener('mouseleave', onMouseLeave)
      cancelAnimationFrame(animationId)
      canvas.remove()
    }
  }

  document.addEventListener('DOMContentLoaded', () => {
    const hero = document.querySelector('.home-hero')
    if (hero) initEntropy(hero)
  })
})()
