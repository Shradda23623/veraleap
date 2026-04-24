import { motion } from "framer-motion";
import { useSEO } from "@/hooks/useSEO";

const Terms = () => {
  useSEO({ title: "Terms of Service", description: "The rules for using VeraLeap, our rental scam prevention platform." });
  const updated = "April 19, 2026";

  return (
    <div className="min-h-screen">
      <section className="bg-gradient-hero py-14 text-primary-foreground">
        <div className="container mx-auto px-4 text-center">
          <motion.h1 initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
            className="text-4xl md:text-5xl font-display font-bold mb-3">
            Terms of <span className="text-secondary">Service</span>
          </motion.h1>
          <p className="text-sm opacity-90">Last updated: {updated}</p>
        </div>
      </section>

      <div className="container mx-auto px-4 py-12 max-w-3xl">
        <div className="prose prose-sm max-w-none space-y-6 text-foreground">
          <section>
            <h2 className="text-xl font-display font-bold mb-2">1. Acceptance</h2>
            <p className="text-sm text-muted-foreground leading-relaxed">
              By creating an account or using VeraLeap you agree to these Terms of Service. If you do not agree,
              please do not use the service.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-display font-bold mb-2">2. What VeraLeap does</h2>
            <p className="text-sm text-muted-foreground leading-relaxed">
              VeraLeap helps tenants in India find, verify, and communicate about rental listings. Brokers and owners
              can publish listings; tenants can browse, save, review, and message. VeraLeap is a marketplace — we are
              not a party to rental agreements and we do not own or rent any of the listed properties.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-display font-bold mb-2">3. Account eligibility</h2>
            <p className="text-sm text-muted-foreground leading-relaxed">
              You must be at least 18 years old to use VeraLeap. You are responsible for keeping your password secure
              and for all activity that happens under your account. You agree to provide accurate information when
              registering and to keep it up to date.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-display font-bold mb-2">4. User conduct</h2>
            <p className="text-sm text-muted-foreground leading-relaxed">You agree not to:</p>
            <ul className="list-disc pl-6 text-sm text-muted-foreground space-y-1.5 leading-relaxed mt-2">
              <li>Post false, fraudulent, misleading, or duplicate listings.</li>
              <li>Impersonate another person or misrepresent your affiliation with any property or broker.</li>
              <li>Harass, threaten, or abuse other users through messages, reviews, or any other feature.</li>
              <li>Collect personal data about other users without their consent, or scrape the service.</li>
              <li>Attempt to gain unauthorised access to any part of the system.</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-display font-bold mb-2">5. Listings and content</h2>
            <p className="text-sm text-muted-foreground leading-relaxed">
              If you post content — listings, images, reviews, messages — you are responsible for it and you warrant
              that you have the right to share it. You grant VeraLeap a non-exclusive, royalty-free licence to host,
              display, and distribute that content as part of the service. We may remove content that violates these
              terms or applicable law.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-display font-bold mb-2">6. Verification</h2>
            <p className="text-sm text-muted-foreground leading-relaxed">
              VeraLeap may run automated and manual checks on listings and broker profiles, but we do not guarantee
              that any listing, broker, or property is legitimate, safe, or accurately described. Always verify
              details independently before transferring money or signing agreements.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-display font-bold mb-2">7. Payments</h2>
            <p className="text-sm text-muted-foreground leading-relaxed">
              VeraLeap does not process rental payments between tenants and landlords. Any money you transfer to a
              landlord, broker, or owner is at your own risk and outside the scope of this service.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-display font-bold mb-2">8. Reports and moderation</h2>
            <p className="text-sm text-muted-foreground leading-relaxed">
              If you see a suspicious listing, broker, or review, please use the in-app report feature. We review
              reports and may remove content, suspend accounts, or refer matters to law enforcement at our discretion.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-display font-bold mb-2">9. Disclaimer</h2>
            <p className="text-sm text-muted-foreground leading-relaxed">
              The service is provided "as is" without warranties of any kind. To the maximum extent permitted by law,
              VeraLeap is not liable for any indirect, incidental, or consequential damages arising from your use of
              the service or any interaction with other users.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-display font-bold mb-2">10. Termination</h2>
            <p className="text-sm text-muted-foreground leading-relaxed">
              We may suspend or terminate your access at any time if you violate these terms. You may stop using the
              service and delete your account at any time from your profile settings.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-display font-bold mb-2">11. Governing law</h2>
            <p className="text-sm text-muted-foreground leading-relaxed">
              These terms are governed by the laws of India. Disputes will be handled in the courts of Jalandhar,
              Punjab, unless local consumer-protection law requires otherwise.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-display font-bold mb-2">12. Changes</h2>
            <p className="text-sm text-muted-foreground leading-relaxed">
              We may update these terms from time to time. Continued use of the service after changes means you
              accept the updated terms.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-display font-bold mb-2">13. Contact</h2>
            <p className="text-sm text-muted-foreground leading-relaxed">
              Questions about these terms? Reach out at{" "}
              <a href="mailto:support@veraleap.com" className="text-primary hover:underline">support@veraleap.com</a>.
            </p>
          </section>
        </div>
      </div>
    </div>
  );
};

export default Terms;
