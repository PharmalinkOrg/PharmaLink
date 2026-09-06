import { useEffect, useMemo, useState } from 'react'
import { QRCodeSVG } from 'qrcode.react'
import './DownloadLandingPage.css'

function DownloadLandingPage() {
  const [deferredPrompt, setDeferredPrompt] = useState(null)
  const [isInstalled, setIsInstalled] = useState(() => {
    if (typeof window === 'undefined') return false

    return (
      window.matchMedia('(display-mode: standalone)').matches ||
      window.navigator.standalone === true
    )
  })

  const downloadUrl = useMemo(() => {
    if (typeof window === 'undefined') return ''

    return new URL('/download', window.location.origin).toString()
  }, [])

  useEffect(() => {
    const handleBeforeInstallPrompt = (event) => {
      event.preventDefault()
      setDeferredPrompt(event)
    }

    const handleAppInstalled = () => {
      setDeferredPrompt(null)
      setIsInstalled(true)
    }

    window.addEventListener(
      'beforeinstallprompt',
      handleBeforeInstallPrompt
    )

    window.addEventListener('appinstalled', handleAppInstalled)

    return () => {
      window.removeEventListener(
        'beforeinstallprompt',
        handleBeforeInstallPrompt
      )

      window.removeEventListener('appinstalled', handleAppInstalled)
    }
  }, [])

  const installApp = async () => {
    if (!deferredPrompt) return

    deferredPrompt.prompt()

    await deferredPrompt.userChoice

    setDeferredPrompt(null)
  }

  const scrollToDownload = () => {
    document
      .getElementById('download')
      ?.scrollIntoView({ behavior: 'smooth' })
  }

  return (
    <div className="download-page">
      {/* Navigation */}
      <header className="site-header">
        <div className="site-header-inner">
          <a href="/" className="brand">
            <span className="brand-mark">+</span>
            <span>PharmaLink</span>
          </a>

          <nav className="site-nav">
            <a href="#features">Features</a>
            <a href="#how-it-works">How it works</a>
            <button type="button" onClick={scrollToDownload}>
              Get the app
            </button>
          </nav>
        </div>
      </header>

      <main>
        {/* Hero */}
        <section className="hero-section">
          <div className="hero-background-shape" />

          <div className="hero-content">
            <div className="hero-copy">
              <span className="eyebrow">
                YOUR MEDICINE, WITH LESS HASSLE
              </span>

              <h1>
                Find your medicine.
                <span> Reserve it.</span>
                Pick it up.
              </h1>

              <p className="hero-description">
                PharmaLink helps you find available medicines at nearby
                pharmacies and reserve them before you make the trip.
              </p>

              <div className="hero-actions">
                <button
                  className="primary-button"
                  type="button"
                  onClick={scrollToDownload}
                >
                  Get PharmaLink
                  <span>→</span>
                </button>

                <a href="#how-it-works" className="secondary-link">
                  See how it works
                </a>
              </div>

              <div className="hero-trust">
                <div className="trust-item">
                  <span className="trust-icon">✓</span>
                  <span>Free to use</span>
                </div>

                <div className="trust-item">
                  <span className="trust-icon">✓</span>
                  <span>No app store required</span>
                </div>
              </div>
            </div>

            {/* QR / phone card */}
            <div className="hero-app-card">
              <div className="phone-glow" />

              <div className="phone-card">
                <div className="phone-top">
                  <span className="phone-camera" />
                </div>

                <div className="phone-screen">
                  <div className="phone-logo">
                    <span>+</span>
                  </div>

                  <strong>PharmaLink</strong>

                  <p>
                    Medicines nearby.
                    <br />
                    Pickup made easier.
                  </p>

                  <div className="phone-search">
                    <span>⌕</span>
                    Search medicines
                  </div>

                  <div className="phone-medicine">
                    <div>
                      <strong>Paracetamol</strong>
                      <small>Available nearby</small>
                    </div>

                    <span className="available-dot" />
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Features */}
        <section id="features" className="features-section">
          <div className="section-heading">
            <span className="eyebrow">WHY PHARMALINK</span>

            <h2>
              A simpler way to find
              <span> your medicine.</span>
            </h2>

            <p>
              Spend less time visiting pharmacies looking for what you need.
              PharmaLink brings medicine availability and pickup reservations
              together in one place.
            </p>
          </div>

          <div className="feature-grid">
            <article className="feature-card">
              <div className="feature-icon">⌕</div>

              <h3>Find medicines nearby</h3>

              <p>
                Search for medicines and discover pharmacies where they are
                available.
              </p>
            </article>

            <article className="feature-card">
              <div className="feature-icon">□</div>

              <h3>Reserve before pickup</h3>

              <p>
                Reserve available medicines ahead of time so your pharmacy
                visit is more convenient.
              </p>
            </article>

            <article className="feature-card">
              <div className="feature-icon">✓</div>

              <h3>Manage your reservations</h3>

              <p>
                Keep track of your reservations and pickup information from
                your account.
              </p>
            </article>
          </div>
        </section>

        {/* How it works */}
        <section id="how-it-works" className="steps-section">
          <div className="steps-container">
            <div className="section-heading">
              <span className="eyebrow">HOW IT WORKS</span>

              <h2>
                From search to pickup
                <span> in a few steps.</span>
              </h2>
            </div>

            <div className="steps-grid">
              <div className="step">
                <div className="step-number">01</div>

                <h3>Search</h3>

                <p>
                  Search for the medicine you need using the PharmaLink app.
                </p>
              </div>

              <div className="step">
                <div className="step-number">02</div>

                <h3>Choose</h3>

                <p>
                  View pharmacies with available stock and choose where you
                  want to pick up.
                </p>
              </div>

              <div className="step">
                <div className="step-number">03</div>

                <h3>Reserve</h3>

                <p>
                  Create a pickup reservation and receive your reservation
                  details.
                </p>
              </div>

              <div className="step">
                <div className="step-number">04</div>

                <h3>Pick up</h3>

                <p>
                  Visit the pharmacy and collect your reserved medicine.
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* Download */}
        <section id="download" className="download-section">
          <div className="download-container">
            <div className="download-copy">
              <span className="eyebrow">GET PHARMALINK</span>

              <h2>
                Ready to make medicine
                <span> access easier?</span>
              </h2>

              <p>
                Open PharmaLink on your phone and add it to your home screen.
                No traditional app store account is required.
              </p>

              {isInstalled ? (
                <div className="installed-message">
                  <span>✓</span>
                  PharmaLink is already installed on this device.
                </div>
              ) : deferredPrompt ? (
                <button
                  className="primary-button"
                  type="button"
                  onClick={installApp}
                >
                  Install PharmaLink
                  <span>↓</span>
                </button>
              ) : (
                <p className="browser-install-note">
                  Open this page on a supported mobile browser and use the
                  browser menu to install PharmaLink.
                </p>
              )}
            </div>

            <div className="qr-panel">
              <div className="qr-header">
                <span className="qr-label">SCAN TO GET THE APP</span>

                <span className="qr-live">
                  <span />
                  Live
                </span>
              </div>

              <div className="qr-code-wrapper">
                {downloadUrl && (
                  <QRCodeSVG
                    value={downloadUrl}
                    size={230}
                    level="M"
                    includeMargin
                  />
                )}
              </div>

              <div className="qr-instructions">
                <strong>Scan with your phone camera</strong>

                <p>
                  The QR code opens the PharmaLink installation page directly.
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* Installation help */}
        <section className="install-help-section">
          <div className="install-help-inner">
            <div>
              <span className="eyebrow">INSTALLATION</span>

              <h2>Works like an app.</h2>

              <p>
                PharmaLink is a Progressive Web App. Install it directly from
                your browser and access it from your phone's home screen.
              </p>
            </div>

            <div className="install-list">
              <div className="install-item">
                <span>01</span>

                <div>
                  <strong>Open PharmaLink</strong>
                  <p>
                    Scan the QR code or open this page on your phone.
                  </p>
                </div>
              </div>

              <div className="install-item">
                <span>02</span>

                <div>
                  <strong>Install the app</strong>
                  <p>
                    Use the browser's install option when available.
                  </p>
                </div>
              </div>

              <div className="install-item">
                <span>03</span>

                <div>
                  <strong>Add to your home screen</strong>
                  <p>
                    Launch PharmaLink just like a regular mobile application.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </section>
      </main>

      {/* Footer */}
      <footer className="site-footer">
        <div className="footer-inner">
          <a href="/" className="brand">
            <span className="brand-mark">+</span>
            <span>PharmaLink</span>
          </a>

          <p>
            Medicine access, made simpler.
          </p>

          <span className="footer-copy">
            © {new Date().getFullYear()} PharmaLink
          </span>
        </div>
      </footer>
    </div>
  )
}

export default DownloadLandingPage
