import { Link } from "react-router-dom";

const Footer = () => (
  <footer className="bg-foreground text-background/70 mt-16">
    <div className="container mx-auto px-4 py-12 grid grid-cols-1 md:grid-cols-4 gap-8">
      <div>
        <h4 className="text-xl font-display font-bold text-gradient-hero mb-4">VeraLeap</h4>
        <p className="text-sm leading-relaxed">We help renters and landlords connect safely. Verified listings, trusted brokers, and scam prevention.</p>
      </div>
      <div>
        <h5 className="font-semibold text-background mb-3">Quick Links</h5>
        <ul className="space-y-2 text-sm">
          <li><Link to="/properties" className="hover:text-background transition-colors">Properties</Link></li>
          <li><Link to="/brokers" className="hover:text-background transition-colors">Brokers</Link></li>
          <li><Link to="/about" className="hover:text-background transition-colors">About Us</Link></li>
          <li><Link to="/contact" className="hover:text-background transition-colors">Contact</Link></li>
          <li><Link to="/register" className="hover:text-background transition-colors">Sign Up</Link></li>
        </ul>
      </div>
      <div>
        <h5 className="font-semibold text-background mb-3">Support</h5>
        <ul className="space-y-2 text-sm">
          <li><Link to="/contact" className="hover:text-background transition-colors">Help & FAQs</Link></li>
          <li><Link to="/privacy" className="hover:text-background transition-colors">Privacy Policy</Link></li>
          <li><Link to="/terms" className="hover:text-background transition-colors">Terms of Service</Link></li>
        </ul>
      </div>
      <div>
        <h5 className="font-semibold text-background mb-3">Contact</h5>
        <ul className="space-y-2 text-sm">
          <li>Jalandhar, Punjab, India</li>
          <li>(+91) 962-2538-769</li>
          <li>support@veraleap.com</li>
        </ul>
      </div>
    </div>
    <div className="border-t border-background/10 py-4 text-center text-xs text-background/40">
      © {new Date().getFullYear()} VeraLeap. All rights reserved.
    </div>
  </footer>
);

export default Footer;
