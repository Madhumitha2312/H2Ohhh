/* H2Ohhh Companion - overlay content script
 * Runs on every website. When the background alarm fires it receives
 * SHOW_REMINDER and draws the transparent animated girl/boy (from the
 * H2Ohhh MP4 videos) in the bottom-right corner, without any white
 * background or rectangular popup.
 *
 * The MP4s are H.264, so they have no alpha channel - the background is
 * a uniform light gray. A tiny WebGL chroma-key shader removes that
 * background on the fly so only the transparent character is visible.
 */
(() => {
  if (window.__H2O_COMPANION_LOADED__) return
  window.__H2O_COMPANION_LOADED__ = true
  console.log('[H2Ohhh ' + location.hostname + '] content.js loaded')

  const OVERLAY_ID = 'h2ohhh-companion-overlay'
  const DISPLAY_MS = 8000

  const VIDEO_BY_GENDER = {
    male: 'boy-reminder.mp4',
    female: 'girl-reminder.mp4',
    neutral: 'girl-reminder.mp4'
  }

  const KEY_BY_GENDER = {
    male: [0.73, 0.73, 0.71],
    female: [0.71, 0.71, 0.71]
  }
  const KEY_TOLERANCE = 0.2
  const SAT_TOLERANCE = 0.12

  const MESSAGES = [
    (name) => `Hey ${name}! It's time to take a sip.`,
    (name) => `Hey ${name}! Stay hydrated.`,
    (name) => `Hey ${name}! Let's take a quick water break.`
  ]

  let activeHost = null
  let voiceToken = 0
  let styleInjected = false

  // Debug logging helper.
  const dbg = (...args) => console.log('[H2Ohhh ' + location.hostname + ']', ...args)

  // ---------------------------------------------------------------- styles
  const OVERLAY_CSS = `
    #${OVERLAY_ID} {
      position: fixed !important;
      right: 18px !important;
      bottom: 18px !important;
      z-index: 2147483647 !important;
      width: 240px !important;
      height: auto !important;
      pointer-events: none !important;
      display: block !important;
      background: transparent !important;
      border: none !important;
      box-shadow: none !important;
      padding: 0 !important;
      margin: 0 !important;
      font-family: inherit;
    }
    #${OVERLAY_ID} canvas, #${OVERLAY_ID} video {
      display: block !important;
      width: 100% !important;
      height: auto !important;
      object-fit: contain !important;
      background: transparent !important;
      border: none !important;
      outline: none !important;
      filter: drop-shadow(0 10px 24px rgba(37, 99, 235, 0.25));
    }
    #${OVERLAY_ID}.h2o-in { animation: h2oSlideIn 0.6s cubic-bezier(0.22, 1, 0.36, 1) both; }
    #${OVERLAY_ID}.h2o-out { animation: h2oSlideOut 0.45s cubic-bezier(0.55, 0, 0.55, 0.2) both; }
    #${OVERLAY_ID} .h2o-float { animation: h2oFloat 3.4s ease-in-out infinite; }
    @keyframes h2oSlideIn {
      0% { opacity: 0; transform: translate(60px, 80px) scale(0.95); }
      70% { transform: translate(-5px, -8px) scale(1); }
      100% { opacity: 1; transform: translate(0, 0) scale(1); }
    }
    @keyframes h2oSlideOut {
      0% { opacity: 1; transform: translate(0, 0) scale(1); }
      100% { opacity: 0; transform: translate(80px, 110px) scale(0.94); }
    }
    @keyframes h2oFloat {
      0%, 100% { transform: translateY(0); }
      50% { transform: translateY(-10px); }
    }
  `

  function injectStyles() {
    if (styleInjected) return
    styleInjected = true
    const el = document.createElement('style')
    el.id = 'h2ohhh-companion-styles'
    el.textContent = OVERLAY_CSS
    ;(document.head || document.documentElement).appendChild(el)
  }

  // ------------------------------------------------------------------ voice
  const FEMALE_RE = /female|woman|girl|zira|aria|ava|jenny|emma|samantha|karen|moira|tessa|serena|kate|victoria|fiona|veena|sonia|nicky|michelle|joanna|salli|kendra|kimberly|ivy|reagan|jessa|libby|amara|corina|beatrice|cecilia|heather|hazel|susan|catherine|martha/i
  const MALE_RE = /male|man|boy|david|mark|daniel|george|thomas|james|oliver|alex|ryan|tom|charles|william|henry|andrew|peter|robert|sam|eric|adam|brian|josh|kenny|jeff|matt|taylor|vincent|frank|paul|guy|nathan|chris|mike|steve|joe|nick/i

  function pickVoice(gender) {
    try {
      const synth = window.speechSynthesis
      const voices = synth.getVoices()
      if (!voices || !voices.length) return null
      const english = voices.filter((v) => v.lang && v.lang.toLowerCase().startsWith('en'))
      if (gender === 'male') {
        return english.find((v) => MALE_RE.test(`${v.name} ${v.lang}`)) || english[0] || null
      }
      return english.find((v) => FEMALE_RE.test(`${v.name} ${v.lang}`)) || english[0] || null
    } catch (_) {
      return null
    }
  }

  function speakReminder(name, gender, voice) {
    try {
      const synth = window.speechSynthesis
      if (!synth || !('speechSynthesis' in window)) return
      const pool = MESSAGES
      const text = pool[Math.floor(Math.random() * pool.length)](name)
      const token = ++voiceToken
      // Speak immediately so the voice starts at the same moment the video
      // overlay plays, rather than lagging behind a few seconds.
      window.setTimeout(() => {
        if (token !== voiceToken) return
        try {
          synth.cancel()
          const u = new SpeechSynthesisUtterance(text)
          u.volume = (voice && voice.volume) || 1
          u.rate = (voice && voice.rate) || 0.95
          u.pitch = (voice && voice.pitch) || 1
          const v = pickVoice(gender)
          if (v) u.voice = v
          synth.speak(u)
        } catch (_) {}
      }, 0)
    } catch (_) {}
  }

  function stopVoice() {
    voiceToken += 1
    try {
      if ('speechSynthesis' in window) window.speechSynthesis.cancel()
    } catch (_) {}
  }

  // ------------------------------------------------------------------ sound
  // Chrome only allows an AudioContext that was created/resumed after a user
  // gesture. We create one optimistically on the first gesture and reuse it,
  // so the reminder sound plays without the "AudioContext was not allowed to
  // start" warning.
  let audioCtx = null

  function primeAudio() {
    if (audioCtx) return
    try {
      const Ctor = window.AudioContext || window.webkitAudioContext
      if (Ctor) audioCtx = new Ctor()
    } catch (_) {}
    if (audioCtx && audioCtx.state === 'suspended') audioCtx.resume().catch(() => {})
  }
  window.addEventListener('pointerdown', primeAudio, { passive: true, once: false })
  window.addEventListener('keydown', primeAudio, { passive: true, once: false })

  function playReminderSound(soundId) {
    if (!soundId || soundId === 'none') return
    if (!audioCtx) primeAudio()
    const ctx = audioCtx
    if (!ctx) return
    try {
      if (ctx.state === 'suspended') ctx.resume().catch(() => {})
      const tone = (freq, start, dur, type, peak) => {
        const osc = ctx.createOscillator()
        const gain = ctx.createGain()
        osc.type = type || 'sine'
        osc.frequency.setValueAtTime(freq, ctx.currentTime + start)
        gain.gain.setValueAtTime(0.0001, ctx.currentTime + start)
        gain.gain.exponentialRampToValueAtTime(peak, ctx.currentTime + start + 0.02)
        gain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + start + dur)
        osc.connect(gain)
        gain.connect(ctx.destination)
        osc.start(ctx.currentTime + start)
        osc.stop(ctx.currentTime + start + dur + 0.05)
      }
      if (soundId === 'waterdrop') {
        tone(900, 0, 0.12, 'sine', 0.16)
        tone(500, 0.1, 0.16, 'sine', 0.1)
      } else if (soundId === 'ocean') {
        tone(220, 0, 0.5, 'sine', 0.05)
        tone(320, 0.12, 0.55, 'sine', 0.04)
        tone(180, 0.24, 0.6, 'sine', 0.04)
      } else if (soundId === 'bell') {
        tone(660, 0, 0.5, 'sine', 0.14)
        tone(990, 0, 0.4, 'sine', 0.05)
      }
    } catch (_) {}
  }

  // ----------------------------------------------------------- chroma video
  function genderFrom(payload) {
    if (payload.gender === 'male') return 'male'
    if (payload.gender === 'female') return 'female'
    return payload.avatarId === 'boy' ? 'male' : 'female'
  }

  function createChromaLayer(gender) {
    const file = VIDEO_BY_GENDER[gender] || VIDEO_BY_GENDER.female
    const url = chrome.runtime.getURL('assets/' + file)
    const key = KEY_BY_GENDER[gender] || KEY_BY_GENDER.female

    const video = document.createElement('video')
    video.muted = true
    video.loop = true
    video.playsInline = true
    video.preload = 'auto'
    // Load the MP4 as a blob URL. Requesting the bytes from the background
    // service worker (GET_VIDEO) bypasses the host page's CSP, which otherwise
    // blocks chrome-extension:// fetches/loads on sites like YouTube, ChatGPT
    // and Gmail. That blocking was why the animation stayed invisible there
    // while the voice still played. The resulting blob is origin-clean, so the
    // WebGL chroma-key works on every site.
    chrome.runtime.sendMessage({ type: 'GET_VIDEO', file })
      .then((msg) => {
        if (!msg || !msg.ok || !msg.data) throw new Error((msg && msg.error) || 'no video bytes')
        return new Blob([msg.data], { type: 'video/mp4' })
      })
      .then((blob) => {
        dbg('fetch success', file, blob.size, 'bytes')
        video.src = URL.createObjectURL(blob)
      })
      .catch((err) => {
        console.error('[H2Ohhh ' + location.hostname + '] fetch failed', file, err)
        video.src = url
      })

    const canvas = document.createElement('canvas')
    canvas.className = 'h2o-float'
    const gl = canvas.getContext('webgl', { alpha: true, premultipliedAlpha: true })

    const rawFallback = () => {
      video.className = 'h2o-float'
      canvas.className = ''
      if (canvas.parentNode) canvas.parentNode.replaceChild(video, canvas)
    }

    if (!gl) {
      // Fallback: show the raw video if WebGL is unavailable.
      rawFallback()
      return { video, canvas, fallback: true }
    }

    const vs = `attribute vec2 a_pos; varying vec2 v_uv; void main(){ v_uv = a_pos*0.5+0.5; gl_Position = vec4(a_pos,0.0,1.0); }`
    const fs = `precision mediump float; uniform sampler2D u_tex; uniform vec3 u_key; uniform float u_tol; uniform float u_sat; varying vec2 v_uv;
      void main(){ vec4 c = texture2D(u_tex, vec2(v_uv.x, 1.0 - v_uv.y));
        float mx = max(c.r, max(c.g, c.b)); float mn = min(c.r, min(c.g, c.b)); float sat = mx - mn;
        float d = distance(c.rgb, u_key);
        float aD = smoothstep(u_tol * 0.55, u_tol, d);
        float aS = smoothstep(u_sat * 0.55, u_sat, sat);
        float a = max(aD, aS);
        gl_FragColor = vec4(c.rgb * a, a); }`

    function compile(type, src) {
      const sh = gl.createShader(type)
      gl.shaderSource(sh, src)
      gl.compileShader(sh)
      return sh
    }
    const prog = gl.createProgram()
    gl.attachShader(prog, compile(gl.VERTEX_SHADER, vs))
    gl.attachShader(prog, compile(gl.FRAGMENT_SHADER, fs))
    gl.linkProgram(prog)
    gl.useProgram(prog)

    const buf = gl.createBuffer()
    gl.bindBuffer(gl.ARRAY_BUFFER, buf)
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 1, -1, -1, 1, 1, 1]), gl.STATIC_DRAW)
    const loc = gl.getAttribLocation(prog, 'a_pos')
    gl.enableVertexAttribArray(loc)
    gl.vertexAttribPointer(loc, 2, gl.FLOAT, false, 0, 0)

    const tex = gl.createTexture()
    gl.bindTexture(gl.TEXTURE_2D, tex)
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE)
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE)
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR)
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR)
    gl.uniform1i(gl.getUniformLocation(prog, 'u_tex'), 0)
    gl.uniform1f(gl.getUniformLocation(prog, 'u_tol'), KEY_TOLERANCE)
    gl.uniform1f(gl.getUniformLocation(prog, 'u_sat'), SAT_TOLERANCE)
    gl.uniform3f(gl.getUniformLocation(prog, 'u_key'), key[0], key[1], key[2])

    let raf = 0
    let texFailed = false
    const render = () => {
      if (texFailed) return
      if (!video.videoWidth) {
        raf = requestAnimationFrame(render)
        return
      }
      canvas.width = video.videoWidth
      canvas.height = video.videoHeight
      gl.viewport(0, 0, canvas.width, canvas.height)
      gl.bindTexture(gl.TEXTURE_2D, tex)
      try {
        gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, video)
      } catch (err) {
        console.error('[H2Ohhh ' + location.hostname + '] texImage2D exception', err)
        texFailed = true
        cancelAnimationFrame(raf)
        rawFallback()
        video.play().catch(() => {})
        return
      }
      gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4)
      raf = requestAnimationFrame(render)
    }
    video.addEventListener('loadeddata', () => {
      dbg('loadeddata', video.videoWidth + 'x' + video.videoHeight)
      canvas.width = video.videoWidth
      canvas.height = video.videoHeight
      video.play().catch(() => {})
    })
    video.addEventListener('play', () => {
      if (!raf) raf = requestAnimationFrame(render)
    })

    // Watchdog: if the video cannot decode within a few seconds, fall back to
    // showing the raw (still transparent-ish) video so the overlay is never
    // invisible. This covers fetch failures and codec hiccups.
    const watchdog = window.setTimeout(() => {
      if (video.videoWidth > 0) return
      cancelAnimationFrame(raf)
      raf = 0
      texFailed = true
      rawFallback()
      video.play().catch(() => {})
    }, 6000)

    return {
      video,
      canvas,
      fallback: false,
      stop: () => {
        cancelAnimationFrame(raf)
        clearTimeout(watchdog)
      }
    }
  }

  // ------------------------------------------------------------------ overlay
  function showReminder(payload) {
    if (activeHost) hideOverlay(true)
    injectStyles()

    const gender = genderFrom(payload)
    dbg('creating overlay', 'gender=' + gender, 'payload=', payload)
    if (activeHost && activeHost.__layer) activeHost.__layer.stop()
    const layer = createChromaLayer(gender)

    const host = document.createElement('div')
    host.id = OVERLAY_ID
    host.className = 'h2o-in'
    if (layer.fallback) host.appendChild(layer.video)
    else host.appendChild(layer.canvas)

    // Remove any stale copy of the overlay before appending.
    document.getElementById(OVERLAY_ID)?.remove()
    ;(document.documentElement || document.body).appendChild(host)
    activeHost = host
    host.__layer = layer
    dbg('overlay appended')

    layer.video.play().then(() => {
      dbg('video.play success')
    }).catch((err) => {
      console.error('[H2Ohhh ' + location.hostname + '] video.play failed', err)
    })

    if (payload.voiceEnabled !== false && payload.name) {
      speakReminder(payload.name, gender, payload.voice)
    }
    playReminderSound(payload.sound)

    window.setTimeout(() => {
      hideOverlay(false)
    }, DISPLAY_MS)
  }

  function hideOverlay(immediate) {
    const host = activeHost
    if (!host) return
    activeHost = null
    if (host.__layer) host.__layer.stop()
    stopVoice()
    if (immediate) {
      host.remove()
      return
    }
    host.classList.remove('h2o-in')
    host.classList.add('h2o-out')
    window.setTimeout(() => {
      if (host && host.isConnected) host.remove()
    }, 500)
  }

  chrome.runtime.onMessage.addListener((message) => {
    if (!message) return
    if (message.type === 'SHOW_REMINDER') {
      dbg('SHOW_REMINDER received', message.payload)
      showReminder(message.payload || {})
    } else if (message.type === 'HIDE_REMINDER') hideOverlay(false)
  })
})()