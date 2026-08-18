import { useEffect, useMemo, useState } from 'react'
import { QRCodeSVG } from 'qrcode.react'

function DownloadLandingPage() {
  const [deferredPrompt, setDeferredPrompt] = useState(null)
  const [isInstalled, setIsInstalled] = useState(() => {
    return window.matchMedia('(display-mode: standalone)').matches
  })

  const downloadUrl = useMemo(() => {
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

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt)
    window.addEventListener('appinstalled', handleAppInstalled)

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt)
      window.removeEventListener('appinstalled', handleAppInstalled)
    }
  }, [])

  const installApp = async () => {
    if (!deferredPrompt) return

    deferredPrompt.prompt()
    await deferredPrompt.userChoice
    setDeferredPrompt(null)
  }

  return (
    <div className="download-page">
      <div className="download-content">
        <p className="download-brand">PharmaLink</p>

        <section className="download-hero">
          <div>
            <p className="eyebrow">Medicine access, made simpler</p>
            <h1 className="download-heading">Install PharmaLink on your phone.</h1>
            <p className="download-copy">
              Find nearby medicines and manage pickup reservations directly from your home screen.
              No app store account is needed.
            </p>
            {isInstalled ? (
              <p className="install-note">PharmaLink is already installed on this device.</p>
            ) : (
              <button className="install-button" type="button" onClick={installApp} disabled={!deferredPrompt}>
                {deferredPrompt ? 'Install PharmaLink' : 'Use browser install option'}
              </button>
            )}
          </div>

          <div className="qr-card">
            <QRCodeSVG value={downloadUrl} level="M" includeMargin />
            <strong>Scan to open on your phone</strong>
            <p>The code always opens this download page.</p>
          </div>
        </section>

        <section className="install-help" aria-labelledby="install-help-heading">
          <h2 id="install-help-heading">How to install</h2>
          <ol>
            <li>Open this page on your phone or scan the QR code.</li>
            <li>In Chrome or Edge, select the browser menu and choose “Install app”.</li>
            <li>In Safari on iPhone, tap Share, then choose “Add to Home Screen”.</li>
          </ol>
          <p className="install-note">
            The install button appears automatically on supported browsers after the site is deployed using HTTPS.
          </p>
        </section>
      </div>
    </div>
  )
}

export default DownloadLandingPage
