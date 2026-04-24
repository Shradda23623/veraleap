import { motion } from "framer-motion";
import { useSEO } from "@/hooks/useSEO";

const Privacy = () => {
  useSEO({ title: "Privacy Policy", description: "How VeraLeap collects, uses, and protects your personal information." });
  const updated = "April 19, 2026";

  return (
    <div className="min-h-screen">
      <section className="bg-gradient-hero py-14 text-primary-foreground">
        <div className="container mx-auto px-4 text-center">
          <motion.h1 initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
            className="text-4xl md:text-5xl font-display font-bold mb-3">
            Privacy <span className="text-secondary">Policy</span>
          </motion.h1>
          <p className="text-sm opacity-90">Last updated: {updated}</p>
        </div>
      </section>

      <div className="container mx-auto px-4 py-12 max-w-3xl">
        <div className="prose prose-sm max-w-none space-y-6 text-foreground">
          <section>
            <h2 className="text-xl font-display font-bold mb-2">1. Who we are</h2>
            <p className="text-sm text-muted-foreground leading-relaxed">
              VeraLeap ("we", "us", "our") operates a rental scam prevention platform that helps tenants verify listings
              and connect with trusted brokers and property owners. This policy explains what personal information we
              collect, how we use it, and the choices you have.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-display font-bold mb-2">2. Information we collect</h2>
            <ul className="list-disc pl-6 text-sm text-muted-foreground space-y-1.5 leading-relaxed">
              <li><strong>Account details:</strong> email, username, role (tenant, broker, owner), and password hash.</li>
              <li><strong>Profile data:</strong> optional photo, city, phone, bio, and verification status you provide.</li>
              <li><strong>Listing data:</strong> if you are a broker or owner, the properties, images, prices, and locations you publish.</li>
              <li><strong>Communication:</strong> messages you send through our in-app chat, contact form submissions, and reviews.</li>
              <li><strong>Usage data:</strong> pages visited, searches performed, and approximate location based on IP.</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-display font-bold mb-2">3. How we use your information</h2>
            <ul className="list-disc pl-6 text-sm text-muted-foreground space-y-1.5 leading-relaxed">
              <li>Provide and maintain the service, including authentication and listing management.</li>
              <li>Enable communication between tenants, brokers, and owners.</li>
              <li>Run verification and fraud-prevention checks on listings and broker profiles.</li>
              <li>Improve the product, fix bugs, and develop new features.</li>
              <li>Respond to your requests, reports, and support enquiries.</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-display font-bold mb-2">4. Sharing your information</h2>
            <p className="text-sm text-muted-foreground leading-relaxed">
              We do not sell your personal data. We share information only with service providers who help us run the
              platform (hosting, authentication, analytics, and map services), and when required by law or to protect
              the safety of our users. Information you publish on a public listing or broker profile is visible to
              other users of the service.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-display font-bold mb-2">5. Data storage and security</h2>
            <p className="text-sm text-muted-foreground leading-relaxed">
              Your data is hosted on Supabase infrastructure with encryption in transit and at rest. Passwords are
              stored as one-way hashes. Access to production data is limited to authorised personnel. No system is
              perfectly secure, so please use a strong, unique password and report any suspicious activity.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-display font-bold mb-2">6. Your rights</h2>
            <p className="text-sm text-muted-foreground leading-relaxed">
              You can access and update your profile at any time from your dashboard. You may request deletion of your
              account and associated data by emailing <a href="mailto:support@veraleap.com" className="text-primary hover:underline">support@veraleap.com</a>.
              Some data (such as messages sent to other users) may be retained for safety and legal reasons.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-display font-bold mb-2">7. Cookies</h2>
            <p className="text-sm text-muted-foreground leading-relaxed">
              We use cookies and similar technologies for authentication and to remember your preferences. You can
              clear or block cookies in your browser, but parts of the service may not work correctly without them.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-display font-bold mb-2">8. Children</h2>
            <p className="text-sm text-muted-foreground leading-relaxed">
              VeraLeap is not intended for users under 18. We do not knowingly collect data from children. If you
              believe a child has provided us with personal information, please contact us so we can remove it.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-display font-bold mb-2">9. Changes</h2>
            <p className="text-sm text-muted-foreground leading-relaxed">
              We may update this policy from time to time. When we do, we will update the "Last updated" date at the
              top of this page and, where appropriate, notify you by email or through the app.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-display font-bold mb-2">10. Contact</h2>
            <p className="text-sm text-muted-foreground leading-relaxed">
              Questions about this policy? Reach out at{" "}
              <a href="mailto:support@veraleap.com" className="text-primary hover:underline">support@veraleap.com</a>.
            </p>
          </section>
        </div>
      </div>
    </div>
  );
};

export default Privacy;
