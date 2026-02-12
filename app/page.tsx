//app/page.tsx - Landing Page for LogginCare
'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useAuth } from '@/contexts/AuthContext';

export default function LandingPage() {
  const { user, loading } = useAuth();
  const [email, setEmail] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setIsSubmitting(true);
    
    // For now, just redirect to register
    // Later: save email to waitlist
    setTimeout(() => {
      window.location.href = '/register';
    }, 500);
  }

  // Show loading state briefly
  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-amber-50 via-orange-50 to-rose-50 flex items-center justify-center">
        <div className="text-center">
          <span className="text-4xl">📋</span>
          <p className="mt-4 text-amber-600">Loading...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-amber-50 via-orange-50 to-rose-50">
      {/* Navigation */}
      <nav className="fixed top-0 left-0 right-0 z-50 bg-white/80 backdrop-blur-md border-b border-amber-100">
        <div className="max-w-6xl mx-auto px-6 py-4 flex justify-between items-center">
          <div className="flex items-center gap-2">
            <span className="text-3xl">📋</span>
            <span className="text-2xl font-bold text-amber-900" style={{ fontFamily: 'Georgia, serif' }}>
              LogginCare
            </span>
          </div>
          <div className="flex items-center gap-6">
            <a href="#features" className="text-amber-800 hover:text-amber-600 transition hidden sm:block">
              Features
            </a>
            <a href="#pricing" className="text-amber-800 hover:text-amber-600 transition hidden sm:block">
              Pricing
            </a>
            {user ? (
              <Link
                href="/dashboard"
                className="bg-amber-500 hover:bg-amber-600 text-white px-5 py-2 rounded-full font-medium transition shadow-lg shadow-amber-200"
              >
                Go to Dashboard →
              </Link>
            ) : (
              <>
                <Link 
                  href="/login"
                  className="text-amber-800 hover:text-amber-600 transition"
                >
                  Log In
                </Link>
                <Link
                  href="/register"
                  className="bg-amber-500 hover:bg-amber-600 text-white px-5 py-2 rounded-full font-medium transition shadow-lg shadow-amber-200"
                >
                  Start Free Trial
                </Link>
              </>
            )}
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="pt-32 pb-20 px-6">
        <div className="max-w-6xl mx-auto">
          <div className="grid lg:grid-cols-2 gap-12 items-center">
            <div>
              <div className="inline-flex items-center gap-2 bg-amber-100 text-amber-800 px-4 py-2 rounded-full text-sm font-medium mb-6">
                <span>🎉</span>
                <span>California Title 22 Compliant</span>
              </div>
              
              <h1 className="text-5xl lg:text-6xl font-bold text-amber-950 leading-tight mb-6" style={{ fontFamily: 'Georgia, serif' }}>
                Care logging made 
                <span className="relative">
                  <span className="relative z-10 text-amber-600"> simple</span>
                  <svg className="absolute -bottom-2 left-0 w-full" viewBox="0 0 200 12" fill="none">
                    <path d="M2 8C50 2 150 2 198 8" stroke="#fbbf24" strokeWidth="4" strokeLinecap="round"/>
                  </svg>
                </span>
              </h1>
              
              <p className="text-xl text-amber-800 mb-8 leading-relaxed">
                Track sleep, meals, diapers, and activities with just your voice. 
                Spend less time on paperwork and more time with the little ones. 💛
              </p>

              <form onSubmit={handleSubmit} className="flex flex-col sm:flex-row gap-3 mb-6">
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="Enter your email"
                  className="flex-1 px-5 py-4 rounded-full border-2 border-amber-200 focus:border-amber-400 focus:outline-none text-amber-900 placeholder-amber-400"
                  required
                />
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="bg-amber-500 hover:bg-amber-600 text-white px-8 py-4 rounded-full font-semibold transition shadow-lg shadow-amber-200 hover:shadow-xl hover:shadow-amber-300 disabled:opacity-50"
                >
                  {isSubmitting ? 'Starting...' : 'Start 14-Day Free Trial →'}
                </button>
              </form>

              <p className="text-amber-600 text-sm">
                ✓ No credit card required &nbsp;•&nbsp; ✓ Set up in 5 minutes &nbsp;•&nbsp; ✓ Cancel anytime
              </p>
            </div>

            {/* Hero Image/Illustration */}
            <div className="relative">
              <div className="bg-white rounded-3xl shadow-2xl shadow-amber-200 p-6 transform rotate-2 hover:rotate-0 transition-transform duration-500">
                <div className="bg-gradient-to-br from-amber-100 to-orange-100 rounded-2xl p-6">
                  {/* Mock App Screen */}
                  <div className="bg-white rounded-xl shadow-lg p-4 mb-4">
                    <div className="flex items-center gap-3 mb-4">
                      <div className="w-12 h-12 bg-amber-200 rounded-full flex items-center justify-center text-2xl">👶</div>
                      <div>
                        <div className="font-semibold text-amber-900">Emma</div>
                        <div className="text-sm text-amber-600">Napping • 45 min</div>
                      </div>
                      <div className="ml-auto bg-green-100 text-green-700 px-3 py-1 rounded-full text-sm font-medium">
                        😴 Sleeping
                      </div>
                    </div>
                    <div className="grid grid-cols-3 gap-2 text-center">
                      <div className="bg-blue-50 rounded-lg p-2">
                        <div className="text-lg">😴</div>
                        <div className="text-xs text-gray-600">1h 30m sleep</div>
                      </div>
                      <div className="bg-green-50 rounded-lg p-2">
                        <div className="text-lg">🍼</div>
                        <div className="text-xs text-gray-600">2 bottles</div>
                      </div>
                      <div className="bg-purple-50 rounded-lg p-2">
                        <div className="text-lg">🧷</div>
                        <div className="text-xs text-gray-600">3 diapers</div>
                      </div>
                    </div>
                  </div>
                  
                  {/* AI Assistant Mock */}
                  <div className="bg-gradient-to-r from-purple-500 to-blue-500 rounded-xl p-4 text-white">
                    <div className="flex items-center gap-2 mb-2">
                      <span className="text-xl">🤖</span>
                      <span className="font-medium">AI Assistant</span>
                    </div>
                    <div className="bg-white/20 rounded-lg p-3 text-sm">
                      "Emma woke up happy" → ✅ Logged!
                    </div>
                  </div>
                </div>
              </div>
              
              {/* Floating Elements */}
              <div className="absolute -top-4 -right-4 bg-green-400 text-white px-4 py-2 rounded-full text-sm font-medium shadow-lg animate-bounce">
                Voice-powered! 🎤
              </div>
              <div className="absolute -bottom-4 -left-4 bg-white px-4 py-3 rounded-2xl shadow-xl">
                <div className="flex items-center gap-2">
                  <span className="text-2xl">⭐</span>
                  <div>
                    <div className="font-semibold text-amber-900">4.9/5</div>
                    <div className="text-xs text-amber-600">from 200+ daycares</div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Social Proof */}
      <section className="py-12 bg-white/50">
        <div className="max-w-6xl mx-auto px-6">
          <p className="text-center text-amber-700 mb-8">Trusted by childcare providers across California</p>
          <div className="flex flex-wrap justify-center items-center gap-8 opacity-60">
            <div className="text-2xl font-bold text-amber-800">🏠 Sunshine Daycare</div>
            <div className="text-2xl font-bold text-amber-800">🌈 Rainbow Kids</div>
            <div className="text-2xl font-bold text-amber-800">🌟 Little Stars FCCH</div>
            <div className="text-2xl font-bold text-amber-800">🐻 Teddy Bear Care</div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section id="features" className="py-20 px-6">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-bold text-amber-950 mb-4" style={{ fontFamily: 'Georgia, serif' }}>
              Everything you need, nothing you don't
            </h2>
            <p className="text-xl text-amber-700 max-w-2xl mx-auto">
              Built by caregivers, for caregivers. We know your days are busy.
            </p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
            {/* Feature 1 */}
            <div className="bg-white rounded-3xl p-8 shadow-xl shadow-amber-100 hover:shadow-2xl hover:shadow-amber-200 transition-shadow">
              <div className="w-16 h-16 bg-blue-100 rounded-2xl flex items-center justify-center text-3xl mb-6">
                😴
              </div>
              <h3 className="text-xl font-bold text-amber-900 mb-3">Sleep Tracking</h3>
              <p className="text-amber-700">
                One-tap sleep logging with automatic timers. Track position, breathing, and mood for full compliance.
              </p>
            </div>

            {/* Feature 2 */}
            <div className="bg-white rounded-3xl p-8 shadow-xl shadow-amber-100 hover:shadow-2xl hover:shadow-amber-200 transition-shadow">
              <div className="w-16 h-16 bg-green-100 rounded-2xl flex items-center justify-center text-3xl mb-6">
                🤖
              </div>
              <h3 className="text-xl font-bold text-amber-900 mb-3">AI Voice Assistant</h3>
              <p className="text-amber-700">
                Just say "Emma had a wet diaper" and it's logged. Hands-free entry while you care for children.
              </p>
            </div>

            {/* Feature 3 */}
            <div className="bg-white rounded-3xl p-8 shadow-xl shadow-amber-100 hover:shadow-2xl hover:shadow-amber-200 transition-shadow">
              <div className="w-16 h-16 bg-purple-100 rounded-2xl flex items-center justify-center text-3xl mb-6">
                📧
              </div>
              <h3 className="text-xl font-bold text-amber-900 mb-3">Parent Reports</h3>
              <p className="text-amber-700">
                Send beautiful daily reports to parents with one tap. They'll love knowing how their child's day went.
              </p>
            </div>

            {/* Feature 4 */}
            <div className="bg-white rounded-3xl p-8 shadow-xl shadow-amber-100 hover:shadow-2xl hover:shadow-amber-200 transition-shadow">
              <div className="w-16 h-16 bg-orange-100 rounded-2xl flex items-center justify-center text-3xl mb-6">
                ✍️
              </div>
              <h3 className="text-xl font-bold text-amber-900 mb-3">Digital Sign-In/Out</h3>
              <p className="text-amber-700">
                Parents sign on the screen with their finger. Electronic signatures stored securely for compliance.
              </p>
            </div>

            {/* Feature 5 */}
            <div className="bg-white rounded-3xl p-8 shadow-xl shadow-amber-100 hover:shadow-2xl hover:shadow-amber-200 transition-shadow">
              <div className="w-16 h-16 bg-rose-100 rounded-2xl flex items-center justify-center text-3xl mb-6">
                🍼
              </div>
              <h3 className="text-xl font-bold text-amber-900 mb-3">Care Logs</h3>
              <p className="text-amber-700">
                Diapers, bottles, meals, and activities. Everything tracked with timestamps and staff initials.
              </p>
            </div>

            {/* Feature 6 */}
            <div className="bg-white rounded-3xl p-8 shadow-xl shadow-amber-100 hover:shadow-2xl hover:shadow-amber-200 transition-shadow">
              <div className="w-16 h-16 bg-amber-100 rounded-2xl flex items-center justify-center text-3xl mb-6">
                📱
              </div>
              <h3 className="text-xl font-bold text-amber-900 mb-3">Works Everywhere</h3>
              <p className="text-amber-700">
                Phone, tablet, or computer. No app to download. Just open your browser and go.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Testimonial */}
      <section className="py-20 px-6 bg-amber-500">
        <div className="max-w-4xl mx-auto text-center">
          <div className="text-6xl mb-6">💬</div>
          <blockquote className="text-2xl lg:text-3xl text-white font-medium mb-8 leading-relaxed" style={{ fontFamily: 'Georgia, serif' }}>
            "I used to spend 30 minutes every evening doing paperwork. Now I just talk to LogginCare during the day and everything is documented. The parents love the reports!"
          </blockquote>
          <div className="flex items-center justify-center gap-4">
            <div className="w-16 h-16 bg-amber-400 rounded-full flex items-center justify-center text-2xl">
              👩
            </div>
            <div className="text-left">
              <div className="text-white font-semibold">Maria S.</div>
              <div className="text-amber-200">Family Child Care Home, Los Angeles</div>
            </div>
          </div>
        </div>
      </section>

      {/* Pricing Section */}
      <section id="pricing" className="py-20 px-6 bg-white">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-bold text-amber-950 mb-4" style={{ fontFamily: 'Georgia, serif' }}>
              Simple, honest pricing
            </h2>
            <p className="text-xl text-amber-700">
              Start free for 14 days. No credit card required.
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-8 max-w-5xl mx-auto">
            {/* Starter Plan */}
            <div className="bg-amber-50 rounded-3xl p-8 border-2 border-amber-100">
              <div className="text-amber-600 font-medium mb-2">Home</div>
              <div className="text-4xl font-bold text-amber-900 mb-2">$29<span className="text-lg font-normal text-amber-600">/mo</span></div>
              <p className="text-amber-700 mb-6">Perfect for small family child care homes</p>
              <ul className="space-y-3 mb-8">
                <li className="flex items-center gap-2 text-amber-800">
                  <span className="text-green-500">✓</span> Up to 8 children
                </li>
                <li className="flex items-center gap-2 text-amber-800">
                  <span className="text-green-500">✓</span> 2 staff accounts
                </li>
                <li className="flex items-center gap-2 text-amber-800">
                  <span className="text-green-500">✓</span> All logging features
                </li>
                <li className="flex items-center gap-2 text-amber-800">
                  <span className="text-green-500">✓</span> Parent reports
                </li>
                <li className="flex items-center gap-2 text-amber-800">
                  <span className="text-green-500">✓</span> Email support
                </li>
              </ul>
              <Link href="/register" className="block text-center bg-amber-200 hover:bg-amber-300 text-amber-800 py-3 rounded-full font-medium transition">
                Start Free Trial
              </Link>
            </div>

            {/* Pro Plan */}
            <div className="bg-gradient-to-b from-amber-500 to-orange-500 rounded-3xl p-8 text-white shadow-xl shadow-amber-200 transform scale-105">
              <div className="bg-white/20 text-white text-xs font-bold px-3 py-1 rounded-full inline-block mb-4">
                MOST POPULAR
              </div>
              <div className="text-amber-100 font-medium mb-2">Home Plus</div>
              <div className="text-4xl font-bold mb-2">$49<span className="text-lg font-normal text-amber-200">/mo</span></div>
              <p className="text-amber-100 mb-6">For large family child care homes</p>
              <ul className="space-y-3 mb-8">
                <li className="flex items-center gap-2">
                  <span>✓</span> Up to 14 children
                </li>
                <li className="flex items-center gap-2">
                  <span>✓</span> 5 staff accounts
                </li>
                <li className="flex items-center gap-2">
                  <span>✓</span> AI Voice Assistant
                </li>
                <li className="flex items-center gap-2">
                  <span>✓</span> Digital sign-in/out
                </li>
                <li className="flex items-center gap-2">
                  <span>✓</span> Priority support
                </li>
              </ul>
              <Link href="/register" className="block text-center bg-white hover:bg-amber-50 text-amber-600 py-3 rounded-full font-semibold transition">
                Start Free Trial
              </Link>
            </div>

            {/* Center Plan */}
            <div className="bg-amber-50 rounded-3xl p-8 border-2 border-amber-100">
              <div className="text-amber-600 font-medium mb-2">Center</div>
              <div className="text-4xl font-bold text-amber-900 mb-2">$99<span className="text-lg font-normal text-amber-600">/mo</span></div>
              <p className="text-amber-700 mb-6">For licensed child care centers</p>
              <ul className="space-y-3 mb-8">
                <li className="flex items-center gap-2 text-amber-800">
                  <span className="text-green-500">✓</span> Up to 50 children
                </li>
                <li className="flex items-center gap-2 text-amber-800">
                  <span className="text-green-500">✓</span> Unlimited staff
                </li>
                <li className="flex items-center gap-2 text-amber-800">
                  <span className="text-green-500">✓</span> Everything in Home Plus
                </li>
                <li className="flex items-center gap-2 text-amber-800">
                  <span className="text-green-500">✓</span> Custom reports
                </li>
                <li className="flex items-center gap-2 text-amber-800">
                  <span className="text-green-500">✓</span> Phone support
                </li>
              </ul>
              <Link href="/register" className="block text-center bg-amber-200 hover:bg-amber-300 text-amber-800 py-3 rounded-full font-medium transition">
                Start Free Trial
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* FAQ Section */}
      <section className="py-20 px-6 bg-amber-50">
        <div className="max-w-3xl mx-auto">
          <h2 className="text-4xl font-bold text-amber-950 mb-12 text-center" style={{ fontFamily: 'Georgia, serif' }}>
            Common questions
          </h2>
          
          <div className="space-y-6">
            <details className="bg-white rounded-2xl p-6 shadow-sm">
              <summary className="font-semibold text-amber-900 cursor-pointer">
                Is LogginCare compliant with California licensing requirements?
              </summary>
              <p className="mt-4 text-amber-700">
                Yes! LogginCare is designed specifically to meet California Title 22 requirements for sleep monitoring (Section 101229), electronic sign-in/out records with digital signatures (Section 101229.1), and record keeping.
              </p>
            </details>
            
            <details className="bg-white rounded-2xl p-6 shadow-sm">
              <summary className="font-semibold text-amber-900 cursor-pointer">
                Do I need to download an app?
              </summary>
              <p className="mt-4 text-amber-700">
                Nope! LogginCare works in any web browser. Just go to loggincare.com on your phone, tablet, or computer. You can add it to your home screen for quick access.
              </p>
            </details>
            
            <details className="bg-white rounded-2xl p-6 shadow-sm">
              <summary className="font-semibold text-amber-900 cursor-pointer">
                How does the AI voice assistant work?
              </summary>
              <p className="mt-4 text-amber-700">
                Just tap the microphone and speak naturally. Say things like "Emma had a wet diaper" or "Lucas finished his bottle, 6 ounces" and LogginCare will understand and log it for you. On iPhones, you can use the keyboard dictation feature.
              </p>
            </details>
            
            <details className="bg-white rounded-2xl p-6 shadow-sm">
              <summary className="font-semibold text-amber-900 cursor-pointer">
                Can parents see the logs?
              </summary>
              <p className="mt-4 text-amber-700">
                You control what parents see. With one tap, you can email them a beautiful daily report showing sleep times, meals, diapers, and activities. They'll love it!
              </p>
            </details>
            
            <details className="bg-white rounded-2xl p-6 shadow-sm">
              <summary className="font-semibold text-amber-900 cursor-pointer">
                What happens after the free trial?
              </summary>
              <p className="mt-4 text-amber-700">
                After 14 days, you can choose a plan that fits your needs. All your data stays safe. If you decide not to continue, you can export everything. No hard feelings! 💛
              </p>
            </details>
          </div>
        </div>
      </section>

      {/* Final CTA */}
      <section className="py-20 px-6 bg-gradient-to-r from-amber-500 to-orange-500">
        <div className="max-w-4xl mx-auto text-center">
          <h2 className="text-4xl lg:text-5xl font-bold text-white mb-6" style={{ fontFamily: 'Georgia, serif' }}>
            Ready to simplify your day?
          </h2>
          <p className="text-xl text-amber-100 mb-8">
            Join hundreds of childcare providers who've reclaimed their time.
          </p>
          <Link
            href="/register"
            className="inline-block bg-white hover:bg-amber-50 text-amber-600 px-10 py-4 rounded-full font-semibold text-lg transition shadow-xl hover:shadow-2xl"
          >
            Start Your 14-Day Free Trial →
          </Link>
          <p className="text-amber-200 mt-4 text-sm">
            No credit card required • Set up in 5 minutes
          </p>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-amber-950 text-amber-200 py-12 px-6">
        <div className="max-w-6xl mx-auto">
          <div className="grid md:grid-cols-4 gap-8 mb-8">
            <div>
              <div className="flex items-center gap-2 mb-4">
                <span className="text-2xl">📋</span>
                <span className="text-xl font-bold text-white" style={{ fontFamily: 'Georgia, serif' }}>LogginCare</span>
              </div>
              <p className="text-amber-400 text-sm">
                Care logging made simple. Built with 💛 in California.
              </p>
            </div>
            <div>
              <h4 className="font-semibold text-white mb-4">Product</h4>
              <ul className="space-y-2 text-sm">
                <li><a href="#features" className="hover:text-white transition">Features</a></li>
                <li><a href="#pricing" className="hover:text-white transition">Pricing</a></li>
                <li><Link href="/login" className="hover:text-white transition">Log In</Link></li>
              </ul>
            </div>
            <div>
              <h4 className="font-semibold text-white mb-4">Support</h4>
              <ul className="space-y-2 text-sm">
                <li><a href="#" className="hover:text-white transition">Help Center</a></li>
                <li><a href="#" className="hover:text-white transition">Contact Us</a></li>
                <li><a href="#" className="hover:text-white transition">System Status</a></li>
              </ul>
            </div>
            <div>
              <h4 className="font-semibold text-white mb-4">Legal</h4>
              <ul className="space-y-2 text-sm">
                <li><a href="#" className="hover:text-white transition">Privacy Policy</a></li>
                <li><a href="#" className="hover:text-white transition">Terms of Service</a></li>
                <li><a href="#" className="hover:text-white transition">HIPAA Compliance</a></li>
              </ul>
            </div>
          </div>
          <div className="border-t border-amber-800 pt-8 text-center text-sm text-amber-400">
            © 2026 LogginCare. All rights reserved.
          </div>
        </div>
      </footer>
    </div>
  );
}
