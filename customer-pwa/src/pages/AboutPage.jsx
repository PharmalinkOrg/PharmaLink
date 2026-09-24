import { useNavigate } from 'react-router-dom'
import {
  ArrowLeft,
  Bot,
  Building2,
  ChevronRight,
  HeartPulse,
  PackageSearch,
  Search,
  ShieldCheck,
} from 'lucide-react'

function AboutPage() {
  const navigate = useNavigate()

  const features = [
    {
      icon: Search,
      title: 'Medicine Search',
      description:
        'Search for medicines and check availability from participating pharmacies.',
    },
    {
      icon: PackageSearch,
      title: 'Pickup Reservations',
      description:
        'Reserve available medicines and arrange pickup from the selected pharmacy.',
    },
    {
      icon: Building2,
      title: 'Pharmacy Connection',
      description:
        'Connect customers with participating pharmacies through one platform.',
    },
    {
      icon: Bot,
      title: 'PharmaLink AI',
      description:
        'Get assistance navigating PharmaLink and understanding how to use platform features.',
    },
  ]

  return (
    <section className="min-h-screen bg-gray-50 pb-24 px-4 pt-6">
      <div className="max-w-lg mx-auto">

        {/* Header */}
        <header className="flex items-center gap-3 mb-6">
          <button
            type="button"
            onClick={() => navigate(-1)}
            className="w-10 h-10 rounded-xl bg-white border border-gray-200 flex items-center justify-center text-gray-700 hover:bg-gray-50"
            aria-label="Go back"
          >
            <ArrowLeft size={19} />
          </button>

          <div>
            <h1 className="text-2xl font-bold text-gray-900">
              About PharmaLink
            </h1>

            <p className="text-sm text-gray-500 mt-1">
              Medicine access made easier.
            </p>
          </div>
        </header>

        {/* Brand Card */}
        <div className="bg-[#0B2B2B] rounded-2xl p-6 text-white shadow-sm mb-4">
          <div className="w-12 h-12 bg-white/10 rounded-2xl flex items-center justify-center mb-4">
            <HeartPulse size={25} />
          </div>

          <h2 className="text-xl font-bold">
            PharmaLink
          </h2>

          <p className="text-sm text-white/75 mt-2 leading-relaxed">
            PharmaLink is a pharmacy connection platform designed to make
            it easier for customers to find medicines while helping
            participating pharmacies respond to customer demand.
          </p>
        </div>

        {/* What you can do */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 mb-4">
          <h2 className="text-base font-bold text-gray-900">
            What You Can Do
          </h2>

          <p className="text-xs text-gray-500 mt-1 mb-5">
            Customer features available through PharmaLink.
          </p>

          <div className="flex flex-col gap-5">
            {features.map((feature) => {
              const Icon = feature.icon

              return (
                <div
                  key={feature.title}
                  className="flex items-start gap-3"
                >
                  <div className="w-10 h-10 rounded-xl bg-teal-50 text-teal-700 flex items-center justify-center flex-shrink-0">
                    <Icon size={18} />
                  </div>

                  <div>
                    <h3 className="text-sm font-bold text-gray-900">
                      {feature.title}
                    </h3>

                    <p className="text-xs text-gray-500 mt-1 leading-relaxed">
                      {feature.description}
                    </p>
                  </div>
                </div>
              )
            })}
          </div>
        </div>

        {/* Platform information */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 mb-4">
          <div className="flex items-center gap-3 mb-3">
            <ShieldCheck size={19} className="text-teal-700" />

            <h2 className="text-base font-bold text-gray-900">
              Platform Information
            </h2>
          </div>

          <p className="text-sm text-gray-600 leading-relaxed">
            PharmaLink connects customers and participating pharmacies for
            medicine discovery, requests, prescription-related workflows,
            and pickup reservations.
          </p>

          <div className="mt-4 p-3 rounded-xl bg-amber-50 border border-amber-100">
            <p className="text-xs text-amber-800 leading-relaxed">
              PharmaLink does not replace professional medical advice.
              Questions about medicines, prescriptions, treatment, or health
              decisions should be discussed with an appropriate healthcare
              professional.
            </p>
          </div>
        </div>

        {/* Useful links */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden mb-4">
          <button
            type="button"
            onClick={() => navigate('/privacy')}
            className="w-full p-4 flex items-center justify-between text-left border-b border-gray-100 hover:bg-gray-50"
          >
            <div>
              <p className="text-sm font-semibold text-gray-900">
                Privacy & Data
              </p>

              <p className="text-xs text-gray-500 mt-0.5">
                Learn about information used by PharmaLink.
              </p>
            </div>

            <ChevronRight size={17} className="text-gray-400" />
          </button>

          <button
            type="button"
            onClick={() => navigate('/support')}
            className="w-full p-4 flex items-center justify-between text-left hover:bg-gray-50"
          >
            <div>
              <p className="text-sm font-semibold text-gray-900">
                Help & Support
              </p>

              <p className="text-xs text-gray-500 mt-0.5">
                Find answers and get help using the platform.
              </p>
            </div>

            <ChevronRight size={17} className="text-gray-400" />
          </button>
        </div>

        {/* Version */}
        <div className="text-center py-4">
          <p className="text-sm font-semibold text-gray-700">
            PharmaLink
          </p>

          <p className="text-xs text-gray-400 mt-1">
            Medicine Access Platform
          </p>
        </div>

      </div>
    </section>
  )
}

export default AboutPage