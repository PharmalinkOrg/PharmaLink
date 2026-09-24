import { ArrowLeft, Database, FileText, LockKeyhole, ShieldCheck } from 'lucide-react'
import { useNavigate } from 'react-router-dom'

function PrivacyPage() {
  const navigate = useNavigate()

  return (
    <section className="min-h-screen bg-gray-50 pb-24 px-4 pt-6">
      <div className="max-w-lg mx-auto">
        <header className="flex items-center gap-3 mb-6">
          <button
            type="button"
            onClick={() => navigate(-1)}
            className="w-10 h-10 rounded-xl bg-white border border-gray-200 flex items-center justify-center text-gray-700"
            aria-label="Go back"
          >
            <ArrowLeft size={19} />
          </button>

          <div>
            <h1 className="text-2xl font-bold text-gray-900">
              Privacy & Data
            </h1>
            <p className="text-sm text-gray-500 mt-1">
              Understand how your PharmaLink information is used.
            </p>
          </div>
        </header>

        <div className="flex flex-col gap-4">

          {/* Privacy overview */}
          <div className="bg-white rounded-2xl p-5 border border-gray-100 shadow-sm">
            <div className="flex items-center gap-3 mb-3">
              <div className="w-10 h-10 rounded-xl bg-teal-50 text-teal-700 flex items-center justify-center">
                <ShieldCheck size={20} />
              </div>

              <div>
                <h2 className="font-bold text-gray-900">
                  Your Privacy
                </h2>
                <p className="text-xs text-gray-500">
                  Your information supports your use of PharmaLink.
                </p>
              </div>
            </div>

            <p className="text-sm text-gray-600 leading-relaxed">
              PharmaLink uses account and platform information to provide
              customer features such as medicine searches, reservations,
              prescription-related workflows, medicine requests, and account
              management.
            </p>
          </div>

          {/* Account information */}
          <div className="bg-white rounded-2xl p-5 border border-gray-100 shadow-sm">
            <div className="flex items-center gap-3 mb-4">
              <Database size={19} className="text-teal-700" />

              <h2 className="font-bold text-gray-900">
                Account Information
              </h2>
            </div>

            <p className="text-sm text-gray-600 leading-relaxed mb-3">
              Your PharmaLink customer account may contain information such as:
            </p>

            <ul className="text-sm text-gray-600 space-y-2 list-disc pl-5">
              <li>Name and email address</li>
              <li>Phone number</li>
              <li>Profile information</li>
              <li>Reservation activity</li>
              <li>Medicine requests</li>
              <li>Prescription-related records</li>
            </ul>
          </div>

          {/* Prescriptions */}
          <div className="bg-white rounded-2xl p-5 border border-gray-100 shadow-sm">
            <div className="flex items-center gap-3 mb-4">
              <FileText size={19} className="text-teal-700" />

              <h2 className="font-bold text-gray-900">
                Prescription Information
              </h2>
            </div>

            <p className="text-sm text-gray-600 leading-relaxed">
              Prescription uploads are used for PharmaLink's
              prescription-related pharmacy workflow. Customers should only
              upload prescription information required for the transaction
              they are performing through the platform.
            </p>
          </div>

          {/* Security */}
          <div className="bg-white rounded-2xl p-5 border border-gray-100 shadow-sm">
            <div className="flex items-center gap-3 mb-4">
              <LockKeyhole size={19} className="text-teal-700" />

              <h2 className="font-bold text-gray-900">
                Account Security
              </h2>
            </div>

            <p className="text-sm text-gray-600 leading-relaxed">
              Keep your PharmaLink password private and sign out when using a
              shared device. You can update your password from the Account &
              Security section of your profile.
            </p>
          </div>

          {/* Data management */}
          <div className="bg-white rounded-2xl p-5 border border-gray-100 shadow-sm">
            <h2 className="font-bold text-gray-900 mb-2">
              Managing Your Information
            </h2>

            <p className="text-sm text-gray-600 leading-relaxed">
              You can update supported profile information from your Profile
              page. Additional privacy and account-management options can be
              added as PharmaLink's account-management features are expanded.
            </p>
          </div>

        </div>
      </div>
    </section>
  )
}

export default PrivacyPage