import { Link } from "react-router-dom";
import { SITE_URL } from "@/shared/constants/seo";

export function Footer() {
  return (
    <footer className="mt-auto w-full border-t border-foreground/10 bg-surface px-4 pb-24 pt-10 sm:px-6 lg:px-8 lg:pb-10">
      <div className="mx-auto grid max-w-content gap-8 sm:grid-cols-2 lg:grid-cols-4">
        <div>
          <h3 className="font-display font-semibold">MRECW Results Portal</h3>
          <p className="mt-2 text-sm text-muted">
            Malla Reddy Engineering College for Women (Autonomous), Hyderabad — fast academic insights for students.
          </p>
        </div>
        <div>
          <h4 className="text-sm font-semibold">Quick Links</h4>
          <ul className="mt-3 space-y-2 text-sm text-muted">
            <li><Link to="/academic-results" className="hover:text-primary-light">Academic Results</Link></li>
            <li><Link to="/class-results" className="hover:text-primary-light">Class Results</Link></li>
            <li><Link to="/help-center" className="hover:text-primary-light">Help Center</Link></li>
          </ul>
        </div>
        <div>
          <h4 className="text-sm font-semibold">Contact</h4>
          <p className="mt-3 text-sm text-muted">Hyderabad, Telangana, India</p>
          <p className="mt-1 text-sm text-muted">{SITE_URL}</p>
        </div>
        <div>
          <h4 className="text-sm font-semibold">Legal</h4>
          <ul className="mt-3 space-y-2 text-sm text-muted">
            <li><Link to="/help-center" className="hover:text-primary-light">Privacy Policy</Link></li>
            <li><Link to="/help-center" className="hover:text-primary-light">Terms of Service</Link></li>
          </ul>
        </div>
      </div>
      <p className="mx-auto mt-8 max-w-content text-center text-xs text-muted">
        © {new Date().getFullYear()} MRECW Results Portal. Built for MRECW students.
      </p>
    </footer>
  );
}
